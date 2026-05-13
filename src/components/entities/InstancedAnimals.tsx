/* eslint-disable react-hooks/immutability */
import { useMemo, useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'
import { GRID_SIZE, TILE_SIZE } from '../../constants/gameConfig'
import { PICKING_LAYER } from '../scene/PickingSystem'

const MAX_ANIMALS = 500

const BILINEAR_GLSL = `
  vec4 bilinear(sampler2D tex, vec2 uv, vec2 res) {
      vec2 st = uv * res - 0.5;
      vec2 i = floor(st);
      vec2 f = fract(st);

      vec4 p00 = texture2D(tex, (i + vec2(0.0, 0.0) + 0.5) / res);
      vec4 p10 = texture2D(tex, (i + vec2(1.0, 0.0) + 0.5) / res);
      vec4 p01 = texture2D(tex, (i + vec2(0.0, 1.0) + 0.5) / res);
      vec4 p11 = texture2D(tex, (i + vec2(1.0, 1.0) + 0.5) / res);

      return mix(mix(p00, p10, f.x), mix(p01, p11, f.x), f.y);
  }
`;

const animalVertexShader = (shader: THREE.ShaderLibShader, heightMap: THREE.Texture, uTime: { value: number }) => {
  shader.uniforms.heightMap = { value: heightMap }
  shader.uniforms.uTime = uTime
  shader.uniforms.uGridSize = { value: GRID_SIZE * TILE_SIZE }

  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
    uniform sampler2D heightMap;
    uniform float uTime;
    uniform float uGridSize;
    attribute float aRandom;
    varying float vRandom;
    ${BILINEAR_GLSL}`
  ).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    vRandom = aRandom;
    vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    
    // Exact UV Mapping to match Terrain.tsx 101x101 DataTexture
    float boundary = uGridSize * 0.5;
    vec2 uv = (instPos.xz + boundary) / uGridSize;
    // Invert Y UV to match Terrain.tsx PlaneGeometry mapping (Back/North is V=1)
    uv.y = 1.0 - uv.y;
    vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
    float h = bilinear(heightMap, sUv, vec2(101.0)).r;
    
    transformed.y += h / instanceMatrix[1][1];

    // Procedural animation (Hopping/Waddling)
    float speed = 8.0 + aRandom * 4.0;
    float hop = abs(sin(uTime * speed + aRandom * 10.0)) * 0.05;
    transformed.y += hop;
    
    // Slight side-to-side tilt
    float tilt = sin(uTime * speed * 0.5 + aRandom * 10.0) * 0.1;
    float cosT = cos(tilt);
    float sinT = sin(tilt);
    mat2 rot = mat2(cosT, -sinT, sinT, cosT);
    transformed.xy = rot * transformed.xy;
    `
  )
}

const pickingVertexShader = (shader: THREE.ShaderLibShader, heightMap: THREE.Texture) => {
  shader.uniforms.heightMap = { value: heightMap }
  shader.uniforms.uGridSize = { value: GRID_SIZE * TILE_SIZE }

  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
    uniform sampler2D heightMap;
    uniform float uGridSize;
    attribute float aPickingId;
    varying float vPickingId;
    ${BILINEAR_GLSL}`
  ).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    vPickingId = aPickingId;
    vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float boundary = uGridSize * 0.5;
    vec2 uv = (instPos.xz + boundary) / uGridSize;
    vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
    float h = bilinear(heightMap, sUv, vec2(101.0)).r;
    transformed.y += h / instanceMatrix[1][1];`
  )
  
  shader.fragmentShader = `
    varying float vPickingId;
    void main() {
      float id = vPickingId + 1.0; // Offset by 1
      float r = floor(id / 256.0) / 255.0;
      float g = mod(id, 256.0) / 255.0;
      gl_FragColor = vec4(r, g, 253.0 / 255.0, 1.0); // b=253 for animals
    }
  `
}

// Generate static random values to avoid Math.random during render
const STATIC_RANDOM_VALUES = new Float32Array(MAX_ANIMALS)
for (let i = 0; i < MAX_ANIMALS; i++) {
  STATIC_RANDOM_VALUES[i] = (Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1
  if (STATIC_RANDOM_VALUES[i] < 0) STATIC_RANDOM_VALUES[i] += 1
}

export const InstancedAnimals = () => {
  const animals = useStore((state) => state.animals)
  const heightTexture = useStore((state) => state.heightTexture)
  
  const deerRef = useRef<THREE.InstancedMesh>(null)
  const wolfRef = useRef<THREE.InstancedMesh>(null)
  
  const deerPickingRef = useRef<THREE.InstancedMesh>(null)
  const wolfPickingRef = useRef<THREE.InstancedMesh>(null)

  // Use useState initializer for a stable uniform object
  const [uTime] = useState(() => ({ value: 0 }))

  const animalTypes = useMemo(() => {
    return {
      DEER: animals.filter(a => a.type === 'DEER'),
      WOLF: animals.filter(a => a.type === 'WOLF')
    }
  }, [animals])

  const randomAttr = useMemo(() => {
    return new THREE.InstancedBufferAttribute(STATIC_RANDOM_VALUES, 1)
  }, [])

  const animalGeo = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.5, 0.5, 1.0)
    geo.translate(0, 0.25, 0)
    geo.setAttribute('aRandom', randomAttr)
    geo.setAttribute('aPickingId', new THREE.InstancedBufferAttribute(new Float32Array(MAX_ANIMALS), 1))
    return geo
  }, [randomAttr])

  useEffect(() => {
    const dummy = new THREE.Object3D()
    const updateMesh = (ref: React.RefObject<THREE.InstancedMesh | null>, pickingRef: React.RefObject<THREE.InstancedMesh | null>, list: typeof animals) => {
      if (!ref.current || !pickingRef.current) return
      
      const pickingAttr = ref.current.geometry.getAttribute('aPickingId') as THREE.InstancedBufferAttribute
      const pickingArray = pickingAttr.array as Float32Array
      
      pickingArray.fill(0)
      
      list.forEach((animal, i) => {
        dummy.position.set(animal.position[0], 0, animal.position[1])
        dummy.rotation.y = animal.rotation
        dummy.scale.setScalar(animal.type === 'WOLF' ? 0.15 : 0.2)
        dummy.updateMatrix()
        
        ref.current!.setMatrixAt(i, dummy.matrix)
        pickingRef.current!.setMatrixAt(i, dummy.matrix)
        pickingArray[i] = animal.pickingId || 0
      })
      
      ref.current.count = list.length
      ref.current.instanceMatrix.needsUpdate = true
      
      pickingRef.current.count = list.length
      pickingRef.current.instanceMatrix.needsUpdate = true
      
      pickingAttr.needsUpdate = true
    }
    updateMesh(deerRef, deerPickingRef, animalTypes.DEER)
    updateMesh(wolfRef, wolfPickingRef, animalTypes.WOLF)
  }, [animalTypes, animals])

  useFrame((state) => {
    uTime.value = state.clock.getElapsedTime()
  })

  const mats = useMemo(() => {
    const createMat = (color: string) => {
      const m = new THREE.MeshStandardMaterial({ color })
      m.onBeforeCompile = (shader) => animalVertexShader(shader, heightTexture, uTime)
      return m
    }
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
    depth.onBeforeCompile = (shader) => animalVertexShader(shader, heightTexture, uTime)
    
    const picking = new THREE.MeshBasicMaterial()
    picking.onBeforeCompile = (shader) => pickingVertexShader(shader, heightTexture)
    
    return { deer: createMat('#8d5524'), wolf: createMat('#444444'), depth, picking }
  }, [heightTexture, uTime])

  return (
    <group>
      <instancedMesh ref={deerRef} args={[animalGeo, undefined, MAX_ANIMALS]} castShadow receiveShadow customDepthMaterial={mats.depth}>
        <primitive object={mats.deer} attach="material" />
      </instancedMesh>
      <instancedMesh ref={wolfRef} args={[animalGeo, undefined, MAX_ANIMALS]} castShadow receiveShadow customDepthMaterial={mats.depth}>
        <primitive object={mats.wolf} attach="material" />
      </instancedMesh>

      {/* Picking Meshes */}
      <instancedMesh ref={deerPickingRef} args={[animalGeo, undefined, MAX_ANIMALS]} layers-mask={1 << PICKING_LAYER}>
        <primitive object={mats.picking} attach="material" />
      </instancedMesh>
      <instancedMesh ref={wolfPickingRef} args={[animalGeo, undefined, MAX_ANIMALS]} layers-mask={1 << PICKING_LAYER}>
        <primitive object={mats.picking} attach="material" />
      </instancedMesh>
    </group>
  )
}

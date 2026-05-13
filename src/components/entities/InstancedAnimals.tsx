import { useMemo, useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'
import { GRID_SIZE, TILE_SIZE, OFFSET } from '../../constants/gameConfig'

const MAX_ANIMALS = 500

const animalVertexShader = (shader: THREE.ShaderLibShader, heightMap: THREE.Texture, uTime: { value: number }) => {
  shader.uniforms.heightMap = { value: heightMap }
  shader.uniforms.uTime = uTime
  shader.uniforms.uGridSize = { value: GRID_SIZE * TILE_SIZE }
  shader.uniforms.uOffset = { value: OFFSET }

  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
    uniform sampler2D heightMap;
    uniform float uTime;
    uniform float uGridSize;
    uniform float uOffset;
    attribute float aRandom;
    varying float vRandom;`
  ).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    vRandom = aRandom;
    vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    
    // Exact UV Mapping to match Terrain.tsx 101x101 DataTexture
    vec2 worldUv = (instPos.xz + uOffset) / uGridSize;
    float h = texture2D(heightMap, worldUv).r;
    
    transformed.y += h;

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

  useEffect(() => {
    const dummy = new THREE.Object3D()
    const updateMesh = (ref: React.RefObject<THREE.InstancedMesh | null>, list: typeof animals) => {
      if (!ref.current) return
      list.forEach((animal, i) => {
        dummy.position.set(animal.position[0], 0, animal.position[1])
        dummy.rotation.y = animal.rotation
        dummy.scale.setScalar(animal.type === 'WOLF' ? 0.15 : 0.2)
        dummy.updateMatrix()
        ref.current!.setMatrixAt(i, dummy.matrix)
      })
      ref.current.count = list.length
      ref.current.instanceMatrix.needsUpdate = true
    }
    updateMesh(deerRef, animalTypes.DEER)
    updateMesh(wolfRef, animalTypes.WOLF)
  }, [animalTypes, animals])

  useFrame((state) => {
    // eslint-disable-next-line react-hooks/immutability
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
    return { deer: createMat('#8d5524'), wolf: createMat('#444444'), depth }
  }, [heightTexture, uTime])

  const animalGeo = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.5, 0.5, 1.0)
    geo.translate(0, 0.25, 0)
    geo.setAttribute('aRandom', randomAttr)
    return geo
  }, [randomAttr])

  return (
    <group>
      <instancedMesh ref={deerRef} args={[animalGeo, undefined, MAX_ANIMALS]} castShadow receiveShadow customDepthMaterial={mats.depth}>
        <primitive object={mats.deer} attach="material" />
      </instancedMesh>
      <instancedMesh ref={wolfRef} args={[animalGeo, undefined, MAX_ANIMALS]} castShadow receiveShadow customDepthMaterial={mats.depth}>
        <primitive object={mats.wolf} attach="material" />
      </instancedMesh>
    </group>
  )
}

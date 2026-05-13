/* eslint-disable react-hooks/immutability */
import { useMemo, useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'
import { GRID_SIZE, TILE_SIZE, OFFSET } from '../../constants/gameConfig'
import { PICKING_LAYER } from './PickingSystem'

const MAX_TREES = 5000

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

const treeVertexShader = (shader: THREE.ShaderLibShader, heightMap: THREE.Texture, uTime: { value: number }) => {
  shader.uniforms.heightMap = { value: heightMap }
  shader.uniforms.uTime = uTime
  shader.uniforms.uGridSize = { value: GRID_SIZE * TILE_SIZE }

  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
    uniform sampler2D heightMap;
    uniform float uTime;
    uniform float uGridSize;
    ${BILINEAR_GLSL}`
  ).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    // Instance world position (xz only)
    vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    
    // Exact UV Mapping to match Terrain.tsx 101x101 DataTexture
    // Plane is from -BOUNDARY to BOUNDARY. Total width is uGridSize (20.0)
    float boundary = uGridSize * 0.5;
    vec2 uv = (instPos.xz + boundary) / uGridSize;
    // Invert Y UV to match Terrain.tsx PlaneGeometry mapping (Back/North is V=1)
    uv.y = 1.0 - uv.y;
    vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
    
    // Sample height from heightMap (R channel) using bilinear interpolation
    float h = bilinear(heightMap, sUv, vec2(101.0)).r;
    transformed.y += h / instanceMatrix[1][1];
    
    // Wind sway (only for foliage, not trunk)
    float swayFactor = smoothstep(0.1, 1.0, position.y);
    float sway = sin(uTime * 1.5 + instPos.x * 5.0 + instPos.z * 3.0) * 0.04 * swayFactor;
    transformed.x += sway;
    transformed.z += sway * 0.5;`
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
      float id = vPickingId + 1.0; // Offset by 1 to avoid ID:0
      float r = floor(id / 256.0) / 255.0;
      float g = mod(id, 256.0) / 255.0;
      gl_FragColor = vec4(r, g, 1.0, 1.0); 
    }
  `
}

export const InstancedTrees = () => {
  const buildings = useStore((state) => state.buildings)
  const heightTexture = useStore((state) => state.heightTexture)
  
  const coniferRef = useRef<THREE.InstancedMesh>(null)
  const deciduousRef = useRef<THREE.InstancedMesh>(null)
  const birchRef = useRef<THREE.InstancedMesh>(null)
  const trunkRef = useRef<THREE.InstancedMesh>(null)
  
  const coniferPickingRef = useRef<THREE.InstancedMesh>(null)
  const deciduousPickingRef = useRef<THREE.InstancedMesh>(null)
  const birchPickingRef = useRef<THREE.InstancedMesh>(null)
  const trunkPickingRef = useRef<THREE.InstancedMesh>(null)

  const [uTime] = useState(() => ({ value: 0 }))

  const treeData = useMemo(() => {
    const conifer = buildings.filter(b => b.type === 'TREE_CONIFER' || b.type === 'TREE')
    const deciduous = buildings.filter(b => b.type === 'TREE_DECIDUOUS')
    const birch = buildings.filter(b => b.type === 'TREE_BIRCH')
    return { conifer, deciduous, birch, all: [...conifer, ...deciduous, ...birch] }
  }, [buildings])

  useEffect(() => {
    const dummy = new THREE.Object3D()
    const updateMesh = (ref: React.RefObject<THREE.InstancedMesh | null>, pickingRef: React.RefObject<THREE.InstancedMesh | null>, list: typeof buildings) => {
      if (!ref.current || !pickingRef.current) return
      
      const pickingAttr = ref.current.geometry.getAttribute('aPickingId') as THREE.InstancedBufferAttribute
      const pickingArray = pickingAttr.array as Float32Array
      
      // Clear array
      pickingArray.fill(0)
      
      list.forEach((tree, i) => {
        const worldX = tree.x * TILE_SIZE - OFFSET
        const worldZ = tree.z * TILE_SIZE - OFFSET
        dummy.position.set(worldX, 0, worldZ)
        dummy.rotation.y = (tree.id.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0) % 10) * 0.6
        dummy.scale.setScalar(0.8 + (tree.id.length % 5) * 0.1)
        dummy.updateMatrix()
        
        ref.current!.setMatrixAt(i, dummy.matrix)
        pickingRef.current!.setMatrixAt(i, dummy.matrix)
        pickingArray[i] = tree.pickingId || 0
      })
      
      ref.current.count = list.length
      ref.current.instanceMatrix.needsUpdate = true
      
      pickingRef.current.count = list.length
      pickingRef.current.instanceMatrix.needsUpdate = true
      
      pickingAttr.needsUpdate = true
    }
    updateMesh(coniferRef, coniferPickingRef, treeData.conifer)
    updateMesh(deciduousRef, deciduousPickingRef, treeData.deciduous)
    updateMesh(birchRef, birchPickingRef, treeData.birch)
    updateMesh(trunkRef, trunkPickingRef, treeData.all)
  }, [treeData, buildings])

  useFrame((state) => {
    uTime.value = state.clock.getElapsedTime()
  })

  // Shared Materials
  const mats = useMemo(() => {
    const createMat = (color: string) => {
      const m = new THREE.MeshStandardMaterial({ color })
      m.onBeforeCompile = (shader) => {
        treeVertexShader(shader, heightTexture, uTime)
      }
      return m
    }
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
    depth.onBeforeCompile = (shader) => {
      treeVertexShader(shader, heightTexture, uTime)
    }
    const picking = new THREE.MeshBasicMaterial()
    picking.onBeforeCompile = (shader) => {
      pickingVertexShader(shader, heightTexture)
    }
    return { conifer: createMat('#1a3317'), deciduous: createMat('#385e2c'), birch: createMat('#6e8b3d'), trunk: createMat('#3E2723'), depth, picking }
  }, [heightTexture, uTime])

  const coniferGeo = useMemo(() => { 
    const geo = new THREE.ConeGeometry(0.3, 0.8, 6); 
    geo.translate(0, 0.7, 0); 
    geo.setAttribute('aPickingId', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1));
    return geo 
  }, [])
  const deciduousGeo = useMemo(() => { 
    const geo = new THREE.SphereGeometry(0.35, 8, 8); 
    geo.translate(0, 0.65, 0); 
    geo.setAttribute('aPickingId', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1));
    return geo 
  }, [])
  const birchGeo = useMemo(() => { 
    const geo = new THREE.SphereGeometry(0.25, 8, 8); 
    geo.translate(0, 0.6, 0); 
    geo.setAttribute('aPickingId', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1));
    return geo 
  }, [])
  const trunkGeo = useMemo(() => { 
    const geo = new THREE.CylinderGeometry(0.05, 0.08, 0.6, 6); 
    geo.translate(0, 0.3, 0); 
    geo.setAttribute('aPickingId', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1));
    return geo 
  }, [])

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[trunkGeo, undefined, MAX_TREES]} castShadow receiveShadow customDepthMaterial={mats.depth}>
        <primitive object={mats.trunk} attach="material" />
      </instancedMesh>
      <instancedMesh ref={coniferRef} args={[coniferGeo, undefined, MAX_TREES]} castShadow receiveShadow customDepthMaterial={mats.depth}>
        <primitive object={mats.conifer} attach="material" />
      </instancedMesh>
      <instancedMesh ref={deciduousRef} args={[deciduousGeo, undefined, MAX_TREES]} castShadow receiveShadow customDepthMaterial={mats.depth}>
        <primitive object={mats.deciduous} attach="material" />
      </instancedMesh>
      <instancedMesh ref={birchRef} args={[birchGeo, undefined, MAX_TREES]} castShadow receiveShadow customDepthMaterial={mats.depth}>
        <primitive object={mats.birch} attach="material" />
      </instancedMesh>

      {/* Picking Meshes */}
      <instancedMesh ref={trunkPickingRef} args={[trunkGeo, undefined, MAX_TREES]} layers-mask={1 << PICKING_LAYER}>
        <primitive object={mats.picking} attach="material" />
      </instancedMesh>
      <instancedMesh ref={coniferPickingRef} args={[coniferGeo, undefined, MAX_TREES]} layers-mask={1 << PICKING_LAYER}>
        <primitive object={mats.picking} attach="material" />
      </instancedMesh>
      <instancedMesh ref={deciduousPickingRef} args={[deciduousGeo, undefined, MAX_TREES]} layers-mask={1 << PICKING_LAYER}>
        <primitive object={mats.picking} attach="material" />
      </instancedMesh>
      <instancedMesh ref={birchPickingRef} args={[birchGeo, undefined, MAX_TREES]} layers-mask={1 << PICKING_LAYER}>
        <primitive object={mats.picking} attach="material" />
      </instancedMesh>
    </group>
  )
}

import { useMemo, useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import { GRID_SIZE, TILE_SIZE, OFFSET } from '../../constants/gameConfig'

const MAX_TREES = 5000

const treeVertexShader = (shader: THREE.ShaderLibShader, heightMap: THREE.Texture, uTime: { value: number }) => {
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
    uniform float uOffset;`
  ).replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    // Instance world position (xz only)
    vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    
    // Exact UV Mapping to match Terrain.tsx 101x101 DataTexture
    vec2 worldUv = (instPos.xz + uOffset) / uGridSize;
    
    // Sample height from heightMap (R channel)
    float h = texture2D(heightMap, worldUv).r;
    transformed.y += h;
    
    // Wind sway (only for foliage, not trunk)
    float swayFactor = smoothstep(0.1, 1.0, position.y);
    float sway = sin(uTime * 1.5 + instPos.x * 5.0 + instPos.z * 3.0) * 0.04 * swayFactor;
    transformed.x += sway;
    transformed.z += sway * 0.5;`
  )
}

export const InstancedTrees = () => {
  const buildings = useStore((state) => state.buildings)
  const heightTexture = useStore((state) => state.heightTexture)
  
  const coniferRef = useRef<THREE.InstancedMesh>(null)
  const deciduousRef = useRef<THREE.InstancedMesh>(null)
  const birchRef = useRef<THREE.InstancedMesh>(null)
  const trunkRef = useRef<THREE.InstancedMesh>(null)
  
  // Use useState initializer for a stable uniform object
  const [uTime] = useState(() => ({ value: 0 }))

  const treeData = useMemo(() => {
    const conifer = buildings.filter(b => b.type === 'TREE_CONIFER' || b.type === 'TREE')
    const deciduous = buildings.filter(b => b.type === 'TREE_DECIDUOUS')
    const birch = buildings.filter(b => b.type === 'TREE_BIRCH')
    return { conifer, deciduous, birch, all: [...conifer, ...deciduous, ...birch] }
  }, [buildings])

  useEffect(() => {
    const dummy = new THREE.Object3D()
    const updateMesh = (ref: React.RefObject<THREE.InstancedMesh | null>, list: typeof buildings) => {
      if (!ref.current) return
      list.forEach((tree, i) => {
        const worldX = tree.x * TILE_SIZE - OFFSET
        const worldZ = tree.z * TILE_SIZE - OFFSET
        dummy.position.set(worldX, 0, worldZ)
        dummy.rotation.y = (tree.id.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0) % 10) * 0.6
        dummy.scale.setScalar(0.8 + (tree.id.length % 5) * 0.1)
        dummy.updateMatrix()
        ref.current!.setMatrixAt(i, dummy.matrix)
      })
      ref.current.count = list.length
      ref.current.instanceMatrix.needsUpdate = true
    }
    updateMesh(coniferRef, treeData.conifer)
    updateMesh(deciduousRef, treeData.deciduous)
    updateMesh(birchRef, treeData.birch)
    updateMesh(trunkRef, treeData.all)
  }, [treeData, buildings])

  useFrame((state) => {
    // eslint-disable-next-line react-hooks/immutability
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
    return { conifer: createMat('#1a3317'), deciduous: createMat('#385e2c'), birch: createMat('#6e8b3d'), trunk: createMat('#3E2723'), depth }
  }, [heightTexture, uTime])

  const coniferGeo = useMemo(() => { const geo = new THREE.ConeGeometry(0.3, 0.8, 6); geo.translate(0, 0.7, 0); return geo }, [])
  const deciduousGeo = useMemo(() => { const geo = new THREE.SphereGeometry(0.35, 8, 8); geo.translate(0, 0.65, 0); return geo }, [])
  const birchGeo = useMemo(() => { const geo = new THREE.SphereGeometry(0.25, 8, 8); geo.translate(0, 0.6, 0); return geo }, [])
  const trunkGeo = useMemo(() => { const geo = new THREE.CylinderGeometry(0.05, 0.08, 0.6, 6); geo.translate(0, 0.3, 0); return geo }, [])

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
    </group>
  )
}

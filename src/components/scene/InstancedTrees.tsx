/* eslint-disable react-hooks/immutability */
import { useMemo, useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'
import { surfaceVertexChunks } from '../../shaders/trees/surface.vert'
import { pickingVertexChunks } from '../../shaders/trees/picking.vert'
import { pickingFragmentShader } from '../../shaders/trees/picking.frag'
import { GRID_SIZE, TILE_SIZE, OFFSET } from '../../constants/gameConfig'
import { PICKING_LAYER } from './PickingSystem'

const MAX_TREES = 5000

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
        shader.uniforms.heightMap = { value: heightTexture }
        shader.uniforms.uTime = uTime
        shader.uniforms.uGridSize = { value: GRID_SIZE * TILE_SIZE }
        shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${surfaceVertexChunks.common}`)
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${surfaceVertexChunks.begin}`)
      }
      return m
    }
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
    depth.onBeforeCompile = (shader) => {
      shader.uniforms.heightMap = { value: heightTexture }
      shader.uniforms.uTime = uTime
      shader.uniforms.uGridSize = { value: GRID_SIZE * TILE_SIZE }
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${surfaceVertexChunks.common}`)
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${surfaceVertexChunks.begin}`)
    }
    const picking = new THREE.MeshBasicMaterial()
    picking.onBeforeCompile = (shader) => {
      shader.uniforms.heightMap = { value: heightTexture }
      shader.uniforms.uGridSize = { value: GRID_SIZE * TILE_SIZE }
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${pickingVertexChunks.common}`)
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${pickingVertexChunks.begin}`)
      shader.fragmentShader = pickingFragmentShader
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

/* eslint-disable react-hooks/immutability */
import { useMemo, useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'
import { PICKING_LAYER } from '../scene/PickingSystem'
import { surfaceVertexChunks } from '../../shaders/animals/surface.vert'
import { pickingVertexChunks } from '../../shaders/animals/picking.vert'
import { pickingFragmentShader } from '../../shaders/animals/picking.frag'
import { GRID_SIZE, TILE_SIZE } from '../../constants/gameConfig'

const MAX_ANIMALS = 500

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

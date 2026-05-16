import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'
import { PICKING_LAYER } from '../scene/PickingSystem'
import { AnimalManager } from '../../managers/AnimalManager'

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

  const manager = useMemo(() => new AnimalManager(null), [])

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
    manager.updateHeightTexture(heightTexture)
  }, [manager, heightTexture])

  useEffect(() => {
    if (!deerRef.current || !wolfRef.current || !deerPickingRef.current || !wolfPickingRef.current) return
    
    manager.updateInstances(
      deerRef.current,
      wolfRef.current,
      deerPickingRef.current,
      wolfPickingRef.current,
      animals
    )
  }, [manager, animals])

  useFrame((state) => {
    manager.updateTime(state.clock.getElapsedTime())
  })

  useEffect(() => {
    return () => manager.dispose()
  }, [manager])

  return (
    <group>
      <instancedMesh ref={deerRef} args={[animalGeo, undefined, MAX_ANIMALS]} castShadow receiveShadow customDepthMaterial={manager.materials.depth} frustumCulled={false}>
        <primitive object={manager.materials.deer} attach="material" />
      </instancedMesh>
      <instancedMesh ref={wolfRef} args={[animalGeo, undefined, MAX_ANIMALS]} castShadow receiveShadow customDepthMaterial={manager.materials.depth} frustumCulled={false}>
        <primitive object={manager.materials.wolf} attach="material" />
      </instancedMesh>

      {/* Picking Meshes */}
      <instancedMesh ref={deerPickingRef} args={[animalGeo, undefined, MAX_ANIMALS]} layers-mask={1 << PICKING_LAYER} frustumCulled={false}>
        <primitive object={manager.materials.picking} attach="material" />
      </instancedMesh>
      <instancedMesh ref={wolfPickingRef} args={[animalGeo, undefined, MAX_ANIMALS]} layers-mask={1 << PICKING_LAYER} frustumCulled={false}>
        <primitive object={manager.materials.picking} attach="material" />
      </instancedMesh>
    </group>
  )
}

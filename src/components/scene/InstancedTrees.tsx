import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'
import { MAX_TREES } from '../../constants/gameConfig'
import { PICKING_LAYER } from '../scene/PickingSystem'
import { TreeManager } from '../../managers/TreeManager'

export const InstancedTrees = () => {
  const buildings = useStore((state) => state.buildings)
  const heightTexture = useStore((state) => state.heightTexture)
  const terrainVertices = useStore((state) => state.terrainVertices)
  const hoveredEntityId = useStore((state) => state.hoveredEntityId)
  const mode = useStore((state) => state.mode)
  const isPickable = mode === 'PLAY'

  const coniferRef = useRef<THREE.InstancedMesh>(null)
  const deciduousRef = useRef<THREE.InstancedMesh>(null)
  const birchRef = useRef<THREE.InstancedMesh>(null)
  const coniferTrunkRef = useRef<THREE.InstancedMesh>(null)
  const deciduousTrunkRef = useRef<THREE.InstancedMesh>(null)
  const birchTrunkRef = useRef<THREE.InstancedMesh>(null)

  const coniferPickingRef = useRef<THREE.InstancedMesh>(null)
  const deciduousPickingRef = useRef<THREE.InstancedMesh>(null)
  const birchPickingRef = useRef<THREE.InstancedMesh>(null)
  const coniferTrunkPickingRef = useRef<THREE.InstancedMesh>(null)
  const deciduousTrunkPickingRef = useRef<THREE.InstancedMesh>(null)
  const birchTrunkPickingRef = useRef<THREE.InstancedMesh>(null)

  const manager = useMemo(() => new TreeManager(null), [])

  useEffect(() => {
    const hoveredBuilding = buildings.find(b => b.id === hoveredEntityId)
    manager.updateHoveredEntity(hoveredBuilding ? (hoveredBuilding.pickingId || 0) : null)
  }, [manager, buildings, hoveredEntityId])

  useEffect(() => {
    manager.updateHeightTexture(heightTexture)
  }, [manager, heightTexture])

  useEffect(() => {
    if (!coniferRef.current || !deciduousRef.current || !birchRef.current || 
        !coniferTrunkRef.current || !deciduousTrunkRef.current || !birchTrunkRef.current ||
        !coniferPickingRef.current || !deciduousPickingRef.current || !birchPickingRef.current || 
        !coniferTrunkPickingRef.current || !deciduousTrunkPickingRef.current || !birchTrunkPickingRef.current) return
    
    manager.updateInstances(
      {
        conifer: coniferRef.current,
        coniferTrunk: coniferTrunkRef.current,
        deciduous: deciduousRef.current,
        deciduousTrunk: deciduousTrunkRef.current,
        birch: birchRef.current,
        birchTrunk: birchTrunkRef.current
      },
      {
        conifer: coniferPickingRef.current,
        coniferTrunk: coniferTrunkPickingRef.current,
        deciduous: deciduousPickingRef.current,
        deciduousTrunk: deciduousTrunkPickingRef.current,
        birch: birchPickingRef.current,
        birchTrunk: birchTrunkPickingRef.current
      },
      buildings,
      terrainVertices
    )
  }, [manager, buildings, terrainVertices])

  useFrame((state) => {
    manager.updateTime(state.clock.getElapsedTime())
  })

  useEffect(() => {
    return () => manager.dispose()
  }, [manager])

  const coniferGeo = useMemo(() => { 
    const geo = new THREE.ConeGeometry(0.3, 0.8, 6); 
    geo.translate(0, 0.7, 0); 
    geo.setAttribute('aPickingId', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1));
    geo.setAttribute('aSink', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1));
    return geo 
  }, [])
  const deciduousGeo = useMemo(() => { 
    const geo = new THREE.SphereGeometry(0.35, 8, 8); 
    geo.translate(0, 0.65, 0); 
    geo.setAttribute('aPickingId', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1));
    geo.setAttribute('aSink', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1));
    return geo 
  }, [])
  const birchGeo = useMemo(() => { 
    const geo = new THREE.SphereGeometry(0.25, 8, 8); 
    geo.translate(0, 0.6, 0); 
    geo.setAttribute('aPickingId', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1));
    geo.setAttribute('aSink', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1));
    return geo 
  }, [])
  const trunkGeo = useMemo(() => { 
    const geo = new THREE.CylinderGeometry(0.05, 0.12, 0.6, 6); 
    geo.translate(0, 0.3, 0); 
    geo.setAttribute('aPickingId', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1));
    geo.setAttribute('aSink', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1));
    return geo 
  }, [])

  return (
    <group>
      <instancedMesh ref={coniferTrunkRef} args={[trunkGeo, undefined, MAX_TREES]} castShadow receiveShadow customDepthMaterial={manager.materials.depth} frustumCulled={false}>
        <primitive object={manager.materials.coniferTrunk} attach="material" />
      </instancedMesh>
      <instancedMesh ref={deciduousTrunkRef} args={[trunkGeo, undefined, MAX_TREES]} castShadow receiveShadow customDepthMaterial={manager.materials.depth} frustumCulled={false}>
        <primitive object={manager.materials.deciduousTrunk} attach="material" />
      </instancedMesh>
      <instancedMesh ref={birchTrunkRef} args={[trunkGeo, undefined, MAX_TREES]} castShadow receiveShadow customDepthMaterial={manager.materials.depth} frustumCulled={false}>
        <primitive object={manager.materials.birchTrunk} attach="material" />
      </instancedMesh>
      <instancedMesh ref={coniferRef} args={[coniferGeo, undefined, MAX_TREES]} castShadow receiveShadow customDepthMaterial={manager.materials.depth} frustumCulled={false}>
        <primitive object={manager.materials.conifer} attach="material" />
      </instancedMesh>
      <instancedMesh ref={deciduousRef} args={[deciduousGeo, undefined, MAX_TREES]} castShadow receiveShadow customDepthMaterial={manager.materials.depth} frustumCulled={false}>
        <primitive object={manager.materials.deciduous} attach="material" />
      </instancedMesh>
      <instancedMesh ref={birchRef} args={[birchGeo, undefined, MAX_TREES]} castShadow receiveShadow customDepthMaterial={manager.materials.depth} frustumCulled={false}>
        <primitive object={manager.materials.birch} attach="material" />
      </instancedMesh>

      {/* Picking Meshes */}
      <instancedMesh ref={coniferTrunkPickingRef} args={[trunkGeo, undefined, MAX_TREES]} layers-mask={isPickable ? (1 << PICKING_LAYER) : 0} frustumCulled={false}>
        <primitive object={manager.materials.picking} attach="material" />
      </instancedMesh>
      <instancedMesh ref={deciduousTrunkPickingRef} args={[trunkGeo, undefined, MAX_TREES]} layers-mask={isPickable ? (1 << PICKING_LAYER) : 0} frustumCulled={false}>
        <primitive object={manager.materials.picking} attach="material" />
      </instancedMesh>
      <instancedMesh ref={birchTrunkPickingRef} args={[trunkGeo, undefined, MAX_TREES]} layers-mask={isPickable ? (1 << PICKING_LAYER) : 0} frustumCulled={false}>
        <primitive object={manager.materials.picking} attach="material" />
      </instancedMesh>
      <instancedMesh ref={coniferPickingRef} args={[coniferGeo, undefined, MAX_TREES]} layers-mask={isPickable ? (1 << PICKING_LAYER) : 0} frustumCulled={false}>
        <primitive object={manager.materials.picking} attach="material" />
      </instancedMesh>
      <instancedMesh ref={deciduousPickingRef} args={[deciduousGeo, undefined, MAX_TREES]} layers-mask={isPickable ? (1 << PICKING_LAYER) : 0} frustumCulled={false}>
        <primitive object={manager.materials.picking} attach="material" />
      </instancedMesh>
      <instancedMesh ref={birchPickingRef} args={[birchGeo, undefined, MAX_TREES]} layers-mask={isPickable ? (1 << PICKING_LAYER) : 0} frustumCulled={false}>
        <primitive object={manager.materials.picking} attach="material" />
      </instancedMesh>
    </group>
  )
}

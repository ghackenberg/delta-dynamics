import { MapControls, ContactShadows, Environment } from '@react-three/drei'
import { GameGrid } from './GameGrid'
import { Terrain } from './Terrain'
import { RainEffect } from './RainEffect'
import { DayNightCycle } from './DayNightCycle'
import { PickingSystem } from './PickingSystem'
import { PerformanceSystem } from './PerformanceSystem'
import { useStore } from '../../hooks/useStore'
import { getTerrainById } from '../../terrains'
import { useEffect, useRef } from 'react'
import type { MapControls as MapControlsImpl } from 'three-stdlib'
import { GRID_SIZE, TILE_SIZE } from '../../constants/gameConfig'

export const Scene = () => {
  const activeTerrainId = useStore((state) => state.activeTerrainId)
  const isEditorInteracting = useStore((state) => state.isEditorInteracting)
  const controlsRef = useRef<MapControlsImpl>(null)

  useEffect(() => {
    const terrainConfig = getTerrainById(activeTerrainId)
    if (controlsRef.current) {
      const controls = controlsRef.current
      
      // Compute from terrain size
      const terrainSize = GRID_SIZE * TILE_SIZE
      const targetY = (terrainConfig.visualRange[0] + terrainConfig.visualRange[1]) / 2
      
      const px = terrainConfig.cameraPosition ? terrainConfig.cameraPosition[0] : terrainSize * 0.9
      const py = terrainConfig.cameraPosition ? terrainConfig.cameraPosition[1] : targetY + terrainSize * 0.8
      const pz = terrainConfig.cameraPosition ? terrainConfig.cameraPosition[2] : terrainSize * 0.9
      
      const tx = terrainConfig.cameraTarget ? terrainConfig.cameraTarget[0] : 0
      const ty = terrainConfig.cameraTarget ? terrainConfig.cameraTarget[1] : targetY
      const tz = terrainConfig.cameraTarget ? terrainConfig.cameraTarget[2] : 0

      controls.object.position.set(px, py, pz)
      controls.target.set(tx, ty, tz)
      controls.update()
    }
  }, [activeTerrainId])

  return (
    <>
      <PerformanceSystem />
      <PickingSystem />
      <DayNightCycle />

      <Terrain />
      <GameGrid />
      <RainEffect />

      <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={40} blur={2} far={10} />
      <Environment preset="city" />

      <MapControls 
        ref={controlsRef}
        makeDefault 
        enabled={!isEditorInteracting}
        minDistance={5} 
        maxDistance={50} 
        maxPolarAngle={Math.PI / 2.1} 
      />
    </>
  )
}

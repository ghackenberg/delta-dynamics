/* eslint-disable react-hooks/immutability */
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SEA_LEVEL } from '../../../constants/gameConfig'
import { WaterComputeSystem } from '../../../systems/waterSystem'
import { useStore } from '../../../hooks/useStore'
import type { TerrainConfig } from '../../../types/game'

interface WaterSimulationProps {
  gpuSim: WaterComputeSystem
  terrainConfig: TerrainConfig
  uniforms: {
    waterMap: { value: THREE.Texture | null }
    uTime: { value: number }
    uHoveredCell: { value: THREE.Vector2 }
  }
  surfaceTex: THREE.DataTexture
}

export const WaterSimulation = ({ 
  gpuSim, 
  terrainConfig, 
  uniforms, 
  surfaceTex 
}: WaterSimulationProps) => {
  const day = useStore((state) => state.day)
  const gameTime = useStore((state) => state.gameTime)
  const rainIntensity = useStore((state) => state.rainIntensity)
  const sWater = useStore((state) => state.sWater)
  const gWater = useStore((state) => state.gWater)
  const tHeight = useStore((state) => state.tHeight)
  const setTextures = useStore((state) => state.setTextures)
  const hoveredCell = useStore((state) => state.hoveredCell)

  useFrame((state) => {
    // 1. Run GPU Simulation
    const currentSeaLevel = SEA_LEVEL + Math.sin(day * 0.5 + gameTime * 0.02) * 0.2
    
    // Get current terrain config for inflow
    const inflow = terrainConfig.getInflow ? terrainConfig.getInflow(gameTime) : 0
    
    for (let i = 0; i < 5; i++) { // 5 sub-steps
      gpuSim.step(rainIntensity, inflow, currentSeaLevel, state.clock.getElapsedTime())
    }

    // 2. Read back to CPU for entity logic
    gpuSim.readBack(sWater, gWater, tHeight)

    // 3. Update Uniforms
    const waterTex = gpuSim.getWaterTexture()
    uniforms.waterMap.value = waterTex
    uniforms.uTime.value = state.clock.getElapsedTime()
    
    if (hoveredCell) {
        uniforms.uHoveredCell.value.set(hoveredCell.x, hoveredCell.z)
    } else {
        uniforms.uHoveredCell.value.set(-1, -1)
    }

    setTextures(surfaceTex, waterTex as THREE.DataTexture)
  })

  return null
}

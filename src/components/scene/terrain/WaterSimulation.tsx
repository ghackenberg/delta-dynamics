import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { SEA_LEVEL, GRID_SIZE } from '../../../constants/gameConfig'
import { WaterComputeSystem } from '../../../systems/waterSystem'
import { useStore } from '../../../hooks/useStore'
import type { TerrainConfig, GameMode } from '../../../types/game'

interface WaterUniforms {
  waterMap: { value: THREE.Texture | null }
  uTime: { value: number }
  uHoveredCell: { value: THREE.Vector2 }
  uBrushSize: { value: number }
  uBrushStrength: { value: number }
  uMode: { value: number }
}

interface WaterSimulationProps {
  gpuSim: WaterComputeSystem
  terrainConfig: TerrainConfig
  uniforms: WaterUniforms
  surfaceTex: THREE.DataTexture
}

const updateWaterUniforms = (
  uniforms: WaterUniforms,
  waterTex: THREE.Texture,
  time: number,
  hoveredCell: { x: number, z: number } | null,
  brushSize: number,
  brushStrength: number,
  mode: GameMode
) => {
  uniforms.waterMap.value = waterTex
  uniforms.uTime.value = time
  uniforms.uBrushSize.value = brushSize
  uniforms.uBrushStrength.value = brushStrength
  uniforms.uMode.value = mode === 'EDITOR' ? 1 : 0

  if (hoveredCell) {
    uniforms.uHoveredCell.value.set(hoveredCell.x, hoveredCell.z)
  } else {
    uniforms.uHoveredCell.value.set(-1, -1)
  }
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
  const mode = useStore((state) => state.mode)
  const brushSize = useStore((state) => state.editorBrushSize)
  const brushStrength = useStore((state) => state.editorBrushStrength)
  const isEditorInteracting = useStore((state) => state.isEditorInteracting)
  const editorLayerType = useStore((state) => state.editorLayerType)

  const rainBrushPos = useMemo(() => new THREE.Vector2(), [])

  useFrame((state) => {
      // 1. Run GPU Simulation
      const currentSeaLevel = SEA_LEVEL + Math.sin(day * 0.5 + gameTime * 0.02) * 0.2

      // Get current terrain config for inflow
      const inflow = terrainConfig.getInflow ? terrainConfig.getInflow(gameTime) : 0

      const isRainPainting = mode === 'EDITOR' && isEditorInteracting && editorLayerType === 'RAIN'

      if (isRainPainting && hoveredCell) {
          rainBrushPos.set(hoveredCell.x, GRID_SIZE - 1 - hoveredCell.z)
      } else {
          rainBrushPos.set(-1, -1)
      }

      for (let i = 0; i < 5; i++) { // 5 sub-steps
          gpuSim.step(
              rainIntensity, 
              inflow, 
              currentSeaLevel, 
              state.clock.getElapsedTime(),
              rainBrushPos,
              brushSize,
              brushStrength
          )
      }
    // 2. Read back to CPU for entity logic
    gpuSim.readBack(sWater, gWater, tHeight)

    // 3. Update Uniforms
    const waterTex = gpuSim.getWaterTexture()
    updateWaterUniforms(
      uniforms, 
      waterTex, 
      state.clock.getElapsedTime(), 
      hoveredCell,
      brushSize,
      brushStrength,
      mode
    )

    setTextures(surfaceTex, waterTex as THREE.DataTexture)
  })

  return null
}

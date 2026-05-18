import { useMemo, useState, useEffect, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'
import { GRID_SIZE, TILE_SIZE, MATERIAL_PROPERTIES, MAX_GPU_LAYERS } from '../../constants/gameConfig'
import { WaterComputeSystem } from '../../systems/waterSystem'
import { getTerrainById } from '../../terrains'
import type { LayerType } from '../../types/game'

import { terrainSurfaceVertexModule } from '../../shaders/terrain/surface.vert'
import { terrainSurfaceFragmentModule } from '../../shaders/terrain/surface.frag'
import { terrainPickingVertexModule } from '../../shaders/terrain/picking.vert'
import { terrainPickingFragmentModule } from '../../shaders/terrain/picking.frag'
import { waterPickingVertexModule } from '../../shaders/water/picking.vert'
import { waterPickingFragmentModule } from '../../shaders/water/picking.frag'
import { waterSurfaceVertexModule } from '../../shaders/water/surface.vert'
import { waterSurfaceFragmentModule } from '../../shaders/water/surface.frag'
import { terrainDepthVertexModule } from '../../shaders/terrain/depth.vert'
import { createTerrainSideVertexModule } from '../../shaders/terrain/side.vert'
import { terrainSideFragmentModule } from '../../shaders/terrain/side.frag'
import { createWaterSideVertexModule } from '../../shaders/water/side.vert'
import { waterSideFragmentModule } from '../../shaders/water/side.frag'
import { applyModulesToShader, type Shader } from '../../utils/shaderUtils'
import { TerrainManager } from '../../managers/TerrainManager'
import { computeAdaptiveIndices } from '../../systems/terrainSystem'

import { WaterSimulation } from './terrain/WaterSimulation'
import { TerrainSurface } from './terrain/TerrainSurface'
import { WaterSurface } from './terrain/WaterSurface'
import { TerrainSides } from './terrain/TerrainSides'
import { WaterSides } from './terrain/WaterSides'

export const Terrain = () => {
  const { gl } = useThree()
  const terrainVersion = useStore((state) => state.terrainVersion)
  const sWater = useStore((state) => state.sWater)
  const gWater = useStore((state) => state.gWater)
  const tHeight = useStore((state) => state.tHeight)
  const rLevel = useStore((state) => state.rLevel)
  const activeTerrainId = useStore((state) => state.activeTerrainId)

  const placeBuilding = useStore((state) => state.placeBuilding)
  const paintTerrain = useStore((state) => state.paintTerrain)
  const mode = useStore((state) => state.mode)
  const selectedBuildingType = useStore((state) => state.selectedBuildingType)
  const hoveredCell = useStore((state) => state.hoveredCell)
  const isCtrlPressed = useStore((state) => state.isCtrlPressed)

  const [isPainting, setIsPainting] = useState(false)
  const [isErasing, setIsErasing] = useState(false)

  const setEditorInteracting = useStore((state) => state.setEditorInteracting)

  // Sync with global store for camera control management
  useEffect(() => {
    setEditorInteracting(isCtrlPressed && (isPainting || isErasing))
  }, [isPainting, isErasing, isCtrlPressed, setEditorInteracting])

  // Continuous painting in editor mode
  useFrame(() => {
    if (mode === 'EDITOR' && isCtrlPressed && (isPainting || isErasing) && hoveredCell) {
      paintTerrain(hoveredCell.x, hoveredCell.z, isErasing)
    }
  })

  // Disable context menu for right-click erasing
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (mode === 'EDITOR') e.preventDefault()
    }
    window.addEventListener('contextmenu', handleContextMenu)
    return () => window.removeEventListener('contextmenu', handleContextMenu)
  }, [mode])

  const terrainConfig = useMemo(() => getTerrainById(activeTerrainId), [activeTerrainId])

  const [gpuSim] = useState(() => new WaterComputeSystem(gl))
  const terrainManager = useMemo(() => new TerrainManager(), [])

  useEffect(() => {
    gpuSim.setInitialWater(sWater, gWater, tHeight)
  }, [gpuSim, sWater, gWater, tHeight]) // Only on mount or if water/terrain changes

  const layerColors = useMemo(() => {
    const types: LayerType[] = ['ROCK', 'GRAVEL', 'SAND', 'HUMUS', 'PAVEMENT', 'WATER']
    return types.map(t => new THREE.Color(MATERIAL_PROPERTIES[t].color))
  }, [])

  const layerHighlightColors = useMemo(() => {
    const types: LayerType[] = ['ROCK', 'GRAVEL', 'SAND', 'HUMUS', 'PAVEMENT', 'WATER']
    return types.map(t => new THREE.Color(MATERIAL_PROPERTIES[t].highlightColor))
  }, [])

  const layerPermeabilities = useMemo(() => {
    const types: LayerType[] = ['ROCK', 'GRAVEL', 'SAND', 'HUMUS', 'PAVEMENT', 'WATER']
    return new Float32Array(types.map(t => MATERIAL_PROPERTIES[t].permeability))
  }, [])

  const aCap = useStore((state) => state.aCap)
  const terrainVertices = useStore((state) => state.terrainVertices)

  // Update terrain texture when vertices change
  useEffect(() => {
    gpuSim.updateTerrain(terrainVertices, rLevel, aCap)
    gpuSim.updateMaterialProperties(layerPermeabilities)
    terrainManager.update(terrainVertices, rLevel, aCap)
  }, [gpuSim, terrainVersion, terrainVertices, rLevel, aCap, terrainManager, layerPermeabilities])

  const uniforms = useMemo(() => ({
    uTerrainLayers: { value: terrainManager.layerTex },
    uTerrainSurface: { value: terrainManager.surfaceTex },
    uLayerColors: { value: layerColors },
    uLayerHighlightColors: { value: layerHighlightColors },
    uHoveredCell: { value: new THREE.Vector2(-1, -1) },
    uBrushSize: { value: 1.0 },
    uBrushStrength: { value: 0.5 },
    uMode: { value: 0 }, // 0: PLAY, 1: EDITOR
    waterMap: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uTileSize: { value: TILE_SIZE }
  }), [terrainManager, layerColors, layerHighlightColors])

  const staticGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE, GRID_SIZE, GRID_SIZE)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])

  // Update geometry indices based on adaptive triangulation
  useEffect(() => {
    const indices = computeAdaptiveIndices(terrainVertices)
    staticGeometry.setIndex(new THREE.BufferAttribute(indices, 1))
  }, [terrainVersion, terrainVertices, staticGeometry])

  const onBeforeCompileTerrain = useCallback((shader: Shader) => {
    applyModulesToShader(shader, [terrainSurfaceVertexModule, terrainSurfaceFragmentModule], {
        uTerrainLayers: uniforms.uTerrainLayers,
        uTerrainSurface: uniforms.uTerrainSurface,
        uTileSize: uniforms.uTileSize,
        uHoveredCell: uniforms.uHoveredCell,
        uBrushSize: uniforms.uBrushSize,
        uBrushStrength: uniforms.uBrushStrength,
        uMode: uniforms.uMode,
        uLayerColors: uniforms.uLayerColors,
        uLayerHighlightColors: uniforms.uLayerHighlightColors,
        waterMap: uniforms.waterMap
    })
  }, [uniforms])

  const onBeforeCompilePicking = useCallback((shader: Shader) => {
    applyModulesToShader(shader, [terrainPickingVertexModule, terrainPickingFragmentModule], {
        uTerrainSurface: uniforms.uTerrainSurface
    })
  }, [uniforms.uTerrainSurface])

  const onBeforeCompileWaterPicking = useCallback((shader: Shader) => {
    applyModulesToShader(shader, [waterPickingVertexModule, waterPickingFragmentModule], {
        uTerrainSurface: uniforms.uTerrainSurface,
        waterMap: uniforms.waterMap,
        uTime: uniforms.uTime
    })
  }, [uniforms])

  const terrainDepthMaterial = useMemo(() => {
    const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
    mat.onBeforeCompile = (shader: Shader) => {
      applyModulesToShader(shader, [terrainDepthVertexModule], {
        uTerrainSurface: uniforms.uTerrainSurface
      })
    }
    return mat
  }, [uniforms.uTerrainSurface])

  const sideGeometry = useMemo(() => {
    const [minY, maxY] = terrainConfig.visualRange
    const height = maxY - minY
    const center = (minY + maxY) / 2
    const geo = new THREE.PlaneGeometry(GRID_SIZE * TILE_SIZE, height, GRID_SIZE, 1)
    geo.translate(0, center, 0)
    return geo
  }, [terrainConfig])

  const onBeforeCompileSide = useCallback((shader: Shader, edge: 'N' | 'S' | 'E' | 'W') => {
    applyModulesToShader(shader, [createTerrainSideVertexModule(edge), terrainSideFragmentModule], {
        uTerrainLayers: uniforms.uTerrainLayers,
        uTerrainSurface: uniforms.uTerrainSurface,
        uLayerColors: uniforms.uLayerColors,
        uVisualRange: { value: new THREE.Vector2(...terrainConfig.visualRange) }
    })
    // Add MAX_LAYERS define using applyModulesToShader
    applyModulesToShader(shader, [{ name: 'maxLayers', defines: { MAX_LAYERS: MAX_GPU_LAYERS } }])
  }, [uniforms, terrainConfig.visualRange])

  const onBeforeCompileWaterSide = useCallback((shader: Shader, edge: 'N' | 'S' | 'E' | 'W') => {
    applyModulesToShader(shader, [createWaterSideVertexModule(edge), waterSideFragmentModule], {
        uTerrainSurface: uniforms.uTerrainSurface,
        waterMap: uniforms.waterMap,
        uTime: uniforms.uTime
    })
  }, [uniforms])

  const onBeforeCompileWater = useCallback((shader: Shader) => {
    applyModulesToShader(shader, [waterSurfaceVertexModule, waterSurfaceFragmentModule], {
        uTerrainSurface: uniforms.uTerrainSurface,
        waterMap: uniforms.waterMap,
        uTime: uniforms.uTime,
        uHoveredCell: uniforms.uHoveredCell,
        uBrushSize: uniforms.uBrushSize,
        uBrushStrength: uniforms.uBrushStrength,
        uMode: uniforms.uMode,
        uLayerColors: uniforms.uLayerColors,
        uLayerHighlightColors: uniforms.uLayerHighlightColors
    })
  }, [uniforms])

  const offset = (GRID_SIZE * TILE_SIZE) / 2

  return (
    <group 
      onPointerDown={(e) => {
        if (mode === 'PLAY') {
          if (e.button === 0 && hoveredCell) {
              placeBuilding(hoveredCell.x, hoveredCell.z, selectedBuildingType)
          }
        } else if (mode === 'EDITOR') {
          if (e.button === 0) setIsPainting(true)
          if (e.button === 2) setIsErasing(true)
        }
      }}
      onPointerUp={(e) => {
        if (mode === 'EDITOR') {
          if (e.button === 0) setIsPainting(false)
          if (e.button === 2) setIsErasing(false)
        }
      }}
      onPointerLeave={() => {
        if (mode === 'EDITOR') {
          setIsPainting(false)
          setIsErasing(false)
        }
      }}
    >
      <WaterSimulation 
        gpuSim={gpuSim}
        terrainConfig={terrainConfig}
        uniforms={uniforms}
        surfaceTex={terrainManager.surfaceTex}
      />

      <TerrainSurface 
        geometry={staticGeometry}
        depthMaterial={terrainDepthMaterial}
        onBeforeCompile={onBeforeCompileTerrain}
        onBeforeCompilePicking={onBeforeCompilePicking}
      />

      <WaterSurface 
        geometry={staticGeometry}
        onBeforeCompile={onBeforeCompileWater}
        onBeforeCompilePicking={onBeforeCompileWaterPicking}
      />

      <TerrainSides 
        geometry={sideGeometry}
        onBeforeCompile={onBeforeCompileSide}
        offset={offset}
      />

      <WaterSides 
        geometry={sideGeometry}
        onBeforeCompile={onBeforeCompileWaterSide}
        offset={offset}
      />
    </group>
  )
}

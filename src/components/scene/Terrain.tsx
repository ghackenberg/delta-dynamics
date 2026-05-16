/* eslint-disable react-hooks/immutability */
import { useMemo, useState, useEffect, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'
import { GRID_SIZE, TILE_SIZE, MATERIAL_PROPERTIES, MAX_GPU_LAYERS, LAYER_ID_MAP, TERRAIN_BASE_Y } from '../../constants/gameConfig'
import { WaterComputeSystem } from '../../systems/waterSystem'
import { getTerrainById } from '../../terrains'
import type { LayerType } from '../../types/game'

import { terrainSurfaceVertexChunks } from '../../shaders/terrain/surface.vert'
import { terrainSurfaceFragmentChunks } from '../../shaders/terrain/surface.frag'
import { pickingVertexChunks as terrainPickingVertexChunks } from '../../shaders/terrain/picking.vert'
import { pickingFragmentShader as terrainPickingFragmentShader } from '../../shaders/terrain/picking.frag'
import { waterPickingVertexChunks } from '../../shaders/water/picking.vert'
import { waterPickingFragmentChunks } from '../../shaders/water/picking.frag'
import { waterSurfaceVertexChunks } from '../../shaders/water/surface.vert'
import { waterSurfaceFragmentChunks } from '../../shaders/water/surface.frag'
import { terrainDepthVertexChunks } from '../../shaders/terrain/depth.vert'
import { terrainSideVertexChunks } from '../../shaders/terrain/side.vert'
import { terrainSideFragmentChunks } from '../../shaders/terrain/side.frag'
import { waterSideVertexChunks } from '../../shaders/water/side.vert'
import { waterSideFragmentChunks } from '../../shaders/water/side.frag'

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

  useEffect(() => {
    gpuSim.setInitialWater(sWater, gWater, tHeight)
  }, [gpuSim, sWater, gWater, tHeight]) // Only on mount or if water/terrain changes

  // Initialize stable objects once
  const layerTex = useMemo(() => {
    const data = new Float32Array((GRID_SIZE + 1) * (GRID_SIZE + 1) * MAX_GPU_LAYERS * 4)
    const tex = new THREE.DataArrayTexture(data, GRID_SIZE + 1, GRID_SIZE + 1, MAX_GPU_LAYERS)
    tex.format = THREE.RGBAFormat
    tex.type = THREE.FloatType
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    return tex
  }, [])

  const surfaceTex = useMemo(() => {
    const data = new Float32Array((GRID_SIZE + 1) * (GRID_SIZE + 1) * 4)
    const tex = new THREE.DataTexture(data, GRID_SIZE + 1, GRID_SIZE + 1, THREE.RGBAFormat, THREE.FloatType)
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    return tex
  }, [])

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

    // Also update rendering textures
    const lData = layerTex.image.data as Float32Array
    const sData = surfaceTex.image.data as Float32Array
    const size = GRID_SIZE + 1
    
    for (let j = 0; j <= GRID_SIZE; j++) {
      const texJ = GRID_SIZE - j
      const rowOff = texJ * size
      for (let i = 0; i <= GRID_SIZE; i++) {
        const texIdx = (rowOff + i) * 4
        const layers = terrainVertices[i][j]
        
        let totalHeight = 0
        for (let k = 0; k < MAX_GPU_LAYERS; k++) {
          const layerIdx = (k * size * size + rowOff + i) * 4
          if (k < layers.length) {
            const l = layers[k]
            lData[layerIdx] = LAYER_ID_MAP[l.type]
            lData[layerIdx + 1] = l.thickness
            totalHeight += l.thickness
          } else {
            lData[layerIdx] = -1.0
            lData[layerIdx + 1] = 0.0
          }
        }
        
        const topLayer = layers[layers.length - 1]
        const topTypeIdx = LAYER_ID_MAP[topLayer.type]
        
        const gridI = Math.min(i, GRID_SIZE - 1)
        const gridJ = Math.min(j, GRID_SIZE - 1)
        const gridIdx = gridJ * GRID_SIZE + gridI
        const height = totalHeight + TERRAIN_BASE_Y
        
        sData[texIdx] = height
        sData[texIdx + 1] = rLevel[gridIdx] || -99
        sData[texIdx + 2] = topTypeIdx
        sData[texIdx + 3] = aCap[gridIdx]
      }
    }
    layerTex.needsUpdate = true
    surfaceTex.needsUpdate = true
  }, [gpuSim, terrainVersion, terrainVertices, rLevel, aCap, layerTex, surfaceTex, layerPermeabilities])

  const uniforms = useMemo(() => ({
    uTerrainLayers: { value: layerTex },
    uTerrainSurface: { value: surfaceTex },
    uLayerColors: { value: layerColors },
    uLayerHighlightColors: { value: layerHighlightColors },
    uHoveredCell: { value: new THREE.Vector2(-1, -1) },
    waterMap: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uTileSize: { value: TILE_SIZE }
  }), [layerTex, surfaceTex, layerColors, layerHighlightColors])

  const staticGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE, GRID_SIZE, GRID_SIZE)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])

  const waterGeometry = useMemo(() => {
    return staticGeometry.clone().toNonIndexed()
  }, [staticGeometry])

  const onBeforeCompileTerrain = useCallback((shader: THREE.ShaderLibShader) => {
    shader.uniforms.uTerrainLayers = uniforms.uTerrainLayers
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
    shader.uniforms.uTileSize = uniforms.uTileSize
    shader.uniforms.uHoveredCell = uniforms.uHoveredCell
    shader.uniforms.uLayerColors = uniforms.uLayerColors
    shader.uniforms.uLayerHighlightColors = uniforms.uLayerHighlightColors

    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${terrainSurfaceVertexChunks.common}`)
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${terrainSurfaceVertexChunks.begin}`)
    
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${terrainSurfaceFragmentChunks.common}`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${terrainSurfaceFragmentChunks.color}`)
  }, [uniforms])

  const onBeforeCompilePicking = useCallback((shader: THREE.ShaderLibShader) => {
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${terrainPickingVertexChunks.common}`)
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${terrainPickingVertexChunks.begin}`)
    shader.fragmentShader = terrainPickingFragmentShader
  }, [uniforms.uTerrainSurface])

  const onBeforeCompileWaterPicking = useCallback((shader: THREE.ShaderLibShader) => {
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
    shader.uniforms.waterMap = uniforms.waterMap
    shader.uniforms.uTime = uniforms.uTime
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${waterPickingVertexChunks.common}`)
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${waterPickingVertexChunks.begin}`)
    
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${waterPickingFragmentChunks.common}`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${waterPickingFragmentChunks.color}`)
  }, [uniforms])

  const terrainDepthMaterial = useMemo(() => {
    const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${terrainDepthVertexChunks.common}`)
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${terrainDepthVertexChunks.begin}`)
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

  const onBeforeCompileSide = useCallback((shader: THREE.ShaderLibShader, edge: 'N' | 'S' | 'E' | 'W') => {
    shader.uniforms.uTerrainLayers = uniforms.uTerrainLayers
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
    shader.uniforms.uLayerColors = uniforms.uLayerColors
    shader.uniforms.uVisualRange = { value: new THREE.Vector2(...terrainConfig.visualRange) }
    
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nuniform vec2 uVisualRange;\n${terrainSideVertexChunks.common}`)
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${terrainSideVertexChunks.begin(edge)}`)
    
    shader.fragmentShader = `#define MAX_LAYERS ${MAX_GPU_LAYERS}\n` + shader.fragmentShader.replace('#include <common>', `#include <common>\n${terrainSideFragmentChunks.common}`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${terrainSideFragmentChunks.color}`)
  }, [uniforms, terrainConfig.visualRange])

  const onBeforeCompileWaterSide = useCallback((shader: THREE.ShaderLibShader, edge: 'N' | 'S' | 'E' | 'W') => {
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
    shader.uniforms.waterMap = uniforms.waterMap
    shader.uniforms.uTime = uniforms.uTime
    
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${waterSideVertexChunks.common}`)
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${waterSideVertexChunks.begin(edge)}`)
    
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${waterSideFragmentChunks.common}`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${waterSideFragmentChunks.color}`)
  }, [uniforms])

  const onBeforeCompileWater = useCallback((shader: THREE.ShaderLibShader) => {
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
    shader.uniforms.waterMap = uniforms.waterMap
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uHoveredCell = uniforms.uHoveredCell
    shader.uniforms.uLayerHighlightColors = uniforms.uLayerHighlightColors
    
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${waterSurfaceVertexChunks.common}`)
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${waterSurfaceVertexChunks.begin}`)
    
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${waterSurfaceFragmentChunks.common}`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${waterSurfaceFragmentChunks.color}`)
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
        surfaceTex={surfaceTex}
      />

      <TerrainSurface 
        geometry={staticGeometry}
        depthMaterial={terrainDepthMaterial}
        onBeforeCompile={onBeforeCompileTerrain}
        onBeforeCompilePicking={onBeforeCompilePicking}
      />

      <WaterSurface 
        geometry={waterGeometry}
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

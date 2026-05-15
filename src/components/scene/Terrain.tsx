/* eslint-disable react-hooks/immutability */
import { useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'
import { GRID_SIZE, TILE_SIZE, SEA_LEVEL, MATERIAL_PROPERTIES, MAX_GPU_LAYERS, LAYER_ID_MAP } from '../../constants/gameConfig'
import { WaterComputeSystem } from '../../systems/waterComputeSystem'
import type { LayerType } from '../../types/game'
import { TerrainManager } from '../../managers/TerrainManager'
import { PICKING_LAYER } from './PickingSystem'
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

export const Terrain = () => {
  const { gl } = useThree()
  const terrainVersion = useStore((state) => state.terrainVersion)
  const sWater = useStore((state) => state.sWater)
  const gWater = useStore((state) => state.gWater)
  const tHeight = useStore((state) => state.tHeight)
  const rLevel = useStore((state) => state.rLevel)
  const rainIntensity = useStore((state) => state.rainIntensity)
  const day = useStore((state) => state.day)
  const gameTime = useStore((state) => state.gameTime)
  
  const placeBuilding = useStore((state) => state.placeBuilding)
  const selectedBuildingType = useStore((state) => state.selectedBuildingType)
  const hoveredCell = useStore((state) => state.hoveredCell)

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

  // Update terrain texture when vertices change
  useEffect(() => {
    const terrainVertices = TerrainManager.getInstance().getVertices()
    gpuSim.updateTerrain(terrainVertices, rLevel, aCap)
    gpuSim.updateMaterialProperties(layerPermeabilities)

    // Also update rendering textures
    const lData = layerTex.image.data as Float32Array
    const sData = surfaceTex.image.data as Float32Array
    const size = GRID_SIZE + 1
    
    for (let j = 0; j <= GRID_SIZE; j++) {
      // Invert j for texture row to match Three.js v-coord (v=0 is bottom/South)
      // Logic j=0 is North, should be v=1 (top row)
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
        const height = totalHeight - 5.0 // Use actual vertex height (TERRAIN_BASE_Y = -5)
        
        sData[texIdx] = height
        sData[texIdx + 1] = rLevel[gridIdx] || -99
        sData[texIdx + 2] = topTypeIdx
        sData[texIdx + 3] = aCap[gridIdx] // Keep consistent with GPU surface.a
      }
    }
    layerTex.needsUpdate = true
    surfaceTex.needsUpdate = true
  }, [gpuSim, terrainVersion, rLevel, aCap, tHeight, layerTex, surfaceTex, layerPermeabilities])

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

  const onBeforeCompileTerrain = (shader: THREE.ShaderLibShader) => {
    shader.uniforms.uTerrainLayers = uniforms.uTerrainLayers
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
    shader.uniforms.uTileSize = uniforms.uTileSize

    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${terrainSurfaceVertexChunks.common}`)
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${terrainSurfaceVertexChunks.begin}`)
    
    shader.uniforms.uHoveredCell = uniforms.uHoveredCell
    shader.uniforms.uLayerColors = uniforms.uLayerColors
    shader.uniforms.uLayerHighlightColors = uniforms.uLayerHighlightColors
    
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${terrainSurfaceFragmentChunks.common}`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${terrainSurfaceFragmentChunks.color}`)
  }

  const onBeforeCompilePicking = (shader: THREE.ShaderLibShader) => {
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${terrainPickingVertexChunks.common}`)
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${terrainPickingVertexChunks.begin}`)
    shader.fragmentShader = terrainPickingFragmentShader
  }

  const onBeforeCompileWaterPicking = (shader: THREE.ShaderLibShader) => {
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
    shader.uniforms.waterMap = uniforms.waterMap
    shader.uniforms.uTime = uniforms.uTime
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${waterPickingVertexChunks.common}`)
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${waterPickingVertexChunks.begin}`)
    
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${waterPickingFragmentChunks.common}`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${waterPickingFragmentChunks.color}`)
  }

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
    const geo = new THREE.PlaneGeometry(GRID_SIZE * TILE_SIZE, 1, GRID_SIZE, 1)
    geo.translate(0, 0.5, 0) // Shift so bottom is at 0
    return geo
  }, [])

  const onBeforeCompileSide = (shader: THREE.ShaderLibShader, edge: 'N' | 'S' | 'E' | 'W') => {
    shader.uniforms.uTerrainLayers = uniforms.uTerrainLayers
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
    shader.uniforms.uLayerColors = uniforms.uLayerColors
    
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${terrainSideVertexChunks.common}`)
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${terrainSideVertexChunks.begin(edge)}`)
    
    shader.fragmentShader = `#define MAX_LAYERS ${MAX_GPU_LAYERS}\n` + shader.fragmentShader.replace('#include <common>', `#include <common>\n${terrainSideFragmentChunks.common}`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${terrainSideFragmentChunks.color}`)
  }

  const onBeforeCompileWaterSide = (shader: THREE.ShaderLibShader, edge: 'N' | 'S' | 'E' | 'W') => {
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
    shader.uniforms.waterMap = uniforms.waterMap
    shader.uniforms.uTime = uniforms.uTime
    
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${waterSideVertexChunks.common}`)
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${waterSideVertexChunks.begin(edge)}`)
    
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${waterSideFragmentChunks.common}`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${waterSideFragmentChunks.color}`)
  }

  const onBeforeCompileWater = (shader: THREE.ShaderLibShader) => {
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
    shader.uniforms.waterMap = uniforms.waterMap
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uHoveredCell = uniforms.uHoveredCell
    shader.uniforms.uLayerHighlightColors = uniforms.uLayerHighlightColors
    
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${waterSurfaceVertexChunks.common}`)
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${waterSurfaceVertexChunks.begin}`)
    
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${waterSurfaceFragmentChunks.common}`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${waterSurfaceFragmentChunks.color}`)
  }


  useFrame((state) => {
    // 1. Run GPU Simulation
    const currentSeaLevel = SEA_LEVEL + Math.sin(day * 0.5 + gameTime * 0.02) * 0.2
    for (let i = 0; i < 5; i++) { // 5 sub-steps
      gpuSim.step(rainIntensity, currentSeaLevel, state.clock.getElapsedTime())
    }

    // 2. Read back to CPU for entity logic
    gpuSim.readBack(sWater, gWater, tHeight)

    // 3. Update Uniforms
    uniforms.waterMap.value = gpuSim.getWaterTexture()
    uniforms.uTime.value = state.clock.getElapsedTime()
    
    if (hoveredCell) {
        uniforms.uHoveredCell.value.set(hoveredCell.x, hoveredCell.z)
    } else {
        uniforms.uHoveredCell.value.set(-1, -1)
    }

    useStore.setState({ heightTexture: surfaceTex, waterTexture: gpuSim.getWaterTexture() as THREE.DataTexture })
  })

  const offset = (GRID_SIZE * TILE_SIZE) / 2

  return (
    <group 
      onPointerDown={(e) => {
        if (e.button === 0 && hoveredCell) {
            placeBuilding(hoveredCell.x, hoveredCell.z, selectedBuildingType)
        }
      }}
    >
      <mesh 
        receiveShadow 
        castShadow 
        frustumCulled={false} 
        position={[0, 0, 0]} 
        geometry={staticGeometry}
        customDepthMaterial={terrainDepthMaterial}
      >
        <meshStandardMaterial flatShading onBeforeCompile={onBeforeCompileTerrain} />
      </mesh>
      
      {/* Picking Mesh */}
      <mesh 
        layers-mask={1 << PICKING_LAYER}
        frustumCulled={false} 
        position={[0, 0, 0]} 
        geometry={staticGeometry}
      >
        <meshBasicMaterial onBeforeCompile={onBeforeCompilePicking} />
      </mesh>

      {/* Water Picking Mesh */}
      <mesh 
        layers-mask={1 << PICKING_LAYER}
        frustumCulled={false} 
        position={[0, 0, 0]} 
        geometry={waterGeometry}
      >
        <meshBasicMaterial 
          onBeforeCompile={onBeforeCompileWaterPicking} 
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      <mesh 
        receiveShadow 
        frustumCulled={false} 
        position={[0, 0, 0]} 
        geometry={waterGeometry}
      >
        <meshStandardMaterial 
          flatShading 
          onBeforeCompile={onBeforeCompileWater} 
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* Terrain Sides */}
      <mesh position={[0, 0, -offset]} rotation={[0, Math.PI, 0]} geometry={sideGeometry} frustumCulled={false}>
        <meshStandardMaterial side={THREE.DoubleSide} onBeforeCompile={(s) => onBeforeCompileSide(s, 'N')} />
      </mesh>
      <mesh position={[0, 0, offset]} rotation={[0, 0, 0]} geometry={sideGeometry} frustumCulled={false}>
        <meshStandardMaterial side={THREE.DoubleSide} onBeforeCompile={(s) => onBeforeCompileSide(s, 'S')} />
      </mesh>
      <mesh position={[-offset, 0, 0]} rotation={[0, -Math.PI/2, 0]} geometry={sideGeometry} frustumCulled={false}>
        <meshStandardMaterial side={THREE.DoubleSide} onBeforeCompile={(s) => onBeforeCompileSide(s, 'W')} />
      </mesh>
      <mesh position={[offset, 0, 0]} rotation={[0, Math.PI/2, 0]} geometry={sideGeometry} frustumCulled={false}>
        <meshStandardMaterial side={THREE.DoubleSide} onBeforeCompile={(s) => onBeforeCompileSide(s, 'E')} />
      </mesh>

      {/* Water Sides */}
      <mesh position={[0, 0, -offset]} rotation={[0, Math.PI, 0]} geometry={sideGeometry} frustumCulled={false}>
        <meshStandardMaterial transparent side={THREE.DoubleSide} onBeforeCompile={(s) => onBeforeCompileWaterSide(s, 'N')} />
      </mesh>
      <mesh position={[0, 0, offset]} rotation={[0, 0, 0]} geometry={sideGeometry} frustumCulled={false}>
        <meshStandardMaterial transparent side={THREE.DoubleSide} onBeforeCompile={(s) => onBeforeCompileWaterSide(s, 'S')} />
      </mesh>
      <mesh position={[-offset, 0, 0]} rotation={[0, -Math.PI/2, 0]} geometry={sideGeometry} frustumCulled={false}>
        <meshStandardMaterial transparent side={THREE.DoubleSide} onBeforeCompile={(s) => onBeforeCompileWaterSide(s, 'W')} />
      </mesh>
      <mesh position={[offset, 0, 0]} rotation={[0, Math.PI/2, 0]} geometry={sideGeometry} frustumCulled={false}>
        <meshStandardMaterial transparent side={THREE.DoubleSide} onBeforeCompile={(s) => onBeforeCompileWaterSide(s, 'E')} />
      </mesh>
    </group>
  )
}

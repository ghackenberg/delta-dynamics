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

const BILINEAR_GLSL = `
  vec4 bilinear(sampler2D tex, vec2 uv, vec2 res) {
      vec2 st = uv * res - 0.5;
      vec2 i = floor(st);
      vec2 f = fract(st);

      vec4 p00 = texture2D(tex, (i + vec2(0.0, 0.0) + 0.5) / res);
      vec4 p10 = texture2D(tex, (i + vec2(1.0, 0.0) + 0.5) / res);
      vec4 p01 = texture2D(tex, (i + vec2(0.0, 1.0) + 0.5) / res);
      vec4 p11 = texture2D(tex, (i + vec2(1.0, 1.0) + 0.5) / res);

      return mix(mix(p00, p10, f.x), mix(p01, p11, f.x), f.y);
  }
`;

const BILINEAR_ARRAY_GLSL = `
  vec4 bilinearArray(sampler2DArray tex, vec2 uv, float layer, vec2 res) {
      vec2 st = uv * res - 0.5;
      vec2 i = floor(st);
      vec2 f = fract(st);

      vec4 p00 = texture(tex, vec3((i + vec2(0.0, 0.0) + 0.5) / res, layer));
      vec4 p10 = texture(tex, vec3((i + vec2(1.0, 0.0) + 0.5) / res, layer));
      vec4 p01 = texture(tex, vec3((i + vec2(0.0, 1.0) + 0.5) / res, layer));
      vec4 p11 = texture(tex, vec3((i + vec2(1.0, 1.0) + 0.5) / res, layer));

      return mix(mix(p00, p10, f.x), mix(p01, p11, f.x), f.y);
  }
`;

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
    shader.uniforms.uLayerColors = uniforms.uLayerColors
    shader.uniforms.uLayerHighlightColors = uniforms.uLayerHighlightColors
    shader.uniforms.uHoveredCell = uniforms.uHoveredCell
    shader.uniforms.uTileSize = uniforms.uTileSize
    
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      uniform sampler2D uTerrainLayers;
      uniform sampler2D uTerrainSurface;
      uniform float uTileSize;
      varying float vType;
      varying vec2 vGridUv;
      ${BILINEAR_GLSL}`
    ).replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vGridUv = uv;
      vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
      vec4 surfaceData = bilinear(uTerrainSurface, sUv, vec2(101.0));
      transformed.y = surfaceData.r;
      vType = surfaceData.b;`
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform sampler2D uTerrainSurface;
      uniform vec2 uHoveredCell;
      uniform vec3 uLayerColors[6];
      uniform vec3 uLayerHighlightColors[6];
      varying float vType;
      varying vec2 vGridUv;`
    ).replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      // Discrete Cell-based Material Sampling
      vec2 gridRes = vec2(100.0);
      vec2 texRes = vec2(101.0);
      vec2 cellCoord = clamp(floor(vGridUv * gridRes), 0.0, 99.0);
      float cellType = texture2D(uTerrainSurface, (cellCoord + 0.5) / texRes).b;
      
      int typeIdx = int(cellType + 0.5);
      vec3 terrainColor = uLayerColors[typeIdx];
      
      // Hover Highlight (Inverted Y to match picking)
      vec2 gridCell = floor(vGridUv * gridRes);
      if (gridCell.x == uHoveredCell.x && (gridRes.y - 1.0 - gridCell.y) == uHoveredCell.y) {
          terrainColor = mix(terrainColor, uLayerHighlightColors[typeIdx], 0.6);
      }

      // Grid and Boundary lines
      vec2 grid = fract(vGridUv * 100.0);
      float edgeDist = 0.05;
      bool isGridLineX = grid.x < edgeDist || grid.x > 1.0 - edgeDist;
      bool isGridLineY = grid.y < edgeDist || grid.y > 1.0 - edgeDist;
      
      if (isGridLineX || isGridLineY) {
          float boundary = 0.0;
          if (isGridLineX) {
              float neighborType = texture2D(uTerrainSurface, (cellCoord + vec2(grid.x < 0.5 ? -0.5 : 1.5, 0.5)) / texRes).b;
              if (abs(neighborType - cellType) > 0.1) boundary = 1.0;
          }
          if (isGridLineY) {
              float neighborType = texture2D(uTerrainSurface, (cellCoord + vec2(0.5, grid.y < 0.5 ? -0.5 : 1.5)) / texRes).b;
              if (abs(neighborType - cellType) > 0.1) boundary = 1.0;
          }
          
          if (boundary > 0.5) {
              terrainColor = mix(terrainColor, vec3(1.0, 0.9, 0.5), 0.6);
          } else {
              terrainColor *= 0.8;
          }
      }
      
      diffuseColor.rgb = terrainColor;`
    )
  }

  const onBeforeCompilePicking = (shader: THREE.ShaderLibShader) => {
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
    shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uTerrainSurface;
        varying vec2 vGridUv;
        ${BILINEAR_GLSL}`
      ).replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vGridUv = uv;
        vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
        transformed.y = bilinear(uTerrainSurface, sUv, vec2(101.0)).r;`
      )
    shader.fragmentShader = `
      varying vec2 vGridUv;
      void main() {
        float x = (clamp(floor(vGridUv.x * 100.0), 0.0, 99.0) + 1.0) / 255.0;
        // Invert Y UV to match grid Z if mirrored
        float z = (clamp(floor((1.0 - vGridUv.y) * 100.0), 0.0, 99.0) + 1.0) / 255.0;
        gl_FragColor = vec4(x, z, 0.0, 1.0);
      }
    `
  }

  const onBeforeCompileWaterPicking = (shader: THREE.ShaderLibShader) => {
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
    shader.uniforms.waterMap = uniforms.waterMap
    shader.uniforms.uTime = uniforms.uTime
    
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      uniform sampler2D uTerrainSurface;
      uniform sampler2D waterMap;
      uniform float uTime;
      varying float vDepth;
      varying vec2 vGridUv;
      ${BILINEAR_GLSL}`
    ).replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vGridUv = uv;
      vec2 gridRes = vec2(100.0);
      vec2 texRes = vec2(101.0);
      
      vec2 sUv = (uv * 100.0 + 0.5) / texRes;
      float h = bilinear(uTerrainSurface, sUv, texRes).r;
      
      vec2 st = uv * gridRes - 0.5;
      vec2 i = floor(st);
      vec2 f = fract(st);

      vec4 p00 = texture2D(waterMap, (i + vec2(0.0, 0.0) + 0.5) / gridRes);
      vec4 p10 = texture2D(waterMap, (i + vec2(1.0, 0.0) + 0.5) / gridRes);
      vec4 p01 = texture2D(waterMap, (i + vec2(0.0, 1.0) + 0.5) / gridRes);
      vec4 p11 = texture2D(waterMap, (i + vec2(1.0, 1.0) + 0.5) / gridRes);
      
      float maxWetL = -10.0;
      bool anyWet = false;
      if (p00.b > 0.001) { maxWetL = max(maxWetL, p00.r); anyWet = true; }
      if (p10.b > 0.001) { maxWetL = max(maxWetL, p10.r); anyWet = true; }
      if (p01.b > 0.001) { maxWetL = max(maxWetL, p01.r); anyWet = true; }
      if (p11.b > 0.001) { maxWetL = max(maxWetL, p11.r); anyWet = true; }
      
      if (!anyWet) {
          transformed.y = h - 0.05;
      } else {
          float w00 = (p00.b > 0.001 || p00.r < maxWetL) ? 1.0 : 0.0;
          float w10 = (p10.b > 0.001 || p10.r < maxWetL) ? 1.0 : 0.0;
          float w01 = (p01.b > 0.001 || p01.r < maxWetL) ? 1.0 : 0.0;
          float w11 = (p11.b > 0.001 || p11.r < maxWetL) ? 1.0 : 0.0;
          
          float fw00 = (1.0 - f.x) * (1.0 - f.y) * w00;
          float fw10 = f.x * (1.0 - f.y) * w10;
          float fw01 = (1.0 - f.x) * f.y * w01;
          float fw11 = f.x * f.y * w11;
          
          float totalW = fw00 + fw10 + fw01 + fw11;
          float finalSL = (totalW > 0.0) ? (p00.r * fw00 + p10.r * fw10 + p01.r * fw01 + p11.r * fw11) / totalW : h;
          
          transformed.y = finalSL;
      }
      
      vDepth = transformed.y - h;
      
      float sw_interp = bilinear(waterMap, uv, gridRes).b;
      if (sw_interp > 0.05) {
        transformed.y += sin(uTime * 2.0 + (position.x + position.z) * 5.0) * 0.005;
      }`
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform sampler2D waterMap;
      varying float vDepth;
      varying vec2 vGridUv;`
    ).replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      // Hide if dry and no wet neighbors
      vec2 gridRes = vec2(100.0);
      if (texture2D(waterMap, vGridUv).b < 0.001) {
          bool hasWetNeighbor = false;
          vec2 texel = 1.0 / gridRes;
          for (int y = -1; y <= 1; y++) {
              for (int x = -1; x <= 1; x++) {
                  if (x == 0 && y == 0) continue;
                  vec2 nUv = vGridUv + vec2(float(x), float(y)) * texel;
                  if (nUv.x >= 0.0 && nUv.x <= 1.0 && nUv.y >= 0.0 && nUv.y <= 1.0) {
                      if (texture2D(waterMap, nUv).b > 0.001) {
                          hasWetNeighbor = true;
                          break;
                      }
                  }
              }
              if (hasWetNeighbor) break;
          }
          if (!hasWetNeighbor) discard;
      }

      // Continuous Depth Check (intersection with smooth terrain)
      float x = (clamp(floor(vGridUv.x * 100.0), 0.0, 99.0) + 1.0) / 255.0;
      float z = (clamp(floor((1.0 - vGridUv.y) * 100.0), 0.0, 99.0) + 1.0) / 255.0;
      diffuseColor.rgb = vec3(x, z, 0.0);
      diffuseColor.a = 1.0;`
    )
  }

  const terrainDepthMaterial = useMemo(() => {
    const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uTerrainSurface;
        ${BILINEAR_GLSL}`
      ).replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
        transformed.y = bilinear(uTerrainSurface, sUv, vec2(101.0)).r;`
      )
    }
    return mat
  }, [uniforms.uTerrainSurface])

  const sideGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(GRID_SIZE * TILE_SIZE, 1, GRID_SIZE, 1)
    geo.translate(0, 0.5, 0) // Shift so bottom is at 0
    return geo
  }, [])

  const onBeforeCompileSide = (shader: THREE.ShaderLibShader, edge: 'N' | 'S' | 'E' | 'W', isWater: boolean = false) => {
    shader.uniforms.uTerrainLayers = uniforms.uTerrainLayers
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
    shader.uniforms.uLayerColors = uniforms.uLayerColors
    shader.uniforms.waterMap = uniforms.waterMap
    shader.uniforms.uTime = uniforms.uTime
    
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      uniform highp sampler2DArray uTerrainLayers;
      uniform sampler2D uTerrainSurface;
      uniform sampler2D waterMap;
      uniform float uTime;
      varying float vWorldY;
      varying float vSurfaceY;
      varying float vWaterY;
      varying vec2 vGridUv;
      ${BILINEAR_GLSL}`
    ).replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float edgeX = uv.x;
      ${edge === 'N' ? 'vGridUv = vec2(1.0 - edgeX, 1.0);' : ''}
      ${edge === 'S' ? 'vGridUv = vec2(edgeX, 0.0);' : ''}
      ${edge === 'W' ? 'vGridUv = vec2(0.0, 1.0 - edgeX);' : ''}
      ${edge === 'E' ? 'vGridUv = vec2(1.0, edgeX);' : ''}

      vec2 gridRes = vec2(100.0);
      vec2 texRes = vec2(101.0);
      vec2 sUv = (vGridUv * 100.0 + 0.5) / texRes;
      float h = bilinear(uTerrainSurface, sUv, texRes).r;
      
      // Water-Aware Interpolation for Sides
      vec2 st = vGridUv * gridRes - 0.5;
      vec2 i = floor(st);
      vec2 f = fract(st);
      vec4 p00 = texture2D(waterMap, (i + vec2(0.0, 0.0) + 0.5) / gridRes);
      vec4 p10 = texture2D(waterMap, (i + vec2(1.0, 0.0) + 0.5) / gridRes);
      vec4 p01 = texture2D(waterMap, (i + vec2(0.0, 1.0) + 0.5) / gridRes);
      vec4 p11 = texture2D(waterMap, (i + vec2(1.0, 1.0) + 0.5) / gridRes);
      
      float maxWetL = -10.0;
      bool anyWet = false;
      if (p00.b > 0.001) { maxWetL = max(maxWetL, p00.r); anyWet = true; }
      if (p10.b > 0.001) { maxWetL = max(maxWetL, p10.r); anyWet = true; }
      if (p01.b > 0.001) { maxWetL = max(maxWetL, p01.r); anyWet = true; }
      if (p11.b > 0.001) { maxWetL = max(maxWetL, p11.r); anyWet = true; }
      
      float wH = h;
      if (anyWet) {
          float w00 = (p00.b > 0.001 || p00.r < maxWetL) ? 1.0 : 0.0;
          float w10 = (p10.b > 0.001 || p10.r < maxWetL) ? 1.0 : 0.0;
          float w01 = (p01.b > 0.001 || p01.r < maxWetL) ? 1.0 : 0.0;
          float w11 = (p11.b > 0.001 || p11.r < maxWetL) ? 1.0 : 0.0;
          float fw00 = (1.0 - f.x) * (1.0 - f.y) * w00;
          float fw10 = f.x * (1.0 - f.y) * w10;
          float fw01 = (1.0 - f.x) * f.y * w01;
          float fw11 = f.x * f.y * w11;
          float tw = fw00 + fw10 + fw01 + fw11;
          if (tw > 0.0) wH = (p00.r * fw00 + p10.r * fw10 + p01.r * fw01 + p11.r * fw11) / tw;
      } else {
          wH = h - 0.05;
      }

      vSurfaceY = h;
      vWaterY = wH;

      if (uv.y > 0.5) {
        transformed.y = ${isWater ? 'vWaterY' : 'vSurfaceY'};
      } else {
        transformed.y = ${isWater ? 'vSurfaceY' : '-5.0'};
      }
      
      vWorldY = transformed.y;`
    )

    shader.fragmentShader = `#define MAX_LAYERS ${MAX_GPU_LAYERS}\n` + shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      precision highp sampler2DArray;
      uniform sampler2DArray uTerrainLayers;
      uniform sampler2D uTerrainSurface;
      uniform sampler2D waterMap;
      uniform vec3 uLayerColors[6];
      varying float vWorldY;
      varying float vSurfaceY;
      varying float vWaterY;
      varying vec2 vGridUv;
      ${BILINEAR_ARRAY_GLSL}`
    ).replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      ${isWater ? `
        // Hide if dry and no wet neighbors
        vec2 gridRes = vec2(100.0);
        vec4 waterData = texture2D(waterMap, vGridUv);
        if (waterData.b < 0.001) {
            bool hasWetNeighbor = false;
            vec2 texel = 1.0 / gridRes;
            for (int y = -1; y <= 1; y++) {
                for (int x = -1; x <= 1; x++) {
                    if (x == 0 && y == 0) continue;
                    vec2 nUv = vGridUv + vec2(float(x), float(y)) * texel;
                    if (nUv.x >= 0.0 && nUv.x <= 1.0 && nUv.y >= 0.0 && nUv.y <= 1.0) {
                        if (texture2D(waterMap, nUv).b > 0.001) {
                            hasWetNeighbor = true;
                            break;
                        }
                    }
                }
                if (hasWetNeighbor) break;
            }
            if (!hasWetNeighbor) discard;
        }

        // Deep/Shallow Color
        float depth = vWaterY - vSurfaceY;
        vec3 shallowColor = vec3(0.2, 0.5, 0.8);
        vec3 deepColor = vec3(0.02, 0.1, 0.3);
        diffuseColor.rgb = mix(shallowColor, deepColor, smoothstep(0.0, 0.5, depth)) * 0.7;
      ` : `
        vec2 gridRes = vec2(100.0);
        vec2 texRes = vec2(101.0);
        
        // Use a slight inset to avoid floating point precision issues exactly on the edge
        vec2 safeGridUv = clamp(vGridUv, 0.001, 0.999);
        vec2 cellCoord = floor(safeGridUv * gridRes);
        vec2 discreteSUv = (cellCoord + 0.5) / texRes;
        
        vec2 sUv = (vGridUv * 100.0 + 0.5) / 101.0;
        
        float currentH = -5.0;
        vec3 terrainColor = uLayerColors[0];

        for (int i = 0; i < MAX_LAYERS; i++) {
            // Interpolate thickness for smooth height transitions
            vec4 layerData = bilinearArray(uTerrainLayers, sUv, float(i), vec2(101.0));
            if (layerData.r < -0.5) break;
            
            // Read discrete type for color
            vec4 discreteLayerData = texture(uTerrainLayers, vec3(discreteSUv, float(i)));
            
            float nextH = currentH + layerData.g;
            if (vWorldY <= nextH + 0.001) {
                float typeIdx = discreteLayerData.r;
                if (typeIdx < -0.5) {
                    // Fall back to discrete cell's top layer if it lacks this interpolated layer
                    typeIdx = texture(uTerrainSurface, discreteSUv).b;
                }
                terrainColor = uLayerColors[int(typeIdx + 0.5)];
                break;
            }
            currentH = nextH;
        }

        diffuseColor.rgb = terrainColor * 0.7; // Darken sides
      `}
      diffuseColor.a = 1.0;`
    )
  }

  const onBeforeCompileWater = (shader: THREE.ShaderLibShader) => {
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
    shader.uniforms.waterMap = uniforms.waterMap
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uHoveredCell = uniforms.uHoveredCell
    shader.uniforms.uLayerHighlightColors = uniforms.uLayerHighlightColors
    
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      uniform sampler2D uTerrainSurface;
      uniform sampler2D waterMap;
      uniform float uTime;
      varying float vDepth;
      varying vec2 vGridUv;
      ${BILINEAR_GLSL}`
    ).replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vGridUv = uv;
      vec2 gridRes = vec2(100.0);
      vec2 texRes = vec2(101.0);
      
      // 1. Smooth Terrain Height at this vertex
      vec2 sUv = (uv * 100.0 + 0.5) / texRes;
      float h = bilinear(uTerrainSurface, sUv, texRes).r;
      
      // 2. Wet-Neighbor-Only Level Averaging
      vec2 st = uv * gridRes - 0.5;
      vec2 i = floor(st);
      vec2 f = fract(st);

      vec4 p00 = texture2D(waterMap, (i + vec2(0.0, 0.0) + 0.5) / gridRes);
      vec4 p10 = texture2D(waterMap, (i + vec2(1.0, 0.0) + 0.5) / gridRes);
      vec4 p01 = texture2D(waterMap, (i + vec2(0.0, 1.0) + 0.5) / gridRes);
      vec4 p11 = texture2D(waterMap, (i + vec2(1.0, 1.0) + 0.5) / gridRes);
      
      // Masks: 1.0 if wet, 0.0 if dry
      float m00 = p00.b > 0.001 ? 1.0 : 0.0;
      float m10 = p10.b > 0.001 ? 1.0 : 0.0;
      float m01 = p01.b > 0.001 ? 1.0 : 0.0;
      float m11 = p11.b > 0.001 ? 1.0 : 0.0;
      
      float fw00 = (1.0 - f.x) * (1.0 - f.y) * m00;
      float fw10 = f.x * (1.0 - f.y) * m10;
      float fw01 = (1.0 - f.x) * f.y * m01;
      float fw11 = f.x * f.y * m11;
      
      float totalW = fw00 + fw10 + fw01 + fw11;
      
      if (totalW > 0.0001) {
          float finalSL = (p00.r * fw00 + p10.r * fw10 + p01.r * fw01 + p11.r * fw11) / totalW;
          transformed.y = finalSL;
      } else {
          transformed.y = h - 0.05; // Hide dry vertices
      }
      
      vDepth = transformed.y - h;
      
      float sw_interp = bilinear(waterMap, uv, gridRes).b;
      if (sw_interp > 0.05) {
        transformed.y += sin(uTime * 2.0 + (position.x + position.z) * 5.0) * 0.005;
      }`
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform sampler2D waterMap;
      uniform vec2 uHoveredCell;
      uniform vec3 uLayerHighlightColors[6];
      varying float vDepth;
      varying vec2 vGridUv;`
    ).replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      // Hide if dry and no wet neighbors
      vec2 gridRes = vec2(100.0);
      vec4 waterData = texture2D(waterMap, vGridUv);
      float sw = waterData.b;
      
      if (sw < 0.001) {
          bool hasWetNeighbor = false;
          vec2 texel = 1.0 / gridRes;
          if (texture2D(waterMap, vGridUv + vec2(texel.x, 0.0)).b > 0.001 ||
              texture2D(waterMap, vGridUv - vec2(texel.x, 0.0)).b > 0.001 ||
              texture2D(waterMap, vGridUv + vec2(0.0, texel.y)).b > 0.001 ||
              texture2D(waterMap, vGridUv - vec2(0.0, texel.y)).b > 0.001) {
              hasWetNeighbor = true;
          }
          if (!hasWetNeighbor) discard;
      }

      // Continuous Depth Check (intersection with smooth terrain)
      vec3 shallowColor = vec3(0.2, 0.5, 0.8);
      vec3 deepColor = vec3(0.02, 0.1, 0.3);
      vec3 waterColor = mix(shallowColor, deepColor, smoothstep(0.0, 0.5, vDepth));
      
      // Hover Highlight
      vec2 gridCell = floor(vGridUv * gridRes);
      if (gridCell.x == uHoveredCell.x && (gridRes.y - 1.0 - gridCell.y) == uHoveredCell.y) {
          waterColor = mix(waterColor, uLayerHighlightColors[5], 0.4);
      }

      // Crisp shoreline contour at terrain intersection
      float shoreLine = 1.0 - smoothstep(0.0, 0.03, vDepth);
      waterColor = mix(waterColor, vec3(1.0), shoreLine * 0.8);
      
      // Subtle flow/grid lines
      vec2 grid = fract(vGridUv * 100.0);
      if (grid.x < 0.02 || grid.y < 0.02) {
          waterColor += vec3(0.05);
      }
      
      diffuseColor.rgb = waterColor;
      diffuseColor.a = 0.85;`
    )
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
        <meshStandardMaterial transparent side={THREE.DoubleSide} onBeforeCompile={(s) => onBeforeCompileSide(s, 'N', true)} />
      </mesh>
      <mesh position={[0, 0, offset]} rotation={[0, 0, 0]} geometry={sideGeometry} frustumCulled={false}>
        <meshStandardMaterial transparent side={THREE.DoubleSide} onBeforeCompile={(s) => onBeforeCompileSide(s, 'S', true)} />
      </mesh>
      <mesh position={[-offset, 0, 0]} rotation={[0, -Math.PI/2, 0]} geometry={sideGeometry} frustumCulled={false}>
        <meshStandardMaterial transparent side={THREE.DoubleSide} onBeforeCompile={(s) => onBeforeCompileSide(s, 'W', true)} />
      </mesh>
      <mesh position={[offset, 0, 0]} rotation={[0, Math.PI/2, 0]} geometry={sideGeometry} frustumCulled={false}>
        <meshStandardMaterial transparent side={THREE.DoubleSide} onBeforeCompile={(s) => onBeforeCompileSide(s, 'E', true)} />
      </mesh>
    </group>
  )
}

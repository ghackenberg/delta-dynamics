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
  const rLevel = useStore((state) => state.rLevel)
  const rainIntensity = useStore((state) => state.rainIntensity)
  const day = useStore((state) => state.day)
  const gameTime = useStore((state) => state.gameTime)
  
  const placeBuilding = useStore((state) => state.placeBuilding)
  const selectedBuildingType = useStore((state) => state.selectedBuildingType)
  const hoveredCell = useStore((state) => state.hoveredCell)

  const [gpuSim] = useState(() => new WaterComputeSystem(gl))

  useEffect(() => {
    gpuSim.setInitialWater(sWater, gWater)
  }, [gpuSim, sWater, gWater]) // Only on mount or if water changes

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

  const layerPorosities = useMemo(() => {
    const types: LayerType[] = ['ROCK', 'GRAVEL', 'SAND', 'HUMUS', 'PAVEMENT', 'WATER']
    return new Float32Array(types.map(t => MATERIAL_PROPERTIES[t].porosity))
  }, [])

  const layerPermeabilities = useMemo(() => {
    const types: LayerType[] = ['ROCK', 'GRAVEL', 'SAND', 'HUMUS', 'PAVEMENT', 'WATER']
    return new Float32Array(types.map(t => MATERIAL_PROPERTIES[t].permeability))
  }, [])

  // Update terrain texture when vertices change
  useEffect(() => {
    const terrainVertices = TerrainManager.getInstance().getVertices()
    gpuSim.updateTerrain(terrainVertices, rLevel)
    gpuSim.updateMaterialProperties(layerPorosities, layerPermeabilities)

    // Also update rendering textures
    const lData = layerTex.image.data as Float32Array
    const sData = surfaceTex.image.data as Float32Array
    const size = GRID_SIZE + 1
    
    for (let j = 0; j <= GRID_SIZE; j++) {
      const rowOff = j * size
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
        const pavementLayer = layers.find(l => l.type === 'PAVEMENT')
        const height = totalHeight - 5.0 // -5 is TERRAIN_BASE_Y
        
        const gridI = Math.min(i, GRID_SIZE - 1)
        const gridJ = Math.min(j, GRID_SIZE - 1)
        const gridIdx = gridJ * GRID_SIZE + gridI
        
        sData[texIdx] = height
        sData[texIdx + 1] = rLevel[gridIdx] || -99
        sData[texIdx + 2] = topTypeIdx
        sData[texIdx + 3] = pavementLayer ? pavementLayer.thickness : 0.0
      }
    }
    layerTex.needsUpdate = true
    surfaceTex.needsUpdate = true
  }, [gpuSim, terrainVersion, rLevel, layerTex, surfaceTex, layerPorosities, layerPermeabilities])

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
      vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
      float h = bilinear(uTerrainSurface, sUv, vec2(101.0)).r;
      float sw = bilinear(waterMap, uv, vec2(100.0)).r;
      transformed.y = h + sw;
      if (sw > 0.05) {
        transformed.y += sin(uTime * 2.0 + (position.x + position.z) * 5.0) * 0.005;
      }
      vDepth = sw;`
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying float vDepth;
      varying vec2 vGridUv;`
    ).replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      if (vDepth < 0.02) discard;
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

      vec2 sUv = (vGridUv * 100.0 + 0.5) / 101.0;
      float h = bilinear(uTerrainSurface, sUv, vec2(101.0)).r;
      float sw = bilinear(waterMap, vGridUv, vec2(100.0)).r;
      
      vSurfaceY = h;
      vWaterY = h + sw;

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
        if (vWaterY - vSurfaceY < 0.01) discard;
        vec3 shallowColor = vec3(0.2, 0.5, 0.8);
        vec3 deepColor = vec3(0.02, 0.1, 0.3);
        diffuseColor.rgb = mix(shallowColor, deepColor, 0.5);
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
      vec2 sUv = (uv * 100.0 + 0.5) / 101.0;
      float h = bilinear(uTerrainSurface, sUv, vec2(101.0)).r;
      float sw = bilinear(waterMap, uv, vec2(100.0)).r;
      transformed.y = h + sw;
      if (sw > 0.05) {
        transformed.y += sin(uTime * 2.0 + (position.x + position.z) * 5.0) * 0.005;
      }
      vDepth = sw;`
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform vec2 uHoveredCell;
      uniform vec3 uLayerHighlightColors[6];
      varying float vDepth;
      varying vec2 vGridUv;`
    ).replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      if (vDepth < 0.02) discard;
      vec3 shallowColor = vec3(0.2, 0.5, 0.8);
      vec3 deepColor = vec3(0.02, 0.1, 0.3);
      vec3 waterColor = mix(shallowColor, deepColor, smoothstep(0.0, 0.5, vDepth));
      
      // Hover Highlight
      vec2 gridRes = vec2(100.0);
      vec2 gridCell = floor(vGridUv * gridRes);
      if (gridCell.x == uHoveredCell.x && (gridRes.y - 1.0 - gridCell.y) == uHoveredCell.y) {
          waterColor = mix(waterColor, uLayerHighlightColors[5], 0.4);
      }

      // Crisp shoreline contour near the discard threshold
      float shoreLine = 1.0 - smoothstep(0.02, 0.028, vDepth);
      waterColor = mix(waterColor, vec3(1.0), shoreLine * 0.9);
      
      vec2 grid = fract(vGridUv * 100.0);
      if (grid.x < 0.05 || grid.y < 0.05) {
          waterColor += vec3(0.1);
      }
      
      diffuseColor.rgb = waterColor;
      diffuseColor.a = 1.0;`
    )
  }

  useFrame((state) => {
    // 1. Run GPU Simulation
    const currentSeaLevel = SEA_LEVEL + Math.sin(day * 0.5 + gameTime * 0.02) * 0.2
    for (let i = 0; i < 5; i++) { // 5 sub-steps
      gpuSim.step(rainIntensity, currentSeaLevel, state.clock.getElapsedTime())
    }

    // 2. Read back to CPU for entity logic
    gpuSim.readBack(sWater, gWater)

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
        geometry={staticGeometry}
      >
        <meshBasicMaterial onBeforeCompile={onBeforeCompileWaterPicking} />
      </mesh>

      <mesh 
        receiveShadow 
        frustumCulled={false} 
        position={[0, 0.001, 0]} 
        geometry={staticGeometry}
      >
        <meshStandardMaterial flatShading onBeforeCompile={onBeforeCompileWater} />
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

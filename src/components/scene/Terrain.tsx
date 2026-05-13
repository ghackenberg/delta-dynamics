/* eslint-disable react-hooks/immutability */
import { useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'
import { GRID_SIZE, TILE_SIZE, SEA_LEVEL } from '../../constants/gameConfig'
import { WaterComputeSystem } from '../../systems/waterComputeSystem'

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

export const Terrain = () => {
  const { gl } = useThree()
  const terrainVertices = useStore((state) => state.terrainVertices)
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
  const setHoveredCell = useStore((state) => state.setHoveredCell)

  const [gpuSim] = useState(() => new WaterComputeSystem(gl))

  useEffect(() => {
    gpuSim.setInitialWater(sWater, gWater)
  }, [gpuSim, sWater, gWater]) // Only on mount or if water changes

  // Initialize stable objects once
  const layerTex = useMemo(() => {
    const data = new Float32Array((GRID_SIZE + 1) * (GRID_SIZE + 1) * 4)
    const tex = new THREE.DataTexture(data, GRID_SIZE + 1, GRID_SIZE + 1, THREE.RGBAFormat, THREE.FloatType)
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

  // Update terrain texture when vertices change
  useEffect(() => {
    gpuSim.updateTerrain(terrainVertices, rLevel)

    // Also update rendering textures
    const lData = layerTex.image.data as Float32Array
    const sData = surfaceTex.image.data as Float32Array
    const size = GRID_SIZE + 1
    
    for (let j = 0; j <= GRID_SIZE; j++) {
      const rowOff = j * size
      for (let i = 0; i <= GRID_SIZE; i++) {
        const texIdx = (rowOff + i) * 4
        const layers = terrainVertices[i][j]
        
        let rock = 0, gravel = 0, sand = 0, humus = 0, pavement = 0
        layers.forEach(l => {
          if (l.type === 'ROCK') rock += l.thickness
          else if (l.type === 'GRAVEL') gravel += l.thickness
          else if (l.type === 'SAND') sand += l.thickness
          else if (l.type === 'HUMUS') humus += l.thickness
          else if (l.type === 'PAVEMENT') pavement += l.thickness
        })
        
        const topType = layers[layers.length - 1].type
        const topTypeIdx = topType === 'ROCK' ? 0 : topType === 'GRAVEL' ? 1 : topType === 'SAND' ? 2 : topType === 'HUMUS' ? 3 : 4
        const height = rock + gravel + sand + humus + pavement - 5.0 // -5 is TERRAIN_BASE_Y
        
        lData[texIdx] = rock
        lData[texIdx + 1] = gravel
        lData[texIdx + 2] = sand
        lData[texIdx + 3] = humus
        
        sData[texIdx] = height
        sData[texIdx + 1] = rLevel[j * GRID_SIZE + i] || -99 // Use grid rLevel for vertex
        sData[texIdx + 2] = topTypeIdx
        sData[texIdx + 3] = pavement
      }
    }
    layerTex.needsUpdate = true
    surfaceTex.needsUpdate = true
  }, [gpuSim, terrainVertices, rLevel, layerTex, surfaceTex])

  const uniforms = useMemo(() => ({
    uTerrainLayers: { value: layerTex },
    uTerrainSurface: { value: surfaceTex },
    waterMap: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uTileSize: { value: TILE_SIZE }
  }), [layerTex, surfaceTex])

  const staticGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE, GRID_SIZE, GRID_SIZE)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])

  const onBeforeCompileTerrain = (shader: THREE.ShaderLibShader) => {
    shader.uniforms.uTerrainLayers = uniforms.uTerrainLayers
    shader.uniforms.uTerrainSurface = uniforms.uTerrainSurface
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
      varying float vType;
      varying vec2 vGridUv;`
    ).replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      vec3 cRock = vec3(0.15, 0.15, 0.15);
      vec3 cGravel = vec3(0.25, 0.22, 0.2);
      vec3 cSand = vec3(0.35, 0.3, 0.2);
      vec3 cHumus = vec3(0.12, 0.22, 0.12);
      vec3 cPavement = vec3(0.25, 0.25, 0.25);
      
      // Discrete Cell-based Material Sampling
      vec2 gridRes = vec2(100.0);
      vec2 texRes = vec2(101.0);
      vec2 cellCoord = floor(vGridUv * gridRes);
      float cellType = texture2D(uTerrainSurface, (cellCoord + 0.5) / texRes).b;
      
      vec3 terrainColor = cRock;
      if (cellType < 0.5) terrainColor = cRock;
      else if (cellType < 1.5) terrainColor = cGravel;
      else if (cellType < 2.5) terrainColor = cSand;
      else if (cellType < 3.5) terrainColor = cHumus;
      else terrainColor = cPavement;
      
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

  const onBeforeCompileWater = (shader: THREE.ShaderLibShader) => {
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
      vec3 shallowColor = vec3(0.2, 0.5, 0.8);
      vec3 deepColor = vec3(0.02, 0.1, 0.3);
      vec3 waterColor = mix(shallowColor, deepColor, smoothstep(0.0, 0.5, vDepth));
      
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
    
    useStore.setState({ heightTexture: surfaceTex, waterTexture: gpuSim.getWaterTexture() as THREE.DataTexture })
  })

  const getGridCoords = (point: THREE.Vector3) => {
    const offset = (GRID_SIZE * TILE_SIZE) / 2
    const x = Math.floor((point.x + offset) / TILE_SIZE)
    const z = Math.floor((point.z + offset) / TILE_SIZE)
    return { x: Math.max(0, Math.min(GRID_SIZE - 1, x)), z: Math.max(0, Math.min(GRID_SIZE - 1, z)) }
  }

  const offset = (GRID_SIZE * TILE_SIZE) / 2

  return (
    <group 
      onPointerMove={(e) => setHoveredCell(getGridCoords(e.point))} 
      onPointerDown={(e) => e.button === 0 && placeBuilding(getGridCoords(e.point).x, getGridCoords(e.point).z, selectedBuildingType)}
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
      
      <mesh 
        receiveShadow 
        frustumCulled={false} 
        position={[0, 0.001, 0]} 
        geometry={staticGeometry}
      >
        <meshStandardMaterial flatShading onBeforeCompile={onBeforeCompileWater} />
      </mesh>

      {hoveredCell && (
        <mesh position={[hoveredCell.x * TILE_SIZE - offset + TILE_SIZE/2, tHeight[hoveredCell.z * GRID_SIZE + hoveredCell.x] + sWater[hoveredCell.z * GRID_SIZE + hoveredCell.x] + 0.05, hoveredCell.z * TILE_SIZE - offset + TILE_SIZE/2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
          <meshBasicMaterial color="yellow" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  )
}

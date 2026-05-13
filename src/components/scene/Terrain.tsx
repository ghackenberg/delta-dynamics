/* eslint-disable react-hooks/immutability */
import { useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'
import { GRID_SIZE, TILE_SIZE, SEA_LEVEL } from '../../constants/gameConfig'
import { WaterComputeSystem } from '../../systems/waterComputeSystem'

const BICUBIC_GLSL = `
  vec4 catmullRom(vec4 p0, vec4 p1, vec4 p2, vec4 p3, float t) {
      float t2 = t * t;
      float t3 = t2 * t;
      return 0.5 * (
          (2.0 * p1) +
          (-p0 + p2) * t +
          (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 +
          (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
      );
  }

  vec4 bicubic(sampler2D tex, vec2 uv, vec2 res) {
      vec2 st = uv * res - 0.5;
      vec2 i = floor(st);
      vec2 f = fract(st);

      vec4 p00 = texture2D(tex, (i + vec2(-1.0, -1.0) + 0.5) / res);
      vec4 p10 = texture2D(tex, (i + vec2( 0.0, -1.0) + 0.5) / res);
      vec4 p20 = texture2D(tex, (i + vec2( 1.0, -1.0) + 0.5) / res);
      vec4 p30 = texture2D(tex, (i + vec2( 2.0, -1.0) + 0.5) / res);
      vec4 row0 = catmullRom(p00, p10, p20, p30, f.x);

      vec4 p01 = texture2D(tex, (i + vec2(-1.0,  0.0) + 0.5) / res);
      vec4 p11 = texture2D(tex, (i + vec2( 0.0,  0.0) + 0.5) / res);
      vec4 p21 = texture2D(tex, (i + vec2( 1.0,  0.0) + 0.5) / res);
      vec4 p31 = texture2D(tex, (i + vec2( 2.0,  0.0) + 0.5) / res);
      vec4 row1 = catmullRom(p01, p11, p21, p31, f.x);

      vec4 p02 = texture2D(tex, (i + vec2(-1.0,  1.0) + 0.5) / res);
      vec4 p12 = texture2D(tex, (i + vec2( 0.0,  1.0) + 0.5) / res);
      vec4 p22 = texture2D(tex, (i + vec2( 1.0,  1.0) + 0.5) / res);
      vec4 p32 = texture2D(tex, (i + vec2( 2.0,  1.0) + 0.5) / res);
      vec4 row2 = catmullRom(p02, p12, p22, p32, f.x);

      vec4 p03 = texture2D(tex, (i + vec2(-1.0,  2.0) + 0.5) / res);
      vec4 p13 = texture2D(tex, (i + vec2( 0.0,  2.0) + 0.5) / res);
      vec4 p23 = texture2D(tex, (i + vec2( 1.0,  2.0) + 0.5) / res);
      vec4 p33 = texture2D(tex, (i + vec2( 2.0,  2.0) + 0.5) / res);
      vec4 row3 = catmullRom(p03, p13, p23, p33, f.x);

      return catmullRom(row0, row1, row2, row3, f.y);
  }
`;

export const Terrain = () => {
  const { gl } = useThree()
  const terrainVertices = useStore((state) => state.terrainVertices)
  const sWater = useStore((state) => state.sWater)
  const gWater = useStore((state) => state.gWater)
  const tHeight = useStore((state) => state.tHeight)
  const aCap = useStore((state) => state.aCap)
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

  // Update terrain texture when vertices change
  useEffect(() => {
    gpuSim.updateTerrain(tHeight, aCap, rLevel)
  }, [gpuSim, tHeight, aCap, rLevel])

  // Initialize stable objects once
  const hTex = useMemo(() => {
    const data = new Float32Array((GRID_SIZE + 1) * (GRID_SIZE + 1) * 4)
    const tex = new THREE.DataTexture(data, GRID_SIZE + 1, GRID_SIZE + 1, THREE.RGBAFormat, THREE.FloatType)
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    return tex
  }, [])

  const uniforms = useMemo(() => ({
    heightMap: { value: hTex },
    waterMap: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uTileSize: { value: TILE_SIZE }
  }), [hTex])

  const staticGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE, GRID_SIZE, GRID_SIZE)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])

  const onBeforeCompileTerrain = (shader: THREE.ShaderLibShader) => {
    shader.uniforms.heightMap = uniforms.heightMap
    shader.uniforms.uTileSize = uniforms.uTileSize
    
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      uniform sampler2D heightMap;
      uniform float uTileSize;
      varying float vType;
      varying vec2 vGridUv;
      ${BICUBIC_GLSL}`
    ).replace(
      '#include <beginnormal_vertex>',
      `#include <beginnormal_vertex>
      float texelSize = 1.0 / 101.0;
      float hL = bicubic(heightMap, uv - vec2(texelSize, 0.0), vec2(101.0)).r;
      float hR = bicubic(heightMap, uv + vec2(texelSize, 0.0), vec2(101.0)).r;
      float hD = bicubic(heightMap, uv - vec2(0.0, texelSize), vec2(101.0)).r;
      float hU = bicubic(heightMap, uv + vec2(0.0, texelSize), vec2(101.0)).r;
      vec3 slopeX = vec3(2.0 * uTileSize, hR - hL, 0.0);
      vec3 slopeZ = vec3(0.0, hU - hD, 2.0 * uTileSize);
      objectNormal = normalize(cross(slopeZ, slopeX));`
    ).replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vGridUv = uv;
      vec4 heightData = bicubic(heightMap, uv, vec2(101.0));
      transformed.y = heightData.r;
      vType = heightData.g;`
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying float vType;
      varying vec2 vGridUv;`
    ).replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      vec3 cHumus = vec3(0.12, 0.22, 0.12);
      vec3 cSand = vec3(0.35, 0.3, 0.2);
      vec3 cRock = vec3(0.15, 0.15, 0.15);
      vec3 cPavement = vec3(0.25, 0.25, 0.25);
      vec3 terrainColor = cHumus;
      terrainColor = mix(terrainColor, cSand, smoothstep(0.0, 1.0, vType));
      terrainColor = mix(terrainColor, cRock, smoothstep(1.0, 2.0, vType));
      terrainColor = mix(terrainColor, cPavement, smoothstep(2.0, 3.0, vType));
      
      // Layer Boundary Contours
      float distToBorder = abs(fract(vType) - 0.5);
      float borderLine = 1.0 - smoothstep(0.0, 0.05, distToBorder);
      // Only show borders between defined layers (avoid borders outside 0-3 range)
      if (vType > 0.1 && vType < 2.9) {
          terrainColor = mix(terrainColor, vec3(1.0, 0.9, 0.5), borderLine * 0.5);
      }

      vec2 grid = fract(vGridUv * 100.0);
      if (grid.x < 0.05 || grid.y < 0.05) {
          terrainColor *= 0.5;
      }
      
      diffuseColor.rgb = terrainColor;`
    )
  }

  const terrainDepthMaterial = useMemo(() => {
    const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.heightMap = uniforms.heightMap
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D heightMap;
        ${BICUBIC_GLSL}`
      ).replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        transformed.y = bicubic(heightMap, uv, vec2(101.0)).r;`
      )
    }
    return mat
  }, [uniforms.heightMap])

  const onBeforeCompileWater = (shader: THREE.ShaderLibShader) => {
    shader.uniforms.heightMap = uniforms.heightMap
    shader.uniforms.waterMap = uniforms.waterMap
    shader.uniforms.uTime = uniforms.uTime
    
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      uniform sampler2D heightMap;
      uniform sampler2D waterMap;
      uniform float uTime;
      varying float vDepth;
      varying vec2 vGridUv;
      ${BICUBIC_GLSL}`
    ).replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vGridUv = uv;
      float h = bicubic(heightMap, uv, vec2(101.0)).r;
      float sw = bicubic(waterMap, uv, vec2(100.0)).r;
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
      diffuseColor.a = smoothstep(0.015, 0.025, vDepth) * 0.8;`
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

    // 3. Update Height Texture (Static-ish)
    const hData = hTex.image.data as Float32Array
    const size = GRID_SIZE + 1
    for (let j = 0; j <= GRID_SIZE; j++) {
      const rowOff = j * size
      for (let i = 0; i <= GRID_SIZE; i++) {
        const idx = (rowOff + i) * 4
        const layers = terrainVertices[i][j]
        const topType = layers[layers.length - 1].type
        const groundH = layers.reduce((sum, l) => sum + l.thickness, -5)
        hData[idx] = groundH
        hData[idx + 1] = topType === 'HUMUS' ? 0 : topType === 'SAND' ? 1 : topType === 'PAVEMENT' ? 3 : 2
      }
    }
    hTex.needsUpdate = true

    // 4. Update Uniforms
    uniforms.waterMap.value = gpuSim.getWaterTexture()
    uniforms.uTime.value = state.clock.getElapsedTime()
    
    useStore.setState({ heightTexture: hTex, waterTexture: gpuSim.getWaterTexture() as THREE.DataTexture })
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
        <meshStandardMaterial onBeforeCompile={onBeforeCompileTerrain} />
      </mesh>
      
      <mesh 
        receiveShadow 
        frustumCulled={false} 
        position={[0, 0.001, 0]} 
        geometry={staticGeometry}
      >
        <meshStandardMaterial transparent onBeforeCompile={onBeforeCompileWater} />
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

import { useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import { GRID_SIZE, TILE_SIZE, SEA_LEVEL } from '../../constants/gameConfig'
import { WaterComputeSystem } from '../../systems/waterComputeSystem'

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
  }, []) // Only on mount

  // Update terrain texture when vertices change
  useEffect(() => {
    gpuSim.updateTerrain(tHeight, aCap, rLevel)
  }, [tHeight, aCap, rLevel])

  // Use useState initializer for stable objects that don't need re-render triggers
  const [hTex] = useState(() => {
    const data = new Float32Array((GRID_SIZE + 1) * (GRID_SIZE + 1) * 4)
    const tex = new THREE.DataTexture(data, GRID_SIZE + 1, GRID_SIZE + 1, THREE.RGBAFormat, THREE.FloatType)
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    return tex
  })

  const [uniforms] = useState(() => ({
    heightMap: { value: hTex },
    waterMap: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uTileSize: { value: TILE_SIZE }
  }))

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
      varying float vType;`
    ).replace(
      '#include <beginnormal_vertex>',
      `#include <beginnormal_vertex>
      float texelSize = 1.0 / 101.0;
      float hL = texture2D(heightMap, uv - vec2(texelSize, 0.0)).r;
      float hR = texture2D(heightMap, uv + vec2(texelSize, 0.0)).r;
      float hD = texture2D(heightMap, uv - vec2(0.0, texelSize)).r;
      float hU = texture2D(heightMap, uv + vec2(0.0, texelSize)).r;
      vec3 slopeX = vec3(2.0 * uTileSize, hR - hL, 0.0);
      vec3 slopeZ = vec3(0.0, hU - hD, 2.0 * uTileSize);
      objectNormal = normalize(cross(slopeZ, slopeX));`
    ).replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec4 heightData = texture2D(heightMap, uv);
      transformed.y = heightData.r;
      vType = heightData.g;`
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying float vType;`
    ).replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      vec3 terrainColor = vec3(0.15); // ROCK
      if (vType < 0.5) terrainColor = vec3(0.12, 0.22, 0.12); // HUMUS
      else if (vType < 1.5) terrainColor = vec3(0.35, 0.3, 0.2); // SAND
      else if (vType > 2.5) terrainColor = vec3(0.25, 0.25, 0.25); // PAVEMENT
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
        uniform sampler2D heightMap;`
      ).replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        transformed.y = texture2D(heightMap, uv).r;`
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
      varying float vDepth;`
    ).replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float h = texture2D(heightMap, uv).r;
      float sw = texture2D(waterMap, uv).r;
      transformed.y = h + sw;
      if (sw > 0.05) {
        transformed.y += sin(uTime * 2.0 + (position.x + position.z) * 5.0) * 0.005;
      }
      vDepth = sw;`
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying float vDepth;`
    ).replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      if (vDepth < 0.02) discard;
      vec3 shallowColor = vec3(0.2, 0.5, 0.8);
      vec3 deepColor = vec3(0.02, 0.1, 0.3);
      diffuseColor.rgb = mix(shallowColor, deepColor, smoothstep(0.0, 0.5, vDepth));
      diffuseColor.a = smoothstep(0.0, 0.1, vDepth) * 0.7;`
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

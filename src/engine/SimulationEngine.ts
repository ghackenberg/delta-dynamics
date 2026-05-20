import * as THREE from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'
import { useStore } from '../hooks/useStore'
import type { LayerType } from '../types/game'
import {
  GRID_SIZE,
  TILE_SIZE,
  OFFSET,
  BOUNDARY,
  SEA_LEVEL,
  MAX_GPU_LAYERS,
  MATERIAL_PROPERTIES,
  MAX_TREES,
  BUILDING_SIZES
} from '../constants/gameConfig'
import { getTerrainById } from '../terrains'
import { WaterComputeSystem } from '../systems/waterSystem'
import { TerrainManager } from '../managers/TerrainManager'
import { TreeManager } from '../managers/TreeManager'
import { AnimalManager } from '../managers/AnimalManager'
import { computeAdaptiveIndices, getInterpolatedHeight, isAreaFlat } from '../systems/terrainSystem'
import { gridToWorld } from '../utils/gameUtils'

import { terrainSurfaceVertexModule } from '../shaders/terrain/surface.vert'
import { terrainSurfaceFragmentModule } from '../shaders/terrain/surface.frag'
import { terrainPickingVertexModule } from '../shaders/terrain/picking.vert'
import { terrainPickingFragmentModule } from '../shaders/terrain/picking.frag'
import { waterPickingVertexModule } from '../shaders/water/picking.vert'
import { waterPickingFragmentModule } from '../shaders/water/picking.frag'
import { waterSurfaceVertexModule } from '../shaders/water/surface.vert'
import { waterSurfaceFragmentModule } from '../shaders/water/surface.frag'
import { terrainDepthVertexModule } from '../shaders/terrain/depth.vert'
import { createTerrainSideVertexModule } from '../shaders/terrain/side.vert'
import { createWaterSideVertexModule } from '../shaders/water/side.vert'
import { applyModulesToShader } from '../utils/shaderUtils'

import {
  createHumanMesh,
  createBuildingGroup,
  createPlacementPreviewGroup
} from './SceneMeshBuilder'

// Let's resolve the exact shader module imports first. We saw earlier:
// src\shaders\terrain\side.vert.ts -> createTerrainSideVertexModule
// src\shaders\terrain\side.frag.ts -> terrainSideFragmentModule
// src\shaders\water\side.vert.ts -> createWaterSideVertexModule
// src\shaders\water\side.frag.ts -> waterSideFragmentModule
// So we must import from their correct paths:
import { terrainSideFragmentModule } from '../shaders/terrain/side.frag'
import { waterSideFragmentModule } from '../shaders/water/side.frag'

const PICKING_LAYER = 1
const RAIN_COUNT = 500
const CLOUD_HEIGHT_OFFSET = 5
const MAX_ANIMALS = 500

// Generate static random values for animal vertex shader behavior
const STATIC_RANDOM_VALUES = new Float32Array(MAX_ANIMALS)
for (let i = 0; i < MAX_ANIMALS; i++) {
  STATIC_RANDOM_VALUES[i] = (Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1
  if (STATIC_RANDOM_VALUES[i] < 0) STATIC_RANDOM_VALUES[i] += 1
}

export class SimulationEngine {
  public canvas: HTMLCanvasElement | OffscreenCanvas
  public interactive: boolean

  // Painting states for editor
  public isPainting = false
  public isErasing = false

  public scene: THREE.Scene
  public camera: THREE.PerspectiveCamera
  public renderer: THREE.WebGLRenderer
  public controls: MapControls | null = null
  private startTime: number

  // Lights
  public ambientLight!: THREE.AmbientLight
  public hemisphereLight!: THREE.HemisphereLight
  public directionalLight!: THREE.DirectionalLight

  // Managers & Simulators
  public gpuSim!: WaterComputeSystem
  public terrainManager!: TerrainManager
  public treeManager!: TreeManager
  public animalManager!: AnimalManager

  // Shared Terrain & Water Uniforms
  public uniforms!: Record<string, THREE.IUniform>

  // Geometries
  public staticGeometry!: THREE.PlaneGeometry
  public sideGeometry!: THREE.PlaneGeometry
  public treeConiferTrunkGeometry!: THREE.CylinderGeometry
  public treeDeciduousTrunkGeometry!: THREE.CylinderGeometry
  public treeBirchTrunkGeometry!: THREE.CylinderGeometry
  public treeConiferGeometry!: THREE.ConeGeometry
  public treeDeciduousGeometry!: THREE.SphereGeometry
  public treeBirchGeometry!: THREE.SphereGeometry
  public animalDeerGeometry!: THREE.BoxGeometry
  public animalWolfGeometry!: THREE.BoxGeometry

  // Materials
  public terrainMaterial!: THREE.MeshStandardMaterial
  public terrainPickingMaterial!: THREE.MeshBasicMaterial
  public terrainDepthMaterial!: THREE.MeshDepthMaterial
  public waterMaterial!: THREE.MeshStandardMaterial
  public waterPickingMaterial!: THREE.MeshBasicMaterial
  public terrainSideMaterialN!: THREE.MeshStandardMaterial
  public terrainSideMaterialS!: THREE.MeshStandardMaterial
  public terrainSideMaterialE!: THREE.MeshStandardMaterial
  public terrainSideMaterialW!: THREE.MeshStandardMaterial
  public waterSideMaterialN!: THREE.MeshStandardMaterial
  public waterSideMaterialS!: THREE.MeshStandardMaterial
  public waterSideMaterialE!: THREE.MeshStandardMaterial
  public waterSideMaterialW!: THREE.MeshStandardMaterial

  // Meshes
  public terrainSurfaceMesh!: THREE.Mesh
  public terrainPickingMesh!: THREE.Mesh
  public waterSurfaceMesh!: THREE.Mesh
  public waterPickingMesh!: THREE.Mesh
  public terrainSides: THREE.Mesh[] = []
  public waterSides: THREE.Mesh[] = []

  // Instanced Meshes
  public instancedTrees: {
    conifer: THREE.InstancedMesh
    coniferTrunk: THREE.InstancedMesh
    deciduous: THREE.InstancedMesh
    deciduousTrunk: THREE.InstancedMesh
    birch: THREE.InstancedMesh
    birchTrunk: THREE.InstancedMesh
  } | null = null
  public instancedTreesPicking: {
    conifer: THREE.InstancedMesh
    coniferTrunk: THREE.InstancedMesh
    deciduous: THREE.InstancedMesh
    deciduousTrunk: THREE.InstancedMesh
    birch: THREE.InstancedMesh
    birchTrunk: THREE.InstancedMesh
  } | null = null

  public instancedAnimals: {
    deer: THREE.InstancedMesh
    wolf: THREE.InstancedMesh
  } | null = null
  public instancedAnimalsPicking: {
    deer: THREE.InstancedMesh
    wolf: THREE.InstancedMesh
  } | null = null

  // Individual building & human mesh groups
  public buildingMeshes = new Map<string, THREE.Group>()
  public humanMeshes = new Map<string, THREE.Group>()

  // Preview mesh for placement
  public previewGroup: THREE.Group | null = null
  private lastPreviewType = ''
  private lastPreviewWidth = 0
  private lastPreviewHeight = 0

  // Rain Effect properties
  public rainGroup!: THREE.Group
  public rainCloudMesh!: THREE.Mesh
  public rainCloudMaterial!: THREE.ShaderMaterial
  public rainPoints!: THREE.Points
  public rainMaterial!: THREE.ShaderMaterial
  private rainPositions!: Float32Array
  private rainVelocities!: Float32Array

  // Picking helper variables
  public pickingTarget!: THREE.WebGLRenderTarget
  public pickingPixelBuffer = new Uint8Array(4)
  public mouse = new THREE.Vector2(-999, -999)

  // Tracking state changes
  private lastTerrainVersion = -1
  private lastActiveTerrainId = ''

  // Performance monitoring
  private lastFpsTime = 0
  private fpsFrames = 0

  // Event listeners refs for cleanup
  private listeners: { element: EventTarget, type: string, handler: EventListenerOrEventListenerObject }[] = []

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, options: { interactive?: boolean } = {}) {
    this.canvas = canvas
    this.interactive = options.interactive ?? true
    this.startTime = performance.now()

    // 1. Initialize Scene & Camera
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#87ceeb')

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    this.camera.position.set(20, 20, 20)

    // 2. Initialize WebGLRenderer
    const rendererParams: THREE.WebGLRendererParameters = {
      canvas: this.canvas as HTMLCanvasElement,
      antialias: true,
      alpha: true
    }
    this.renderer = new THREE.WebGLRenderer(rendererParams)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap

    // 3. Initialize Controls (if interactive)
    if (this.interactive && this.canvas instanceof HTMLCanvasElement) {
      this.controls = new MapControls(this.camera, this.canvas)
      this.controls.enableDamping = true
      this.controls.dampingFactor = 0.05
      this.controls.minDistance = 5
      this.controls.maxDistance = 50
      this.controls.maxPolarAngle = Math.PI / 2.1
    }

    // 4. Setup Lighting
    this.setupLighting()

    // 5. Setup Managers and Simulators
    this.gpuSim = new WaterComputeSystem(this.renderer)
    this.terrainManager = new TerrainManager()
    this.treeManager = new TreeManager(null)
    this.animalManager = new AnimalManager(null)

    // 6. Setup Uniforms
    this.setupUniforms()

    // 7. Setup Geometries
    this.setupGeometries()

    // 8. Setup Materials
    this.setupMaterials()

    // 9. Setup Meshes
    this.setupMeshes()

    // 10. Setup Rain Group
    this.setupRainEffect()

    // 11. Setup Picking Render Target (if interactive)
    if (this.interactive) {
      this.pickingTarget = new THREE.WebGLRenderTarget(1, 1, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType
      })
      this.setupMouseListeners()
    }
  }

  private setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
    this.ambientLight.name = 'main-ambient-light'
    this.scene.add(this.ambientLight)

    this.hemisphereLight = new THREE.HemisphereLight('#a0c0ff', '#403020', 0.4)
    this.hemisphereLight.name = 'main-hemi-light'
    this.scene.add(this.hemisphereLight)

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 2.5)
    this.directionalLight.name = 'main-dir-light'
    this.directionalLight.position.set(20, 40, 20)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.set(4096, 4096)
    this.directionalLight.shadow.bias = -0.0002
    this.directionalLight.shadow.normalBias = 0.02

    // Configure shadow camera bounds to fit the 20x20 terrain (d = 12 covers from -10 to 10 with a buffer)
    const d = 12
    this.directionalLight.shadow.camera.left = -d
    this.directionalLight.shadow.camera.right = d
    this.directionalLight.shadow.camera.top = d
    this.directionalLight.shadow.camera.bottom = -d
    this.directionalLight.shadow.camera.near = 0.1
    this.directionalLight.shadow.camera.far = 60
    this.scene.add(this.directionalLight)
  }

  private setupUniforms() {
    const types: LayerType[] = ['ROCK', 'GRAVEL', 'SAND', 'HUMUS', 'PAVEMENT', 'WATER', 'RAIN', 'WATER_SOURCE', 'WATER_SINK']
    const layerColors = types.map((t) => new THREE.Color(MATERIAL_PROPERTIES[t].color))
    const layerHighlightColors = types.map((t) => new THREE.Color(MATERIAL_PROPERTIES[t].highlightColor))

    this.uniforms = {
      uTerrainLayers: { value: this.terrainManager.layerTex },
      uTerrainSurface: { value: this.terrainManager.surfaceTex },
      uLayerColors: { value: layerColors },
      uLayerHighlightColors: { value: layerHighlightColors },
      uHoveredCell: { value: new THREE.Vector2(-1, -1) },
      uBrushSize: { value: 1.0 },
      uBrushStrength: { value: 0.5 },
      uMode: { value: 0 },
      waterMap: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
      uTileSize: { value: TILE_SIZE },
      uVisualRange: { value: new THREE.Vector2(-5, 5) }
    }
  }

  private setupGeometries() {
    // Terrain & Water Surface Geometry
    this.staticGeometry = new THREE.PlaneGeometry(GRID_SIZE * TILE_SIZE, GRID_SIZE * TILE_SIZE, GRID_SIZE, GRID_SIZE)
    this.staticGeometry.rotateX(-Math.PI / 2)

    // Sides Geometry (Default height 10, will update translation dynamically based on terrain)
    this.sideGeometry = new THREE.PlaneGeometry(GRID_SIZE * TILE_SIZE, 10, GRID_SIZE, 1)
    this.sideGeometry.translate(0, 0, 0) // Centering handled dynamically by shader or height range

    this.treeConiferTrunkGeometry = new THREE.CylinderGeometry(0.05, 0.12, 0.6, 6)
    this.treeConiferTrunkGeometry.translate(0, 0.3, 0)
    this.treeConiferTrunkGeometry.setAttribute('aPickingId', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1))
    this.treeConiferTrunkGeometry.setAttribute('aSink', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1))

    this.treeDeciduousTrunkGeometry = this.treeConiferTrunkGeometry.clone()
    this.treeBirchTrunkGeometry = this.treeConiferTrunkGeometry.clone()

    this.treeConiferGeometry = new THREE.ConeGeometry(0.3, 0.8, 6)
    this.treeConiferGeometry.translate(0, 0.7, 0)
    this.treeConiferGeometry.setAttribute('aPickingId', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1))
    this.treeConiferGeometry.setAttribute('aSink', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1))

    this.treeDeciduousGeometry = new THREE.SphereGeometry(0.35, 8, 8)
    this.treeDeciduousGeometry.translate(0, 0.65, 0)
    this.treeDeciduousGeometry.setAttribute('aPickingId', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1))
    this.treeDeciduousGeometry.setAttribute('aSink', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1))

    this.treeBirchGeometry = new THREE.SphereGeometry(0.25, 8, 8)
    this.treeBirchGeometry.translate(0, 0.6, 0)
    this.treeBirchGeometry.setAttribute('aPickingId', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1))
    this.treeBirchGeometry.setAttribute('aSink', new THREE.InstancedBufferAttribute(new Float32Array(MAX_TREES), 1))

    // Animal Geometries
    this.animalDeerGeometry = new THREE.BoxGeometry(0.5, 0.5, 1.0)
    this.animalDeerGeometry.translate(0, 0.25, 0)
    this.animalDeerGeometry.setAttribute('aRandom', new THREE.InstancedBufferAttribute(STATIC_RANDOM_VALUES, 1))
    this.animalDeerGeometry.setAttribute('aPickingId', new THREE.InstancedBufferAttribute(new Float32Array(MAX_ANIMALS), 1))

    this.animalWolfGeometry = new THREE.BoxGeometry(0.5, 0.5, 1.0)
    this.animalWolfGeometry.translate(0, 0.25, 0)
    this.animalWolfGeometry.setAttribute('aRandom', new THREE.InstancedBufferAttribute(STATIC_RANDOM_VALUES, 1))
    this.animalWolfGeometry.setAttribute('aPickingId', new THREE.InstancedBufferAttribute(new Float32Array(MAX_ANIMALS), 1))
  }

  private setupMaterials() {
    // 1. Terrain Material
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      flatShading: true,
      roughness: 0.8,
      metalness: 0.1
    })
    this.terrainMaterial.onBeforeCompile = (shader) => {
      applyModulesToShader(shader, [terrainSurfaceVertexModule, terrainSurfaceFragmentModule], {
        uTerrainLayers: this.uniforms.uTerrainLayers,
        uTerrainSurface: this.uniforms.uTerrainSurface,
        uTileSize: this.uniforms.uTileSize,
        uHoveredCell: this.uniforms.uHoveredCell,
        uBrushSize: this.uniforms.uBrushSize,
        uBrushStrength: this.uniforms.uBrushStrength,
        uMode: this.uniforms.uMode,
        uTime: this.uniforms.uTime,
        uLayerColors: this.uniforms.uLayerColors,
        uLayerHighlightColors: this.uniforms.uLayerHighlightColors,
        waterMap: this.uniforms.waterMap
      })
    }

    // 2. Terrain Picking Material
    this.terrainPickingMaterial = new THREE.MeshBasicMaterial()
    this.terrainPickingMaterial.onBeforeCompile = (shader) => {
      applyModulesToShader(shader, [terrainPickingVertexModule, terrainPickingFragmentModule], {
        uTerrainSurface: this.uniforms.uTerrainSurface
      })
    }

    // 3. Terrain Depth Material
    this.terrainDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
    this.terrainDepthMaterial.onBeforeCompile = (shader) => {
      applyModulesToShader(shader, [terrainDepthVertexModule], {
        uTerrainSurface: this.uniforms.uTerrainSurface
      })
    }

    // 4. Water Material
    this.waterMaterial = new THREE.MeshStandardMaterial({
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })
    this.waterMaterial.onBeforeCompile = (shader) => {
      applyModulesToShader(shader, [waterSurfaceVertexModule, waterSurfaceFragmentModule], {
        uTerrainSurface: this.uniforms.uTerrainSurface,
        waterMap: this.uniforms.waterMap,
        uTime: this.uniforms.uTime,
        uHoveredCell: this.uniforms.uHoveredCell,
        uBrushSize: this.uniforms.uBrushSize,
        uBrushStrength: this.uniforms.uBrushStrength,
        uMode: this.uniforms.uMode,
        uLayerColors: this.uniforms.uLayerColors,
        uLayerHighlightColors: this.uniforms.uLayerHighlightColors
      })
    }

    // 5. Water Picking Material
    this.waterPickingMaterial = new THREE.MeshBasicMaterial({
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })
    this.waterPickingMaterial.onBeforeCompile = (shader) => {
      applyModulesToShader(shader, [waterPickingVertexModule, waterPickingFragmentModule], {
        uTerrainSurface: this.uniforms.uTerrainSurface,
        waterMap: this.uniforms.waterMap,
        uTime: this.uniforms.uTime
      })
    }

    // 6. Terrain Sides Materials
    const createSideMat = (edge: 'N' | 'S' | 'E' | 'W') => {
      const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide })
      mat.onBeforeCompile = (shader) => {
        applyModulesToShader(shader, [createTerrainSideVertexModule(edge), terrainSideFragmentModule], {
          uTerrainLayers: this.uniforms.uTerrainLayers,
          uTerrainSurface: this.uniforms.uTerrainSurface,
          uLayerColors: this.uniforms.uLayerColors,
          uVisualRange: this.uniforms.uVisualRange
        })
        applyModulesToShader(shader, [{ name: 'maxLayers', defines: { MAX_LAYERS: MAX_GPU_LAYERS } }])
      }
      mat.customProgramCacheKey = () => `terrain-side-${edge}`
      return mat
    }
    this.terrainSideMaterialN = createSideMat('N')
    this.terrainSideMaterialS = createSideMat('S')
    this.terrainSideMaterialE = createSideMat('E')
    this.terrainSideMaterialW = createSideMat('W')

    // 7. Water Sides Materials
    const createWaterSideMat = (edge: 'N' | 'S' | 'E' | 'W') => {
      const mat = new THREE.MeshStandardMaterial({ transparent: true, side: THREE.DoubleSide })
      mat.onBeforeCompile = (shader) => {
        applyModulesToShader(shader, [createWaterSideVertexModule(edge), waterSideFragmentModule], {
          uTerrainSurface: this.uniforms.uTerrainSurface,
          waterMap: this.uniforms.waterMap,
          uTime: this.uniforms.uTime
        })
      }
      mat.customProgramCacheKey = () => `water-side-${edge}`
      return mat
    }
    this.waterSideMaterialN = createWaterSideMat('N')
    this.waterSideMaterialS = createWaterSideMat('S')
    this.waterSideMaterialE = createWaterSideMat('E')
    this.waterSideMaterialW = createWaterSideMat('W')
  }

  private setupMeshes() {
    // Terrain Mesh Setup
    this.terrainSurfaceMesh = new THREE.Mesh(this.staticGeometry, this.terrainMaterial)
    this.terrainSurfaceMesh.receiveShadow = true
    this.terrainSurfaceMesh.castShadow = true
    this.terrainSurfaceMesh.frustumCulled = false
    this.terrainSurfaceMesh.customDepthMaterial = this.terrainDepthMaterial
    this.scene.add(this.terrainSurfaceMesh)

    // Terrain Picking Mesh Setup
    this.terrainPickingMesh = new THREE.Mesh(this.staticGeometry, this.terrainPickingMaterial)
    this.terrainPickingMesh.frustumCulled = false
    this.terrainPickingMesh.layers.set(PICKING_LAYER)
    this.scene.add(this.terrainPickingMesh)

    // Water Mesh Setup
    this.waterSurfaceMesh = new THREE.Mesh(this.staticGeometry, this.waterMaterial)
    this.waterSurfaceMesh.receiveShadow = true
    this.waterSurfaceMesh.frustumCulled = false
    this.scene.add(this.waterSurfaceMesh)

    // Water Picking Mesh Setup
    this.waterPickingMesh = new THREE.Mesh(this.staticGeometry, this.waterPickingMaterial)
    this.waterPickingMesh.frustumCulled = false
    this.waterPickingMesh.layers.set(PICKING_LAYER)
    this.scene.add(this.waterPickingMesh)

    // Terrain Sides Meshes Setup
    const sideOffset = (GRID_SIZE * TILE_SIZE) / 2
    this.terrainSides = [
      new THREE.Mesh(this.sideGeometry, this.terrainSideMaterialN),
      new THREE.Mesh(this.sideGeometry, this.terrainSideMaterialS),
      new THREE.Mesh(this.sideGeometry, this.terrainSideMaterialE),
      new THREE.Mesh(this.sideGeometry, this.terrainSideMaterialW)
    ]
    this.terrainSides[0].position.set(0, 0, -sideOffset); this.terrainSides[0].rotation.y = Math.PI
    this.terrainSides[1].position.set(0, 0, sideOffset); this.terrainSides[1].rotation.y = 0
    this.terrainSides[2].position.set(sideOffset, 0, 0); this.terrainSides[2].rotation.y = Math.PI / 2
    this.terrainSides[3].position.set(-sideOffset, 0, 0); this.terrainSides[3].rotation.y = -Math.PI / 2
    this.terrainSides.forEach((side) => {
      side.frustumCulled = false
      this.scene.add(side)
    })

    // Water Sides Meshes Setup
    this.waterSides = [
      new THREE.Mesh(this.sideGeometry, this.waterSideMaterialN),
      new THREE.Mesh(this.sideGeometry, this.waterSideMaterialS),
      new THREE.Mesh(this.sideGeometry, this.waterSideMaterialE),
      new THREE.Mesh(this.sideGeometry, this.waterSideMaterialW)
    ]
    this.waterSides[0].position.set(0, 0, -sideOffset); this.waterSides[0].rotation.y = Math.PI
    this.waterSides[1].position.set(0, 0, sideOffset); this.waterSides[1].rotation.y = 0
    this.waterSides[2].position.set(sideOffset, 0, 0); this.waterSides[2].rotation.y = Math.PI / 2
    this.waterSides[3].position.set(-sideOffset, 0, 0); this.waterSides[3].rotation.y = -Math.PI / 2
    this.waterSides.forEach((side) => {
      side.frustumCulled = false
      this.scene.add(side)
    })

    // Instanced Trees Meshes
    this.instancedTrees = {
      conifer: new THREE.InstancedMesh(this.treeConiferGeometry, this.treeManager.materials.conifer, MAX_TREES),
      coniferTrunk: new THREE.InstancedMesh(this.treeConiferTrunkGeometry, this.treeManager.materials.coniferTrunk, MAX_TREES),
      deciduous: new THREE.InstancedMesh(this.treeDeciduousGeometry, this.treeManager.materials.deciduous, MAX_TREES),
      deciduousTrunk: new THREE.InstancedMesh(this.treeDeciduousTrunkGeometry, this.treeManager.materials.deciduousTrunk, MAX_TREES),
      birch: new THREE.InstancedMesh(this.treeBirchGeometry, this.treeManager.materials.birch, MAX_TREES),
      birchTrunk: new THREE.InstancedMesh(this.treeBirchTrunkGeometry, this.treeManager.materials.birchTrunk, MAX_TREES)
    }
    this.instancedTrees.conifer.castShadow = this.instancedTrees.conifer.receiveShadow = true
    this.instancedTrees.coniferTrunk.castShadow = this.instancedTrees.coniferTrunk.receiveShadow = true
    this.instancedTrees.deciduous.castShadow = this.instancedTrees.deciduous.receiveShadow = true
    this.instancedTrees.deciduousTrunk.castShadow = this.instancedTrees.deciduousTrunk.receiveShadow = true
    this.instancedTrees.birch.castShadow = this.instancedTrees.birch.receiveShadow = true
    this.instancedTrees.birchTrunk.castShadow = this.instancedTrees.birchTrunk.receiveShadow = true

    this.instancedTrees.conifer.customDepthMaterial = this.treeManager.materials.depth
    this.instancedTrees.coniferTrunk.customDepthMaterial = this.treeManager.materials.depth
    this.instancedTrees.deciduous.customDepthMaterial = this.treeManager.materials.depth
    this.instancedTrees.deciduousTrunk.customDepthMaterial = this.treeManager.materials.depth
    this.instancedTrees.birch.customDepthMaterial = this.treeManager.materials.depth
    this.instancedTrees.birchTrunk.customDepthMaterial = this.treeManager.materials.depth

    this.instancedTrees.conifer.material = this.treeManager.materials.conifer
    this.instancedTrees.coniferTrunk.material = this.treeManager.materials.coniferTrunk
    this.instancedTrees.deciduous.material = this.treeManager.materials.deciduous
    this.instancedTrees.deciduousTrunk.material = this.treeManager.materials.deciduousTrunk
    this.instancedTrees.birch.material = this.treeManager.materials.birch
    this.instancedTrees.birchTrunk.material = this.treeManager.materials.birchTrunk

    Object.values(this.instancedTrees).forEach((mesh) => {
      mesh.frustumCulled = false
      this.scene.add(mesh)
    })

    // Instanced Trees Picking Meshes
    this.instancedTreesPicking = {
      conifer: new THREE.InstancedMesh(this.treeConiferGeometry, this.treeManager.materials.picking, MAX_TREES),
      coniferTrunk: new THREE.InstancedMesh(this.treeConiferTrunkGeometry, this.treeManager.materials.picking, MAX_TREES),
      deciduous: new THREE.InstancedMesh(this.treeDeciduousGeometry, this.treeManager.materials.picking, MAX_TREES),
      deciduousTrunk: new THREE.InstancedMesh(this.treeDeciduousTrunkGeometry, this.treeManager.materials.picking, MAX_TREES),
      birch: new THREE.InstancedMesh(this.treeBirchGeometry, this.treeManager.materials.picking, MAX_TREES),
      birchTrunk: new THREE.InstancedMesh(this.treeBirchTrunkGeometry, this.treeManager.materials.picking, MAX_TREES)
    }
    Object.values(this.instancedTreesPicking).forEach((mesh) => {
      mesh.material = this.treeManager.materials.picking
      mesh.frustumCulled = false
      mesh.layers.set(PICKING_LAYER)
      this.scene.add(mesh)
    })

    // Instanced Animals Meshes
    this.instancedAnimals = {
      deer: new THREE.InstancedMesh(this.animalDeerGeometry, this.animalManager.materials.deer, MAX_ANIMALS),
      wolf: new THREE.InstancedMesh(this.animalWolfGeometry, this.animalManager.materials.wolf, MAX_ANIMALS)
    }
    this.instancedAnimals.deer.castShadow = this.instancedAnimals.deer.receiveShadow = true
    this.instancedAnimals.wolf.castShadow = this.instancedAnimals.wolf.receiveShadow = true

    this.instancedAnimals.deer.customDepthMaterial = this.animalManager.materials.depth
    this.instancedAnimals.wolf.customDepthMaterial = this.animalManager.materials.depth

    this.instancedAnimals.deer.material = this.animalManager.materials.deer
    this.instancedAnimals.wolf.material = this.animalManager.materials.wolf

    Object.values(this.instancedAnimals).forEach((mesh) => {
      mesh.frustumCulled = false
      this.scene.add(mesh)
    })

    // Instanced Animals Picking Meshes
    this.instancedAnimalsPicking = {
      deer: new THREE.InstancedMesh(this.animalDeerGeometry, this.animalManager.materials.picking, MAX_ANIMALS),
      wolf: new THREE.InstancedMesh(this.animalWolfGeometry, this.animalManager.materials.picking, MAX_ANIMALS)
    }
    Object.values(this.instancedAnimalsPicking).forEach((mesh) => {
      mesh.material = this.animalManager.materials.picking
      mesh.frustumCulled = false
      mesh.layers.set(PICKING_LAYER)
      this.scene.add(mesh)
    })
  }

  private setupRainEffect() {
    this.rainPositions = new Float32Array(RAIN_COUNT * 3)
    this.rainVelocities = new Float32Array(RAIN_COUNT)
    for (let i = 0; i < RAIN_COUNT; i++) {
      this.rainVelocities[i] = Math.random() * 0.2 + 0.1
      this.rainPositions[i * 3 + 1] = 0.5 - Math.random() * (CLOUD_HEIGHT_OFFSET + 0.5)

      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 15 * TILE_SIZE
      this.rainPositions[i * 3 + 0] = Math.cos(angle) * radius
      this.rainPositions[i * 3 + 2] = Math.sin(angle) * radius
    }

    this.rainGroup = new THREE.Group()
    this.rainGroup.visible = false
    this.scene.add(this.rainGroup)

    // Cloud Mesh
    const cloudGeo = new THREE.IcosahedronGeometry(1, 3)
    this.rainCloudMaterial = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uBrushSize: { value: 1.0 },
        uIntensity: { value: 0.5 },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#777777') }
      },
      vertexShader: `
        varying vec3 vNormal;
        uniform float uBrushSize;
        uniform float uIntensity;
        uniform float uTime;

        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float noise(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
                         mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
                     mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
                         mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
        }

        void main() {
          vNormal = normal;
          float radius = uBrushSize;
          vec3 pos = position;
          float n = noise(pos * 2.0 + uTime * 0.5);
          float displacement = n * radius * 0.2 * (0.5 + uIntensity * 0.5);
          vec3 displacedPosition = pos * radius;
          displacedPosition.y *= 0.1;
          displacedPosition += normal * displacement;
          displacedPosition.y *= 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 uColor;
        uniform float uIntensity;

        void main() {
          float dotProduct = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0)));
          float light = max(0.5, dotProduct);
          vec3 color = uColor * (1.1 - uIntensity * 0.4);
          gl_FragColor = vec4(color * light, 0.6 + uIntensity * 0.3);
        }
      `
    })

    this.rainCloudMesh = new THREE.Mesh(cloudGeo, this.rainCloudMaterial)
    this.rainCloudMesh.position.set(0, 0, 0)
    this.rainGroup.add(this.rainCloudMesh)

    // Rain points
    const pointsGeo = new THREE.BufferGeometry()
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3))

    this.rainMaterial = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uColor: { value: new THREE.Color('#ffffff') },
        uOpacity: { value: 0.6 },
        uIntensity: { value: 0.5 },
        uSize: { value: 0.1 }
      },
      vertexShader: `
        uniform float uSize;
        uniform float uIntensity;
        varying float vLocalY;
        varying float vId;

        void main() {
          vLocalY = position.y;
          vId = float(gl_VertexID) / 500.0;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uIntensity;
        varying float vLocalY;
        varying float vId;

        void main() {
          if (vLocalY > 0.0) discard;
          if (vId > uIntensity) discard;
          if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
          float finalOpacity = uOpacity * (0.5 + uIntensity * 0.5);
          gl_FragColor = vec4(uColor, finalOpacity);
        }
      `
    })

    this.rainPoints = new THREE.Points(pointsGeo, this.rainMaterial)
    this.rainGroup.add(this.rainPoints)
  }

  private setupMouseListeners() {
    if (!(this.canvas instanceof HTMLCanvasElement)) return

    const el = this.canvas

    const onMouseMove = (e: Event) => {
      const mouseEvent = e as MouseEvent
      const rect = el.getBoundingClientRect()
      this.mouse.x = ((mouseEvent.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((mouseEvent.clientY - rect.top) / rect.height) * 2 + 1
    }

    const onMouseLeave = () => {
      this.mouse.set(-999, -999)
    }

    const onMouseDown = (e: Event) => {
      const mouseEvent = e as MouseEvent
      const state = useStore.getState()
      if (state.mode === 'PLAY') {
        if (mouseEvent.button === 0 && state.hoveredCell) {
          state.placeBuilding(state.hoveredCell.x, state.hoveredCell.z, state.selectedBuildingType)
        }
      } else if (state.mode === 'EDITOR') {
        if (mouseEvent.button === 0) this.isPainting = true
        if (mouseEvent.button === 2) this.isErasing = true
      }
    }

    const onMouseUp = (e: Event) => {
      const mouseEvent = e as MouseEvent
      if (mouseEvent.button === 0) this.isPainting = false
      if (mouseEvent.button === 2) this.isErasing = false
    }

    const onContextMenu = (e: Event) => {
      const state = useStore.getState()
      if (state.mode === 'EDITOR') {
        e.preventDefault()
      }
    }

    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('mouseleave', onMouseLeave)
    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('mouseup', onMouseUp)
    el.addEventListener('contextmenu', onContextMenu)

    this.listeners.push({ element: el, type: 'mousemove', handler: onMouseMove })
    this.listeners.push({ element: el, type: 'mouseleave', handler: onMouseLeave })
    this.listeners.push({ element: el, type: 'mousedown', handler: onMouseDown })
    this.listeners.push({ element: el, type: 'mouseup', handler: onMouseUp })
    this.listeners.push({ element: el, type: 'contextmenu', handler: onContextMenu })

    // Also listen to window level mouseup to end painting/erasing when dragging off canvas
    window.addEventListener('mouseup', onMouseUp)
    this.listeners.push({ element: window, type: 'mouseup', handler: onMouseUp })
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  /**
   * Main simulation frame tick.
   * Called on requestAnimationFrame.
   */
  public update() {
    const elapsed = (performance.now() - this.startTime) / 1000
    this.uniforms.uTime.value = elapsed

    const state = useStore.getState()
    const {
      isLoading,
      setIsLoading,
      gameState,
      gameTime,
      day,
      rainIntensity,
      sWater,
      gWater,
      tHeight,
      rLevel,
      aCap,
      terrainVertices,
      terrainVersion,
      activeTerrainId,
      buildings,
      humans,
      animals,
      mode,
      editorLayerType,
      editorBrushSize,
      editorBrushStrength,
      isEditorInteracting,
      hoveredCell,
      isCtrlPressed,
      paintTerrain
    } = state

    // Automatically hide initialization overlay once the 3D scene starts rendering
    if (isLoading) {
      setIsLoading(false)
    }

    // Update shaders uniforms for cell hovering and editor brush highlighting
    this.uniforms.uMode.value = mode === 'EDITOR' ? 1 : 0
    this.uniforms.uBrushSize.value = editorBrushSize
    const isWaterOrRain = ['RAIN', 'WATER_SOURCE', 'WATER_SINK'].includes(editorLayerType)
    this.uniforms.uBrushStrength.value = isWaterOrRain ? editorBrushStrength : editorBrushStrength * 0.1
    if (hoveredCell) {
      this.uniforms.uHoveredCell.value.set(hoveredCell.x, hoveredCell.z)
    } else {
      this.uniforms.uHoveredCell.value.set(-1, -1)
    }

    // Disable controls while painting in editor mode to prevent camera movement
    if (this.controls) {
      this.controls.enabled = !(mode === 'EDITOR' && isCtrlPressed)
    }

    // In editor mode, handle continuous terrain painting
    if (mode === 'EDITOR' && isCtrlPressed && (this.isPainting || this.isErasing) && hoveredCell) {
      paintTerrain(hoveredCell.x, hoveredCell.z, this.isErasing)
    }

    // Sync editor interacting status to Zustand
    const isInteracting = isCtrlPressed && (this.isPainting || this.isErasing)
    if (isInteracting !== isEditorInteracting) {
      state.setEditorInteracting(isInteracting)
    }

    // 1. Sync Terrain & Simulation properties if active terrain changed or updated
    const isNewTerrain = activeTerrainId !== this.lastActiveTerrainId
    if (isNewTerrain) {
      this.lastActiveTerrainId = activeTerrainId
      this.lastTerrainVersion = -1 // Force reload
    }

    if (terrainVertices && terrainVertices.length > 0 && terrainVersion !== this.lastTerrainVersion) {
      this.lastTerrainVersion = terrainVersion

      // Adjust height range visual range uniforms
      const terrainConfig = getTerrainById(activeTerrainId)
      if (terrainConfig) {
        this.uniforms.uVisualRange.value.set(...terrainConfig.visualRange)
      }

      this.gpuSim.setInitialWater(sWater, gWater, tHeight)
      this.gpuSim.updateTerrain(terrainVertices, rLevel, aCap)
      
      const types: LayerType[] = ['ROCK', 'GRAVEL', 'SAND', 'HUMUS', 'PAVEMENT', 'WATER', 'RAIN', 'WATER_SOURCE', 'WATER_SINK']
      const layerPermeabilities = new Float32Array(types.map((t) => MATERIAL_PROPERTIES[t].permeability))
      this.gpuSim.updateMaterialProperties(layerPermeabilities)

      this.terrainManager.update(terrainVertices, rLevel, aCap)

      // Re-triangulate dynamic indices
      const indices = computeAdaptiveIndices(terrainVertices)
      this.staticGeometry.setIndex(new THREE.BufferAttribute(indices, 1))

      this.uniforms.uTerrainLayers.value = this.terrainManager.layerTex
      this.uniforms.uTerrainSurface.value = this.terrainManager.surfaceTex
      this.treeManager.updateHeightTexture(this.terrainManager.surfaceTex)
      this.animalManager.updateHeightTexture(this.terrainManager.surfaceTex)
    }

    // 2. Perform Water Simulation Steps
    if (gameState === 'PLAY') {
      const terrainConfig = getTerrainById(activeTerrainId)
      const currentSeaLevel = SEA_LEVEL + Math.sin(day * 0.5 + gameTime * 0.02) * 0.2
      const inflow = terrainConfig?.getInflow ? terrainConfig.getInflow(gameTime) : 0

      // In Rain painting, feed coordinates to GPU sim
      const isRainPainting = mode === 'EDITOR' && isEditorInteracting && editorLayerType === 'RAIN'
      const rainBrushPos = new THREE.Vector2(-1, -1)
      if (isRainPainting && hoveredCell) {
        rainBrushPos.set(hoveredCell.x, GRID_SIZE - 1 - hoveredCell.z)
      }

      for (let i = 0; i < 5; i++) {
        this.gpuSim.step(
          rainIntensity,
          inflow,
          currentSeaLevel,
          elapsed,
          rainBrushPos,
          editorBrushSize,
          editorBrushStrength
        )
      }
      this.gpuSim.readBack(sWater, gWater, tHeight)

      const waterTex = this.gpuSim.getWaterTexture()
      this.uniforms.waterMap.value = waterTex
      state.setTextures(this.terrainManager.surfaceTex, waterTex as THREE.DataTexture)
    }

    // 3. Update Day/Night Cycle Lights
    const timeRatio = gameTime / 1440
    const sunAngle = timeRatio * 2 * Math.PI - Math.PI / 2
    const intensityFactor = Math.max(0, Math.sin(sunAngle))

    // Transition from a lighter twilight blue at night to sky blue during the day
    const skyR = (80 + intensityFactor * 55) / 255
    const skyG = (90 + intensityFactor * 116) / 255
    const skyB = (115 + intensityFactor * 120) / 255
    this.scene.background = new THREE.Color(skyR, skyG, skyB)

    // Significantly higher ambient floor at night (1.50) and day (1.80) to make everything easily recognizable
    this.ambientLight.intensity = 1.50 + intensityFactor * 0.30
    this.hemisphereLight.intensity = 1.00 + intensityFactor * 0.40
    this.directionalLight.intensity = intensityFactor * 4.00
    this.directionalLight.position.set(Math.cos(sunAngle) * 20, Math.sin(sunAngle) * 20, 10)

    // 4. Render Rain Effect
    const isRainSelected = mode === 'EDITOR' && editorLayerType === 'RAIN'
    const isRainPainting = isRainSelected && isEditorInteracting

    if (isRainSelected && hoveredCell) {
      this.rainGroup.visible = true
      const [wx, wz] = gridToWorld(hoveredCell.x, hoveredCell.z)
      const centerIdx = hoveredCell.z * GRID_SIZE + hoveredCell.x
      let maxHeight = tHeight[centerIdx] + sWater[centerIdx]
      const brushRadius = Math.ceil(editorBrushSize)

      for (let dx = -brushRadius; dx <= brushRadius; dx++) {
        for (let dz = -brushRadius; dz <= brushRadius; dz++) {
          const nx = hoveredCell.x + dx
          const nz = hoveredCell.z + dz
          if (nx >= 0 && nx < GRID_SIZE && nz >= 0 && nz < GRID_SIZE) {
            if (dx * dx + dz * dz <= (editorBrushSize + 0.1) * (editorBrushSize + 0.1)) {
              const cellIdx = nz * GRID_SIZE + nx
              const cellHeight = tHeight[cellIdx] + sWater[cellIdx]
              if (cellHeight > maxHeight) {
                maxHeight = cellHeight
              }
            }
          }
        }
      }
      const targetY = maxHeight + CLOUD_HEIGHT_OFFSET

      this.rainGroup.position.x += (wx - this.rainGroup.position.x) * 0.2
      this.rainGroup.position.z += (wz - this.rainGroup.position.z) * 0.2
      this.rainGroup.position.y += (targetY - this.rainGroup.position.y) * 0.2

      this.rainCloudMaterial.uniforms.uTime.value = elapsed
      this.rainCloudMaterial.uniforms.uBrushSize.value = editorBrushSize * TILE_SIZE
      this.rainCloudMaterial.uniforms.uIntensity.value = editorBrushStrength

      this.rainPoints.visible = isRainPainting
      this.rainMaterial.uniforms.uIntensity.value = editorBrushStrength

      const rainPosAttr = this.rainPoints.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < RAIN_COUNT; i++) {
        let y = rainPosAttr.getY(i)
        y -= this.rainVelocities[i]
        if (y < -CLOUD_HEIGHT_OFFSET) {
          y = 0.5 + (Math.random() - 0.5) * 0.1
          const angle = Math.random() * Math.PI * 2
          const radius = Math.random() * editorBrushSize * TILE_SIZE
          rainPosAttr.setX(i, Math.cos(angle) * radius)
          rainPosAttr.setZ(i, Math.sin(angle) * radius)
        }
        rainPosAttr.setY(i, y)
      }
      rainPosAttr.needsUpdate = true
    } else {
      this.rainGroup.visible = false
    }

    // 5. Instanced Trees & Animals
    if (terrainVertices && terrainVertices.length > 0) {
      // Hover building ID check
      const hoveredBuilding = buildings.find((b) => b.id === state.hoveredEntityId)
      this.treeManager.updateHoveredEntity(hoveredBuilding ? hoveredBuilding.pickingId || 0 : null)
      this.treeManager.updateTime(elapsed)

      // Instanced Trees matrix update
      if (this.instancedTrees && this.instancedTreesPicking) {
        this.treeManager.updateInstances(
          this.instancedTrees,
          this.instancedTreesPicking,
          buildings,
          terrainVertices
        )
      }

      // Animals matrix update
      const hoveredAnimal = animals.find((a) => a.id === state.hoveredEntityId)
      this.animalManager.updateHoveredEntity(hoveredAnimal ? hoveredAnimal.pickingId || 0 : null)
      this.animalManager.updateTime(elapsed)

      if (this.instancedAnimals && this.instancedAnimalsPicking) {
        this.animalManager.updateInstances(
          this.instancedAnimals.deer,
          this.instancedAnimals.wolf,
          this.instancedAnimalsPicking.deer,
          this.instancedAnimalsPicking.wolf,
          animals
        )
      }
    }

    // 6. Non-Tree Buildings Placement & Sync
    if (terrainVertices && terrainVertices.length > 0) {
      const activeIds = new Set<string>()

      buildings
        .filter((b) => !['TREE', 'TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'].includes(b.type))
        .forEach((b) => {
          activeIds.add(b.id)
          const worldX = (b.x + (b.width - 1) / 2) * TILE_SIZE - OFFSET
          const worldZ = (b.z + (b.height - 1) / 2) * TILE_SIZE - OFFSET
          const gridX = (worldX + BOUNDARY) / TILE_SIZE
          const gridZ = (worldZ + BOUNDARY) / TILE_SIZE
          const hCenter = getInterpolatedHeight(terrainVertices, gridX, gridZ)

          let group = this.buildingMeshes.get(b.id)
          if (!group) {
            group = createBuildingGroup(b.type, b.isReady, b.progress, b.width, b.height)

            // Add picking mesh to the building group
            const meshScale = b.width * TILE_SIZE * 0.8
            const pickingColor = new THREE.Color(
              Math.floor(((b.pickingId || 0) + 1) / 256) / 255,
              (((b.pickingId || 0) + 1) % 256) / 255,
              1.0 // b=255 for buildings
            )
            const pickMat = new THREE.MeshBasicMaterial({ color: pickingColor })
            let pickMesh: THREE.Mesh
            if (b.type === 'FENCE') {
              pickMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.2), pickMat)
              pickMesh.position.set(0, 0.25, 0)
            } else {
              pickMesh = new THREE.Mesh(new THREE.BoxGeometry(meshScale, meshScale / 1.5, meshScale), pickMat)
              pickMesh.position.set(0, meshScale / 3, 0)
            }
            pickMesh.layers.set(PICKING_LAYER)
            group.add(pickMesh)

            this.scene.add(group)
            this.buildingMeshes.set(b.id, group)
          } else {
            // Update building growth scale dynamically if not ready
            if (!b.isReady && b.type !== 'FENCE') {
              const scaleRatio = 0.4 + (b.progress / 100) * 0.6
              const buildGroup = group.children[0]
              if (buildGroup) buildGroup.scale.setScalar(scaleRatio)
            }
          }

          group.position.set(worldX, hCenter, worldZ)
        })

      // Clean up deleted buildings
      this.buildingMeshes.forEach((group, id) => {
        if (!activeIds.has(id)) {
          this.scene.remove(group)
          group.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              obj.geometry.dispose()
              if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
              else obj.material.dispose()
            }
          })
          this.buildingMeshes.delete(id)
        }
      })
    }

    // 7. Human Mesh Sync
    if (terrainVertices && terrainVertices.length > 0) {
      const activeHumanIds = new Set<string>()

      humans.forEach((h) => {
        activeHumanIds.add(h.id)
        const gridX = (h.position[0] + BOUNDARY) / TILE_SIZE
        const gridZ = (h.position[1] + BOUNDARY) / TILE_SIZE
        const hCenter = getInterpolatedHeight(terrainVertices, gridX, gridZ)

        let group = this.humanMeshes.get(h.id)
        if (!group) {
          group = createHumanMesh(h.color, h.outfitColor, h.state === 'SLEEPING')

          // Add picking mesh to group
          const pickingColor = new THREE.Color(
            Math.floor(((h.pickingId || 0) + 1) / 256) / 255,
            (((h.pickingId || 0) + 1) % 256) / 255,
            254 / 255 // b=254 for humans
          )
          const pickMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 0.5, 6),
            new THREE.MeshBasicMaterial({ color: pickingColor })
          )
          pickMesh.name = 'pickingMesh'
          pickMesh.position.set(0, 0.25, 0)
          pickMesh.layers.set(PICKING_LAYER)
          group.add(pickMesh)

          this.scene.add(group)
          this.humanMeshes.set(h.id, group)
        } else {
          // Dynamic visual highlights on hover
          const isHovered = h.id === state.hoveredEntityId
          const emissiveVal = isHovered ? 0.2 : 0
          group.traverse((obj) => {
            if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
              obj.material.emissive.setScalar(emissiveVal)
            }
          })
        }

        group.position.set(h.position[0], hCenter, h.position[1])
        group.rotation.y = h.rotation
      })

      // Clean up deleted humans
      this.humanMeshes.forEach((group, id) => {
        if (!activeHumanIds.has(id)) {
          this.scene.remove(group)
          group.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              obj.geometry.dispose()
              if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
              else obj.material.dispose()
            }
          })
          this.humanMeshes.delete(id)
        }
      })
    }

    // 8. Update Placement Preview Mesh
    if (this.interactive && hoveredCell && state.selectedBuildingType !== 'NONE') {
      const type = state.selectedBuildingType
      const size = BUILDING_SIZES[type] || { width: 1, height: 1 }

      // Validate placement for visual preview styling
      let valid = true
      if (hoveredCell.x + size.width > GRID_SIZE || hoveredCell.z + size.height > GRID_SIZE) {
        valid = false
      } else if (type === 'CUT_TREE') {
        const bId = state.occupancyGrid[hoveredCell.x][hoveredCell.z]
        const b = buildings.find((x) => x.id === bId)
        valid = !!(b && ['TREE', 'TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'].includes(b.type))
      } else {
        const isTreeType = ['TREE', 'TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'].includes(type)
        if (isTreeType && terrainVertices && terrainVertices.length > 0) {
          let isHumusCell = true
          for (let di = 0; di <= 1; di++) {
            for (let dj = 0; dj <= 1; dj++) {
              const v = terrainVertices[hoveredCell.x + di][hoveredCell.z + dj]
              if (v[v.length - 1].type !== 'HUMUS') {
                isHumusCell = false
                break
              }
            }
            if (!isHumusCell) break
          }
          if (!isHumusCell) valid = false
        }

        if (valid) {
          for (let i = hoveredCell.x; i < hoveredCell.x + size.width; i++) {
            for (let j = hoveredCell.z; j < hoveredCell.z + size.height; j++) {
              if (state.occupancyGrid[i][j] || sWater[i * GRID_SIZE + j] > 0.05) {
                valid = false
                break
              }
            }
            if (!valid) break
          }
        }

        // Validate flatness for specific buildings
        if (valid && ['HOUSE', 'FARM', 'LUMBER_MILL', 'QUARRY'].includes(type) && terrainVertices && terrainVertices.length > 0) {
          if (!isAreaFlat(terrainVertices, hoveredCell.x, hoveredCell.z, size.width, size.height)) {
            valid = false
          }
        }
      }

      if (valid && type !== 'ROAD' && type !== 'EXCAVATE' && type !== 'FILL' && type !== 'CUT_TREE') {
        // Recreate preview if parameters changed
        if (
          !this.previewGroup ||
          this.lastPreviewType !== type ||
          this.lastPreviewWidth !== size.width ||
          this.lastPreviewHeight !== size.height
        ) {
          if (this.previewGroup) this.scene.remove(this.previewGroup)
          this.previewGroup = createPlacementPreviewGroup(type, size.width, size.height)
          this.scene.add(this.previewGroup)
          this.lastPreviewType = type
          this.lastPreviewWidth = size.width
          this.lastPreviewHeight = size.height
        }

        this.previewGroup.visible = true
        const worldX = (hoveredCell.x + (size.width - 1) / 2) * TILE_SIZE - OFFSET
        const worldZ = (hoveredCell.z + (size.height - 1) / 2) * TILE_SIZE - OFFSET
        const gridX = (worldX + BOUNDARY) / TILE_SIZE
        const gridZ = (worldZ + BOUNDARY) / TILE_SIZE
        if (terrainVertices && terrainVertices.length > 0) {
          const hCenter = getInterpolatedHeight(terrainVertices, gridX, gridZ)
          this.previewGroup.position.set(worldX, hCenter, worldZ)
        }
      } else {
        if (this.previewGroup) this.previewGroup.visible = false
      }
    } else {
      if (this.previewGroup) this.previewGroup.visible = false
    }

    // 9. Run Interactive Picking Pass
    if (this.interactive && this.mouse.x !== -999 && this.mouse.y !== -999) {
      const width = this.renderer.domElement.clientWidth
      const height = this.renderer.domElement.clientHeight
      const pixelX = (this.mouse.x * 0.5 + 0.5) * width
      const pixelY = (this.mouse.y * 0.5 + 0.5) * height

      const isEditor = state.mode === 'EDITOR'
      if (this.instancedTreesPicking) {
        Object.values(this.instancedTreesPicking).forEach(mesh => {
          mesh.visible = !isEditor
        })
      }
      if (this.instancedAnimalsPicking) {
        Object.values(this.instancedAnimalsPicking).forEach(mesh => {
          mesh.visible = !isEditor
        })
      }
      this.humanMeshes.forEach(group => {
        const pickMesh = group.getObjectByName('pickingMesh')
        if (pickMesh) {
          pickMesh.visible = !isEditor
        }
      })

      const originalMask = this.camera.layers.mask
      this.camera.setViewOffset(width, height, pixelX, height - pixelY, 1, 1)
      this.camera.layers.set(PICKING_LAYER)

      const currentRenderTarget = this.renderer.getRenderTarget()
      const originalClearColor = this.renderer.getClearColor(new THREE.Color())
      const originalClearAlpha = this.renderer.getClearAlpha()

      this.renderer.setRenderTarget(this.pickingTarget)
      this.renderer.setClearColor(0x000000, 0)
      this.renderer.clear()
      this.renderer.render(this.scene, this.camera)

      this.renderer.setRenderTarget(currentRenderTarget)
      this.renderer.setClearColor(originalClearColor, originalClearAlpha)

      this.camera.clearViewOffset()
      this.camera.layers.mask = originalMask

      if (isEditor) {
        if (this.instancedTreesPicking) {
          Object.values(this.instancedTreesPicking).forEach(mesh => {
            mesh.visible = true
          })
        }
        if (this.instancedAnimalsPicking) {
          Object.values(this.instancedAnimalsPicking).forEach(mesh => {
            mesh.visible = true
          })
        }
        this.humanMeshes.forEach(group => {
          const pickMesh = group.getObjectByName('pickingMesh')
          if (pickMesh) {
            pickMesh.visible = true
          }
        })
      }

      this.renderer.readRenderTargetPixels(this.pickingTarget, 0, 0, 1, 1, this.pickingPixelBuffer)

      const r = this.pickingPixelBuffer[0]
      const g = this.pickingPixelBuffer[1]
      const b = this.pickingPixelBuffer[2]

      if (b === 0) {
        // Terrain
        if (r > 0 && g > 0) {
          state.setHoveredCell({ x: r - 1, z: g - 1 })
          state.setHoveredEntityId(null)
        } else {
          state.setHoveredCell(null)
          state.setHoveredEntityId(null)
        }
      } else {
        // Entity hovered
        state.setHoveredCell(null)
        const rawPickingId = (r << 8) | g
        const pickingId = rawPickingId - 1
        let foundId: string | null = null

        if (b === 255) {
          // Building / Tree
          const building = buildings.find((x) => x.pickingId === pickingId || x.pickingId === rawPickingId)
          foundId = building ? building.id : null
        } else if (b === 254) {
          // Human
          const human = humans.find((h) => h.pickingId === pickingId || h.pickingId === rawPickingId)
          foundId = human ? human.id : null
        } else if (b === 253) {
          // Animal
          const animal = animals.find((a) => a.pickingId === pickingId || a.pickingId === rawPickingId)
          foundId = animal ? animal.id : null
        }

        state.setHoveredEntityId(foundId)
      }
    }

    // 10. Update FPS counter in store
    if (this.interactive) {
      if (this.lastFpsTime === 0) {
        this.lastFpsTime = performance.now()
      } else {
        this.fpsFrames++
        const now = performance.now()
        if (now >= this.lastFpsTime + 1000) {
          state.setFps(Math.round((this.fpsFrames * 1000) / (now - this.lastFpsTime)))
          this.fpsFrames = 0
          this.lastFpsTime = now
        }
      }
    }

    // 11. Final Render Pass
    if (this.controls && this.controls.enabled) {
      this.controls.update()
    }
    this.renderer.render(this.scene, this.camera)
  }

  /**
   * Destroys materials, geometries, and removes event listeners to prevent WebGL context leakage.
   */
  public dispose() {
    // 1. Remove event listeners
    this.listeners.forEach((listener) => {
      listener.element.removeEventListener(listener.type, listener.handler)
    })
    this.listeners = []

    // 2. Dispose controls
    if (this.controls) {
      this.controls.dispose()
    }

    // 3. Dispose managers
    this.treeManager.dispose()
    this.animalManager.dispose()

    // 4. Dispose scene items
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.InstancedMesh) {
        obj.geometry.dispose()
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose())
        } else {
          obj.material.dispose()
        }
      }
    })

    // 5. Dispose specific items
    this.staticGeometry.dispose()
    this.sideGeometry.dispose()
    this.treeConiferTrunkGeometry.dispose()
    this.treeDeciduousTrunkGeometry.dispose()
    this.treeBirchTrunkGeometry.dispose()
    this.treeConiferGeometry.dispose()
    this.treeDeciduousGeometry.dispose()
    this.treeBirchGeometry.dispose()
    this.animalDeerGeometry.dispose()
    this.animalWolfGeometry.dispose()

    this.terrainMaterial.dispose()
    this.terrainPickingMaterial.dispose()
    this.terrainDepthMaterial.dispose()
    this.waterMaterial.dispose()
    this.waterPickingMaterial.dispose()
    this.terrainSideMaterialN.dispose()
    this.terrainSideMaterialS.dispose()
    this.terrainSideMaterialE.dispose()
    this.terrainSideMaterialW.dispose()
    this.waterSideMaterialN.dispose()
    this.waterSideMaterialS.dispose()
    this.waterSideMaterialE.dispose()
    this.waterSideMaterialW.dispose()

    this.buildingMeshes.forEach((g) => {
      g.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          obj.material.dispose()
        }
      })
    })
    this.buildingMeshes.clear()

    this.humanMeshes.forEach((g) => {
      g.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          obj.material.dispose()
        }
      })
    })
    this.humanMeshes.clear()

    if (this.previewGroup) {
      this.previewGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          obj.material.dispose()
        }
      })
    }

    if (this.pickingTarget) {
      this.pickingTarget.dispose()
    }

    // 6. Dispose WebGLRenderer
    this.renderer.dispose()
  }
}

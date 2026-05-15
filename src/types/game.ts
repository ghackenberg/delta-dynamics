import * as THREE from 'three'

export type BuildingType = 'HOUSE' | 'FARM' | 'LUMBER_MILL' | 'QUARRY' | 'NONE' | 'ROAD' | 'EXCAVATE' | 'FILL' | 'TREE' | 'TREE_CONIFER' | 'TREE_DECIDUOUS' | 'TREE_BIRCH' | 'CUT_TREE' | 'FENCE' | 'PUMP' | 'DIKE'

export interface BuildingInstance {
  id: string
  pickingId?: number
  type: BuildingType
  level: number
  progress: number 
  isReady: boolean
  assignedWorkers: string[] 
  x: number 
  z: number 
  width: number
  height: number
}

export interface Human {
  id: string
  pickingId?: number
  name: string
  position: [number, number]
  rotation: number
  target: [number, number] | null
  state: 'IDLE' | 'MOVING' | 'WORKING' | 'SLEEPING' | 'EATING'
  homeId: string | null
  workplaceId: string | null 
  color: string 
  outfitColor: string 
}

export type AnimalType = 'DEER' | 'WOLF'

export interface Animal {
  id: string
  pickingId?: number
  type: AnimalType
  position: [number, number]
  rotation: number
  target: [number, number] | null
  state: 'IDLE' | 'WANDERING'
  waitCounter: number
}

export type LayerType = 'ROCK' | 'GRAVEL' | 'HUMUS' | 'SAND' | 'PAVEMENT' | 'WATER'

export interface TerrainLayer {
  type: LayerType
  thickness: number
}

export type TerrainVertex = TerrainLayer[]

export interface TerrainData {
  vertices: TerrainVertex[][]
  sWater: Float32Array
  gWater: Float32Array
  tHeight: Float32Array
  aCap: Float32Array
  rLevel: Float32Array
  buildings: BuildingInstance[]
  occupancyGrid: (string | null)[][]
}

export interface TerrainConfig {
  id: string
  name: string
  visualRange: [number, number] // [minY, maxY] for rendering sides/depth
  generate: () => TerrainData
  getInflow?: (gameTime: number) => number
}

export interface GameResources {
  food: number
  wood: number
  stone: number
  gold: number
}

export interface GameState {
  gameTime: number 
  day: number
  isNight: boolean
  simulationSpeed: number 
  resources: GameResources
  rates: GameResources
  buildings: BuildingInstance[]
  occupancyGrid: (string | null)[][] 
  terrainVertices: TerrainVertex[][]
  terrainVersion: number
  activeTerrainId: string
  
  // Buffers for simulation (Flattened 100x100)
  sWater: Float32Array
  gWater: Float32Array
  tHeight: Float32Array
  aCap: Float32Array
  rLevel: Float32Array
  
  // GPU Textures
  heightTexture: THREE.DataTexture
  waterTexture: THREE.DataTexture

  humans: Human[]
  animals: Animal[]
  aiStatus: string
  isAiLoading: boolean
  aiResponse: string
  rainIntensity: number 
  selectedBuildingType: BuildingType
  hoveredCell: { x: number, z: number } | null
  hoveredEntityId: string | null
  tick: () => void
  simulateWater: () => void
  setSelectedBuildingType: (type: BuildingType) => void
  setHoveredCell: (cell: { x: number, z: number } | null) => void
  setHoveredEntityId: (id: string | null) => void
  placeBuilding: (x: number, z: number, type: BuildingType) => void
  setAiStatus: (status: string) => void
  setAiLoading: (loading: boolean) => void
  setAiResponse: (response: string) => void
  setRainIntensity: (intensity: number) => void
  spawnHuman: (homeId: string) => void
  spawnAnimal: (type: AnimalType, x?: number, z?: number) => void
}

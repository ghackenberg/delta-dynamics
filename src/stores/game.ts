import * as THREE from 'three'
import type { StateCreator } from 'zustand'
import type { 
  BuildingInstance, 
  Human, 
  Animal, 
  TerrainVertex, 
  GameResources, 
  AnimalType,
  BuildingType
} from '../types/game'
import { 
  GRID_SIZE, 
  TILE_SIZE, 
  BOUNDARY, 
  INITIAL_RESOURCES, 
  BUILDING_SIZES,
  MAX_TREES
} from '../constants/gameConfig'
import { gridToWorld } from '../utils/gameUtils'
import { generateInitialTerrain, paintArea, isAreaFlat } from '../systems/terrainSystem'
import { 
  findSafeLandPosition, 
  getRandomSkinTone, 
  getRandomOutfitColor, 
  updateHuman, 
  updateAnimal 
} from '../systems/entitySystem'
import { 
  calculateRates, 
  updateConstruction, 
  checkBuildingCost, 
  deductBuildingCost 
} from '../systems/economySystem'
import type { EditorSlice } from './editor'
import type { AiSlice } from './ai'
import type { UiSlice } from './ui'

const createDataTexture = () => {
  const data = new Float32Array(GRID_SIZE * GRID_SIZE * 4)
  const tex = new THREE.DataTexture(data, GRID_SIZE, GRID_SIZE, THREE.RGBAFormat, THREE.FloatType)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  return tex
}

const heightTexture = createDataTexture()
const waterTexture = createDataTexture()

const activeTerrainId = 'river-lake'
const { 
  vertices: initialVertices, 
  sWater: initialSWater, 
  gWater: initialGWater, 
  tHeight: initialTHeight, 
  aCap: initialACap, 
  rLevel: initialRLevel, 
  buildings: initialBuildings, 
  occupancyGrid: initialOccupancy 
} = generateInitialTerrain(activeTerrainId)

const initialHumans = [{ 
  id: 'starter', 
  pickingId: 1, 
  name: 'Leader', 
  position: findSafeLandPosition(initialSWater), 
  rotation: 0, 
  target: null, 
  state: 'IDLE' as const, 
  homeId: null, 
  workplaceId: null, 
  color: getRandomSkinTone(), 
  outfitColor: getRandomOutfitColor() 
}]

const initialAnimals: Animal[] = []
const animalConfigs: {type: AnimalType, pos: [number, number]}[] = [
  { type: 'DEER', pos: [2, 2] }, { type: 'DEER', pos: [5, -3] }, { type: 'DEER', pos: [-4, 6] }, 
  { type: 'WOLF', pos: [-2, -2] }, { type: 'WOLF', pos: [-7, -5] },
]
animalConfigs.forEach((config, idx) => {
  const gridX = Math.floor((config.pos[0] + BOUNDARY) / TILE_SIZE)
  const gridZ = Math.floor((config.pos[1] + BOUNDARY) / TILE_SIZE)
  let finalPos = config.pos
  if (gridX >= 0 && gridX < GRID_SIZE && gridZ >= 0 && gridZ < GRID_SIZE && initialSWater[gridZ * GRID_SIZE + gridX] > 0.05) {
    finalPos = findSafeLandPosition(initialSWater)
  }
  initialAnimals.push({ 
    id: `${config.type.toLowerCase()}${idx + 1}`, 
    pickingId: idx + 1, 
    type: config.type, 
    position: finalPos, 
    rotation: 0, 
    target: null, 
    state: 'IDLE' as const, 
    waitCounter: 0 
  })
})

export interface GameSlice {
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
  sWater: Float32Array
  gWater: Float32Array
  tHeight: Float32Array
  aCap: Float32Array
  rLevel: Float32Array
  heightTexture: THREE.DataTexture
  waterTexture: THREE.DataTexture
  humans: Human[]
  animals: Animal[]
  rainIntensity: number
  tick: () => void
  spawnHuman: (homeId: string) => void
  spawnAnimal: (type: AnimalType, x?: number, z?: number) => void
  placeBuilding: (x: number, z: number, type: BuildingType) => void
  paintTerrain: (x: number, z: number, isErase: boolean) => void
  resetTerrain: () => void
  setRainIntensity: (intensity: number) => void
  setTextures: (height: THREE.DataTexture, water: THREE.DataTexture) => void
}

export type StoreState = GameSlice & EditorSlice & AiSlice & UiSlice

export const createGameSlice: StateCreator<StoreState, [], [], GameSlice> = (set, get) => ({
  gameTime: 480, 
  day: 1, 
  isNight: false, 
  simulationSpeed: 50, 
  rainIntensity: 0,
  resources: { ...INITIAL_RESOURCES }, 
  rates: { food: 0, wood: 0, stone: 0, gold: 0 },
  buildings: initialBuildings, 
  occupancyGrid: initialOccupancy, 
  terrainVertices: initialVertices, 
  terrainVersion: 0, 
  activeTerrainId: 'river-lake',
  sWater: initialSWater, 
  gWater: initialGWater, 
  tHeight: initialTHeight, 
  aCap: initialACap, 
  rLevel: initialRLevel,
  heightTexture, 
  waterTexture,
  humans: initialHumans,
  animals: initialAnimals,

  tick: () => {
    const state = get()
    const { sWater, gWater } = state
    
    const newRainIntensity = Math.max(0, state.rainIntensity - 0.001)
    let newTime = state.gameTime + 0.5, newDay = state.day
    if (newTime >= 1440) { newTime = 0; newDay++ }
    const isNight = newTime >= 1320 || newTime < 360
    const simulationSpeed = isNight ? 25 : 50 

    const newHumans = state.humans.map(human => updateHuman(human, isNight, state.buildings, sWater))
    const newAnimals = state.animals.map(animal => updateAnimal(animal, sWater))

    const tempState: Partial<StoreState> = { 
      sWater: state.sWater, 
      gWater: state.gWater, 
      tHeight: state.tHeight, 
      aCap: state.aCap, 
      rLevel: state.rLevel 
    }
    const { newBuildings, newOccupancy, terrainChanged } = updateConstruction(
      state.buildings, 
      newHumans, 
      state.terrainVertices, 
      state.occupancyGrid, 
      tempState
    )

    let res = { ...state.resources }
    if (!isNight && (state.gameTime % 10 === 0)) {
      res = { 
        food: res.food + state.rates.food, 
        wood: res.wood + state.rates.wood, 
        stone: res.stone + state.rates.stone, 
        gold: res.gold + state.rates.gold 
      }
    }

    const rates = calculateRates(newBuildings)

    const finalHumans = [...newHumans]
    const blueprints = newBuildings.filter(b => !b.isReady)
    finalHumans.forEach(h => { 
      if (!h.workplaceId && blueprints.length > 0) h.workplaceId = blueprints[0].id 
    })

    set({ 
      gameTime: newTime, 
      day: newDay, 
      isNight, 
      simulationSpeed: simulationSpeed, 
      rainIntensity: newRainIntensity, 
      humans: finalHumans, 
      animals: newAnimals, 
      buildings: newBuildings, 
      occupancyGrid: newOccupancy, 
      resources: res, 
      rates, 
      terrainVersion: terrainChanged ? state.terrainVersion + 1 : state.terrainVersion,
      sWater, 
      gWater,
      tHeight: tempState.tHeight!, 
      aCap: tempState.aCap!
    })
  },

  spawnHuman: (homeId) => set((state) => {
    const home = state.buildings.find(b => b.id === homeId)
    if (!home) return state
    const [wx, wz] = gridToWorld(home.x, home.z, home.width, home.height)
    const maxPickingId = state.humans.reduce((max, h) => Math.max(max, h.pickingId || 0), 0)
    return { 
      humans: [...state.humans, { 
        id: Math.random().toString(36).substr(2, 9), 
        pickingId: maxPickingId + 1, 
        name: `Villager ${state.humans.length + 1}`, 
        position: [wx, wz], 
        rotation: 0, 
        target: null, 
        state: 'IDLE' as const, 
        homeId, 
        workplaceId: null, 
        color: getRandomSkinTone(), 
        outfitColor: getRandomOutfitColor() 
      }] 
    }
  }),

  spawnAnimal: (type, x, z) => set((state) => {
    const pos: [number, number] = (x !== undefined && z !== undefined) ? [x, z] : findSafeLandPosition(state.sWater)
    const maxPickingId = state.animals.reduce((max, a) => Math.max(max, a.pickingId || 0), 0)
    return { 
      animals: [...state.animals, { 
        id: Math.random().toString(36).substr(2, 9), 
        pickingId: maxPickingId + 1, 
        type, 
        position: pos, 
        rotation: 0, 
        target: null, 
        state: 'IDLE' as const, 
        waitCounter: 0 
      }] 
    }
  }),

  placeBuilding: (xIndex, zIndex, type) => set((state) => {
    const size = BUILDING_SIZES[type] || { width: 1, height: 1 }
    if (type === 'CUT_TREE') {
      const bId = state.occupancyGrid[xIndex][zIndex]
      if (bId) {
        const b = state.buildings.find(i => i.id === bId)
        if (b && ['TREE', 'TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'].includes(b.type)) {
          const newB = state.buildings.filter(i => i.id !== bId), newO = [...state.occupancyGrid]
          for (let i = b.x; i < b.x + b.width; i++) { 
            newO[i] = [...newO[i]]; 
            for (let j = b.z; j < b.z + b.height; j++) newO[i][j] = null 
          }
          return { 
            buildings: newB, 
            occupancyGrid: newO, 
            resources: { ...state.resources, wood: state.resources.wood + 10 } 
          }
        }
      }
      return state
    }
    if (xIndex + size.width > GRID_SIZE || zIndex + size.height > GRID_SIZE) return state
    
    const isTreeType = ['TREE', 'TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'].includes(type)
    if (isTreeType) {
      let isHumusCell = true
      for (let di = 0; di <= 1; di++) {
        for (let dj = 0; dj <= 1; dj++) {
          const layers = state.terrainVertices[xIndex + di][zIndex + dj]
          if (layers[layers.length - 1].type !== 'HUMUS') {
            isHumusCell = false
            break
          }
        }
        if (!isHumusCell) break
      }
      if (!isHumusCell) return state
    }

    for (let i = xIndex; i < xIndex + size.width; i++) 
      for (let j = zIndex; j < zIndex + size.height; j++) 
        if (state.occupancyGrid[i][j] || state.sWater[j * GRID_SIZE + i] > 0.05) return state

    if (['HOUSE', 'FARM', 'LUMBER_MILL', 'QUARRY'].includes(type) && !isAreaFlat(state.terrainVertices, xIndex, zIndex, size.width, size.height)) return state
    
    if (!checkBuildingCost(type, state.resources)) return state 
    
    let actualType: BuildingType = type
    if (type === 'TREE') actualType = (['TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'] as const)[Math.floor(Math.random() * 3)]
    const isReady = ['TREE', 'TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'].includes(actualType), id = Math.random().toString(36).substr(2, 9)
    const maxPickingId = state.buildings.reduce((max, b) => Math.max(max, b.pickingId || 0), 0)
    const newB = { 
      id, 
      pickingId: maxPickingId + 1, 
      type: actualType, 
      level: 1, 
      progress: isReady ? 100 : 0, 
      isReady, 
      assignedWorkers: [], 
      x: xIndex, 
      z: zIndex, 
      width: size.width, 
      height: size.height 
    }
    const buildings = [...state.buildings, newB], newO = [...state.occupancyGrid]
    for (let i = xIndex; i < xIndex + size.width; i++) { 
      newO[i] = [...newO[i]]; 
      for (let j = zIndex; j < zIndex + size.height; j++) newO[i][j] = id 
    }
    const humans = [...state.humans]
    if (!isReady) { 
      const idleIdx = humans.findIndex(h => !h.workplaceId); 
      if (idleIdx !== -1) humans[idleIdx] = { ...humans[idleIdx], workplaceId: id } 
    }
    
    return { 
      buildings, 
      occupancyGrid: newO, 
      humans, 
      resources: deductBuildingCost(type, state.resources) 
    }
  }),

  paintTerrain: (xIndex, zIndex, isErase) => set((state) => {
    const radius = state.editorBrushSize
    const startI = Math.max(0, xIndex - radius - 1)
    const endI = Math.min(GRID_SIZE - 1, xIndex + radius)
    const startJ = Math.max(0, zIndex - radius - 1)
    const endJ = Math.min(GRID_SIZE - 1, zIndex + radius)

    // Snapshot of humus state before painting
    const wasHumus = new Uint8Array((endI - startI + 1) * (endJ - startJ + 1))
    for (let i = startI; i <= endI; i++) {
      for (let j = startJ; j <= endJ; j++) {
        let isHumus = true
        for (let di = 0; di <= 1; di++) {
          for (let dj = 0; dj <= 1; dj++) {
            const v = state.terrainVertices[Math.min(GRID_SIZE, i + di)][Math.min(GRID_SIZE, j + dj)]
            if (v[v.length - 1]?.type !== 'HUMUS') {
              isHumus = false
              break
            }
          }
          if (!isHumus) break
        }
        if (isHumus) wasHumus[(i - startI) * (endJ - startJ + 1) + (j - startJ)] = 1
      }
    }

    const changed = paintArea(
      state.terrainVertices,
      xIndex, zIndex,
      radius,
      state.editorLayerType,
      isErase ? -state.editorBrushStrength : state.editorBrushStrength,
      state
    )

    if (changed) {
      const { buildings, occupancyGrid, terrainVertices, sWater } = state
      const idsToRemove = new Set<string>()
      const treesToAdd: BuildingInstance[] = []
      const newOccupancy = [...occupancyGrid]
      let treeUpdateChanged = false

      const buildingMap = new Map(buildings.map(b => [b.id, b]))
      let maxPickingId = buildings.reduce((max, b) => Math.max(max, b.pickingId || 0), 0)

      for (let i = startI; i <= endI; i++) {
        let rowChanged = false
        const currentRow = [...newOccupancy[i]]
        for (let j = startJ; j <= endJ; j++) {
          let isHumus = true
          for (let di = 0; di <= 1; di++) {
            for (let dj = 0; dj <= 1; dj++) {
              const vi = Math.min(GRID_SIZE, i + di)
              const vj = Math.min(GRID_SIZE, j + dj)
              const v = terrainVertices[vi][vj]
              if (v[v.length - 1]?.type !== 'HUMUS') {
                isHumus = false
                break
              }
            }
            if (!isHumus) break
          }

          const buildingId = currentRow[j]
          const wasH = wasHumus[(i - startI) * (endJ - startJ + 1) + (j - startJ)] === 1

          if (buildingId) {
            const building = buildingMap.get(buildingId)
            const isTree = building && ['TREE', 'TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'].includes(building.type)
            if (isTree && !isHumus) {
              idsToRemove.add(buildingId)
              currentRow[j] = null
              rowChanged = true
            }
          } else if (isHumus && !wasH && sWater[j * GRID_SIZE + i] <= 0.05 && (buildings.length - idsToRemove.size + treesToAdd.length) < MAX_TREES) {
            if (Math.random() < 0.02) {
              const type = (['TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'] as const)[Math.floor(Math.random() * 3)]
              maxPickingId++
              const id = Math.random().toString(36).substr(2, 9)
              const newB: BuildingInstance = {
                id,
                pickingId: maxPickingId,
                type,
                level: 1,
                progress: 100,
                isReady: true,
                assignedWorkers: [],
                x: i,
                z: j,
                width: 1,
                height: 1
              }
              treesToAdd.push(newB)
              currentRow[j] = id
              rowChanged = true
            }
          }
        }
        if (rowChanged) {
          newOccupancy[i] = currentRow
          treeUpdateChanged = true
        }
      }

      const finalBuildings = treeUpdateChanged 
        ? buildings.filter(b => !idsToRemove.has(b.id)).concat(treesToAdd)
        : state.buildings

      return { 
        terrainVersion: state.terrainVersion + 1,
        buildings: finalBuildings,
        occupancyGrid: treeUpdateChanged ? newOccupancy : state.occupancyGrid
      }
    }
    return state
  }),

  resetTerrain: () => {
    const { vertices, sWater, gWater, tHeight, aCap, rLevel, buildings, occupancyGrid } = generateInitialTerrain('flat')
    set((state) => ({
      terrainVertices: vertices,
      sWater,
      gWater,
      tHeight,
      aCap,
      rLevel,
      buildings,
      occupancyGrid,
      terrainVersion: state.terrainVersion + 1,
      humans: [], 
      animals: []
    }))
  },

  setRainIntensity: (intensity) => set({ rainIntensity: intensity }),
  setTextures: (height, water) => set({ heightTexture: height, waterTexture: water }),
})

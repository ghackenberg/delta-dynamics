import * as THREE from 'three'
import { create } from 'zustand'
import type { BuildingType, AnimalType, GameState, Animal } from '../types/game'
import { GRID_SIZE, TILE_SIZE, BOUNDARY, INITIAL_RESOURCES, BUILDING_SIZES } from '../constants/gameConfig'
import { gridToWorld } from '../utils/gameUtils'
import { generateInitialTerrain } from '../systems/terrainSystem'
import { findSafeLandPosition, getRandomSkinTone, getRandomOutfitColor, updateHuman, updateAnimal } from '../systems/entitySystem'
import { calculateRates, updateConstruction, checkBuildingCost, deductBuildingCost } from '../systems/economySystem'
import { TerrainManager } from '../managers/TerrainManager'

const createDataTexture = () => {
  const data = new Float32Array(GRID_SIZE * GRID_SIZE * 4)
  const tex = new THREE.DataTexture(data, GRID_SIZE, GRID_SIZE, THREE.RGBAFormat, THREE.FloatType)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  return tex
}

const heightTexture = createDataTexture()
const waterTexture = createDataTexture()

const { vertices: initialVertices, sWater: initialSWater, gWater: initialGWater, tHeight: initialTHeight, aCap: initialACap, rLevel: initialRLevel, buildings: initialBuildings, occupancyGrid: initialOccupancy } = generateInitialTerrain()

TerrainManager.getInstance().initialize(initialVertices)

const initialHumans = [{ id: 'starter', name: 'Leader', position: findSafeLandPosition(initialSWater), rotation: 0, target: null, state: 'IDLE' as const, homeId: null, workplaceId: null, color: getRandomSkinTone(), outfitColor: getRandomOutfitColor() }]
const initialAnimals: Animal[] = []
const animalConfigs: {type: AnimalType, pos: [number, number]}[] = [
  { type: 'DEER', pos: [2, 2] }, { type: 'DEER', pos: [5, -3] }, { type: 'DEER', pos: [-4, 6] }, { type: 'WOLF', pos: [-2, -2] }, { type: 'WOLF', pos: [-7, -5] },
]
animalConfigs.forEach((config, idx) => {
  const gridX = Math.floor((config.pos[0] + BOUNDARY) / TILE_SIZE)
  const gridZ = Math.floor((config.pos[1] + BOUNDARY) / TILE_SIZE)
  let finalPos = config.pos
  if (gridX >= 0 && gridX < GRID_SIZE && gridZ >= 0 && gridZ < GRID_SIZE && initialSWater[gridZ * GRID_SIZE + gridX] > 0.05) finalPos = findSafeLandPosition(initialSWater)
  initialAnimals.push({ id: `${config.type.toLowerCase()}${idx + 1}`, type: config.type, position: finalPos, rotation: 0, target: null, state: 'IDLE' as const, waitCounter: 0 })
})

export const useStore = create<GameState>((set, get) => ({
  gameTime: 480, day: 1, isNight: false, simulationSpeed: 50, rainIntensity: 0,
  resources: { ...INITIAL_RESOURCES }, rates: { food: 0, wood: 0, stone: 0, gold: 0 },
  buildings: initialBuildings, occupancyGrid: initialOccupancy, terrainVertices: initialVertices, terrainVersion: 0,
  sWater: initialSWater, gWater: initialGWater, tHeight: initialTHeight, aCap: initialACap, rLevel: initialRLevel,
  heightTexture, waterTexture,
  humans: initialHumans,
  animals: initialAnimals, aiStatus: 'Idle', isAiLoading: false, aiResponse: '', selectedBuildingType: 'HOUSE', hoveredCell: null, hoveredEntityId: null,

  simulateWater: () => {
    // Now handled on GPU in Terrain.tsx
  },

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

    const tempState: Partial<GameState> = { sWater: state.sWater, gWater: state.gWater, tHeight: state.tHeight, aCap: state.aCap, rLevel: state.rLevel }
    const { newBuildings, newOccupancy, terrainChanged } = updateConstruction(state.buildings, newHumans, TerrainManager.getInstance(), state.occupancyGrid, tempState)

    let res = { ...state.resources }
    if (!isNight && (state.gameTime % 10 === 0)) {
      res = { food: res.food + state.rates.food, wood: res.wood + state.rates.wood, stone: res.stone + state.rates.stone, gold: res.gold + state.rates.gold }
    }

    const rates = calculateRates(newBuildings)

    const finalHumans = [...newHumans]
    const blueprints = newBuildings.filter(b => !b.isReady)
    finalHumans.forEach(h => { if (!h.workplaceId && blueprints.length > 0) h.workplaceId = blueprints[0].id })

    set({ 
      gameTime: newTime, day: newDay, isNight, simulationSpeed: simulationSpeed, 
      rainIntensity: newRainIntensity, humans: finalHumans, animals: newAnimals, 
      buildings: newBuildings, occupancyGrid: newOccupancy, resources: res, rates, 
      terrainVersion: terrainChanged ? state.terrainVersion + 1 : state.terrainVersion,
      sWater, gWater,
      tHeight: tempState.tHeight!, aCap: tempState.aCap!
    })
    },

  setSelectedBuildingType: (type) => set({ selectedBuildingType: type }),
  setHoveredCell: (cell) => set({ hoveredCell: cell }),
  setHoveredEntityId: (id) => set({ hoveredEntityId: id }),
  spawnHuman: (homeId) => set((state) => {
    const home = state.buildings.find(b => b.id === homeId)
    if (!home) return state
    const [wx, wz] = gridToWorld(home.x, home.z, home.width, home.height)
    return { humans: [...state.humans, { id: Math.random().toString(36).substr(2, 9), name: `Villager ${state.humans.length + 1}`, position: [wx, wz], rotation: 0, target: null, state: 'IDLE' as const, homeId, workplaceId: null, color: getRandomSkinTone(), outfitColor: getRandomOutfitColor() }] }
  }),
  spawnAnimal: (type, x, z) => set((state) => {
    const pos: [number, number] = (x !== undefined && z !== undefined) ? [x, z] : findSafeLandPosition(state.sWater)
    return { animals: [...state.animals, { id: Math.random().toString(36).substr(2, 9), type, position: pos, rotation: 0, target: null, state: 'IDLE' as const, waitCounter: 0 }] }
  }),
  placeBuilding: (xIndex, zIndex, type) => set((state) => {
    const size = BUILDING_SIZES[type] || { width: 1, height: 1 }
    if (type === 'CUT_TREE') {
      const bId = state.occupancyGrid[xIndex][zIndex]
      if (bId) {
        const b = state.buildings.find(i => i.id === bId)
        if (b && ['TREE', 'TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'].includes(b.type)) {
          const newB = state.buildings.filter(i => i.id !== bId), newO = [...state.occupancyGrid]
          for (let i = b.x; i < b.x + b.width; i++) { newO[i] = [...newO[i]]; for (let j = b.z; j < b.z + b.height; j++) newO[i][j] = null }
          return { buildings: newB, occupancyGrid: newO, resources: { ...state.resources, wood: state.resources.wood + 10 } }
        }
      }
      return state
    }
    if (xIndex + size.width > GRID_SIZE || zIndex + size.height > GRID_SIZE) return state
    for (let i = xIndex; i < xIndex + size.width; i++) for (let j = zIndex; j < zIndex + size.height; j++) if (state.occupancyGrid[i][j] || state.sWater[j * GRID_SIZE + i] > 0.05) return state
    if (['HOUSE', 'FARM', 'LUMBER_MILL', 'QUARRY'].includes(type) && !TerrainManager.getInstance().isAreaFlat(xIndex, zIndex, size.width, size.height)) return state
    
    if (!checkBuildingCost(type, state.resources)) return state 
    
    let actualType: BuildingType = type
    if (type === 'TREE') actualType = (['TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'] as const)[Math.floor(Math.random() * 3)]
    const isReady = ['TREE', 'TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'].includes(actualType), id = Math.random().toString(36).substr(2, 9)
    const newB = { id, type: actualType, level: 1, progress: isReady ? 100 : 0, isReady, assignedWorkers: [], x: xIndex, z: zIndex, width: size.width, height: size.height }
    const buildings = [...state.buildings, newB], newO = [...state.occupancyGrid]
    for (let i = xIndex; i < xIndex + size.width; i++) { newO[i] = [...newO[i]]; for (let j = zIndex; j < zIndex + size.height; j++) newO[i][j] = id }
    const humans = [...state.humans]
    if (!isReady) { const idleIdx = humans.findIndex(h => !h.workplaceId); if (idleIdx !== -1) humans[idleIdx] = { ...humans[idleIdx], workplaceId: id } }
    
    return { buildings, occupancyGrid: newO, humans, resources: deductBuildingCost(type, state.resources) }
  }),
  setAiStatus: (status) => set({ aiStatus: status }),
  setAiLoading: (loading) => set({ isAiLoading: loading }),
  setAiResponse: (response) => set({ aiResponse: response }),
  setRainIntensity: (intensity) => set({ rainIntensity: intensity }),
}))

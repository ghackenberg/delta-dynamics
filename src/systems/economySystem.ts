import type { BuildingInstance, BuildingType, GameResources, Human, TerrainVertex, GameState, LayerType } from '../types/game'
import { BUILDING_COSTS, GRID_SIZE } from '../constants/gameConfig'
import { updateCellWaterData } from './waterSystem'

export const calculateRates = (buildings: BuildingInstance[]): GameResources => {
  const rates = { food: 0, wood: 0, stone: 0, gold: 0 }
  buildings.forEach(b => {
    if (!b.isReady) return
    if (b.type === 'HOUSE') rates.gold += 5
    if (b.type === 'FARM') rates.food += 10
    if (b.type === 'LUMBER_MILL') rates.wood += 8
    if (b.type === 'QUARRY') rates.stone += 5
  })
  return rates
}

export const updateConstruction = (
  buildings: BuildingInstance[], 
  humans: Human[], 
  terrainVertices: TerrainVertex[][], 
  occupancyGrid: (string | null)[][],
  tempState: Partial<GameState>, 
  getRiverCarve: (i: number, j: number) => number, 
  MANUAL_HEIGHTS: number[][]
): { newBuildings: BuildingInstance[], newVertices: TerrainVertex[][], newOccupancy: (string | null)[][] } => {
  const newBuildings = [...buildings]
  const newVertices = [...terrainVertices]
  const newOccupancy = [...occupancyGrid]

  newBuildings.forEach((building, bIdx) => {
    if (!building.isReady) {
      const workers = humans.filter(h => h.workplaceId === building.id && h.state === 'WORKING').length
      if (workers > 0) {
        if (building.type === 'EXCAVATE' || building.type === 'FILL' || building.type === 'ROAD' || building.type === 'DIKE') {
          let amount = (building.type === 'EXCAVATE' ? -0.05 : 0.05) / 20
          if (building.type === 'DIKE') amount = 0.1 / 20 // Dikes are faster/thicker
          
          let type: LayerType = 'HUMUS'
          if (building.type === 'ROAD') type = 'PAVEMENT'
          else if (building.type === 'DIKE') type = 'GRAVEL'
          
          for (let di = 0; di <= building.width; di++) {
            for (let dj = 0; dj <= building.height; dj++) {
              const i = building.x + di, j = building.z + dj
              if (i < 0 || i > GRID_SIZE || j < 0 || j > GRID_SIZE) continue
              const vertex = [...newVertices[i][j]], last = vertex[vertex.length - 1]
              if (amount < 0) { 
                vertex[vertex.length - 1] = { ...last, thickness: Math.max(0, last.thickness + amount) }
                if (vertex[vertex.length-1].thickness <= 0 && vertex.length > 1) vertex.pop() 
              } else { 
                if (last?.type === type) vertex[vertex.length-1] = { ...last, thickness: last.thickness + amount }
                else vertex.push({ type, thickness: amount }) 
              }
              newVertices[i] = [...newVertices[i]]; newVertices[i][j] = vertex
            }
          }
          for (let i = Math.max(0, building.x - 1); i <= Math.min(GRID_SIZE - 1, building.x + building.width); i++) {
            for (let j = Math.max(0, building.z - 1); j <= Math.min(GRID_SIZE - 1, building.z + building.height); j++) {
              updateCellWaterData(i, j, newVertices, tempState, getRiverCarve, MANUAL_HEIGHTS)
            }
          }
          const prog = Math.min(100, building.progress + workers * 0.1)
          newBuildings[bIdx] = { ...building, progress: prog, isReady: prog === 100 }
          if (prog === 100 && building.type !== 'ROAD') {
            for (let i = building.x; i < building.x + building.width; i++) {
              newOccupancy[i] = [...newOccupancy[i]]
              for (let j = building.z; j < building.z + building.height; j++) newOccupancy[i][j] = null
            }
            newBuildings.splice(bIdx, 1)
          }
        } else {
          const prog = Math.min(100, building.progress + workers * 0.25)
          newBuildings[bIdx] = { ...building, progress: prog, isReady: prog === 100 }
        }
      }
    }
  })
  return { newBuildings, newVertices, newOccupancy }
}

export const checkBuildingCost = (type: BuildingType, resources: GameResources): boolean => {
  const cost = BUILDING_COSTS[type] || { wood: 0, stone: 0 }
  return resources.wood >= cost.wood && resources.stone >= cost.stone
}

export const deductBuildingCost = (type: BuildingType, resources: GameResources): GameResources => {
  const cost = BUILDING_COSTS[type] || { wood: 0, stone: 0 }
  return {
    ...resources,
    wood: resources.wood - cost.wood,
    stone: resources.stone - cost.stone
  }
}

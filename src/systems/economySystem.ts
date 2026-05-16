import type { BuildingInstance, BuildingType, GameResources, Human, GameState, LayerType, TerrainVertex } from '../types/game'
import { BUILDING_COSTS } from '../constants/gameConfig'
import { modifyArea } from './terrainSystem'

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
  vertices: TerrainVertex[][], 
  occupancyGrid: (string | null)[][],
  tempState: Partial<GameState>
): { newBuildings: BuildingInstance[], newOccupancy: (string | null)[][], terrainChanged: boolean } => {
  const newBuildings = [...buildings]
  const newOccupancy = [...occupancyGrid]
  let terrainChanged = false

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
          
          const changed = modifyArea(vertices, building.x, building.z, building.width, building.height, type, amount, tempState)
          if (changed) terrainChanged = true

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
  return { newBuildings, newOccupancy, terrainChanged }
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

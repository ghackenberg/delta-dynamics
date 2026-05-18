import { GRID_SIZE, TERRAIN_BASE_Y } from '../constants/gameConfig'
import type { TerrainVertex, TerrainLayer, BuildingInstance, GameState, TerrainConfig } from '../types/game'
import { updateCellWaterData } from '../systems/waterSystem'

export const flatTerrain: TerrainConfig = {
  id: 'flat',
  name: 'Flat Land',
  visualRange: [-5, 5],
  generate: () => {
    const vertices: TerrainVertex[][] = []
    for (let i = 0; i <= GRID_SIZE; i++) {
      const row: TerrainVertex[] = []
      for (let j = 0; j <= GRID_SIZE; j++) {
        const rockTop = 1.0 // Fixed height
        const layers: TerrainLayer[] = [
          { type: 'ROCK', thickness: rockTop - TERRAIN_BASE_Y },
          { type: 'HUMUS', thickness: 0.5 }
        ]
        row.push(layers)
      }
      vertices.push(row)
    }

    const sWater = new Float32Array(GRID_SIZE * GRID_SIZE)
    const gWater = new Float32Array(GRID_SIZE * GRID_SIZE)
    const tHeight = new Float32Array(GRID_SIZE * GRID_SIZE)
    const aCap = new Float32Array(GRID_SIZE * GRID_SIZE)
    const rLevel = new Float32Array(GRID_SIZE * GRID_SIZE).fill(0)
    
    const buildings: BuildingInstance[] = []
    const occupancyGrid: (string | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null))

    const tempState: Partial<GameState> = { sWater, gWater, tHeight, aCap, rLevel }

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        updateCellWaterData(i, j, vertices, tempState)
      }
    }
    return { vertices, sWater, gWater, tHeight, aCap, rLevel, buildings, occupancyGrid }
  }
}

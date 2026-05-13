import { GRID_SIZE, TERRAIN_BASE_Y, MANUAL_HEIGHTS, RIVER_PATHS } from '../constants/gameConfig'
import type { TerrainVertex, TerrainLayer, BuildingInstance, BuildingType, GameState } from '../types/game'
import { distToSegment } from '../utils/gameUtils'
import { updateCellWaterData } from './waterSystem'

export const getLakeCarve = (i: number, j: number) => {
  const dist = Math.sqrt((i - 50) ** 2 + (j - 50) ** 2)
  const radius = 12
  if (dist < radius) return Math.pow(1 - dist / radius, 2) * 3.5
  return 0
}

export const getRiverCarve = (i: number, j: number) => {
  let minDist = Infinity
  for (const path of RIVER_PATHS) {
    for (let k = 0; k < path.length - 1; k++) {
      minDist = Math.min(minDist, distToSegment(i, j, path[k][0], path[k][1], path[k + 1][0], path[k + 1][1]))
    }
  }
  const width = 6.0 
  const riverCarve = minDist < width ? Math.pow(1 - minDist / width, 2) * 2.0 : 0
  const lakeCarve = getLakeCarve(i, j)
  return Math.max(riverCarve, lakeCarve)
}

export const generateInitialTerrain = () => {
  const vertices: TerrainVertex[][] = []
  for (let i = 0; i <= GRID_SIZE; i++) {
    const row: TerrainVertex[] = []
    for (let j = 0; j <= GRID_SIZE; j++) {
      const fi = (i / GRID_SIZE) * 10, fj = (j / GRID_SIZE) * 10
      const i0 = Math.floor(fi), i1 = Math.min(10, i0 + 1)
      const j0 = Math.floor(fj), j1 = Math.min(10, j0 + 1)
      const weightI = fi - i0, weightJ = fj - j0
      const originalRockTop = (1 - weightI) * (1 - weightJ) * MANUAL_HEIGHTS[i0][j0] + weightI * (1 - weightJ) * MANUAL_HEIGHTS[i1][j0] + (1 - weightI) * weightJ * MANUAL_HEIGHTS[i0][j1] + weightI * weightJ * MANUAL_HEIGHTS[i1][j1]
      const carve = getRiverCarve(i, j)
      const rockTop = originalRockTop - carve
      const altitudeFactor = Math.max(0, Math.min(1, 1 - (rockTop - 1.5) / 1.5)) 
      const layers: TerrainLayer[] = [{ type: 'ROCK', thickness: rockTop - TERRAIN_BASE_Y }]
      if (carve > 0.2) {
        layers.push({ type: 'GRAVEL', thickness: 0.2 })
        if (carve > 0.8) layers.push({ type: 'SAND', thickness: 0.1 })
      } else if (altitudeFactor > 0) {
        const gravelThickness = 0.5 * altitudeFactor, humusThickness = 0.3 * altitudeFactor
        if (gravelThickness > 0.05) layers.push({ type: 'GRAVEL', thickness: gravelThickness })
        if (humusThickness > 0.05) layers.push({ type: 'HUMUS', thickness: humusThickness })
      }
      row.push(layers)
    }
    vertices.push(row)
  }

  const sWater = new Float32Array(GRID_SIZE * GRID_SIZE)
  const gWater = new Float32Array(GRID_SIZE * GRID_SIZE)
  const tHeight = new Float32Array(GRID_SIZE * GRID_SIZE)
  const aCap = new Float32Array(GRID_SIZE * GRID_SIZE)
  const rLevel = new Float32Array(GRID_SIZE * GRID_SIZE).fill(-99)
  
  const buildings: BuildingInstance[] = []
  const occupancyGrid: (string | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null))

  const tempState: Partial<GameState> = { sWater, gWater, tHeight, aCap, rLevel }

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      updateCellWaterData(i, j, vertices, tempState, getRiverCarve, MANUAL_HEIGHTS)
      const topLayer = vertices[i][j][vertices[i][j].length - 1]
      const idx = j * GRID_SIZE + i
      if (topLayer.type === 'HUMUS' && sWater[idx] <= 0 && Math.random() > 0.98) {
        const treeTypes: BuildingType[] = ['TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH']
        const randomTree = treeTypes[Math.floor(Math.random() * treeTypes.length)]
        const id = Math.random().toString(36).substr(2, 9)
        buildings.push({ id, type: randomTree, level: 1, progress: 100, isReady: true, assignedWorkers: [], x: i, z: j, width: 1, height: 1 })
        occupancyGrid[i][j] = id
      }
    }
  }
  return { vertices, sWater, gWater, tHeight, aCap, rLevel, buildings, occupancyGrid }
}

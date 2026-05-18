import { GRID_SIZE, TERRAIN_BASE_Y, TREE_SLOPE_THRESHOLD } from '../constants/gameConfig'
import { SAMPLE_HEIGHTMAP } from './heightmaps'
import type { TerrainVertex, TerrainLayer, BuildingInstance, BuildingType, GameState, TerrainConfig } from '../types/game'
import { updateCellWaterData } from '../systems/waterSystem'
import { getCellMaxSlope } from '../systems/terrainSystem'

const getLakeCarve = (i: number, j: number) => {
  const dist = Math.sqrt((i - 50) ** 2 + (j - 50) ** 2)
  const radius = 12
  if (dist < radius) return Math.pow(1 - dist / radius, 2) * 3.5
  return 0
}

const RIVER_PATHS = [
  [[0, 50], [25, 45], [50, 50], [75, 55], [100, 50]]
]

const distToSegment = (px: number, pz: number, x1: number, z1: number, x2: number, z2: number) => {
  const l2 = (x1 - x2) ** 2 + (z1 - z2) ** 2
  if (l2 === 0) return Math.sqrt((px - x1) ** 2 + (pz - z1) ** 2)
  let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2
  t = Math.max(0, Math.min(1, t))
  return Math.sqrt((px - (x1 + t * (x2 - x1))) ** 2 + (pz - (z1 + t * (z2 - z1))) ** 2)
}

const getRiverCarve = (i: number, j: number) => {
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

export const riverLakeTerrain: TerrainConfig = {
  id: 'river-lake',
  name: 'River and Lake',
  visualRange: [-5, 15],
  getInflow: (gameTime: number) => {
    // 24h cycle: peaks at noon (720), lowest at midnight (0/1440)
    // gameTime is in minutes (0-1440)
    const normalizedTime = (gameTime / 1440) * Math.PI * 2
    const baseInflow = 0.05
    const amplitude = 0.04
    // Peak at 12:00 (normalizedTime = PI) -> use -cos
    // This creates a smooth flow that's visibly stronger during the day
    return baseInflow - Math.cos(normalizedTime) * amplitude
  },
  generate: () => {
    const vertices: TerrainVertex[][] = []
    for (let i = 0; i <= GRID_SIZE; i++) {
      const row: TerrainVertex[] = []
      for (let j = 0; j <= GRID_SIZE; j++) {
        const fi = (i / GRID_SIZE) * 10, fj = (j / GRID_SIZE) * 10
        const i0 = Math.floor(fi), i1 = Math.min(10, i0 + 1)
        const j0 = Math.floor(fj), j1 = Math.min(10, j0 + 1)
        const weightI = fi - i0, weightJ = fj - j0
        const baseHeight = (1 - weightI) * (1 - weightJ) * SAMPLE_HEIGHTMAP[i0][j0] + weightI * (1 - weightJ) * SAMPLE_HEIGHTMAP[i1][j0] + (1 - weightI) * weightJ * SAMPLE_HEIGHTMAP[i0][j1] + weightI * weightJ * SAMPLE_HEIGHTMAP[i1][j1]
        
        const originalRockTop = baseHeight + 4.0 // Shifted up
        const carve = getRiverCarve(i, j)
        const rockTop = originalRockTop - carve
        
        // altitudeFactor should be based on height relative to the base of the shifted terrain
        const relativeHeight = rockTop - 4.0
        const altitudeFactor = Math.max(0, Math.min(1, 1 - (relativeHeight - 1.5) / 1.5)) 
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
    const rLevel = new Float32Array(GRID_SIZE * GRID_SIZE).fill(0)
    
    const buildings: BuildingInstance[] = []
    const occupancyGrid: (string | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null))

    const tempState: Partial<GameState> = { sWater, gWater, tHeight, aCap, rLevel }

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        updateCellWaterData(i, j, vertices, tempState)
        
        const idx = j * GRID_SIZE + i
        const carveAtCenter = getRiverCarve(i + 0.5, j + 0.5)
        if (carveAtCenter > 0.5) {
          if (i < 1) {
            tempState.rLevel![idx] = 1 // SOURCE
          }
        }
        
        // Tree generation logic...
        let isHumusCell = true
        for (let di = 0; di <= 1; di++) {
          for (let dj = 0; dj <= 1; dj++) {
            const v = vertices[i + di][j + dj]
            if (v[v.length - 1].type !== 'HUMUS') {
              isHumusCell = false
              break
            }
          }
          if (!isHumusCell) break
        }

        if (isHumusCell && getCellMaxSlope(vertices, i, j) <= TREE_SLOPE_THRESHOLD && sWater[idx] <= 0 && Math.random() > 0.98) {
          const treeSpacing = 3
          let tooClose = false
          const sXi = Math.max(0, i - treeSpacing), eXi = Math.min(GRID_SIZE - 1, i + treeSpacing)
          const sZj = Math.max(0, j - treeSpacing), eZj = Math.min(GRID_SIZE - 1, j + treeSpacing)
          for (let ni = sXi; ni <= eXi; ni++) {
            for (let nj = sZj; nj <= eZj; nj++) {
              if ((ni - i) ** 2 + (nj - j) ** 2 >= treeSpacing ** 2) continue
              if (occupancyGrid[ni][nj]) {
                tooClose = true; break
              }
            }
            if (tooClose) break
          }

          if (!tooClose) {
            const treeTypes: BuildingType[] = ['TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH']
            const randomTree = treeTypes[Math.floor(Math.random() * treeTypes.length)]
            const id = Math.random().toString(36).substr(2, 9)
            
            buildings.push({ 
              id, 
              pickingId: buildings.length + 1,
              type: randomTree, 
              level: 1, 
              progress: 100, 
              isReady: true, 
              assignedWorkers: [], 
              x: i, 
              z: j, 
              width: 1, 
              height: 1 
            })
            occupancyGrid[i][j] = id
          }
        }
      }
    }
    return { vertices, sWater, gWater, tHeight, aCap, rLevel, buildings, occupancyGrid }
  }
}

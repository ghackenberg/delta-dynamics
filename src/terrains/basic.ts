import { GRID_SIZE, TERRAIN_BASE_Y, TREE_SLOPE_THRESHOLD } from '../constants/gameConfig'
import { SAMPLE_HEIGHTMAP } from './heightmaps'
import type { TerrainVertex, TerrainLayer, BuildingInstance, BuildingType, GameState, TerrainConfig } from '../types/game'
import { updateCellWaterData } from '../systems/waterSystem'
import { getCellMaxSlope } from '../systems/terrainSystem'

export const basicTerrain: TerrainConfig = {
  id: 'basic',
  name: 'Basic Terrain',
  category: 'STANDARD',
  visualRange: [-5, 5],
  generate: () => {
    let seed = 42
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    const vertices: TerrainVertex[][] = []
    for (let i = 0; i <= GRID_SIZE; i++) {
      const row: TerrainVertex[] = []
      for (let j = 0; j <= GRID_SIZE; j++) {
        const fi = (i / GRID_SIZE) * 10, fj = (j / GRID_SIZE) * 10
        const i0 = Math.floor(fi), i1 = Math.min(10, i0 + 1)
        const j0 = Math.floor(fj), j1 = Math.min(10, j0 + 1)
        const weightI = fi - i0, weightJ = fj - j0
        const rockTop = (1 - weightI) * (1 - weightJ) * SAMPLE_HEIGHTMAP[i0][j0] + weightI * (1 - weightJ) * SAMPLE_HEIGHTMAP[i1][j0] + (1 - weightI) * weightJ * SAMPLE_HEIGHTMAP[i0][j1] + weightI * weightJ * SAMPLE_HEIGHTMAP[i1][j1]
        
        const altitudeFactor = Math.max(0, Math.min(1, 1 - (rockTop - 1.5) / 1.5)) 
        const layers: TerrainLayer[] = [{ type: 'ROCK', thickness: rockTop - TERRAIN_BASE_Y }]
        
        if (altitudeFactor > 0) {
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
        
        // Strict Humus Check: All 4 vertices of the cell must be HUMUS
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

        const idx = j * GRID_SIZE + i
        if (isHumusCell && getCellMaxSlope(vertices, i, j) <= TREE_SLOPE_THRESHOLD && sWater[idx] <= 0 && random() > 0.98) {
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
            const randomTree = treeTypes[Math.floor(random() * treeTypes.length)]
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
            let id = ''
            for (let k = 0; k < 9; k++) {
              id += chars.charAt(Math.floor(random() * chars.length))
            }
            
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
    return { vertices, sWater, gWater, tHeight, aCap, rLevel, buildings, humans: [], animals: [], occupancyGrid }
  }
}


import { GRID_SIZE } from '../constants/gameConfig'
import type { TerrainVertex, LayerType, GameState } from '../types/game'
import { getVertexTotalHeight } from '../utils/gameUtils'
import { updateCellWaterData } from '../systems/waterSystem'

export class TerrainManager {
  private static instance: TerrainManager
  public vertices: TerrainVertex[][] = []

  private constructor() {}

  public static getInstance(): TerrainManager {
    if (!TerrainManager.instance) {
      TerrainManager.instance = new TerrainManager()
    }
    return TerrainManager.instance
  }

  public initialize(initialVertices: TerrainVertex[][]) {
    this.vertices = initialVertices
  }

  public getVertices(): TerrainVertex[][] {
    return this.vertices
  }

  public getInterpolatedHeight(x: number, z: number): number {
    const i = Math.floor(x)
    const j = Math.floor(z)
    if (i < 0 || i >= GRID_SIZE || j < 0 || j >= GRID_SIZE) return 0

    const wi = x - i
    const wj = z - j

    const h00 = getVertexTotalHeight(this.vertices[i][j])
    const h10 = getVertexTotalHeight(this.vertices[i + 1][j])
    const h01 = getVertexTotalHeight(this.vertices[i][j + 1])
    const h11 = getVertexTotalHeight(this.vertices[i + 1][j + 1])

    const h0 = h00 * (1 - wi) + h10 * wi
    const h1 = h01 * (1 - wi) + h11 * wi
    return h0 * (1 - wj) + h1 * wj
  }

  public isAreaFlat(xIdx: number, zIdx: number, w: number, h: number): boolean {
    if (xIdx < 0 || xIdx + w > GRID_SIZE || zIdx < 0 || zIdx + h > GRID_SIZE) return false
    const hReference = getVertexTotalHeight(this.vertices[xIdx][zIdx])
    const epsilon = 0.01
    for (let i = xIdx; i <= xIdx + w; i++) {
      for (let j = zIdx; j <= zIdx + h; j++) {
        if (Math.abs(getVertexTotalHeight(this.vertices[i][j]) - hReference) > epsilon) return false
      }
    }
    return true
  }

  public modifyTerrain(
    xIdx: number, 
    zIdx: number, 
    type: LayerType, 
    amount: number,
    state: Partial<GameState> // required for updateCellWaterData
  ): boolean {
    let changed = false
    for (let di = 0; di <= 1; di++) {
      for (let dj = 0; dj <= 1; dj++) {
        const i = xIdx + di, j = zIdx + dj
        if (i < 0 || i > GRID_SIZE || j < 0 || j > GRID_SIZE) continue
        
        const vertex = this.vertices[i][j]
        const lastLayer = vertex[vertex.length - 1]
        
        if (lastLayer && lastLayer.type === type) {
          lastLayer.thickness = Math.max(0, lastLayer.thickness + amount)
          if (lastLayer.thickness === 0 && vertex.length > 1) {
            vertex.pop()
          }
          changed = true
        } else if (amount > 0) {
          vertex.push({ type, thickness: amount })
          changed = true
        }
      }
    }

    if (changed) {
      for (let i = Math.max(0, xIdx - 1); i <= Math.min(GRID_SIZE - 1, xIdx + 1); i++) {
        for (let j = Math.max(0, zIdx - 1); j <= Math.min(GRID_SIZE - 1, zIdx + 1); j++) {
          updateCellWaterData(i, j, this.vertices, state)
        }
      }
    }
    
    return changed
  }

  public modifyArea(
    xIdx: number,
    zIdx: number,
    width: number,
    height: number,
    type: LayerType,
    amount: number,
    state: Partial<GameState>
  ): boolean {
    let changed = false
    for (let di = 0; di <= width; di++) {
      for (let dj = 0; dj <= height; dj++) {
        const i = xIdx + di, j = zIdx + dj
        if (i < 0 || i > GRID_SIZE || j < 0 || j > GRID_SIZE) continue
        
        const vertex = this.vertices[i][j]
        const last = vertex[vertex.length - 1]
        
        if (amount < 0) {
          if (last) {
            last.thickness = Math.max(0, last.thickness + amount)
            if (last.thickness <= 0 && vertex.length > 1) vertex.pop()
            changed = true
          }
        } else {
          if (last?.type === type) {
            last.thickness += amount
          } else {
            vertex.push({ type, thickness: amount })
          }
          changed = true
        }
      }
    }

    if (changed) {
      for (let i = Math.max(0, xIdx - 1); i <= Math.min(GRID_SIZE - 1, xIdx + width); i++) {
        for (let j = Math.max(0, zIdx - 1); j <= Math.min(GRID_SIZE - 1, zIdx + height); j++) {
          updateCellWaterData(i, j, this.vertices, state)
        }
      }
    }

    return changed
  }
}

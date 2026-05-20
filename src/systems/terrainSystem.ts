import { GRID_SIZE } from '../constants/gameConfig'
import type { TerrainVertex, LayerType, GameState, TerrainData } from '../types/game'
import { getVertexTotalHeight } from '../utils/gameUtils'
import { updateCellWaterData } from './waterSystem'
import { terrains } from '../terrains'
import { storageManager } from '../managers/StorageManager'

export const generateInitialTerrain = async (terrainId: string): Promise<TerrainData> => {
  if (terrainId.startsWith('custom-')) {
    const data = await storageManager.getTerrainData(terrainId)
    if (data) return data
  }
  const config = terrains.find(t => t.id === terrainId) || terrains[0]
  return config.generate()
}

/**
 * Utility to calculate height at arbitrary x, z coordinates via bilinear interpolation.
 */
export const getInterpolatedHeight = (vertices: TerrainVertex[][], x: number, z: number): number => {
  const i = Math.floor(x)
  const j = Math.floor(z)
  if (i < 0 || i >= GRID_SIZE || j < 0 || j >= GRID_SIZE) return 0

  const wi = x - i
  const wj = z - j

  // Note: For a GRID_SIZE grid, vertices are usually GRID_SIZE + 1. 
  // TerrainManager was using [i+1][j] etc. which might go OOB if i or j is GRID_SIZE.
  // We assume vertices dimensions are compatible with GRID_SIZE indexing.
  const h00 = getVertexTotalHeight(vertices[i][j])
  const h10 = i + 1 <= GRID_SIZE ? getVertexTotalHeight(vertices[i + 1][j]) : h00
  const h01 = j + 1 <= GRID_SIZE ? getVertexTotalHeight(vertices[i][j + 1]) : h00
  const h11 = (i + 1 <= GRID_SIZE && j + 1 <= GRID_SIZE) ? getVertexTotalHeight(vertices[i + 1][j + 1]) : h00

  const h0 = h00 * (1 - wi) + h10 * wi
  const h1 = h01 * (1 - wi) + h11 * wi
  return h0 * (1 - wj) + h1 * wj
}

/**
 * Checks if a rectangular area is flat.
 */
export const isAreaFlat = (vertices: TerrainVertex[][], xIdx: number, zIdx: number, w: number, h: number): boolean => {
  if (xIdx < 0 || xIdx + w > GRID_SIZE || zIdx < 0 || zIdx + h > GRID_SIZE) return false
  const hReference = getVertexTotalHeight(vertices[xIdx][zIdx])
  const epsilon = 0.01
  for (let i = xIdx; i <= xIdx + w; i++) {
    for (let j = zIdx; j <= zIdx + h; j++) {
      if (Math.abs(getVertexTotalHeight(vertices[i][j]) - hReference) > epsilon) return false
    }
  }
  return true
}

/**
 * Calculates the maximum height difference within a single 1x1 cell.
 */
export const getCellMaxSlope = (vertices: TerrainVertex[][], x: number, z: number): number => {
  if (x < 0 || x >= GRID_SIZE || z < 0 || z >= GRID_SIZE) return 0
  const h00 = getVertexTotalHeight(vertices[x][z])
  const h10 = getVertexTotalHeight(vertices[x + 1][z])
  const h01 = getVertexTotalHeight(vertices[x][z + 1])
  const h11 = getVertexTotalHeight(vertices[x + 1][z + 1])
  
  return Math.max(
    Math.abs(h00 - h10),
    Math.abs(h00 - h01),
    Math.abs(h10 - h11),
    Math.abs(h01 - h11),
    Math.abs(h00 - h11),
    Math.abs(h10 - h01)
  )
}

/**
 * Updates water simulation data for a modified area.
 */
export const updateWaterSimulationForArea = (
  vertices: TerrainVertex[][],
  xIdx: number,
  zIdx: number,
  width: number,
  height: number,
  state: Partial<GameState>
) => {
  for (let i = Math.max(0, xIdx - 1); i <= Math.min(GRID_SIZE - 1, xIdx + width + 1); i++) {
    for (let j = Math.max(0, zIdx - 1); j <= Math.min(GRID_SIZE - 1, zIdx + height + 1); j++) {
      updateCellWaterData(i, j, vertices, state)
    }
  }
}

/**
 * Modifies terrain height at a specific point (2x2 grid points).
 * Mutates the provided vertices array directly for performance (versioned mutation pattern).
 */
export const modifyTerrain = (
  vertices: TerrainVertex[][],
  xIdx: number, 
  zIdx: number, 
  type: LayerType, 
  amount: number,
  state: Partial<GameState>
): boolean => {
  let changed = false
  for (let di = 0; di <= 1; di++) {
    for (let dj = 0; dj <= 1; dj++) {
      const i = xIdx + di, j = zIdx + dj
      if (i < 0 || i > GRID_SIZE || j < 0 || j > GRID_SIZE) continue
      
      const vertex = vertices[i][j]
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
    updateWaterSimulationForArea(vertices, xIdx, zIdx, 1, 1, state)
  }
  
  return changed
}

/**
 * Modifies a rectangular area of terrain.
 * Mutates the provided vertices array directly for performance (versioned mutation pattern).
 */
export const modifyArea = (
  vertices: TerrainVertex[][],
  xIdx: number,
  zIdx: number,
  width: number,
  height: number,
  type: LayerType,
  amount: number,
  state: Partial<GameState>
): boolean => {
  let changed = false
  for (let di = 0; di <= width; di++) {
    for (let dj = 0; dj <= height; dj++) {
      const i = xIdx + di, j = zIdx + dj
      if (i < 0 || i > GRID_SIZE || j < 0 || j > GRID_SIZE) continue
      
      const vertex = vertices[i][j]
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
    updateWaterSimulationForArea(vertices, xIdx, zIdx, width, height, state)
  }

  return changed
}

/**
 * Paints terrain with a brush (Gaussian weight).
 * Mutates the provided vertices array directly for performance (versioned mutation pattern).
 */
export const paintArea = (
  vertices: TerrainVertex[][],
  xIdx: number,
  zIdx: number,
  radius: number,
  type: LayerType,
  strength: number,
  state: Partial<GameState>
): boolean => {
  if (type === 'RAIN') return false

  if (radius === 0) {
    if (type === 'WATER_SOURCE' || type === 'WATER_SINK') {
      if (!state.rLevel) return false
      const idx = zIdx * GRID_SIZE + xIdx
      const amount = strength
      if (strength > 0) {
        const delta = type === 'WATER_SOURCE' ? amount : -amount
        state.rLevel[idx] = Math.max(-5.0, Math.min(5.0, state.rLevel[idx] + delta))
      } else {
        const current = state.rLevel[idx]
        if (Math.abs(current) > 0.001) {
          const eraseFactor = Math.abs(strength)
          if (current > 0) state.rLevel[idx] = Math.max(0, current - eraseFactor)
          else state.rLevel[idx] = Math.min(0, current + eraseFactor)
        }
      }
      return true
    }

    let changed = false
    const amount = strength
    for (let di = 0; di <= 1; di++) {
      for (let dj = 0; dj <= 1; dj++) {
        const i = xIdx + di
        const j = zIdx + dj
        if (i < 0 || i > GRID_SIZE || j < 0 || j > GRID_SIZE) continue

        const vertex = vertices[i][j]
        const last = vertex[vertex.length - 1]

        if (strength > 0) {
          if (last?.type === type) {
            last.thickness += amount
          } else {
            vertex.push({ type, thickness: amount })
          }
          changed = true
        } else {
          let eraseAmount = Math.abs(amount)
          while (eraseAmount > 0 && vertex.length > 0) {
            const currentLast = vertex[vertex.length - 1]
            if (currentLast.thickness > eraseAmount) {
              currentLast.thickness -= eraseAmount
              eraseAmount = 0
            } else {
              eraseAmount -= currentLast.thickness
              if (vertex.length > 1) {
                vertex.pop()
              } else {
                currentLast.thickness = 0
                eraseAmount = 0
              }
            }
          }
          changed = true
        }
      }
    }
    if (changed) {
      updateWaterSimulationForArea(vertices, xIdx, zIdx, 1, 1, state)
    }
    return changed
  }

  if (type === 'WATER_SOURCE' || type === 'WATER_SINK') {
    if (!state.rLevel) return false
    let changed = false
    const sigma = radius / 2
    const sigma2 = 2 * sigma * sigma
    const startI = Math.max(0, xIdx - radius)
    const endI = Math.min(GRID_SIZE - 1, xIdx + radius)
    const startJ = Math.max(0, zIdx - radius)
    const endJ = Math.min(GRID_SIZE - 1, zIdx + radius)

    for (let i = startI; i <= endI; i++) {
      for (let j = startJ; j <= endJ; j++) {
        const dx = i - xIdx
        const dz = j - zIdx
        const dist2 = dx * dx + dz * dz
        if (dist2 > radius * radius) continue

        const weight = Math.exp(-dist2 / sigma2)
        const amount = strength * weight
        const idx = j * GRID_SIZE + i
        
        if (strength > 0) {
          // Paint: Add/Subtract based on tool type
          const delta = type === 'WATER_SOURCE' ? amount : -amount
          state.rLevel[idx] = Math.max(-5.0, Math.min(5.0, state.rLevel[idx] + delta))
          changed = true
        } else {
          // Erase: Pull towards 0
          const current = state.rLevel[idx]
          if (Math.abs(current) > 0.001) {
            const eraseFactor = Math.abs(strength) * weight
            if (current > 0) state.rLevel[idx] = Math.max(0, current - eraseFactor)
            else state.rLevel[idx] = Math.min(0, current + eraseFactor)
            changed = true
          }
        }
      }
    }
    return changed
  }

  let changed = false
  const sigma = radius / 2
  const sigma2 = 2 * sigma * sigma

  const startI = Math.max(0, xIdx - radius)
  const endI = Math.min(GRID_SIZE, xIdx + radius)
  const startJ = Math.max(0, zIdx - radius)
  const endJ = Math.min(GRID_SIZE, zIdx + radius)

  for (let i = startI; i <= endI; i++) {
    for (let j = startJ; j <= endJ; j++) {
      const dx = i - xIdx
      const dz = j - zIdx
      const dist2 = dx * dx + dz * dz
      if (dist2 > radius * radius) continue

      const weight = Math.exp(-dist2 / sigma2)
      const amount = strength * weight
      if (Math.abs(amount) < 0.001) continue

      const vertex = vertices[i][j]
      const last = vertex[vertex.length - 1]

      if (strength > 0) {
        // Paint
        if (last?.type === type) {
          last.thickness += amount
        } else {
          vertex.push({ type, thickness: amount })
        }
        changed = true
      } else {
        // Erase
        let eraseAmount = Math.abs(amount)
        while (eraseAmount > 0 && vertex.length > 0) {
          const currentLast = vertex[vertex.length - 1]
          if (currentLast.thickness > eraseAmount) {
            currentLast.thickness -= eraseAmount
            eraseAmount = 0
          } else {
            eraseAmount -= currentLast.thickness
            if (vertex.length > 1) {
              vertex.pop()
            } else {
              currentLast.thickness = 0
              eraseAmount = 0
            }
          }
        }
        changed = true
      }
    }
  }

  if (changed) {
    updateWaterSimulationForArea(vertices, startI, startJ, endI - startI, endJ - startJ, state)
  }

  return changed
}

/**
 * Computes adaptive indices for a grid based on vertex heights.
 * Picks the diagonal with the smaller height difference to avoid "spiking" artifacts.
 */
export const computeAdaptiveIndices = (vertices: TerrainVertex[][]): Uint32Array => {
  const indices = new Uint32Array(GRID_SIZE * GRID_SIZE * 6)
  let ptr = 0

  for (let j = 0; j < GRID_SIZE; j++) {
    for (let i = 0; i < GRID_SIZE; i++) {
      // Vertex indices in the PlaneGeometry grid (which is (GRID_SIZE+1) x (GRID_SIZE+1))
      // PlaneGeometry standard indexing: row by row, from top-left.
      // But our rotateX(-Math.PI/2) and vertex height mapping might have different orientation.
      // PlaneGeometry(w, h, sw, sh) vertices:
      // index = y * (sw + 1) + x
      
      const v00 = j * (GRID_SIZE + 1) + i
      const v10 = j * (GRID_SIZE + 1) + (i + 1)
      const v01 = (j + 1) * (GRID_SIZE + 1) + i
      const v11 = (j + 1) * (GRID_SIZE + 1) + (i + 1)

      const h00 = getVertexTotalHeight(vertices[i][j])
      const h10 = getVertexTotalHeight(vertices[i + 1][j])
      const h01 = getVertexTotalHeight(vertices[i][j + 1])
      const h11 = getVertexTotalHeight(vertices[i + 1][j + 1])

      const diff00_11 = Math.abs(h00 - h11)
      const diff10_01 = Math.abs(h10 - h01)

      if (diff00_11 < diff10_01) {
        // Diagonal v00 -> v11
        indices[ptr++] = v00
        indices[ptr++] = v01
        indices[ptr++] = v11
        
        indices[ptr++] = v00
        indices[ptr++] = v11
        indices[ptr++] = v10
      } else {
        // Diagonal v10 -> v01
        indices[ptr++] = v00
        indices[ptr++] = v01
        indices[ptr++] = v10
        
        indices[ptr++] = v01
        indices[ptr++] = v11
        indices[ptr++] = v10
      }
    }
  }

  return indices
}

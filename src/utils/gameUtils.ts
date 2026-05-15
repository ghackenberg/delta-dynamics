import { TILE_SIZE, OFFSET, BOUNDARY } from '../constants/gameConfig'
import type { TerrainVertex } from '../types/game'
import { TERRAIN_BASE_Y } from '../constants/gameConfig'

export const gridToWorld = (x: number, z: number, w: number = 1, h: number = 1): [number, number] => [
  (x + (w - 1) / 2) * TILE_SIZE - OFFSET,
  (z + (h - 1) / 2) * TILE_SIZE - OFFSET
]

export const worldToGrid = (x: number, z: number): [number, number] => [
  Math.floor((x + BOUNDARY) / TILE_SIZE),
  Math.floor((z + BOUNDARY) / TILE_SIZE)
]

export const getVertexTotalHeight = (vertex: TerrainVertex) => {
  return vertex.reduce((sum, layer) => sum + layer.thickness, TERRAIN_BASE_Y)
}

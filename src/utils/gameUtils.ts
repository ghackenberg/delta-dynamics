import { TILE_SIZE, OFFSET, BOUNDARY, GRID_SIZE } from '../constants/gameConfig'
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

export const distToSegment = (px: number, pz: number, x1: number, z1: number, x2: number, z2: number) => {
  const l2 = (x1 - x2) ** 2 + (z1 - z2) ** 2
  if (l2 === 0) return Math.sqrt((px - x1) ** 2 + (pz - z1) ** 2)
  let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2
  t = Math.max(0, Math.min(1, t))
  return Math.sqrt((px - (x1 + t * (x2 - x1))) ** 2 + (pz - (z1 + t * (z2 - z1))) ** 2)
}

export const getVertexTotalHeight = (vertex: TerrainVertex) => {
  return vertex.reduce((sum, layer) => sum + layer.thickness, TERRAIN_BASE_Y)
}

export const getBilinearInterpolatedHeight = (x: number, z: number, terrainVertices: TerrainVertex[][]) => {
  const gridX = (x + BOUNDARY) / TILE_SIZE, gridZ = (z + BOUNDARY) / TILE_SIZE
  const i = Math.floor(gridX), j = Math.floor(gridZ)
  if (i < 0 || i >= GRID_SIZE || j < 0 || j >= GRID_SIZE) return 0
  const fx = gridX - i, fz = gridZ - j
  const h00 = getVertexTotalHeight(terrainVertices[i][j])
  const h10 = getVertexTotalHeight(terrainVertices[i + 1][j])
  const h01 = getVertexTotalHeight(terrainVertices[i][j + 1])
  const h11 = getVertexTotalHeight(terrainVertices[i + 1][j + 1])
  return (1 - fx) * (1 - fz) * h00 + fx * (1 - fz) * h10 + (1 - fx) * fz * h01 + fx * fz * h11
}

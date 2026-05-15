import { basicTerrain } from './basic'
import { riverLakeTerrain } from './river-lake'
import { flatTerrain } from './flat'
import type { TerrainConfig } from '../types/game'

export const terrains: TerrainConfig[] = [
  basicTerrain,
  riverLakeTerrain,
  flatTerrain
]

export const getTerrainById = (id: string) => terrains.find(t => t.id === id) || basicTerrain

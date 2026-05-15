import type { BuildingType, LayerType } from '../types/game'

export const GRID_SIZE = 100
export const TILE_SIZE = 0.2
export const TERRAIN_BASE_Y = -5
export const SEA_LEVEL = -0.8
export const OFFSET = (GRID_SIZE * TILE_SIZE) / 2 - TILE_SIZE / 2 
export const BOUNDARY = (GRID_SIZE * TILE_SIZE) / 2 
export const MAX_GPU_LAYERS = 8

export const LAYER_ID_MAP: Record<LayerType, number> = {
  ROCK: 0,
  GRAVEL: 1,
  SAND: 2,
  HUMUS: 3,
  PAVEMENT: 4,
  WATER: 5
}

export const BUILDING_SIZES: Record<BuildingType, { width: number, height: number }> = {
  HOUSE: { width: 5, height: 5 },
  FARM: { width: 5, height: 5 },
  LUMBER_MILL: { width: 5, height: 5 },
  QUARRY: { width: 5, height: 5 },
  ROAD: { width: 1, height: 1 },
  EXCAVATE: { width: 1, height: 1 },
  FILL: { width: 1, height: 1 },
  TREE: { width: 1, height: 1 },
  TREE_CONIFER: { width: 1, height: 1 },
  TREE_DECIDUOUS: { width: 1, height: 1 },
  TREE_BIRCH: { width: 1, height: 1 },
  CUT_TREE: { width: 1, height: 1 },
  FENCE: { width: 1, height: 1 },
  PUMP: { width: 3, height: 3 },
  DIKE: { width: 1, height: 1 },
  NONE: { width: 1, height: 1 }
}

export const MATERIAL_PROPERTIES: Record<LayerType, { porosity: number, permeability: number, color: string, highlightColor: string }> = {
  ROCK: { porosity: 0.05, permeability: 0.01, color: '#5c5c5c', highlightColor: '#8c8c8c' },
  GRAVEL: { porosity: 0.3, permeability: 0.8, color: '#96897f', highlightColor: '#c2b6ac' },
  HUMUS: { porosity: 0.4, permeability: 0.2, color: '#4a704a', highlightColor: '#6a9c6a' },
  SAND: { porosity: 0.35, permeability: 0.4, color: '#d4c29d', highlightColor: '#e8d8b5' },
  PAVEMENT: { porosity: 0.02, permeability: 0.001, color: '#6b6b6b', highlightColor: '#9c9c9c' },
  WATER: { porosity: 1.0, permeability: 1.0, color: '#4a90e2', highlightColor: '#7ab8ff' }
}

export const INITIAL_RESOURCES = { food: 500, wood: 200, stone: 100, gold: 100 }

export const SKIN_TONES = ['#ffdbac', '#f1c27d', '#e0ac69', '#8d5524']
export const OUTFIT_COLORS = ['#4a90e2', '#e67e22', '#2ecc71', '#e74c3c', '#9b59b6', '#f1c40f']

export const BUILDING_COSTS: Record<BuildingType, { wood: number, stone: number }> = {
  HOUSE: { wood: 50, stone: 0 },
  FARM: { wood: 30, stone: 0 },
  LUMBER_MILL: { wood: 20, stone: 20 },
  QUARRY: { wood: 50, stone: 10 },
  ROAD: { wood: 0, stone: 10 },
  EXCAVATE: { wood: 0, stone: 0 },
  FILL: { wood: 0, stone: 10 },
  TREE: { wood: 5, stone: 0 },
  TREE_CONIFER: { wood: 5, stone: 0 },
  TREE_DECIDUOUS: { wood: 5, stone: 0 },
  TREE_BIRCH: { wood: 5, stone: 0 },
  CUT_TREE: { wood: 0, stone: 0 },
  FENCE: { wood: 5, stone: 0 },
  PUMP: { wood: 40, stone: 60 },
  DIKE: { wood: 20, stone: 20 },
  NONE: { wood: 0, stone: 0 }
}

export const BUILDING_COLORS: Record<string, { corpus: string, roof: string }> = {
  HOUSE: { corpus: '#f5f5f5', roof: '#8b4513' },
  FARM: { corpus: '#ba0000', roof: '#333333' },
  LUMBER_MILL: { corpus: '#8b4513', roof: '#556b2f' },
  QUARRY: { corpus: '#808080', roof: '#404040' },
  FENCE: { corpus: '#5D4037', roof: '#5D4037' },
  TREE: { corpus: '#5D4037', roof: '#2d5a27' },
  TREE_CONIFER: { corpus: '#3E2723', roof: '#1a3317' },
  TREE_DECIDUOUS: { corpus: '#4d2d18', roof: '#385e2c' },
  TREE_BIRCH: { corpus: '#8D6E63', roof: '#6e8b3d' },
  DEFAULT: { corpus: '#cccccc', roof: '#999999' }
}

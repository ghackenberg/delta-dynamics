import { terrains } from '../terrains'

export const generateInitialTerrain = (terrainId: string) => {
  const config = terrains.find(t => t.id === terrainId) || terrains[0]
  return config.generate()
}

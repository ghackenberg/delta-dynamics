import { TILE_SIZE, OFFSET, BOUNDARY, GRID_SIZE, SKIN_TONES, OUTFIT_COLORS, HUMAN_SLOPE_THRESHOLD, ANIMAL_SLOPE_THRESHOLD } from '../constants/gameConfig'
import type { Human, Animal, BuildingInstance, TerrainVertex } from '../types/game'
import { gridToWorld } from '../utils/gameUtils'
import { getCellMaxSlope } from './terrainSystem'

export const findSafeLandPosition = (sWater: Float32Array, vertices: TerrainVertex[][], threshold: number = ANIMAL_SLOPE_THRESHOLD): [number, number] => {
  for (let attempt = 0; attempt < 100; attempt++) {
    const x = Math.floor(Math.random() * GRID_SIZE), z = Math.floor(Math.random() * GRID_SIZE)
    if (sWater[z * GRID_SIZE + x] <= 0.05 && getCellMaxSlope(vertices, x, z) <= threshold) {
      return [x * TILE_SIZE - OFFSET, z * TILE_SIZE - OFFSET]
    }
  }
  return [0, 0]
}

export const getRandomSkinTone = () => SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)]
export const getRandomOutfitColor = () => OUTFIT_COLORS[Math.floor(Math.random() * OUTFIT_COLORS.length)]

export const updateHuman = (human: Human, isNight: boolean, buildings: BuildingInstance[], sWater: Float32Array, vertices: TerrainVertex[][]): Human => {
  let newState = human.state, newTarget = human.target, newRot = human.rotation
  const newPos = [...human.position] as [number, number]
  const home = buildings.find(b => b.id === human.homeId), work = buildings.find(b => b.id === human.workplaceId)
  
  if (isNight) {
    if (home) {
      const [wx, wz] = gridToWorld(home.x, home.z, home.width, home.height)
      if (Math.abs(newPos[0] - wx) < 0.2 && Math.abs(newPos[1] - wz) < 0.2) { newState = 'SLEEPING'; newTarget = null }
      else { newState = 'MOVING'; newTarget = [wx, wz] }
    }
  } else {
    if (work) {
      const [wx, wz] = gridToWorld(work.x, work.z, work.width, work.height)
      if (Math.abs(newPos[0] - wx) < 0.2 && Math.abs(newPos[1] - wz) < 0.2) { newState = 'WORKING'; newTarget = null }
      else { newState = 'MOVING'; newTarget = [wx, wz] }
    } else newState = 'IDLE'
  }

  if (newTarget) {
    const dx = newTarget[0] - newPos[0], dz = newTarget[1] - newPos[1], dist = Math.sqrt(dx * dx + dz * dz)
    if (dist > 0.1) {
      newRot = Math.atan2(dx, dz)
      const nextX = newPos[0] + (dx / dist) * 0.02, nextZ = newPos[1] + (dz / dist) * 0.02
      const gx = Math.floor((nextX + BOUNDARY) / TILE_SIZE), gz = Math.floor((nextZ + BOUNDARY) / TILE_SIZE)
      if (gx >= 0 && gx < GRID_SIZE && gz >= 0 && gz < GRID_SIZE && sWater[gz * GRID_SIZE + gx] <= 0.05) {
        if (getCellMaxSlope(vertices, gx, gz) <= HUMAN_SLOPE_THRESHOLD) {
          newPos[0] = nextX; newPos[1] = nextZ
        }
      }
    }
  }
  newPos[0] = Math.max(-BOUNDARY + 0.1, Math.min(BOUNDARY - 0.1, newPos[0]))
  newPos[1] = Math.max(-BOUNDARY + 0.1, Math.min(BOUNDARY - 0.1, newPos[1]))
  
  return { ...human, state: newState, target: newTarget, position: newPos, rotation: newRot }
}

export const updateAnimal = (animal: Animal, sWater: Float32Array, vertices: TerrainVertex[][]): Animal => {
  let newState = animal.state, newTarget = animal.target, newRot = animal.rotation, newWait = animal.waitCounter
  const newPos = [...animal.position] as [number, number]
  
  if (newState === 'IDLE') {
    newWait++
    if (newWait > (5 + Math.random() * 10) * 20) {
      newState = 'WANDERING'; newWait = 0
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2, dist = 2 + Math.random() * 3
        const tx = Math.max(-BOUNDARY + 0.5, Math.min(BOUNDARY - 0.5, newPos[0] + Math.cos(angle) * dist)), tz = Math.max(-BOUNDARY + 0.5, Math.min(BOUNDARY - 0.5, newPos[1] + Math.sin(angle) * dist))
        const gx = Math.floor((tx + BOUNDARY) / TILE_SIZE), gz = Math.floor((tz + BOUNDARY) / TILE_SIZE)
        if (gx >= 0 && gx < GRID_SIZE && gz >= 0 && gz < GRID_SIZE && sWater[gz * GRID_SIZE + gx] <= 0.05) {
          if (getCellMaxSlope(vertices, gx, gz) <= ANIMAL_SLOPE_THRESHOLD) {
            newTarget = [tx, tz]; break
          }
        }
      }
    }
  } else if (newState === 'WANDERING' && newTarget) {
    const dx = newTarget[0] - newPos[0], dz = newTarget[1] - newPos[1], dist = Math.sqrt(dx * dx + dz * dz)
    if (dist > 0.1) {
      newRot = Math.atan2(dx, dz)
      const nextX = newPos[0] + (dx / dist) * 0.04, nextZ = newPos[1] + (dz / dist) * 0.04
      const gx = Math.floor((nextX + BOUNDARY) / TILE_SIZE), gz = Math.floor((nextZ + BOUNDARY) / TILE_SIZE)
      if (gx >= 0 && gx < GRID_SIZE && gz >= 0 && gz < GRID_SIZE && sWater[gz * GRID_SIZE + gx] <= 0.05) {
        if (getCellMaxSlope(vertices, gx, gz) <= ANIMAL_SLOPE_THRESHOLD) {
          newPos[0] = nextX; newPos[1] = nextZ
        } else {
          newState = 'IDLE'; newTarget = null
        }
      }
      else { newState = 'IDLE'; newTarget = null }
    } else { newState = 'IDLE'; newTarget = null }
  }
  
  return { ...animal, state: newState, target: newTarget, position: newPos, rotation: newRot, waitCounter: newWait }
}


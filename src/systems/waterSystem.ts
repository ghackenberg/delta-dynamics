import { GRID_SIZE, SEA_LEVEL, MATERIAL_PROPERTIES } from '../constants/gameConfig'
import type { GameState, TerrainVertex } from '../types/game'
import { getVertexTotalHeight } from '../utils/gameUtils'

export const runWaterSimulationInPlace = (state: GameState) => {
  const { sWater, gWater, tHeight, aCap, rLevel, day, gameTime, rainIntensity } = state
  const tidalOffset = Math.sin(day * 0.5 + gameTime * 0.02) * 0.2
  const currentSeaLevel = SEA_LEVEL + tidalOffset

  const sDeltas = new Float32Array(GRID_SIZE * GRID_SIZE)
  const gDeltas = new Float32Array(GRID_SIZE * GRID_SIZE)

  const SUB_STEPS = 10
  for (let step = 0; step < SUB_STEPS; step++) {
    sDeltas.fill(0)
    gDeltas.fill(0)

    for (let i = 0; i < GRID_SIZE; i++) {
      const rowOff = i * GRID_SIZE
      for (let j = 0; j < GRID_SIZE; j++) {
        const idx = rowOff + j
        const sw = sWater[idx], gw = gWater[idx]
        if (sw < 0.00001 && gw < 0.00001) continue

        const th = tHeight[idx], ac = aCap[idx]
        const sL = th + sw, gL = th - 0.5 + (ac > 0 ? (gw / ac) : 0)

        const check = (ni: number, nj: number) => {
          const nIdx = ni * GRID_SIZE + nj
          const nEffS = tHeight[nIdx] + sWater[nIdx]
          const sDiff = sL - nEffS
          if (sDiff > 0.0001) {
            const f = sDiff * 0.05
            const clampedF = Math.min(f, sw * 0.1)
            sDeltas[idx] -= clampedF; sDeltas[nIdx] += clampedF
          }
          const nGL = tHeight[nIdx] - 0.5 + (aCap[nIdx] > 0 ? (gWater[nIdx] / aCap[nIdx]) : 0)
          const gDiff = gL - nGL
          if (gDiff > 0.0001) {
            const f = gDiff * 0.005
            const clampedF = Math.min(f, gw * 0.25)
            gDeltas[idx] -= clampedF; gDeltas[nIdx] += clampedF
          }
        }

        if (i > 0) check(i - 1, j)
        if (i < GRID_SIZE - 1) check(i + 1, j)
        if (j > 0) check(i, j - 1)
        if (j < GRID_SIZE - 1) check(i, j + 1)

        if (rLevel[idx] === -99 && th < -0.5) {
          if (i === 0 || i === GRID_SIZE - 1 || j === 0 || j === GRID_SIZE - 1) {
            sDeltas[idx] += (currentSeaLevel - sL) * 0.025
          }
        }
      }
    }

    for (let idx = 0; idx < GRID_SIZE * GRID_SIZE; idx++) {
      if (rainIntensity > 0) sWater[idx] += rainIntensity * 0.0005 
      
      const rl = rLevel[idx]
      if (rl !== -99) {
        const j = idx % GRID_SIZE
        if (j < 5) { sWater[idx] = Math.max(0, rl - tHeight[idx]); gWater[idx] = aCap[idx] }
        else if (j > 95) { sWater[idx] = 0; gWater[idx] = 0 }
        else { sWater[idx] = Math.max(0, sWater[idx] + sDeltas[idx]); gWater[idx] = Math.max(0, gWater[idx] + gDeltas[idx]) }
      } else {
        sWater[idx] = Math.max(0, sWater[idx] + sDeltas[idx]); gWater[idx] = Math.max(0, gWater[idx] + gDeltas[idx])
      }
      if (sWater[idx] > 0 && gWater[idx] < aCap[idx]) {
        const amt = Math.min(sWater[idx], aCap[idx] - gWater[idx], 0.001)
        sWater[idx] -= amt; gWater[idx] += amt
      }
      if (gWater[idx] > aCap[idx]) { sWater[idx] += (gWater[idx] - aCap[idx]); gWater[idx] = aCap[idx] }
    }
  }
}

export const updateCellWaterData = (i: number, j: number, vertices: TerrainVertex[][], state: Partial<GameState>, getRiverCarve: (i: number, j: number) => number, MANUAL_HEIGHTS: number[][]) => {
  const idx = j * GRID_SIZE + i
  const h00 = getVertexTotalHeight(vertices[i][j])
  const h10 = getVertexTotalHeight(vertices[i + 1][j])
  const h01 = getVertexTotalHeight(vertices[i][j + 1])
  const h11 = getVertexTotalHeight(vertices[i + 1][j + 1])
  const th = (h00 + h10 + h01 + h11) / 4
  state.tHeight![idx] = th
  
  const layers = vertices[i][j]
  let ac = 0
  layers.forEach(l => { ac += l.thickness * MATERIAL_PROPERTIES[l.type].porosity })
  state.aCap![idx] = ac

  const carveAtCenter = getRiverCarve(i + 0.5, j + 0.5)
  if (carveAtCenter > 0.5) {
    const fi = ((i + 0.5) / GRID_SIZE) * 10, fj = ((j + 0.5) / GRID_SIZE) * 10
    const i0 = Math.floor(fi), i1 = Math.min(10, i0 + 1)
    const j0 = Math.floor(fj), j1 = Math.min(10, j0 + 1)
    const wi = fi - i0, wj = fj - j0
    const oh = (1 - wi) * (1 - wj) * MANUAL_HEIGHTS[i0][j0] + wi * (1 - wj) * MANUAL_HEIGHTS[i1][j0] + (1 - wi) * wj * MANUAL_HEIGHTS[i0][j1] + wi * wj * MANUAL_HEIGHTS[i1][j1]
    
    if (i < 5) {
      state.rLevel![idx] = oh - 0.05
      state.sWater![idx] = Math.max(0, state.rLevel![idx] - th)
    } else if (i > 95) {
      state.rLevel![idx] = oh - 1.5
      state.sWater![idx] = 0
    }
    state.gWater![idx] = ac
  } else if (th < -0.8) {
    state.sWater![idx] = Math.max(0, -0.8 - th)
    state.gWater![idx] = ac
  } else if (th < 0) {
    state.gWater![idx] = ac * 0.8
  }
}

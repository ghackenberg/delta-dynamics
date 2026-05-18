import * as THREE from 'three'
import { GRID_SIZE, MAX_GPU_LAYERS, LAYER_ID_MAP, TERRAIN_BASE_Y } from '../constants/gameConfig'
import type { TerrainVertex } from '../types/game'

export class TerrainManager {
  public layerTex: THREE.DataArrayTexture
  public surfaceTex: THREE.DataTexture

  constructor() {
    const lData = new Float32Array((GRID_SIZE + 1) * (GRID_SIZE + 1) * MAX_GPU_LAYERS * 4)
    this.layerTex = new THREE.DataArrayTexture(lData, GRID_SIZE + 1, GRID_SIZE + 1, MAX_GPU_LAYERS)
    this.layerTex.format = THREE.RGBAFormat
    this.layerTex.type = THREE.FloatType
    this.layerTex.minFilter = THREE.NearestFilter
    this.layerTex.magFilter = THREE.NearestFilter

    const sData = new Float32Array((GRID_SIZE + 1) * (GRID_SIZE + 1) * 4)
    this.surfaceTex = new THREE.DataTexture(sData, GRID_SIZE + 1, GRID_SIZE + 1, THREE.RGBAFormat, THREE.FloatType)
    this.surfaceTex.minFilter = THREE.NearestFilter
    this.surfaceTex.magFilter = THREE.NearestFilter
  }

  public update(terrainVertices: TerrainVertex[][], rLevel: Float32Array, aCap: Float32Array) {
    const lData = this.layerTex.image.data as Float32Array
    const sData = this.surfaceTex.image.data as Float32Array
    const size = GRID_SIZE + 1
    
    for (let j = 0; j <= GRID_SIZE; j++) {
      const texJ = GRID_SIZE - j
      const rowOff = texJ * size
      for (let i = 0; i <= GRID_SIZE; i++) {
        const texIdx = (rowOff + i) * 4
        const layers = terrainVertices[i][j]
        
        let totalHeight = 0
        for (let k = 0; k < MAX_GPU_LAYERS; k++) {
          const layerIdx = (k * size * size + rowOff + i) * 4
          if (k < layers.length) {
            const l = layers[k]
            lData[layerIdx] = LAYER_ID_MAP[l.type]
            lData[layerIdx + 1] = l.thickness
            totalHeight += l.thickness
          } else {
            lData[layerIdx] = -1.0
            lData[layerIdx + 1] = 0.0
          }
        }
        
        const topLayer = layers[layers.length - 1]
        const topTypeIdx = LAYER_ID_MAP[topLayer.type]
        
        const gridI = Math.min(i, GRID_SIZE - 1)
        const gridJ = Math.min(j, GRID_SIZE - 1)
        const gridIdx = gridJ * GRID_SIZE + gridI
        const height = totalHeight + TERRAIN_BASE_Y
        
        sData[texIdx] = height
        sData[texIdx + 1] = rLevel[gridIdx] ?? 0.0
        sData[texIdx + 2] = topTypeIdx
        sData[texIdx + 3] = aCap[gridIdx]
      }
    }
    this.layerTex.needsUpdate = true
    this.surfaceTex.needsUpdate = true
  }

  public dispose() {
    this.layerTex.dispose()
    this.surfaceTex.dispose()
  }
}

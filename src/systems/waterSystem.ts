import * as THREE from 'three'
import { waterSimulationVertexModule } from '../shaders/water/simulation.vert'
import { waterSimulationFragmentModule } from '../shaders/water/simulation.frag'
import { GRID_SIZE, MAX_GPU_LAYERS, LAYER_ID_MAP, MATERIAL_PROPERTIES } from '../constants/gameConfig'
import type { GameState, TerrainVertex } from '../types/game'
import { getVertexTotalHeight } from '../utils/gameUtils'
import { applyModulesToShader, type Shader } from '../utils/shaderUtils'

export class WaterComputeSystem {
    private renderer: THREE.WebGLRenderer
    private renderTargetA: THREE.WebGLRenderTarget
    private renderTargetB: THREE.WebGLRenderTarget
    private terrainLayersTexture: THREE.DataArrayTexture
    private terrainSurfaceTexture: THREE.DataTexture
    private computeMaterial: THREE.ShaderMaterial
    private scene: THREE.Scene
    private camera: THREE.OrthographicCamera
    private mesh: THREE.Mesh
    private pixelBuffer: Float32Array

    constructor(renderer: THREE.WebGLRenderer) {
        this.renderer = renderer
        
        const options = {
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            depthBuffer: false,
            stencilBuffer: false,
        }

        this.renderTargetA = new THREE.WebGLRenderTarget(GRID_SIZE, GRID_SIZE, options)
        this.renderTargetB = new THREE.WebGLRenderTarget(GRID_SIZE, GRID_SIZE, options)
        
        // Terrain Layers (3D Array: Material ID, Thickness)
        this.terrainLayersTexture = new THREE.DataArrayTexture(new Float32Array(GRID_SIZE * GRID_SIZE * MAX_GPU_LAYERS * 4), GRID_SIZE, GRID_SIZE, MAX_GPU_LAYERS)
        this.terrainLayersTexture.format = THREE.RGBAFormat
        this.terrainLayersTexture.type = THREE.FloatType
        this.terrainLayersTexture.minFilter = THREE.NearestFilter
        this.terrainLayersTexture.magFilter = THREE.NearestFilter

        // Terrain Surface (PAVEMENT, rLevel, topType, height)
        this.terrainSurfaceTexture = new THREE.DataTexture(new Float32Array(GRID_SIZE * GRID_SIZE * 4), GRID_SIZE, GRID_SIZE, THREE.RGBAFormat, THREE.FloatType)
        this.terrainSurfaceTexture.minFilter = THREE.NearestFilter
        this.terrainSurfaceTexture.magFilter = THREE.NearestFilter

        const computeShader = {
            uniforms: {
                uWater: { value: null },
                uTerrainLayers: { value: this.terrainLayersTexture },
                uTerrainSurface: { value: this.terrainSurfaceTexture },
                uLayerPermeability: { value: new Float32Array(6) },
                uRain: { value: 0 },
                uRainBrushPos: { value: new THREE.Vector2(-1, -1) },
                uRainBrushSize: { value: 0 },
                uRainBrushIntensity: { value: 0 },
                uInflow: { value: 0 },
                uSeaLevel: { value: -0.8 },
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(GRID_SIZE, GRID_SIZE) }
            },
            vertexShader: waterSimulationVertexModule.vertex?.main || '',
            fragmentShader: waterSimulationFragmentModule.fragment?.main || ''
        }
        
        // Use our utility to apply modules (handles defines etc)
        applyModulesToShader(computeShader as Shader, [waterSimulationVertexModule, waterSimulationFragmentModule])

        this.computeMaterial = new THREE.ShaderMaterial({
            uniforms: computeShader.uniforms,
            vertexShader: computeShader.vertexShader,
            fragmentShader: computeShader.fragmentShader
        })

        this.scene = new THREE.Scene()
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.computeMaterial)
        this.scene.add(this.mesh)

        this.pixelBuffer = new Float32Array(GRID_SIZE * GRID_SIZE * 4)
    }

    public updateMaterialProperties(permeability: Float32Array) {
        this.computeMaterial.uniforms.uLayerPermeability.value = permeability
    }

    public setInitialWater(sWater: Float32Array, gWater: Float32Array, tHeight: Float32Array) {
        const data = new Float32Array(GRID_SIZE * GRID_SIZE * 4)
        for (let j = 0; j < GRID_SIZE; j++) {
            // Invert j for texture row
            const texJ = GRID_SIZE - 1 - j
            const rowOff = texJ * GRID_SIZE
            for (let i = 0; i < GRID_SIZE; i++) {
                const gridIdx = j * GRID_SIZE + i
                const texIdx = (rowOff + i) * 4
                const sw = sWater[gridIdx]
                const th = tHeight[gridIdx]
                data[texIdx] = th + sw // sL
                data[texIdx + 1] = gWater[gridIdx]
                data[texIdx + 2] = sw 
                data[texIdx + 3] = 1.0
            }
        }
        const tex = new THREE.DataTexture(data, GRID_SIZE, GRID_SIZE, THREE.RGBAFormat, THREE.FloatType)
        tex.needsUpdate = true
        
        // Initial copy to targets using a quad mesh
        const prevTarget = this.renderer.getRenderTarget()
        const setupMaterial = new THREE.MeshBasicMaterial({ map: tex })
        const setupMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), setupMaterial)
        const setupScene = new THREE.Scene(); setupScene.add(setupMesh)
        
        this.renderer.setRenderTarget(this.renderTargetA)
        this.renderer.render(setupScene, this.camera)
        this.renderer.setRenderTarget(this.renderTargetB)
        this.renderer.render(setupScene, this.camera)
        this.renderer.setRenderTarget(prevTarget)
        tex.dispose()
    }

    public updateTerrain(terrainVertices: TerrainVertex[][], rLevel: Float32Array, aCap: Float32Array) {
        const lData = this.terrainLayersTexture.image.data as Float32Array
        const sData = this.terrainSurfaceTexture.image.data as Float32Array
        
        for (let j = 0; j < GRID_SIZE; j++) {
            // Invert j for texture row (v=0 is bottom/South)
            const texJ = GRID_SIZE - 1 - j
            const rowOff = texJ * GRID_SIZE
            for (let i = 0; i < GRID_SIZE; i++) {
                const texIdx = (rowOff + i) * 4
                
                // Average height of the 4 vertices defining the cell
                const h00 = getVertexTotalHeight(terrainVertices[i][j])
                const h10 = getVertexTotalHeight(terrainVertices[i + 1][j])
                const h01 = getVertexTotalHeight(terrainVertices[i][j + 1])
                const h11 = getVertexTotalHeight(terrainVertices[i + 1][j + 1])
                const height = (h00 + h10 + h01 + h11) / 4
                
                // For layers, we still use the top-left vertex for now as it defines the cell's material properties
                const layers = terrainVertices[i][j]
                
                for (let k = 0; k < MAX_GPU_LAYERS; k++) {
                    const layerIdx = (k * GRID_SIZE * GRID_SIZE + rowOff + i) * 4
                    if (k < layers.length) {
                        const l = layers[k]
                        lData[layerIdx] = LAYER_ID_MAP[l.type]
                        lData[layerIdx + 1] = l.thickness
                    } else {
                        lData[layerIdx] = -1.0
                        lData[layerIdx + 1] = 0.0
                    }
                }
                
                const topLayer = layers[layers.length - 1]
                const topTypeIdx = LAYER_ID_MAP[topLayer.type]
                
                sData[texIdx] = height
                const gridIdx = j * GRID_SIZE + i
                sData[texIdx + 1] = rLevel[gridIdx]
                sData[texIdx + 2] = topTypeIdx
                sData[texIdx + 3] = aCap[gridIdx] // Use alpha for aCap instead of pavement thickness
            }
        }
        this.terrainLayersTexture.needsUpdate = true
        this.terrainSurfaceTexture.needsUpdate = true
    }

    public step(rain: number, inflow: number, seaLevel: number, time: number, rainBrushPos?: THREE.Vector2, rainBrushSize?: number, rainBrushIntensity?: number) {
        this.computeMaterial.uniforms.uWater.value = this.renderTargetA.texture
        this.computeMaterial.uniforms.uRain.value = rain
        this.computeMaterial.uniforms.uInflow.value = inflow
        this.computeMaterial.uniforms.uSeaLevel.value = seaLevel
        this.computeMaterial.uniforms.uTime.value = time

        if (rainBrushPos) this.computeMaterial.uniforms.uRainBrushPos.value.copy(rainBrushPos)
        else this.computeMaterial.uniforms.uRainBrushPos.value.set(-1, -1)
        
        if (rainBrushSize !== undefined) this.computeMaterial.uniforms.uRainBrushSize.value = rainBrushSize
        if (rainBrushIntensity !== undefined) this.computeMaterial.uniforms.uRainBrushIntensity.value = rainBrushIntensity

        const prevTarget = this.renderer.getRenderTarget()
        this.renderer.setRenderTarget(this.renderTargetB)
        this.renderer.render(this.scene, this.camera)
        this.renderer.setRenderTarget(prevTarget)

        // Swap
        const tmp = this.renderTargetA
        this.renderTargetA = this.renderTargetB
        this.renderTargetB = tmp
    }

    public getWaterTexture(): THREE.Texture {
        return this.renderTargetA.texture
    }

    public readBack(sWater: Float32Array, gWater: Float32Array, tHeight: Float32Array) {
        const prevTarget = this.renderer.getRenderTarget()
        this.renderer.setRenderTarget(this.renderTargetA)
        this.renderer.readRenderTargetPixels(this.renderTargetA, 0, 0, GRID_SIZE, GRID_SIZE, this.pixelBuffer)
        this.renderer.setRenderTarget(prevTarget)

        for (let j = 0; j < GRID_SIZE; j++) {
            // Invert j to get back to logic grid
            const texJ = GRID_SIZE - 1 - j
            const rowOff = texJ * GRID_SIZE
            for (let i = 0; i < GRID_SIZE; i++) {
                const gridIdx = j * GRID_SIZE + i
                const texIdx = (rowOff + i) * 4
                const sL = this.pixelBuffer[texIdx]
                const th = tHeight[gridIdx]
                sWater[gridIdx] = Math.max(0.0, sL - th)
                gWater[gridIdx] = this.pixelBuffer[texIdx + 1]
            }
        }
    }
}

export const updateCellWaterData = (i: number, j: number, vertices: TerrainVertex[][], state: Partial<GameState>) => {
  const idx = j * GRID_SIZE + i
  const h00 = getVertexTotalHeight(vertices[i][j])
  const h10 = getVertexTotalHeight(vertices[i + 1][j])
  const h01 = getVertexTotalHeight(vertices[i][j + 1])
  const h11 = getVertexTotalHeight(vertices[i + 1][j + 1])
  const th = (h00 + h10 + h01 + h11) / 4
  state.tHeight![idx] = th
  
  let totalAc = 0
  for (let di = 0; di <= 1; di++) {
    for (let dj = 0; dj <= 1; dj++) {
      let vAc = 0
      vertices[i + di][j + dj].forEach(l => { vAc += l.thickness * MATERIAL_PROPERTIES[l.type].porosity })
      totalAc += vAc
    }
  }
  const ac = totalAc / 4
  state.aCap![idx] = ac

  if (th < -0.8) {
    state.sWater![idx] = Math.max(0, -0.8 - th)
    state.gWater![idx] = ac
  } else if (th < 0) {
    state.gWater![idx] = ac * 0.8
  } else {
    state.gWater![idx] = ac * 0.2
  }
}

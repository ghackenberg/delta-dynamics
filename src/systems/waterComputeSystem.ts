import * as THREE from 'three'
import { waterFragmentShader } from './waterComputeShader'
import { GRID_SIZE } from '../constants/gameConfig'
import type { TerrainVertex, TerrainLayer } from '../types/game'

export class WaterComputeSystem {
    private renderer: THREE.WebGLRenderer
    private renderTargetA: THREE.WebGLRenderTarget
    private renderTargetB: THREE.WebGLRenderTarget
    private terrainLayersTexture: THREE.DataTexture
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
        
        // Terrain Layers (ROCK, GRAVEL, SAND, HUMUS)
        this.terrainLayersTexture = new THREE.DataTexture(new Float32Array(GRID_SIZE * GRID_SIZE * 4), GRID_SIZE, GRID_SIZE, THREE.RGBAFormat, THREE.FloatType)
        this.terrainLayersTexture.minFilter = THREE.NearestFilter
        this.terrainLayersTexture.magFilter = THREE.NearestFilter

        // Terrain Surface (PAVEMENT, rLevel, topType, height)
        this.terrainSurfaceTexture = new THREE.DataTexture(new Float32Array(GRID_SIZE * GRID_SIZE * 4), GRID_SIZE, GRID_SIZE, THREE.RGBAFormat, THREE.FloatType)
        this.terrainSurfaceTexture.minFilter = THREE.NearestFilter
        this.terrainSurfaceTexture.magFilter = THREE.NearestFilter

        this.computeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uWater: { value: null },
                uTerrainLayers: { value: this.terrainLayersTexture },
                uTerrainSurface: { value: this.terrainSurfaceTexture },
                uLayerPorosity: { value: new Float32Array(5) },
                uLayerPermeability: { value: new Float32Array(5) },
                uRain: { value: 0 },
                uSeaLevel: { value: -0.8 },
                uTime: { value: 0 },
                uResolution: { value: new THREE.Vector2(GRID_SIZE, GRID_SIZE) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: waterFragmentShader
        })

        this.scene = new THREE.Scene()
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.computeMaterial)
        this.scene.add(this.mesh)

        this.pixelBuffer = new Float32Array(GRID_SIZE * GRID_SIZE * 4)
    }

    public updateMaterialProperties(porosity: Float32Array, permeability: Float32Array) {
        this.computeMaterial.uniforms.uLayerPorosity.value = porosity
        this.computeMaterial.uniforms.uLayerPermeability.value = permeability
    }

    public setInitialWater(sWater: Float32Array, gWater: Float32Array) {
        const data = new Float32Array(GRID_SIZE * GRID_SIZE * 4)
        for (let j = 0; j < GRID_SIZE; j++) {
            const rowOff = j * GRID_SIZE
            for (let i = 0; i < GRID_SIZE; i++) {
                const gridIdx = rowOff + i
                const texIdx = (rowOff + i) * 4
                data[texIdx] = sWater[gridIdx]
                data[texIdx + 1] = gWater[gridIdx]
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

    public updateTerrain(terrainVertices: TerrainVertex[][], rLevel: Float32Array) {
        const lData = this.terrainLayersTexture.image.data as Float32Array
        const sData = this.terrainSurfaceTexture.image.data as Float32Array
        
        for (let j = 0; j < GRID_SIZE; j++) {
            const rowOff = j * GRID_SIZE
            for (let i = 0; i < GRID_SIZE; i++) {
                const texIdx = (rowOff + i) * 4
                const layers = terrainVertices[i][j]
                
                let rock = 0, gravel = 0, sand = 0, humus = 0, pavement = 0
                layers.forEach((l: TerrainLayer) => {
                    if (l.type === 'ROCK') rock += l.thickness
                    else if (l.type === 'GRAVEL') gravel += l.thickness
                    else if (l.type === 'SAND') sand += l.thickness
                    else if (l.type === 'HUMUS') humus += l.thickness
                    else if (l.type === 'PAVEMENT') pavement += l.thickness
                })
                
                const topType = layers[layers.length - 1].type
                const topTypeIdx = topType === 'ROCK' ? 0 : topType === 'GRAVEL' ? 1 : topType === 'SAND' ? 2 : topType === 'HUMUS' ? 3 : 4
                
                lData[texIdx] = rock
                lData[texIdx + 1] = gravel
                lData[texIdx + 2] = sand
                lData[texIdx + 3] = humus
                
                const height = rock + gravel + sand + humus + pavement - 5.0 // -5 is TERRAIN_BASE_Y
                sData[texIdx] = height
                sData[texIdx + 1] = rLevel[rowOff + i]
                sData[texIdx + 2] = topTypeIdx
                sData[texIdx + 3] = pavement
            }
        }
        this.terrainLayersTexture.needsUpdate = true
        this.terrainSurfaceTexture.needsUpdate = true
    }

    public step(rain: number, seaLevel: number, time: number) {
        this.computeMaterial.uniforms.uWater.value = this.renderTargetA.texture
        this.computeMaterial.uniforms.uRain.value = rain
        this.computeMaterial.uniforms.uSeaLevel.value = seaLevel
        this.computeMaterial.uniforms.uTime.value = time

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

    public readBack(sWater: Float32Array, gWater: Float32Array) {
        const prevTarget = this.renderer.getRenderTarget()
        this.renderer.setRenderTarget(this.renderTargetA)
        this.renderer.readRenderTargetPixels(this.renderTargetA, 0, 0, GRID_SIZE, GRID_SIZE, this.pixelBuffer)
        this.renderer.setRenderTarget(prevTarget)

        for (let j = 0; j < GRID_SIZE; j++) {
            const rowOff = j * GRID_SIZE
            for (let i = 0; i < GRID_SIZE; i++) {
                const gridIdx = rowOff + i
                const texIdx = (rowOff + i) * 4
                sWater[gridIdx] = this.pixelBuffer[texIdx]
                gWater[gridIdx] = this.pixelBuffer[texIdx + 1]
            }
        }
    }
}

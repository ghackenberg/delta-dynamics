import * as THREE from 'three'
import { waterFragmentShader } from './waterComputeShader'
import { GRID_SIZE } from '../constants/gameConfig'

export class WaterComputeSystem {
    private renderer: THREE.WebGLRenderer
    private renderTargetA: THREE.WebGLRenderTarget
    private renderTargetB: THREE.WebGLRenderTarget
    private terrainTexture: THREE.DataTexture
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
        
        // Terrain Texture (Static/Updated on terrain change)
        const terrainData = new Float32Array(GRID_SIZE * GRID_SIZE * 4)
        this.terrainTexture = new THREE.DataTexture(terrainData, GRID_SIZE, GRID_SIZE, THREE.RGBAFormat, THREE.FloatType)
        this.terrainTexture.minFilter = THREE.NearestFilter
        this.terrainTexture.magFilter = THREE.NearestFilter

        this.computeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uWater: { value: null },
                uTerrain: { value: this.terrainTexture },
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

    public updateTerrain(tHeight: Float32Array, aCap: Float32Array, rLevel: Float32Array) {
        const data = this.terrainTexture.image.data as Float32Array
        for (let j = 0; j < GRID_SIZE; j++) {
            const rowOff = j * GRID_SIZE
            for (let i = 0; i < GRID_SIZE; i++) {
                const gridIdx = rowOff + i
                const texIdx = (rowOff + i) * 4
                data[texIdx] = tHeight[gridIdx]
                data[texIdx + 1] = aCap[gridIdx]
                data[texIdx + 2] = rLevel[gridIdx]
                data[texIdx + 3] = 1.0
            }
        }
        this.terrainTexture.needsUpdate = true
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

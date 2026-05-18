import * as THREE from 'three'
import { GRID_SIZE, TILE_SIZE } from '../constants/gameConfig'
import { animalSurfaceVertexModule } from '../shaders/animals/surface.vert'
import { animalPickingVertexModule } from '../shaders/animals/picking.vert'
import { animalPickingFragmentModule } from '../shaders/animals/picking.frag'
import { highlightFragmentModule } from '../shaders/shared/highlight'
import { injectModules } from '../utils/shaderUtils'
import type { Animal } from '../types/game'

export class AnimalManager {
  public uTime = { value: 0 }
  public uHoveredPickingId = { value: -1.0 }
  public uTerrainSurface = { value: null as THREE.Texture | null }
  public materials: {
    deer: THREE.MeshStandardMaterial
    wolf: THREE.MeshStandardMaterial
    depth: THREE.MeshDepthMaterial
    picking: THREE.MeshBasicMaterial
  }

  constructor(heightTexture: THREE.Texture | null) {
    this.uTerrainSurface.value = heightTexture
    
    this.materials = {
      deer: new THREE.MeshStandardMaterial({ color: '#8d5524' }),
      wolf: new THREE.MeshStandardMaterial({ color: '#444444' }),
      depth: new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }),
      picking: new THREE.MeshBasicMaterial()
    }

    this.setup()
  }

  private setup() {
    const commonUniforms = {
      uTerrainSurface: this.uTerrainSurface,
      uTime: this.uTime,
      uHoveredPickingId: this.uHoveredPickingId,
      uGridSize: { value: GRID_SIZE * TILE_SIZE }
    }

    injectModules(this.materials.deer, [animalSurfaceVertexModule, highlightFragmentModule], commonUniforms)
    injectModules(this.materials.wolf, [animalSurfaceVertexModule, highlightFragmentModule], commonUniforms)
    injectModules(this.materials.depth, [animalSurfaceVertexModule], commonUniforms)
    injectModules(this.materials.picking, [animalPickingVertexModule, animalPickingFragmentModule], commonUniforms)
  }

  public updateHeightTexture(heightTexture: THREE.Texture | null) {
    this.uTerrainSurface.value = heightTexture
  }

  public updateTime(time: number) {
    this.uTime.value = time
  }

  public updateHoveredEntity(pickingId: number | null) {
    this.uHoveredPickingId.value = pickingId ?? -1.0
  }

  public updateInstances(
    deerMesh: THREE.InstancedMesh,
    wolfMesh: THREE.InstancedMesh,
    deerPicking: THREE.InstancedMesh,
    wolfPicking: THREE.InstancedMesh,
    animals: Animal[]
  ) {
    const dummy = new THREE.Object3D()
    
    const deerList = animals.filter(a => a.type === 'DEER')
    const wolfList = animals.filter(a => a.type === 'WOLF')

    const updateMesh = (mesh: THREE.InstancedMesh, picking: THREE.InstancedMesh, list: Animal[]) => {
      const pickingAttr = mesh.geometry.getAttribute('aPickingId') as THREE.InstancedBufferAttribute
      const pickingArray = pickingAttr.array as Float32Array
      
      // Clear unused instances in the buffer if necessary, or just rely on .count
      // Note: Since geometry is shared between deer/wolf in the component, 
      // we must be careful. But here each call gets a different mesh/picking pair.
      // Wait, InstancedAnimals.tsx uses SAME animalGeo for both deer and wolf!
      
      list.forEach((animal, i) => {
        dummy.position.set(animal.position[0], 0, animal.position[1])
        dummy.rotation.y = animal.rotation
        dummy.scale.setScalar(animal.type === 'WOLF' ? 0.15 : 0.2)
        dummy.updateMatrix()
        
        mesh.setMatrixAt(i, dummy.matrix)
        picking.setMatrixAt(i, dummy.matrix)
        pickingArray[i] = animal.pickingId || 0
      })

      mesh.count = list.length
      mesh.instanceMatrix.needsUpdate = true
      picking.count = list.length
      picking.instanceMatrix.needsUpdate = true
      
      // Mark attribute as needing update
      pickingAttr.needsUpdate = true
    }

    updateMesh(deerMesh, deerPicking, deerList)
    updateMesh(wolfMesh, wolfPicking, wolfList)
  }

  public dispose() {
    Object.values(this.materials).forEach(m => m.dispose())
  }
}

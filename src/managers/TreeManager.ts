import * as THREE from 'three'
import { GRID_SIZE, TILE_SIZE, OFFSET } from '../constants/gameConfig'
import { treeSurfaceVertexModule } from '../shaders/trees/surface.vert'
import { treePickingVertexModule } from '../shaders/trees/picking.vert'
import { treePickingFragmentModule } from '../shaders/trees/picking.frag'
import { injectModules } from '../utils/shaderUtils'
import type { BuildingInstance } from '../types/game'

export class TreeManager {
  public uTime = { value: 0 }
  public uTerrainSurface = { value: null as THREE.Texture | null }
  public materials: {
    conifer: THREE.MeshStandardMaterial
    deciduous: THREE.MeshStandardMaterial
    birch: THREE.MeshStandardMaterial
    trunk: THREE.MeshStandardMaterial
    depth: THREE.MeshDepthMaterial
    picking: THREE.MeshBasicMaterial
  }

  constructor(heightTexture: THREE.Texture | null) {
    this.uTerrainSurface.value = heightTexture

    this.materials = {
      conifer: new THREE.MeshStandardMaterial({ color: '#1a3317' }),
      deciduous: new THREE.MeshStandardMaterial({ color: '#385e2c' }),
      birch: new THREE.MeshStandardMaterial({ color: '#6e8b3d' }),
      trunk: new THREE.MeshStandardMaterial({ color: '#3E2723' }),
      depth: new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }),
      picking: new THREE.MeshBasicMaterial()
    }

    this.setup()
  }

  private setup() {
    const commonUniforms = {
      uTerrainSurface: this.uTerrainSurface,
      uTime: this.uTime,
      uGridSize: { value: GRID_SIZE * TILE_SIZE }
    }

    injectModules(this.materials.conifer, [treeSurfaceVertexModule], commonUniforms)
    injectModules(this.materials.deciduous, [treeSurfaceVertexModule], commonUniforms)
    injectModules(this.materials.birch, [treeSurfaceVertexModule], commonUniforms)
    injectModules(this.materials.trunk, [treeSurfaceVertexModule], commonUniforms)
    injectModules(this.materials.depth, [treeSurfaceVertexModule], commonUniforms)
    injectModules(this.materials.picking, [treePickingVertexModule, treePickingFragmentModule], {
      uTerrainSurface: this.uTerrainSurface,
      uGridSize: { value: GRID_SIZE * TILE_SIZE }
    })
  }

  public updateHeightTexture(heightTexture: THREE.Texture | null) {
    this.uTerrainSurface.value = heightTexture
  }

  public updateTime(time: number) {
    this.uTime.value = time
  }

  public updateInstances(
    meshes: {
      conifer: THREE.InstancedMesh
      deciduous: THREE.InstancedMesh
      birch: THREE.InstancedMesh
      trunk: THREE.InstancedMesh
    },
    pickingMeshes: {
      conifer: THREE.InstancedMesh
      deciduous: THREE.InstancedMesh
      birch: THREE.InstancedMesh
      trunk: THREE.InstancedMesh
    },
    buildings: BuildingInstance[]
  ) {
    const dummy = new THREE.Object3D()
    
    const coniferList = buildings.filter(b => b.type === 'TREE_CONIFER' || b.type === 'TREE')
    const deciduousList = buildings.filter(b => b.type === 'TREE_DECIDUOUS')
    const birchList = buildings.filter(b => b.type === 'TREE_BIRCH')
    const allTrees = [...coniferList, ...deciduousList, ...birchList]

    const updateMesh = (mesh: THREE.InstancedMesh, picking: THREE.InstancedMesh, list: BuildingInstance[]) => {
      const pickingAttr = mesh.geometry.getAttribute('aPickingId') as THREE.InstancedBufferAttribute
      const pickingArray = pickingAttr.array as Float32Array
      pickingArray.fill(0)

      list.forEach((tree, i) => {
        const worldX = tree.x * TILE_SIZE - OFFSET
        const worldZ = tree.z * TILE_SIZE - OFFSET
        dummy.position.set(worldX, 0, worldZ)
        dummy.rotation.y = (tree.id.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0) % 10) * 0.6
        dummy.scale.setScalar(0.8 + (tree.id.length % 5) * 0.1)
        dummy.updateMatrix()
        
        mesh.setMatrixAt(i, dummy.matrix)
        picking.setMatrixAt(i, dummy.matrix)
        pickingArray[i] = tree.pickingId || 0
      })

      mesh.count = list.length
      mesh.instanceMatrix.needsUpdate = true
      picking.count = list.length
      picking.instanceMatrix.needsUpdate = true
      pickingAttr.needsUpdate = true
    }

    updateMesh(meshes.conifer, pickingMeshes.conifer, coniferList)
    updateMesh(meshes.deciduous, pickingMeshes.deciduous, deciduousList)
    updateMesh(meshes.birch, pickingMeshes.birch, birchList)
    updateMesh(meshes.trunk, pickingMeshes.trunk, allTrees)
  }

  public dispose() {
    Object.values(this.materials).forEach(m => m.dispose())
  }
}

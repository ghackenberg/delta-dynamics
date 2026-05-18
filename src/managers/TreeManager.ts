import * as THREE from 'three'
import { GRID_SIZE, TILE_SIZE, OFFSET } from '../constants/gameConfig'
import { treeSurfaceVertexModule } from '../shaders/trees/surface.vert'
import { treePickingVertexModule } from '../shaders/trees/picking.vert'
import { treePickingFragmentModule } from '../shaders/trees/picking.frag'
import { highlightFragmentModule } from '../shaders/shared/highlight'
import { injectModules } from '../utils/shaderUtils'
import { getVertexTotalHeight } from '../utils/gameUtils'
import type { BuildingInstance, TerrainVertex } from '../types/game'

export class TreeManager {
  public uTime = { value: 0 }
  public uHoveredPickingId = { value: -1.0 }
  public uTerrainSurface = { value: null as THREE.Texture | null }
  public materials: {
    conifer: THREE.MeshStandardMaterial
    coniferTrunk: THREE.MeshStandardMaterial
    deciduous: THREE.MeshStandardMaterial
    deciduousTrunk: THREE.MeshStandardMaterial
    birch: THREE.MeshStandardMaterial
    birchTrunk: THREE.MeshStandardMaterial
    depth: THREE.MeshDepthMaterial
    picking: THREE.MeshBasicMaterial
  }

  constructor(heightTexture: THREE.Texture | null) {
    this.uTerrainSurface.value = heightTexture

    this.materials = {
      conifer: new THREE.MeshStandardMaterial({ color: '#1a3317' }),
      coniferTrunk: new THREE.MeshStandardMaterial({ color: '#2D1B13' }), // Dark greyish brown
      deciduous: new THREE.MeshStandardMaterial({ color: '#385e2c' }),
      deciduousTrunk: new THREE.MeshStandardMaterial({ color: '#3E2723' }), // Warm dark brown
      birch: new THREE.MeshStandardMaterial({ color: '#6e8b3d' }),
      birchTrunk: new THREE.MeshStandardMaterial({ color: '#A1887F' }), // Lighter brown
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

    injectModules(this.materials.conifer, [treeSurfaceVertexModule, highlightFragmentModule], commonUniforms)
    injectModules(this.materials.coniferTrunk, [treeSurfaceVertexModule, highlightFragmentModule], commonUniforms)
    injectModules(this.materials.deciduous, [treeSurfaceVertexModule, highlightFragmentModule], commonUniforms)
    injectModules(this.materials.deciduousTrunk, [treeSurfaceVertexModule, highlightFragmentModule], commonUniforms)
    injectModules(this.materials.birch, [treeSurfaceVertexModule, highlightFragmentModule], commonUniforms)
    injectModules(this.materials.birchTrunk, [treeSurfaceVertexModule, highlightFragmentModule], commonUniforms)
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

  public updateHoveredEntity(pickingId: number | null) {
    this.uHoveredPickingId.value = pickingId ?? -1.0
  }

  public updateInstances(
    meshes: {
      conifer: THREE.InstancedMesh
      coniferTrunk: THREE.InstancedMesh
      deciduous: THREE.InstancedMesh
      deciduousTrunk: THREE.InstancedMesh
      birch: THREE.InstancedMesh
      birchTrunk: THREE.InstancedMesh
    },
    pickingMeshes: {
      conifer: THREE.InstancedMesh
      coniferTrunk: THREE.InstancedMesh
      deciduous: THREE.InstancedMesh
      deciduousTrunk: THREE.InstancedMesh
      birch: THREE.InstancedMesh
      birchTrunk: THREE.InstancedMesh
    },
    buildings: BuildingInstance[],
    terrainVertices: TerrainVertex[][]
  ) {
    const dummy = new THREE.Object3D()
    
    const coniferList = buildings.filter(b => b.type === 'TREE_CONIFER' || b.type === 'TREE')
    const deciduousList = buildings.filter(b => b.type === 'TREE_DECIDUOUS')
    const birchList = buildings.filter(b => b.type === 'TREE_BIRCH')

    const updateMesh = (mesh: THREE.InstancedMesh, picking: THREE.InstancedMesh, list: BuildingInstance[], isTrunk = false) => {
      const pickingAttr = mesh.geometry.getAttribute('aPickingId') as THREE.InstancedBufferAttribute
      const pickingArray = pickingAttr.array as Float32Array
      pickingArray.fill(0)

      const sinkAttr = mesh.geometry.getAttribute('aSink') as THREE.InstancedBufferAttribute | undefined
      if (sinkAttr) sinkAttr.array.fill(0)

      list.forEach((tree, i) => {
        let worldX = tree.x * TILE_SIZE - OFFSET
        let worldZ = tree.z * TILE_SIZE - OFFSET

        // Nudge trees away from borders to avoid clipping through TerrainSides
        const borderNudge = 0.08
        if (tree.x === 0) worldX += borderNudge
        if (tree.x === GRID_SIZE - 1) worldX -= borderNudge
        if (tree.z === 0) worldZ += borderNudge
        if (tree.z === GRID_SIZE - 1) worldZ -= borderNudge

        dummy.position.set(worldX, 0, worldZ)
        dummy.rotation.y = (tree.id.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0) % 10) * 0.6
        dummy.scale.setScalar(0.8 + (tree.id.length % 5) * 0.1)
        dummy.updateMatrix()
        
        mesh.setMatrixAt(i, dummy.matrix)
        picking.setMatrixAt(i, dummy.matrix)
        pickingArray[i] = tree.pickingId || 0

        if (sinkAttr && isTrunk) {
            const tx = tree.x
            const tz = tree.z
            const hCenter = getVertexTotalHeight(terrainVertices[tx][tz])
            let minH = hCenter
            
            // Check 2x2 grid around the tree footprint
            for (let di = 0; di <= 1; di++) {
                for (let dj = 0; dj <= 1; dj++) {
                    const h = getVertexTotalHeight(terrainVertices[Math.min(GRID_SIZE, tx + di)][Math.min(GRID_SIZE, tz + dj)])
                    if (h < minH) minH = h
                }
            }
            // Dynamic sink based on slope + small safety buffer
            sinkAttr.setX(i, Math.max(0, hCenter - minH) + 0.05)
        }
      })

      mesh.count = list.length
      mesh.instanceMatrix.needsUpdate = true
      picking.count = list.length
      picking.instanceMatrix.needsUpdate = true
      pickingAttr.needsUpdate = true
      if (sinkAttr) sinkAttr.needsUpdate = true
    }

    updateMesh(meshes.conifer, pickingMeshes.conifer, coniferList)
    updateMesh(meshes.coniferTrunk, pickingMeshes.coniferTrunk, coniferList, true)
    updateMesh(meshes.deciduous, pickingMeshes.deciduous, deciduousList)
    updateMesh(meshes.deciduousTrunk, pickingMeshes.deciduousTrunk, deciduousList, true)
    updateMesh(meshes.birch, pickingMeshes.birch, birchList)
    updateMesh(meshes.birchTrunk, pickingMeshes.birchTrunk, birchList, true)
  }

  public dispose() {
    Object.values(this.materials).forEach(m => m.dispose())
  }
}

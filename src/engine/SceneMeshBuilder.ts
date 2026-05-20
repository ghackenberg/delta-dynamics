import * as THREE from 'three'
import { BUILDING_COLORS, TILE_SIZE } from '../constants/gameConfig'

/**
 * Procedural geometry and mesh builders for Delta Dynamics.
 * This class contains shared, framework-free Three.js geometry logic.
 * It is fully WebWorker safe and contains no references to global DOM APIs.
 */

// Shared materials or helper to generate MeshStandardMaterial
export const getStandardMaterial = (color: string, options: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: 0.8,
    metalness: 0.1,
    ...options
  })
}

/**
 * Creates a standard Human mesh group.
 */
export const createHumanMesh = (skinColor: string, outfitColor: string, isSleeping = false): THREE.Group => {
  const group = new THREE.Group()

  const actualOutfitColor = isSleeping ? '#333333' : outfitColor
  const actualSkinColor = isSleeping ? '#555555' : skinColor

  const outfitMat = getStandardMaterial(actualOutfitColor)
  const skinMat = getStandardMaterial(actualSkinColor)

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.15, 6)
  const legL = new THREE.Mesh(legGeo, outfitMat)
  legL.position.set(-0.02, 0.075, 0)
  group.add(legL)

  const legR = new THREE.Mesh(legGeo, outfitMat)
  legR.position.set(0.02, 0.075, 0)
  group.add(legR)

  // Torso
  const torsoGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.16, 8)
  const torso = new THREE.Mesh(torsoGeo, outfitMat)
  torso.position.set(0, 0.22, 0)
  group.add(torso)

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.15, 6)
  const armL = new THREE.Mesh(armGeo, skinMat)
  armL.position.set(-0.06, 0.22, 0)
  armL.rotation.z = 0.2
  group.add(armL)

  const armR = new THREE.Mesh(armGeo, skinMat)
  armR.position.set(0.06, 0.22, 0)
  armR.rotation.z = -0.2
  group.add(armR)

  // Head
  const headGeo = new THREE.SphereGeometry(0.06, 8, 8)
  const head = new THREE.Mesh(headGeo, skinMat)
  head.position.set(0, 0.35, 0)
  group.add(head)

  // Hair (Simple hair blob)
  const hairGeo = new THREE.SphereGeometry(0.05, 6, 6)
  const hair = new THREE.Mesh(hairGeo, getStandardMaterial('#442211'))
  hair.position.set(0, 0.4, 0)
  group.add(hair)

  // Enable shadows
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true
      obj.receiveShadow = true
    }
  })

  return group
}

/**
 * Creates a detailed Animal mesh group (typically for background worker or high-detail rendering).
 */
export const createDetailedAnimalMesh = (type: 'DEER' | 'WOLF'): THREE.Group => {
  const group = new THREE.Group()

  const color = type === 'DEER' ? '#8B4513' : '#708090'
  const mat = getStandardMaterial(color)

  if (type === 'DEER') {
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.4), mat)
    body.position.y = 0.12
    group.add(body)

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.12), mat)
    head.position.set(0, 0.3, 0.22)
    group.add(head)

    // Legs
    const legGeo = new THREE.BoxGeometry(0.03, 0.15, 0.03)
    const l1 = new THREE.Mesh(legGeo, mat); l1.position.set(0.07, 0.05, 0.15); group.add(l1)
    const l2 = new THREE.Mesh(legGeo, mat); l2.position.set(-0.07, 0.05, 0.15); group.add(l2)
    const l3 = new THREE.Mesh(legGeo, mat); l3.position.set(0.07, 0.05, -0.15); group.add(l3)
    const l4 = new THREE.Mesh(legGeo, mat); l4.position.set(-0.07, 0.05, -0.15); group.add(l4)
  } else {
    // Wolf Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.35), mat)
    body.position.y = 0.08
    group.add(body)

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), mat)
    head.position.set(0, 0.16, 0.18)
    group.add(head)
  }

  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true
    }
  })

  return group
}

/**
 * Creates a standard building group (Houses, Farms, Quarries, Lumber Mills, Fences, and Trees).
 */
export const createBuildingGroup = (
  type: string,
  isReady: boolean,
  progress: number,
  width: number,
  _height: number
): THREE.Group => {
  const group = new THREE.Group()
  const colors = BUILDING_COLORS[type] || BUILDING_COLORS.DEFAULT

  if (['TREE', 'TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'].includes(type)) {
    // Procedural Tree (used in workers/fallback, instanced is handled separately in TreeManager)
    const trunkGeo = new THREE.CylinderGeometry(type === 'TREE_BIRCH' ? 0.03 : 0.05, 0.1, 1.0, 6)
    trunkGeo.translate(0, 0.5, 0)
    const trunkMesh = new THREE.Mesh(trunkGeo, getStandardMaterial(colors.corpus))
    group.add(trunkMesh)

    let leafGeo: THREE.BufferGeometry
    if (type === 'TREE_DECIDUOUS') {
      leafGeo = new THREE.SphereGeometry(0.35, 8, 8)
      leafGeo.translate(0, 0.65, 0)
    } else if (type === 'TREE_BIRCH') {
      leafGeo = new THREE.SphereGeometry(0.25, 8, 8)
      leafGeo.translate(0, 0.6, 0)
    } else {
      leafGeo = new THREE.ConeGeometry(0.3, 0.8, 6)
      leafGeo.translate(0, 0.7, 0)
    }
    const leafMesh = new THREE.Mesh(leafGeo, getStandardMaterial(colors.roof))
    group.add(leafMesh)
  } else if (type === 'FENCE') {
    const fenceGeo = new THREE.BoxGeometry(0.05, 0.5, 0.2)
    fenceGeo.translate(0, 0.25, 0)
    const fenceMesh = new THREE.Mesh(fenceGeo, getStandardMaterial(colors.corpus))
    group.add(fenceMesh)
  } else {
    // Normal House / Farm / Mill / Quarry
    const meshScale = width * TILE_SIZE * 0.8

    const buildGroup = new THREE.Group()

    const corpusMat = getStandardMaterial(colors.corpus, {
      transparent: !isReady,
      opacity: isReady ? 1 : 0.5,
      wireframe: !isReady
    })
    const roofMat = getStandardMaterial(colors.roof, {
      transparent: !isReady,
      opacity: isReady ? 1 : 0.5,
      wireframe: !isReady
    })

    const corpusGeo = new THREE.BoxGeometry(meshScale, meshScale / 1.5, meshScale)
    corpusGeo.translate(0, meshScale / 3, 0)
    buildGroup.add(new THREE.Mesh(corpusGeo, corpusMat))

    const roofGeo = new THREE.ConeGeometry(meshScale * 0.8, meshScale / 2, 4)
    roofGeo.rotateY(Math.PI / 4)
    roofGeo.translate(0, meshScale * 0.9, 0)
    buildGroup.add(new THREE.Mesh(roofGeo, roofMat))

    // Apply scaling for progress
    const currentScale = isReady ? 1 : 0.4 + (progress / 100) * 0.6
    buildGroup.scale.setScalar(currentScale)

    group.add(buildGroup)
  }

  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true
      obj.receiveShadow = true
    }
  })

  return group
}

/**
 * Creates the preview mesh shown when placing a building.
 */
export const createPlacementPreviewGroup = (type: string, width: number, _height: number): THREE.Group => {
  const group = new THREE.Group()
  const colors = BUILDING_COLORS[type] || BUILDING_COLORS.DEFAULT

  const previewMat = (color: string) => getStandardMaterial(color, {
    transparent: true,
    opacity: 0.4
  })

  const isTreeType = ['TREE', 'TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'].includes(type)

  if (isTreeType) {
    const trunkGeo = new THREE.CylinderGeometry(type === 'TREE_BIRCH' ? 0.03 : 0.05, 0.1, 1.0, 6)
    trunkGeo.translate(0, 0.5, 0)
    group.add(new THREE.Mesh(trunkGeo, previewMat(colors.corpus)))

    let leafGeo: THREE.BufferGeometry
    if (type === 'TREE_DECIDUOUS') {
      leafGeo = new THREE.SphereGeometry(0.35, 8, 8)
      leafGeo.translate(0, 0.65, 0)
    } else if (type === 'TREE_BIRCH') {
      leafGeo = new THREE.SphereGeometry(0.25, 8, 8)
      leafGeo.translate(0, 0.6, 0)
    } else {
      leafGeo = new THREE.ConeGeometry(0.3, 0.8, 6)
      leafGeo.translate(0, 0.7, 0)
    }
    group.add(new THREE.Mesh(leafGeo, previewMat(colors.roof)))
  } else if (type === 'FENCE') {
    const fenceGeo = new THREE.BoxGeometry(0.05, 0.5, 0.2)
    fenceGeo.translate(0, 0.25, 0)
    group.add(new THREE.Mesh(fenceGeo, previewMat(colors.corpus)))
  } else if (type !== 'ROAD' && type !== 'EXCAVATE' && type !== 'FILL') {
    const meshScale = width * TILE_SIZE * 0.8
    const buildGroup = new THREE.Group()

    const corpusGeo = new THREE.BoxGeometry(meshScale, meshScale / 1.5, meshScale)
    corpusGeo.translate(0, meshScale / 3, 0)
    buildGroup.add(new THREE.Mesh(corpusGeo, previewMat(colors.corpus)))

    const roofGeo = new THREE.ConeGeometry(meshScale * 0.8, meshScale / 2, 4)
    roofGeo.rotateY(Math.PI / 4)
    roofGeo.translate(0, meshScale * 0.9, 0)
    buildGroup.add(new THREE.Mesh(roofGeo, previewMat(colors.roof)))

    buildGroup.scale.setScalar(0.8)
    group.add(buildGroup)
  }

  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true
    }
  })

  return group
}

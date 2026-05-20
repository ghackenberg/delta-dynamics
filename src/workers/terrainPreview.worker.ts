import * as THREE from 'three'
import { terrains } from '../terrains'
import { 
  MATERIAL_PROPERTIES, 
  GRID_SIZE, 
  TILE_SIZE, 
  BUILDING_SIZES,
  TERRAIN_BASE_Y,
  OFFSET,
  BOUNDARY
} from '../constants/gameConfig'
import type { TerrainData, TerrainVertex, Human, Animal } from '../types/game'
import {
  createHumanMesh as buildHumanMesh,
  createDetailedAnimalMesh as buildAnimalMesh,
  createBuildingGroup as buildBuildingGroup
} from '../engine/SceneMeshBuilder'

const getVertexTotalHeight = (vertex: TerrainVertex): number => {
  return vertex.reduce((acc, layer) => acc + layer.thickness, TERRAIN_BASE_Y)
}

const getInterpolatedHeight = (vertices: TerrainVertex[][], x: number, z: number): number => {
  const i = Math.floor(x)
  const j = Math.floor(z)
  if (i < 0 || i >= GRID_SIZE || j < 0 || j >= GRID_SIZE) return 0

  const wi = x - i
  const wj = z - j

  const h00 = getVertexTotalHeight(vertices[i][j])
  const h10 = i + 1 <= GRID_SIZE ? getVertexTotalHeight(vertices[i + 1][j]) : h00
  const h01 = j + 1 <= GRID_SIZE ? getVertexTotalHeight(vertices[i][j + 1]) : h00
  const h11 = (i + 1 <= GRID_SIZE && j + 1 <= GRID_SIZE) ? getVertexTotalHeight(vertices[i + 1][j + 1]) : h00

  const h0 = h00 * (1 - wi) + h10 * wi
  const h1 = h01 * (1 - wi) + h11 * wi
  return h0 * (1 - wj) + h1 * wj
}

const createHumanMesh = (human: Human, vertices: TerrainVertex[][]) => {
  const group = buildHumanMesh(human.color, human.outfitColor, human.state === 'SLEEPING')
  
  const gridX = (human.position[0] + BOUNDARY) / TILE_SIZE
  const gridZ = (human.position[1] + BOUNDARY) / TILE_SIZE
  const yPos = getInterpolatedHeight(vertices, gridX, gridZ)

  group.position.set(human.position[0], yPos, human.position[1])
  group.rotation.y = human.rotation
  return group
}

const createAnimalMesh = (animal: Animal, vertices: TerrainVertex[][]) => {
  const group = buildAnimalMesh(animal.type)
  
  const gridX = (animal.position[0] + BOUNDARY) / TILE_SIZE
  const gridZ = (animal.position[1] + BOUNDARY) / TILE_SIZE
  const yPos = getInterpolatedHeight(vertices, gridX, gridZ)

  group.position.set(animal.position[0], yPos, animal.position[1])
  group.rotation.y = animal.rotation
  return group
}

let canvas: OffscreenCanvas | null = null
let renderer: THREE.WebGLRenderer | null = null

self.onmessage = async (e: MessageEvent) => {
  const { id, jobId, terrainData } = e.data
  
  try {
    const terrain = terrains.find(t => t.id === id)
    let data: TerrainData = terrainData
    if (!data) {
      if (!terrain) {
        self.postMessage({ jobId, error: 'Terrain not found' })
        return
      }
      data = terrain.generate()
    }

    const { vertices, sWater, buildings, humans = [], animals = [] } = data
    const terrainSize = GRID_SIZE * TILE_SIZE
    const visualRange = terrain?.visualRange || [-5, 5]
    const targetY = (visualRange[0] + visualRange[1]) / 2

    // Setup Three.js Scene
    const width = 800 
    const height = 450 
    
    if (!renderer || !canvas) {
      canvas = new OffscreenCanvas(width, height)
      renderer = new THREE.WebGLRenderer({ 
        canvas: canvas as EventTarget as HTMLCanvasElement, 
        antialias: true,
        alpha: true 
      })
      renderer.setSize(width, height, false)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFShadowMap
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#87ceeb') // Sky blue
    
    // Camera setup
    const aspect = width / height
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000)
    
    const px = terrain?.cameraPosition ? terrain.cameraPosition[0] : terrainSize * 0.9
    const py = terrain?.cameraPosition ? terrain.cameraPosition[1] : targetY + terrainSize * 0.8
    const pz = terrain?.cameraPosition ? terrain.cameraPosition[2] : terrainSize * 0.9
    
    const tx = terrain?.cameraTarget ? terrain.cameraTarget[0] : 0
    const ty = terrain?.cameraTarget ? terrain.cameraTarget[1] : targetY
    const tz = terrain?.cameraTarget ? terrain.cameraTarget[2] : 0

    camera.position.set(px, py, pz)
    camera.lookAt(tx, ty, tz)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5)
    directionalLight.position.set(20, 40, 20)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.set(1024, 1024)
    directionalLight.shadow.camera.left = -15
    directionalLight.shadow.camera.right = 15
    directionalLight.shadow.camera.top = 15
    directionalLight.shadow.camera.bottom = -15
    scene.add(directionalLight)

    // Terrain Surface
    const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, GRID_SIZE, GRID_SIZE)
    geometry.rotateX(-Math.PI / 2)

    const posAttr = geometry.getAttribute('position')
    const colors = new Float32Array((GRID_SIZE + 1) * (GRID_SIZE + 1) * 3)

    for (let i = 0; i <= GRID_SIZE; i++) {
      for (let j = 0; j <= GRID_SIZE; j++) {
        const vIdx = j * (GRID_SIZE + 1) + i
        const h = getVertexTotalHeight(vertices[i][j])
        posAttr.setY(vIdx, h)

        const vertex = vertices[i][j]
        const topLayer = vertex[vertex.length - 1]
        const color = new THREE.Color(MATERIAL_PROPERTIES[topLayer.type].color)
        colors[vIdx * 3] = color.r
        colors[vIdx * 3 + 1] = color.g
        colors[vIdx * 3 + 2] = color.b
      }
    }
    posAttr.needsUpdate = true
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.computeVertexNormals()

    const material = new THREE.MeshStandardMaterial({ 
      vertexColors: true,
      flatShading: true,
      roughness: 0.8,
      metalness: 0.1
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.receiveShadow = true
    mesh.castShadow = true
    scene.add(mesh)

    // Water Surface
    const waterGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, GRID_SIZE, GRID_SIZE)
    waterGeometry.rotateX(-Math.PI / 2)
    const waterPosAttr = waterGeometry.getAttribute('position')
    let hasWater = false
    for (let i = 0; i <= GRID_SIZE; i++) {
      for (let j = 0; j <= GRID_SIZE; j++) {
        const idx = Math.min(j, GRID_SIZE - 1) * GRID_SIZE + Math.min(i, GRID_SIZE - 1)
        const sw = sWater[idx]
        const th = (getVertexTotalHeight(vertices[i][j]) + 
                    getVertexTotalHeight(vertices[Math.min(i + 1, GRID_SIZE)][j]) + 
                    getVertexTotalHeight(vertices[i][Math.min(j + 1, GRID_SIZE)]) + 
                    getVertexTotalHeight(vertices[Math.min(i + 1, GRID_SIZE)][Math.min(j + 1, GRID_SIZE)])) / 4
        const vIdx = j * (GRID_SIZE + 1) + i
        if (sw > 0.05) {
          waterPosAttr.setY(vIdx, th + sw)
          hasWater = true
        } else {
          waterPosAttr.setY(vIdx, th - 0.01)
        }
      }
    }
    if (hasWater) {
      waterPosAttr.needsUpdate = true
      const waterMat = new THREE.MeshStandardMaterial({ 
        color: MATERIAL_PROPERTIES.WATER.color, 
        transparent: true, 
        opacity: 0.6,
        flatShading: true 
      })
      const waterMesh = new THREE.Mesh(waterGeometry, waterMat)
      scene.add(waterMesh)
    }

    // Sides logic - Corrected Mapping
    const createSide = (edge: 'N' | 'S' | 'E' | 'W', color: string) => {
      const height = visualRange[1] - visualRange[0]
      const center = (visualRange[0] + visualRange[1]) / 2
      const sideGeo = new THREE.PlaneGeometry(terrainSize, height, GRID_SIZE, 1)
      const sPos = sideGeo.getAttribute('position')
      const sUv = sideGeo.getAttribute('uv')
      
      for (let i = 0; i < sPos.count; i++) {
        const ux = sUv.getX(i)
        const uy = sUv.getY(i)
        
        let gridX = 0, gridZ = 0
        if (edge === 'N') { gridX = Math.round((1 - ux) * GRID_SIZE); gridZ = 0 }
        else if (edge === 'S') { gridX = Math.round(ux * GRID_SIZE); gridZ = GRID_SIZE }
        else if (edge === 'W') { gridX = 0; gridZ = Math.round(ux * GRID_SIZE) }
        else if (edge === 'E') { gridX = GRID_SIZE; gridZ = Math.round((1 - ux) * GRID_SIZE) }

        const h = getVertexTotalHeight(vertices[gridX][gridZ])
        
        if (uy > 0.5) sPos.setY(i, h - center)
        else sPos.setY(i, visualRange[0] - center)
      }
      sideGeo.computeVertexNormals()
      const sideMat = new THREE.MeshStandardMaterial({ color, flatShading: true, side: THREE.DoubleSide })
      const sideMesh = new THREE.Mesh(sideGeo, sideMat)
      
      if (edge === 'N') { sideMesh.position.z = -terrainSize/2; sideMesh.rotation.y = Math.PI }
      else if (edge === 'S') { sideMesh.position.z = terrainSize/2 }
      else if (edge === 'W') { sideMesh.position.x = -terrainSize/2; sideMesh.rotation.y = -Math.PI/2 }
      else if (edge === 'E') { sideMesh.position.x = terrainSize/2; sideMesh.rotation.y = Math.PI/2 }
      
      sideMesh.position.y = center
      scene.add(sideMesh)
    }

    createSide('N', '#333'); createSide('S', '#333'); createSide('E', '#333'); createSide('W', '#333')

    // Buildings & Trees
    buildings.forEach(b => {
      const { width, height } = BUILDING_SIZES[b.type]
      const bX = (b.x + (width - 1) / 2) * TILE_SIZE - OFFSET
      const bZ = (b.z + (height - 1) / 2) * TILE_SIZE - OFFSET
      const bY = getInterpolatedHeight(vertices, (bX + BOUNDARY) / TILE_SIZE, (bZ + BOUNDARY) / TILE_SIZE)

      const group = buildBuildingGroup(b.type, b.isReady, b.progress, width, height)
      group.position.set(bX, bY, bZ)
      scene.add(group)
    })

    // Humans
    humans.forEach(h => scene.add(createHumanMesh(h, vertices)))

    // Animals
    animals.forEach(a => scene.add(createAnimalMesh(a, vertices)))

    // Render
    renderer.render(scene, camera)

    // Convert to Data URL
    const blob = await canvas.convertToBlob({ type: 'image/png' })
    const reader = new FileReader()
    reader.onloadend = () => {
      self.postMessage({ jobId, preview: reader.result })
    }
    reader.readAsDataURL(blob)

    // Cleanup
    scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
        else obj.material.dispose()
      }
    })
  } catch (err) {
    self.postMessage({ jobId, error: err instanceof Error ? err.message : 'Unknown error' })
  }
}

import { useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'
import { BUILDING_SIZES, BUILDING_COLORS, GRID_SIZE, TILE_SIZE, OFFSET, BOUNDARY } from '../../constants/gameConfig'
import { Human } from '../entities/Human'
import { InstancedTrees } from './InstancedTrees'
import { InstancedAnimals } from '../entities/InstancedAnimals'
import { TerrainManager } from '../../managers/TerrainManager'
import { PICKING_LAYER } from './PickingSystem'

export const GameGrid = () => {
  const buildings = useStore((state) => state.buildings)
  const occupancyGrid = useStore((state) => state.occupancyGrid)
  const sWater = useStore((state) => state.sWater)
  const humans = useStore((state) => state.humans)
  const hoveredCell = useStore((state) => state.hoveredCell)
  const selectedBuildingType = useStore((state) => state.selectedBuildingType)

  const isValidPlacement = useMemo(() => {
    if (!hoveredCell) return true
    const { x, z } = hoveredCell
    const size = BUILDING_SIZES[selectedBuildingType] || { width: 1, height: 1 }

    if (x + size.width > GRID_SIZE || z + size.height > GRID_SIZE) return false

    if (selectedBuildingType === 'CUT_TREE') {
      const bId = occupancyGrid[x][z]
      const b = buildings.find(b => b.id === bId)
      return !!(b && ['TREE', 'TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'].includes(b.type))
    }

    for (let i = x; i < x + size.width; i++) {
      for (let j = z; j < z + size.height; j++) {
        if (occupancyGrid[i][j]) return false
        if (sWater[i * GRID_SIZE + j] > 0.05) return false
      }
    }

    if (['HOUSE', 'FARM', 'LUMBER_MILL', 'QUARRY'].includes(selectedBuildingType)) {
      return TerrainManager.getInstance().isAreaFlat(x, z, size.width, size.height)
    }

    return true
  }, [hoveredCell, occupancyGrid, buildings, sWater, selectedBuildingType])
  
  const buildingMeshes = buildings.filter(b => !['TREE', 'TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'].includes(b.type)).map((building) => {
    const worldX = (building.x + (building.width - 1) / 2) * TILE_SIZE - OFFSET
    const worldZ = (building.z + (building.height - 1) / 2) * TILE_SIZE - OFFSET
    const gridX = (worldX + BOUNDARY) / TILE_SIZE
    const gridZ = (worldZ + BOUNDARY) / TILE_SIZE
    const hCenter = TerrainManager.getInstance().getInterpolatedHeight(gridX, gridZ)
    
    const colors = BUILDING_COLORS[building.type] || BUILDING_COLORS.DEFAULT
    const pickingColor = new THREE.Color(
      Math.floor(((building.pickingId || 0) + 1) / 256) / 255,
      (((building.pickingId || 0) + 1) % 256) / 255,
      1.0 // b=255 for buildings
    )
    
    if (building.type === 'FENCE') {
       return (
        <group key={building.id} position={[worldX, hCenter, worldZ]}>
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.05, 0.5, 0.2]} />
            <meshStandardMaterial color={colors.corpus} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.25, 0]} layers-mask={1 << PICKING_LAYER}>
            <boxGeometry args={[0.05, 0.5, 0.2]} />
            <meshBasicMaterial color={pickingColor} />
          </mesh>
        </group>
       )
    } else {
      const meshScale = building.width * TILE_SIZE * 0.8
      return (
        <group key={building.id} position={[worldX, hCenter, worldZ]}>
          <group scale={building.isReady ? 1 : 0.4 + (building.progress / 100) * 0.6}>
            <mesh position={[0, meshScale / 3, 0]} castShadow receiveShadow>
              <boxGeometry args={[meshScale, meshScale / 1.5, meshScale]} />
              <meshStandardMaterial 
                color={colors.corpus} 
                transparent={!building.isReady}
                opacity={building.isReady ? 1 : 0.5}
                wireframe={!building.isReady}
              />
            </mesh>
            <mesh position={[0, meshScale * 0.9, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
              <coneGeometry args={[meshScale * 0.8, meshScale / 2, 4]} />
              <meshStandardMaterial 
                color={colors.roof} 
                transparent={!building.isReady}
                opacity={building.isReady ? 1 : 0.5}
                wireframe={!building.isReady}
              />
            </mesh>
          </group>
          {/* Picking Mesh (Solid box even if not ready) */}
          <mesh position={[0, meshScale / 3, 0]} layers-mask={1 << PICKING_LAYER}>
            <boxGeometry args={[meshScale, meshScale / 1.5, meshScale]} />
            <meshBasicMaterial color={pickingColor} />
          </mesh>
        </group>
      )
    }
  })

  let previewMesh = null
  if (hoveredCell && selectedBuildingType !== 'CUT_TREE' && isValidPlacement) {
    const size = BUILDING_SIZES[selectedBuildingType] || { width: 1, height: 1 }
    const worldX = (hoveredCell.x + (size.width - 1) / 2) * TILE_SIZE - OFFSET
    const worldZ = (hoveredCell.z + (size.height - 1) / 2) * TILE_SIZE - OFFSET
    const gridX = (worldX + BOUNDARY) / TILE_SIZE
    const gridZ = (worldZ + BOUNDARY) / TILE_SIZE
    const hCenter = TerrainManager.getInstance().getInterpolatedHeight(gridX, gridZ)
    const colors = BUILDING_COLORS[selectedBuildingType] || BUILDING_COLORS.DEFAULT

    const isTreeType = ['TREE', 'TREE_CONIFER', 'TREE_DECIDUOUS', 'TREE_BIRCH'].includes(selectedBuildingType)

    if (isTreeType) {
      previewMesh = (
        <group key="preview" position={[worldX, hCenter, worldZ]}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[selectedBuildingType === 'TREE_BIRCH' ? 0.03 : 0.05, 0.1, 1.0, 6]} />
            <meshStandardMaterial color={colors.corpus} transparent opacity={0.4} />
          </mesh>
          {selectedBuildingType === 'TREE_DECIDUOUS' ? (
            <mesh position={[0, 0.65, 0]} castShadow>
              <sphereGeometry args={[0.35, 8, 8]} />
              <meshStandardMaterial color={colors.roof} transparent opacity={0.4} />
            </mesh>
          ) : selectedBuildingType === 'TREE_BIRCH' ? (
            <mesh position={[0, 0.6, 0]} castShadow>
              <sphereGeometry args={[0.25, 8, 8]} />
              <meshStandardMaterial color={colors.roof} transparent opacity={0.4} />
            </mesh>
          ) : ( // TREE or TREE_CONIFER
            <mesh position={[0, 0.7, 0]} castShadow>
              <coneGeometry args={[0.3, 0.8, 6]} />
              <meshStandardMaterial color={colors.roof} transparent opacity={0.4} />
            </mesh>
          )}
        </group>
      )
    } else if (selectedBuildingType === 'FENCE') {
       previewMesh = (
        <group key="preview" position={[worldX, hCenter, worldZ]}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[0.05, 0.5, 0.2]} />
            <meshStandardMaterial color={colors.corpus} transparent opacity={0.4} />
          </mesh>
        </group>
       )
    } else if (selectedBuildingType !== 'ROAD' && selectedBuildingType !== 'EXCAVATE' && selectedBuildingType !== 'FILL') {
      const meshScale = size.width * TILE_SIZE * 0.8
      previewMesh = (
        <group key="preview" position={[worldX, hCenter, worldZ]}>
          <group scale={0.8}>
            <mesh position={[0, meshScale / 3, 0]} castShadow>
              <boxGeometry args={[meshScale, meshScale / 1.5, meshScale]} />
              <meshStandardMaterial color={colors.corpus} transparent opacity={0.4} />
            </mesh>
            <mesh position={[0, meshScale * 0.9, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
              <coneGeometry args={[meshScale * 0.8, meshScale / 2, 4]} />
              <meshStandardMaterial color={colors.roof} transparent opacity={0.4} />
            </mesh>
          </group>
        </group>
      )
    }
  }

  return (
    <group>
      <InstancedTrees />
      <InstancedAnimals />
      {buildingMeshes}
      {previewMesh}
      {humans.map(human => (
        <Human
          key={human.id}
          pickingId={human.pickingId}
          position={human.position}
          rotation={human.rotation}
          state={human.state}
          name={human.name}
          color={human.color}
          outfitColor={human.outfitColor}
        />
      ))}
    </group>
  )
}

import { useRef } from 'react'
import * as THREE from 'three'
import { TerrainManager } from '../../managers/TerrainManager'
import { BOUNDARY, TILE_SIZE } from '../../constants/gameConfig'
import type { AnimalType } from '../../types/game'



interface AnimalProps {
  position: [number, number]
  rotation: number
  type: AnimalType
}

export const Animal = ({ position, rotation, type }: AnimalProps) => {
  const meshRef = useRef<THREE.Group>(null!)
  
  const gridX = (position[0] + BOUNDARY) / TILE_SIZE
  const gridZ = (position[1] + BOUNDARY) / TILE_SIZE
  const yPos = TerrainManager.getInstance().getInterpolatedHeight(gridX, gridZ)

  const getColor = () => {
    if (type === 'DEER') return '#8B4513' // Brown
    if (type === 'WOLF') return '#708090' // SlateGrey
    return 'white'
  }

  return (
    <group position={[position[0], yPos, position[1]]} rotation={[0, rotation, 0]} ref={meshRef}>
      {/* Visual representation of an animal */}
      {type === 'DEER' ? (
        <>
          {/* Body */}
          <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.2, 0.15, 0.4]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
          {/* Neck */}
          <mesh position={[0, 0.22, 0.16]} rotation={[-0.4, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.08, 0.15, 0.08]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
          {/* Head */}
          <mesh position={[0, 0.3, 0.22]} castShadow receiveShadow>
            <boxGeometry args={[0.1, 0.1, 0.12]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
          {/* Antlers */}
          <mesh position={[0.03, 0.38, 0.22]} castShadow receiveShadow>
            <boxGeometry args={[0.02, 0.12, 0.02]} />
            <meshStandardMaterial color="#5D4037" />
          </mesh>
          <mesh position={[-0.03, 0.38, 0.22]} castShadow receiveShadow>
            <boxGeometry args={[0.02, 0.12, 0.02]} />
            <meshStandardMaterial color="#5D4037" />
          </mesh>
          {/* Tail */}
          <mesh position={[0, 0.18, -0.2]} castShadow receiveShadow>
            <boxGeometry args={[0.04, 0.04, 0.08]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
          {/* Legs */}
          <mesh position={[0.07, 0.05, 0.15]} castShadow receiveShadow>
            <boxGeometry args={[0.03, 0.15, 0.03]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
          <mesh position={[-0.07, 0.05, 0.15]} castShadow receiveShadow>
            <boxGeometry args={[0.03, 0.15, 0.03]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
          <mesh position={[0.07, 0.05, -0.15]} castShadow receiveShadow>
            <boxGeometry args={[0.03, 0.15, 0.03]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
          <mesh position={[-0.07, 0.05, -0.15]} castShadow receiveShadow>
            <boxGeometry args={[0.03, 0.15, 0.03]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
        </>
      ) : (
        <>
          {/* Wolf Body */}
          <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.15, 0.12, 0.35]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
          {/* Head */}
          <mesh position={[0, 0.16, 0.18]} castShadow receiveShadow>
            <boxGeometry args={[0.1, 0.08, 0.1]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
          {/* Snout */}
          <mesh position={[0, 0.14, 0.26]} castShadow receiveShadow>
            <boxGeometry args={[0.06, 0.04, 0.08]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          {/* Ears */}
          <mesh position={[0.03, 0.21, 0.16]} castShadow receiveShadow>
            <boxGeometry args={[0.02, 0.04, 0.02]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
          <mesh position={[-0.03, 0.21, 0.16]} castShadow receiveShadow>
            <boxGeometry args={[0.02, 0.04, 0.02]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
          {/* Tail */}
          <mesh position={[0, 0.1, -0.2]} rotation={[-0.5, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.04, 0.06, 0.2]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
          {/* Legs */}
          <mesh position={[0.05, 0.03, 0.12]} castShadow receiveShadow>
            <boxGeometry args={[0.03, 0.1, 0.03]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
          <mesh position={[-0.05, 0.03, 0.12]} castShadow receiveShadow>
            <boxGeometry args={[0.03, 0.1, 0.03]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
          <mesh position={[0.05, 0.03, -0.12]} castShadow receiveShadow>
            <boxGeometry args={[0.03, 0.1, 0.03]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
          <mesh position={[-0.05, 0.03, -0.12]} castShadow receiveShadow>
            <boxGeometry args={[0.03, 0.1, 0.03]} />
            <meshStandardMaterial color={getColor()} />
          </mesh>
        </>
      )}
    </group>
  )
}

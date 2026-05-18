import { useRef, useMemo } from 'react'
import { Html } from '@react-three/drei'

import * as THREE from 'three'
import { BOUNDARY, TILE_SIZE } from '../../constants/gameConfig'
import { PICKING_LAYER } from '../scene/PickingSystem'
import { useStore } from '../../hooks/useStore'
import { getInterpolatedHeight } from '../../systems/terrainSystem'

interface HumanProps {
  id: string
  pickingId?: number
  position: [number, number]
  rotation: number
  state: string
  name: string
  color: string
  outfitColor: string
}

export const Human = ({ id, pickingId, position, rotation, state, name, color, outfitColor }: HumanProps) => {
  const meshRef = useRef<THREE.Group>(null!)
  const terrainVertices = useStore(state => state.terrainVertices)
  const hoveredEntityId = useStore(state => state.hoveredEntityId)
  const isHovered = id === hoveredEntityId

  const gridX = (position[0] + BOUNDARY) / TILE_SIZE
  const gridZ = (position[1] + BOUNDARY) / TILE_SIZE
  const yPos = getInterpolatedHeight(terrainVertices, gridX, gridZ)

  const mode = useStore(state => state.mode)
  const isPickable = mode === 'PLAY'

  const actualOutfitColor = state === 'SLEEPING' ? '#333' : outfitColor
  const actualSkinColor = state === 'SLEEPING' ? '#555' : color

  const pickingColor = useMemo(() => {
    const idVal = (pickingId || 0) + 1 // Offset by 1
    const r = Math.floor(idVal / 256) / 255
    const g = (idVal % 256) / 255
    return new THREE.Color(r, g, 254 / 255) // b=254 for humans
  }, [pickingId])

  const emissiveIntensity = isHovered ? 0.2 : 0
  const emissiveColor = isHovered ? new THREE.Color(0.2, 0.2, 0.2) : new THREE.Color(0, 0, 0)

  return (
    <group position={[position[0], yPos, position[1]]} rotation={[0, rotation, 0]} ref={meshRef}>
      {/* Body Parts */}
      <group position={[0, 0, 0]}>
        {/* Legs */}
        <mesh position={[-0.02, 0.075, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.15, 6]} />
          <meshStandardMaterial color={actualOutfitColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>
        <mesh position={[0.02, 0.075, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.15, 6]} />
          <meshStandardMaterial color={actualOutfitColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>

        {/* Torso */}
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.04, 0.16, 8]} />
          <meshStandardMaterial color={actualOutfitColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>

        {/* Arms */}
        <mesh position={[-0.06, 0.22, 0]} rotation={[0, 0, 0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.15, 6]} />
          <meshStandardMaterial color={actualSkinColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>
        <mesh position={[0.06, 0.22, 0]} rotation={[0, 0, -0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.15, 6]} />
          <meshStandardMaterial color={actualSkinColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color={actualSkinColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>

        {/* Hair/Hat (Simple hair blob) */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshStandardMaterial color="#442211" emissive={emissiveColor} emissiveIntensity={emissiveIntensity} />
        </mesh>
      </group>

      {/* Picking Mesh */}
      <mesh layers-mask={isPickable ? (1 << PICKING_LAYER) : 0} position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 6]} />
        <meshBasicMaterial color={pickingColor} />
      </mesh>

      {/* State Label */}
      <Html 
        position={[0, 0.5, 0]} 
        center 
        distanceFactor={10} 
        pointerEvents="none"
        style={{ pointerEvents: 'none' }}
      >
        <div className="flex flex-col items-center pointer-events-none">
          <span className="text-[8px] font-bold text-white/40 uppercase tracking-tighter bg-black/20 px-1 rounded">{name}</span>
          <span className={`text-[6px] font-bold px-1 rounded ${
            state === 'WORKING' ? 'bg-orange-500 text-white' : 
            state === 'SLEEPING' ? 'bg-blue-500 text-white' : 
            'bg-white/20 text-white'
          }`}>
            {state}
          </span>
        </div>
      </Html>
    </group>
  )
}

import { useRef } from 'react'
import { Html } from '@react-three/drei'

import * as THREE from 'three'
import { useStore } from '../../store/useStore'

interface HumanProps {
  position: [number, number]
  rotation: number
  state: string
  name: string
  color: string
  outfitColor: string
}

export const Human = ({ position, rotation, state, name, color, outfitColor }: HumanProps) => {
  const meshRef = useRef<THREE.Group>(null!)
  const getTerrainHeight = useStore((state) => state.getTerrainHeight)
  
  const yPos = getTerrainHeight(position[0], position[1])

  const actualOutfitColor = state === 'SLEEPING' ? '#333' : outfitColor
  const actualSkinColor = state === 'SLEEPING' ? '#555' : color

  return (
    <group position={[position[0], yPos, position[1]]} rotation={[0, rotation, 0]} ref={meshRef}>
      {/* Body Parts */}
      <group position={[0, 0, 0]}>
        {/* Legs */}
        <mesh position={[-0.02, 0.075, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.15, 6]} />
          <meshStandardMaterial color={actualOutfitColor} />
        </mesh>
        <mesh position={[0.02, 0.075, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.15, 6]} />
          <meshStandardMaterial color={actualOutfitColor} />
        </mesh>

        {/* Torso */}
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.04, 0.16, 8]} />
          <meshStandardMaterial color={actualOutfitColor} />
        </mesh>

        {/* Arms */}
        <mesh position={[-0.06, 0.22, 0]} rotation={[0, 0, 0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.15, 6]} />
          <meshStandardMaterial color={actualSkinColor} />
        </mesh>
        <mesh position={[0.06, 0.22, 0]} rotation={[0, 0, -0.2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.15, 6]} />
          <meshStandardMaterial color={actualSkinColor} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color={actualSkinColor} />
        </mesh>

        {/* Hair/Hat (Simple hair blob) */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshStandardMaterial color="#442211" />
        </mesh>
      </group>

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

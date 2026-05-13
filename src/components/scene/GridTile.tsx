import { useState } from 'react'
import { Plane } from '@react-three/drei'

interface GridTileProps {
  position: [number, number, number]
  size: number
  onSelect: (x: number, z: number) => void
}

export const GridTile = ({ position, size, onSelect }: GridTileProps) => {
  const [hovered, setHover] = useState(false)
  
  return (
    <Plane
      args={[size * 0.95, size * 0.95]}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(position[0], position[2])
      }}
    >
      <meshStandardMaterial 
        color={hovered ? "#444" : "#222"} 
        transparent 
        opacity={0.5} 
      />
    </Plane>
  )
}

import { MapControls, ContactShadows, Environment } from '@react-three/drei'
import { GameGrid } from './GameGrid'
import { Terrain } from './Terrain'
import { DayNightCycle } from './DayNightCycle'

export const Scene = () => {
  return (
    <>
      <DayNightCycle />
      
      <Terrain />
      <GameGrid />
      
      <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={40} blur={2} far={10} />
      <Environment preset="city" />
      
      <MapControls 
        makeDefault 
        minDistance={5} 
        maxDistance={50} 
        maxPolarAngle={Math.PI / 2.1} 
      />
    </>
  )
}

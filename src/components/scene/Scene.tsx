import { MapControls, ContactShadows, Environment } from '@react-three/drei'
import { GameGrid } from './GameGrid'
import { Terrain } from './Terrain'
import { useStore } from '../../store/useStore'
import { useMemo } from 'react'

export const Scene = () => {
  const gameTime = useStore((state) => state.gameTime)

  const { sunPosition, sunIntensity, ambientIntensity, skyColor } = useMemo(() => {
    const timeRatio = gameTime / 1440
    const sunAngle = (timeRatio * 2 * Math.PI) - Math.PI / 2
    
    // Sun moves in an arc
    const x = Math.cos(sunAngle) * 20
    const y = Math.sin(sunAngle) * 20
    const z = 10

    const intensityFactor = Math.max(0, Math.sin(sunAngle))
    
    // Deeper night colors and brighter day
    const skyR = Math.floor(2 + intensityFactor * 133)
    const skyG = Math.floor(2 + intensityFactor * 204)
    const skyB = Math.floor(10 + intensityFactor * 225)
    const colorStr = `rgb(${skyR}, ${skyG}, ${skyB})`

    return {
      sunPosition: [x, y, z] as [number, number, number],
      sunIntensity: intensityFactor * 2.5,
      ambientIntensity: 0.02 + intensityFactor * 0.25,
      skyColor: colorStr
    }
  }, [gameTime])

  return (
    <>
      <color attach="background" args={[skyColor]} />
      
      <ambientLight intensity={ambientIntensity} />
      <directionalLight 
        position={sunPosition} 
        intensity={sunIntensity} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
      >
        <orthographicCamera attach="shadow-camera" args={[-15, 15, 15, -15, 0.1, 50]} />
      </directionalLight>
      
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

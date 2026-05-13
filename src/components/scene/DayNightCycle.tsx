import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '../../hooks/useStore'

export const DayNightCycle = () => {
  const ambientRef = useRef<THREE.AmbientLight>(null!)
  const dirLightRef = useRef<THREE.DirectionalLight>(null!)
  
  useFrame((state) => {
    const gameTime = useStore.getState().gameTime
    const timeRatio = gameTime / 1440
    const sunAngle = (timeRatio * 2 * Math.PI) - Math.PI / 2
    
    // Sun moves in an arc
    const x = Math.cos(sunAngle) * 20
    const y = Math.sin(sunAngle) * 20
    const z = 10

    const intensityFactor = Math.max(0, Math.sin(sunAngle))
    
    // Deeper night colors and brighter day
    const skyR = (2 + intensityFactor * 133) / 255
    const skyG = (2 + intensityFactor * 204) / 255
    const skyB = (10 + intensityFactor * 225) / 255
    
    // Update Scene background color directly
    state.scene.background = new THREE.Color(skyR, skyG, skyB)

    if (ambientRef.current) {
      ambientRef.current.intensity = 0.02 + intensityFactor * 0.25
    }
    
    if (dirLightRef.current) {
      dirLightRef.current.position.set(x, y, z)
      dirLightRef.current.intensity = intensityFactor * 2.5
    }
  })

  return (
    <>
      <ambientLight ref={ambientRef} />
      <directionalLight 
        ref={dirLightRef}
        castShadow 
        shadow-mapSize={[2048, 2048]}
      >
        <orthographicCamera attach="shadow-camera" args={[-15, 15, 15, -15, 0.1, 50]} />
      </directionalLight>
    </>
  )
}

import { Canvas } from '@react-three/fiber'
import { Scene } from './components/scene/Scene'
import { HUD } from './components/ui/HUD'
import { useAI } from './hooks/useAI'
import { useGameLogic } from './hooks/useGameLogic'
import * as THREE from 'three'

function App() {
  const { initAI, consultAdvisor } = useAI()
  useGameLogic()

  return (
    <HUD onInitAI={initAI} onConsultAI={consultAdvisor}>
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [15, 15, 15], fov: 45, near: 0.1, far: 1000 }}
      >
        <Scene />
      </Canvas>
    </HUD>
  )
}

export default App

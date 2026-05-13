import { Canvas } from '@react-three/fiber'
import { Scene } from './components/scene/Scene'
import { HUD } from './components/ui/HUD'
import { useAI } from './ai/useAI'
import { useGameLogic } from './hooks/useGameLogic'
import { Stats } from '@react-three/drei'
import * as THREE from 'three'

function App() {
  const { initAI, consultAdvisor } = useAI()
  useGameLogic()

  return (
    <div className="relative w-full h-full bg-[#111] overflow-hidden">
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [15, 15, 15], fov: 45, near: 0.1, far: 1000 }}
      >
        <Stats />
        <Scene />
      </Canvas>
      
      <HUD onInitAI={initAI} onConsultAI={consultAdvisor} />
    </div>
  )
}

export default App

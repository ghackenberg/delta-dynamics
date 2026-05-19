import { Canvas } from '@react-three/fiber'
import { Routes, Route, Navigate, useMatch, useNavigate, useLocation } from 'react-router-dom'
import { Scene } from './components/scene/Scene'
import { HUD } from './components/ui/HUD'
import { useAI } from './hooks/useAI'
import { useGameLogic } from './hooks/useGameLogic'
import { useStore } from './hooks/useStore'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

function RouteSync() {
  const playMatch = useMatch('/play/:terrainId')
  const editMatch = useMatch('/edit/:terrainId')
  const duplicateMatch = useMatch('/duplicate/:terrainId')
  const renameMatch = useMatch('/rename/:terrainId')
  const deleteMatch = useMatch('/delete/:terrainId')
  const menuMatch = useMatch('/')
  const navigate = useNavigate()
  const location = useLocation()
  const hasInitialized = useRef(false)
  
  const gameState = useStore((state) => state.gameState)
  const mode = useStore((state) => state.mode)
  const activeTerrainId = useStore((state) => state.activeTerrainId)
  
  const setGameState = useStore((state) => state.setGameState)
  const setMode = useStore((state) => state.setMode)
  const loadTerrain = useStore((state) => state.loadTerrain)

  // Stack Initialization
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const path = location.pathname
    const segments = path.split('/').filter(Boolean)

    if (segments[0] === 'play' && segments[1]) {
      const terrainId = segments[1]
      navigate('/', { replace: true })
      // Use setTimeout to allow the replace to register and avoid route conflicts
      setTimeout(() => navigate(`/play/${terrainId}`), 0)
    } else if (segments[0] === 'edit' && segments[1]) {
      const terrainId = segments[1]
      navigate('/', { replace: true })
      setTimeout(() => navigate(`/edit/${terrainId}`), 0)
    } else if (segments[0] === 'duplicate' && segments[1]) {
      const terrainId = segments[1]
      navigate('/', { replace: true })
      setTimeout(() => navigate(`/duplicate/${terrainId}`), 0)
    } else if (segments[0] === 'rename' && segments[1]) {
      const terrainId = segments[1]
      navigate('/', { replace: true })
      setTimeout(() => navigate(`/rename/${terrainId}`), 0)
    } else if (segments[0] === 'delete' && segments[1]) {
      const terrainId = segments[1]
      navigate('/', { replace: true })
      setTimeout(() => navigate(`/delete/${terrainId}`), 0)
    }
  }, [location.pathname, navigate])

  useEffect(() => {
    if (menuMatch || duplicateMatch || renameMatch || deleteMatch) {
      if (gameState !== 'MENU') setGameState('MENU')
    } else if (playMatch) {
      const { terrainId } = playMatch.params
      if (gameState !== 'PLAY') setGameState('PLAY')
      if (mode !== 'PLAY') setMode('PLAY')
      if (terrainId && terrainId !== activeTerrainId) {
        loadTerrain(terrainId)
      }
    } else if (editMatch) {
      const { terrainId } = editMatch.params
      if (gameState !== 'PLAY') setGameState('PLAY')
      if (mode !== 'EDITOR') setMode('EDITOR')
      if (terrainId && terrainId !== activeTerrainId) {
        loadTerrain(terrainId)
      }
    }
  }, [menuMatch, playMatch, editMatch, duplicateMatch, renameMatch, deleteMatch, gameState, mode, activeTerrainId, setGameState, setMode, loadTerrain])

  return null
}

function App() {
  const { initAI, consultAdvisor } = useAI()
  useGameLogic()

  return (
    <>
      <RouteSync />
      <HUD onInitAI={initAI} onConsultAI={consultAdvisor}>
        <GameCanvas />
      </HUD>
      <Routes>
        <Route path="/" element={null} />
        <Route path="/play/:terrainId" element={null} />
        <Route path="/edit/:terrainId" element={null} />
        <Route path="/duplicate/:terrainId" element={null} />
        <Route path="/rename/:terrainId" element={null} />
        <Route path="/delete/:terrainId" element={null} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

function GameCanvas() {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{ position: [20, 20, 20], fov: 45, near: 0.1, far: 1000 }}
    >
      <Scene />
    </Canvas>
  )
}

export default App

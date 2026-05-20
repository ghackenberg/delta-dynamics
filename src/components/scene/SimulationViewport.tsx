import { useEffect, useRef } from 'react'
import { useStore } from '../../hooks/useStore'
import { SimulationEngine } from '../../engine/SimulationEngine'
import { getTerrainById } from '../../terrains'
import { GRID_SIZE, TILE_SIZE } from '../../constants/gameConfig'

export const SimulationViewport = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<SimulationEngine | null>(null)

  const activeTerrainId = useStore((state) => state.activeTerrainId)
  const gameState = useStore((state) => state.gameState)
  const setIsLoading = useStore((state) => state.setIsLoading)

  // 1. Initialize and dispose engine
  useEffect(() => {
    if (!canvasRef.current) return

    const engine = new SimulationEngine(canvasRef.current, { interactive: true })
    engineRef.current = engine

    // Immediate initial resize
    const rect = canvasRef.current.parentElement?.getBoundingClientRect()
    const width = rect?.width || window.innerWidth
    const height = rect?.height || window.innerHeight
    engine.resize(width, height)

    // Render/Update Loop
    let frameId = 0
    let hasSetFinishedLoading = false

    const tick = () => {
      engine.update()

      // Transition loading screen once the engine has rendered its first frame
      if (useStore.getState().isLoading && !hasSetFinishedLoading) {
        setIsLoading(false)
        hasSetFinishedLoading = true
      }

      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)

    // Window / Parent Resize observer
    const handleResize = () => {
      if (!canvasRef.current) return
      const w = canvasRef.current.parentElement?.clientWidth || window.innerWidth
      const h = canvasRef.current.parentElement?.clientHeight || window.innerHeight
      engine.resize(w, h)
    }

    window.addEventListener('resize', handleResize)

    // Clean up
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      engine.dispose()
      engineRef.current = null
    }
  }, [setIsLoading])

  // 2. Handle camera focus and reset on activeTerrainId or gameState change
  useEffect(() => {
    if (gameState === 'MENU' || !engineRef.current) return
    
    const engine = engineRef.current
    const terrainConfig = getTerrainById(activeTerrainId)
    if (!terrainConfig || !engine.controls) return

    const terrainSize = GRID_SIZE * TILE_SIZE
    const targetY = (terrainConfig.visualRange[0] + terrainConfig.visualRange[1]) / 2

    const px = terrainConfig.cameraPosition ? terrainConfig.cameraPosition[0] : terrainSize * 0.9
    const py = terrainConfig.cameraPosition ? terrainConfig.cameraPosition[1] : targetY + terrainSize * 0.8
    const pz = terrainConfig.cameraPosition ? terrainConfig.cameraPosition[2] : terrainSize * 0.9

    const tx = terrainConfig.cameraTarget ? terrainConfig.cameraTarget[0] : 0
    const ty = terrainConfig.cameraTarget ? terrainConfig.cameraTarget[1] : targetY
    const tz = terrainConfig.cameraTarget ? terrainConfig.cameraTarget[2] : 0

    engine.camera.position.set(px, py, pz)
    engine.controls.target.set(tx, ty, tz)
    engine.controls.update()
  }, [activeTerrainId, gameState])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none'
        }}
      />
    </div>
  )
}

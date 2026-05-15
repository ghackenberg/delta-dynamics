import { useEffect } from 'react'
import { useStore } from './useStore'

export const useGameLogic = () => {
  const tick = useStore((state) => state.tick)
  const simulationSpeed = useStore((state) => state.simulationSpeed)
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') useStore.setState({ isCtrlPressed: true })
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') useStore.setState({ isCtrlPressed: false })
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      tick()
    }, simulationSpeed)
    
    return () => clearInterval(interval)
  }, [tick, simulationSpeed])

  return {}
}

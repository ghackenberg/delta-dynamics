import { useEffect } from 'react'
import { useStore } from '../store/useStore'

export const useGameLogic = () => {
  const tick = useStore((state) => state.tick)
  const simulationSpeed = useStore((state) => state.simulationSpeed)
  
  useEffect(() => {
    const interval = setInterval(() => {
      tick()
    }, simulationSpeed)
    
    return () => clearInterval(interval)
  }, [tick, simulationSpeed])

  return {}
}

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../../hooks/useStore'

export const PerformanceSystem = () => {
  const setFps = useStore((state) => state.setFps)
  const lastTime = useRef(0)
  const frames = useRef(0)

  useFrame(() => {
    if (lastTime.current === 0) {
      lastTime.current = performance.now()
      return
    }

    frames.current++
    const now = performance.now()
    if (now >= lastTime.current + 1000) {
      setFps(Math.round((frames.current * 1000) / (now - lastTime.current)))
      frames.current = 0
      lastTime.current = now
    }
  })

  return null
}

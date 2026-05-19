import { useState, useEffect } from 'react'
import { useStore } from '../../hooks/useStore'

export const LoadingOverlay = () => {
  const isLoading = useStore((state) => state.isLoading)
  
  // We use showOverlay to keep the element mounted during fade out
  const [showOverlay, setShowOverlay] = useState(isLoading)
  // We use isTransitioning for the opacity animation
  const [isTransitioning, setIsTransitioning] = useState(isLoading)

  // Sync state during render to avoid flickering and satisfy linter
  // This is a standard pattern for syncing state with external values
  if (isLoading) {
    if (!showOverlay) setShowOverlay(true)
    if (!isTransitioning) setIsTransitioning(true)
  } else {
    // Start fading out as soon as loading is done
    if (isTransitioning) setIsTransitioning(false)
  }

  useEffect(() => {
    if (!isLoading) {
      // Keep the overlay mounted for 1s to allow the fade animation to complete
      const timer = setTimeout(() => {
        setShowOverlay(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  // If isLoading is true, we MUST show the overlay immediately to avoid flickering
  const visible = isLoading || showOverlay
  const active = isLoading || isTransitioning

  if (!visible) return null

  return (
    <div className={`absolute inset-0 z-[100] flex items-center justify-center bg-[#050505] pointer-events-auto transition-opacity duration-1000 ease-in-out ${active ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`flex flex-col items-center gap-8 transition-transform duration-1000 ease-out ${active ? 'scale-100' : 'scale-110'}`}>
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-2 border-white/5 border-t-orange-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img src="/icon.svg" alt="Loading" className="w-10 h-10 opacity-20 animate-pulse" />
          </div>
        </div>
        <div className="flex flex-col items-center text-center">
          <h2 className="text-2xl font-black uppercase tracking-[0.6em] text-white mb-3">Initializing</h2>
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.4em]">Preparing simulation environment</p>
        </div>
      </div>
    </div>
  )
}

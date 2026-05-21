import { useState, useEffect, useRef } from 'react'
import { useStore } from '../../hooks/useStore'

export const ControlHelper = () => {
  const mode = useStore((state) => state.mode)
  const selectedBuildingType = useStore((state) => state.selectedBuildingType)
  const editorBrushAction = useStore((state) => state.editorBrushAction)
  const isCtrlPressed = useStore((state) => state.isCtrlPressed)
  const leftSidebarOpen = useStore((state) => state.leftSidebarOpen)
  const rightSidebarOpen = useStore((state) => state.rightSidebarOpen)

  const [activeMode, setActiveMode] = useState<'mouse' | 'touch'>('mouse')
  const [subIndex, setSubIndex] = useState(0)
  const [isAutoScrolling, setIsAutoScrolling] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [activeMechanism, setActiveMechanism] = useState<'pan' | 'rotate' | 'zoom' | 'paint' | 'camera' | null>(null)

  const [activeTab, setActiveTab] = useState<'mouse' | 'touch'>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse'
    }
    return 'mouse'
  })
  const [isCollapsedWidth, setIsCollapsedWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024
    }
    return false
  })
  const [availableWidth, setAvailableWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 ? window.innerWidth - 576 : window.innerWidth - 144
    }
    return 800
  })

  const showAllInline = availableWidth >= 860

  // Refs for timeouts and pressed keys
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const keysPressedRef = useRef<Set<string>>(new Set())

  // Helper action verb builder depending on play/editor mode
  const getActionVerb = () => {
    if (mode === 'PLAY') {
      return selectedBuildingType === 'NONE' ? 'inspect' : 'build'
    } else {
      return editorBrushAction === 'ERASE' ? 'erase' : 'paint'
    }
  }

  // Interval for cycling control help items
  useEffect(() => {
    if (!isAutoScrolling) return

    const interval = setInterval(() => {
      if (showAllInline) {
        setActiveMode((prev) => (prev === 'mouse' ? 'touch' : 'mouse'))
      } else {
        setSubIndex((prev) => {
          if (activeMode === 'mouse') {
            if (prev >= 3) {
              setActiveMode('touch')
              return 0
            }
            return prev + 1
          } else {
            // Touch mode
            if (prev >= 1) {
              setActiveMode('mouse')
              return 0
            }
            return prev + 1
          }
        })
      }
    }, showAllInline ? 4000 : 2500) // 4 seconds per tab in inline mode, 2.5 seconds per item in cycling mode

    return () => clearInterval(interval)
  }, [activeMode, isAutoScrolling, showAllInline])

  // Helper to handle user interactions and reset lock timer
  const handleInteraction = (mode: 'mouse' | 'touch', index: number) => {
    setIsAutoScrolling(false)
    setActiveMode(mode)
    setSubIndex(index)
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  // Effect to react directly to Ctrl-key pressed changes from game engine/store
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    if (isCtrlPressed) {
      timer = setTimeout(() => {
        handleInteraction('mouse', 3) // Snaps to Ctrl-press action and highlights immediately
        setActiveMechanism('paint')
      }, 0)
    } else {
      timer = setTimeout(() => {
        setActiveMechanism((prev) => (prev === 'paint' ? null : prev))
      }, 0)
      
      // Re-trigger the 4-second timeout to unlock and resume auto-scrolling when Ctrl is released
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        setIsAutoScrolling(true)
      }, 4000)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isCtrlPressed])

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      setIsCollapsedWidth(w < 1024)
      setAvailableWidth(w >= 1024 ? w - 576 : w - 144)
    }
    window.addEventListener('resize', handleResize)

    const handlePointerDown = (e: PointerEvent) => {
      if (isOpen) return
      const isTouch = e.pointerType === 'touch'
      if (isTouch) return // Let handleTouchStart handle all touch events!
      
      // Mouse interaction
      if (e.button === 0) {
        // Left click
        if (e.ctrlKey || isCtrlPressed) {
          handleInteraction('mouse', 3)
          setActiveMechanism('paint')
        } else {
          handleInteraction('mouse', 0)
          setActiveMechanism('pan')
        }
      } else if (e.button === 2) {
        // Right click
        handleInteraction('mouse', 1)
        setActiveMechanism('rotate')
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (isOpen) return
      if (e.touches.length >= 2) {
        handleInteraction('touch', 0) // 2-finger camera
        setActiveMechanism('camera')
      } else if (e.touches.length === 1) {
        handleInteraction('touch', 1) // 1-finger paint/build
        setActiveMechanism('paint')
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isOpen) return
      if (e.touches.length >= 2) {
        handleInteraction('touch', 0)
        setActiveMechanism('camera')
      } else if (e.touches.length === 1) {
        handleInteraction('touch', 1)
        setActiveMechanism('paint')
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (isOpen) return
      if (e.touches.length === 0) {
        setActiveMechanism(null)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          setIsAutoScrolling(true)
        }, 4000)
      } else if (e.touches.length === 1) {
        handleInteraction('touch', 1)
        setActiveMechanism('paint')
      } else {
        handleInteraction('touch', 0)
        setActiveMechanism('camera')
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (isOpen) return
      const isTouch = e.pointerType === 'touch'
      if (isTouch) return
      
      setActiveMechanism(null)
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        setIsAutoScrolling(true)
      }, 4000)
    }

    const handleWheel = () => {
      if (isOpen) return
      handleInteraction('mouse', 2) // Snap to wheel zoom
      setActiveMechanism('zoom')
      
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current)
      wheelTimeoutRef.current = setTimeout(() => {
        setActiveMechanism((prev) => (prev === 'zoom' ? null : prev))
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          setIsAutoScrolling(true)
        }, 4000)
      }, 300)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen) return
      const key = e.key.toLowerCase()
      keysPressedRef.current.add(key)

      if (e.ctrlKey || e.key === 'Control') {
        handleInteraction('mouse', 3)
        setActiveMechanism('paint')
      } else if (
        ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)
      ) {
        handleInteraction('mouse', 0)
        setActiveMechanism('pan')
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isOpen) return
      const key = e.key.toLowerCase()
      keysPressedRef.current.delete(key)

      const hasMovementKeys = Array.from(keysPressedRef.current).some(k =>
        ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)
      )
      const hasControlKey = keysPressedRef.current.has('control')

      if (hasControlKey) {
        handleInteraction('mouse', 3)
        setActiveMechanism('paint')
      } else if (hasMovementKeys) {
        handleInteraction('mouse', 0)
        setActiveMechanism('pan')
      } else {
        setActiveMechanism(null)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          setIsAutoScrolling(true)
        }, 4000)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    window.addEventListener('wheel', handleWheel, { passive: true })
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current)
    }
  }, [isOpen, isCtrlPressed])

  return (
    <>
      {/* Floating Dynamic Status Capsule (Positioned under the Top Bar, aligned with sidebars and headers) */}
      {!(isCollapsedWidth && (leftSidebarOpen || rightSidebarOpen)) && (
        <div className="fixed top-20 left-[72px] right-[72px] lg:left-[224px] lg:right-[352px] h-10 lg:h-12 z-15 pointer-events-none flex justify-center items-center animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="pointer-events-auto flex items-center justify-center gap-2 lg:gap-3 bg-black/60 backdrop-blur-xl border border-white/10 px-3.5 lg:px-5 h-10 lg:h-12 rounded-xl lg:rounded-2xl shadow-2xl text-[8px] sm:text-[9px] lg:text-[10px] xl:text-[11px] font-black uppercase tracking-wider text-white/80 hover:border-white/20 transition-all duration-300 w-full">
            
            {/* Sliding Track for interactive info */}
            <div className="relative h-6 lg:h-8 overflow-hidden flex-1">
              <div 
                className={`flex flex-col h-[200%] w-full ${activeMechanism ? 'transition-none' : 'transition-transform duration-700 ease-in-out'}`}
                style={{ transform: `translateY(${activeMode === 'mouse' ? '0%' : '-50%'})` }}
              >
                {/* Slide 1: Mouse & Keyboard */}
                <div className="h-1/2 flex items-center justify-center shrink-0 w-full relative">
                  {showAllInline ? (
                    <div className="flex items-center justify-around w-full gap-2 lg:gap-4 px-2">
                      {/* Left Button Pan */}
                      <div className={`flex items-center gap-1 transition-all duration-300 px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${
                        activeMechanism === 'pan'
                          ? 'text-orange-400 bg-orange-500/10 border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.15)]'
                          : 'bg-white/5 text-white/60 border-white/5'
                      }`}>
                        <span className="text-[10px] lg:text-xs whitespace-nowrap flex-shrink-0">🖱️</span>
                        <span className="whitespace-nowrap flex-shrink-0">left button: pan</span>
                      </div>

                      {/* Right Button Rotate */}
                      <div className={`flex items-center gap-1 transition-all duration-300 px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${
                        activeMechanism === 'rotate'
                          ? 'text-orange-400 bg-orange-500/10 border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.15)]'
                          : 'bg-white/5 text-white/60 border-white/5'
                      }`}>
                        <span className="text-[10px] lg:text-xs whitespace-nowrap flex-shrink-0">🖱️</span>
                        <span className="whitespace-nowrap flex-shrink-0">right button: rotate</span>
                      </div>

                      {/* Wheel Zoom */}
                      <div className={`flex items-center gap-1 transition-all duration-300 px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${
                        activeMechanism === 'zoom'
                          ? 'text-orange-400 bg-orange-500/10 border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.15)]'
                          : 'bg-white/5 text-white/60 border-white/5'
                      }`}>
                        <span className="text-[10px] lg:text-xs whitespace-nowrap flex-shrink-0">🖱️</span>
                        <span className="whitespace-nowrap flex-shrink-0">wheel: zoom</span>
                      </div>

                      {/* Ctrl + Left Click paint/build */}
                      <div className="flex items-center whitespace-nowrap flex-shrink-0">
                        <span 
                          className={`transition-all duration-300 px-2 lg:px-2.5 py-0.5 rounded-full flex items-center gap-1 border whitespace-nowrap flex-shrink-0 ${
                            isCtrlPressed || (activeMechanism === 'paint' && activeMode === 'mouse')
                              ? 'bg-orange-500 text-white border-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.4)]' 
                              : 'bg-white/5 text-white/60 border-white/5'
                          }`}
                        >
                          <span className={`font-mono text-[9px] px-1 py-0.2 rounded mr-0.5 flex-shrink-0 ${
                            isCtrlPressed || (activeMechanism === 'paint' && activeMode === 'mouse')
                              ? 'bg-white/20' 
                              : 'bg-white/10 text-white/60'
                          }`}>Ctrl</span>
                          <span className="whitespace-nowrap flex-shrink-0">+ left button: {getActionVerb()}</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Action 0: Left Button Pan */}
                      <div className={`absolute inset-0 flex items-center justify-center ${
                        activeMechanism ? 'transition-none' : 'transition-all duration-500'
                      } ${
                        subIndex === 0 && activeMode === 'mouse'
                          ? 'opacity-100 scale-100 pointer-events-auto'
                          : 'opacity-0 scale-95 pointer-events-none'
                      }`}>
                        <span className={`px-2.5 py-0.5 rounded-full border flex items-center gap-1 transition-all duration-300 whitespace-nowrap ${
                          activeMechanism === 'pan'
                            ? 'text-orange-400 bg-orange-500/10 border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.15)]'
                            : 'bg-white/5 text-white/60 border-white/5'
                        }`}>
                          <span className="text-xs">🖱️</span>
                          <span>left button: pan</span>
                        </span>
                      </div>

                      {/* Action 1: Right Button Rotate */}
                      <div className={`absolute inset-0 flex items-center justify-center ${
                        activeMechanism ? 'transition-none' : 'transition-all duration-500'
                      } ${
                        subIndex === 1 && activeMode === 'mouse'
                          ? 'opacity-100 scale-100 pointer-events-auto'
                          : 'opacity-0 scale-95 pointer-events-none'
                      }`}>
                        <span className={`px-2.5 py-0.5 rounded-full border flex items-center gap-1 transition-all duration-300 whitespace-nowrap ${
                          activeMechanism === 'rotate'
                            ? 'text-orange-400 bg-orange-500/10 border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.15)]'
                            : 'bg-white/5 text-white/60 border-white/5'
                        }`}>
                          <span className="text-xs">🖱️</span>
                          <span>right button: rotate</span>
                        </span>
                      </div>

                      {/* Action 2: Wheel Zoom */}
                      <div className={`absolute inset-0 flex items-center justify-center ${
                        activeMechanism ? 'transition-none' : 'transition-all duration-500'
                      } ${
                        subIndex === 2 && activeMode === 'mouse'
                          ? 'opacity-100 scale-100 pointer-events-auto'
                          : 'opacity-0 scale-95 pointer-events-none'
                      }`}>
                        <span className={`px-2.5 py-0.5 rounded-full border flex items-center gap-1 transition-all duration-300 whitespace-nowrap ${
                          activeMechanism === 'zoom'
                            ? 'text-orange-400 bg-orange-500/10 border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.15)]'
                            : 'bg-white/5 text-white/60 border-white/5'
                        }`}>
                          <span className="text-xs">🖱️</span>
                          <span>wheel: zoom</span>
                        </span>
                      </div>

                      {/* Action 3: Ctrl + Left Click paint/build */}
                      <div className={`absolute inset-0 flex items-center justify-center ${
                        activeMechanism ? 'transition-none' : 'transition-all duration-500'
                      } ${
                        subIndex === 3 && activeMode === 'mouse'
                          ? 'opacity-100 scale-100 pointer-events-auto'
                          : 'opacity-0 scale-95 pointer-events-none'
                      }`}>
                        <span 
                          className={`transition-all duration-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 border whitespace-nowrap ${
                            isCtrlPressed || (activeMechanism === 'paint' && activeMode === 'mouse')
                              ? 'bg-orange-500 text-white border-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.4)]' 
                              : 'bg-white/5 text-white/60 border-white/5'
                          }`}
                        >
                          <span className={`font-mono text-[9px] px-1 py-0.2 rounded mr-0.5 ${
                            isCtrlPressed || (activeMechanism === 'paint' && activeMode === 'mouse')
                              ? 'bg-white/20' 
                              : 'bg-white/10 text-white/60'
                          }`}>Ctrl</span>
                          <span>+ left button: {getActionVerb()}</span>
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Slide 2: Touch Gestures */}
                <div className="h-1/2 flex items-center justify-center shrink-0 w-full relative">
                  {showAllInline ? (
                    <div className="flex items-center justify-center gap-6 lg:gap-10 w-full">
                      {/* Action 0: 2-Finger Camera */}
                      <div className={`flex items-center gap-1 transition-all duration-300 px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${
                        activeMechanism === 'camera'
                          ? 'text-orange-400 bg-orange-500/10 border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.15)]'
                          : 'bg-white/5 text-white/60 border-white/5'
                      }`}>
                        <span className="text-[10px] lg:text-xs whitespace-nowrap flex-shrink-0">📱</span>
                        <span className="whitespace-nowrap flex-shrink-0">2-finger: camera</span>
                      </div>

                      {/* Action 1: 1-Finger Paint/Build */}
                      <div className="flex items-center whitespace-nowrap flex-shrink-0">
                        <span className={`transition-all duration-300 px-2.5 py-0.5 rounded-full font-black border whitespace-nowrap flex-shrink-0 ${
                          activeMechanism === 'paint' && activeMode === 'touch'
                            ? 'bg-orange-500 text-white border-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.4)]'
                            : 'bg-white/5 text-white/60 border-white/5'
                        }`}>
                          <span className="whitespace-nowrap flex-shrink-0">👆 1-finger: {getActionVerb()}</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Action 0: 2-Finger Camera */}
                      <div className={`absolute inset-0 flex items-center justify-center ${
                        activeMechanism ? 'transition-none' : 'transition-all duration-500'
                      } ${
                        subIndex === 0 && activeMode === 'touch'
                          ? 'opacity-100 scale-100 pointer-events-auto'
                          : 'opacity-0 scale-95 pointer-events-none'
                      }`}>
                        <span className={`px-2.5 py-0.5 rounded-full border flex items-center gap-1 transition-all duration-300 whitespace-nowrap ${
                          activeMechanism === 'camera'
                            ? 'text-orange-400 bg-orange-500/10 border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.15)]'
                            : 'bg-white/5 text-white/60 border-white/5'
                        }`}>
                          <span className="text-xs">📱</span>
                          <span>2-finger: camera</span>
                        </span>
                      </div>

                      {/* Action 1: 1-Finger Paint/Build */}
                      <div className={`absolute inset-0 flex items-center justify-center ${
                        activeMechanism ? 'transition-none' : 'transition-all duration-500'
                      } ${
                        subIndex === 1 && activeMode === 'touch'
                          ? 'opacity-100 scale-100 pointer-events-auto'
                          : 'opacity-0 scale-95 pointer-events-none'
                      }`}>
                        <span className={`px-2.5 py-0.5 rounded-full font-black border transition-all duration-300 whitespace-nowrap ${
                          activeMechanism === 'paint' && activeMode === 'touch'
                            ? 'bg-orange-500 text-white border-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.4)]'
                            : 'bg-white/5 text-white/60 border-white/5'
                        }`}>
                          👆 1-finger: {getActionVerb()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="w-[1px] h-3 lg:h-4 bg-white/10 shrink-0" />

            {/* 3. Help Toggle Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(true)
              }}
              className="flex items-center justify-center w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-white/10 hover:bg-white/20 text-white hover:scale-105 active:scale-95 transition-all text-[10px] lg:text-xs font-black cursor-pointer shrink-0"
              title="Open detailed control guides"
            >
              ?
            </button>
          </div>
        </div>
      )}

      {/* Detailed Control Guide Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 pointer-events-auto animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Interaction & Controls</h3>
                <p className="text-[9px] text-white/40 uppercase tracking-wider mt-0.5">Delta Dynamics control schema</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/40 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Device Toggle Tabs */}
            <div className="flex border-b border-white/5 bg-black/25">
              <button
                onClick={() => setActiveTab('mouse')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === 'mouse' 
                    ? 'text-orange-400 border-b-2 border-orange-500 bg-white/[0.01]' 
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                🖱️ Mouse & Keyboard
              </button>
              <button
                onClick={() => setActiveTab('touch')}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === 'touch' 
                    ? 'text-orange-400 border-b-2 border-orange-500 bg-white/[0.01]' 
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                📱 Touch Gestures
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 max-h-[60vh]">
              {activeTab === 'mouse' ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Pan */}
                  <div className="flex gap-4 items-center bg-white/5 border border-white/5 p-3.5 rounded-xl">
                    <div className="w-12 h-12 flex items-center justify-center bg-black/40 border border-white/10 rounded-lg shrink-0">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/80">
                        <rect x="6" y="2" width="12" height="20" rx="4" />
                        <path d="M12 2v6" />
                        <path d="M6 8h12" />
                        <path d="M9 20v-2" />
                        {/* Highlight Left Click */}
                        <path d="M6 8V6a4 4 0 0 1 4-4v6H6z" fill="currentColor" className="text-orange-500" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-white">Pan Camera</p>
                      <p className="text-[10px] text-white/50 leading-relaxed mt-0.5">Drag with the <strong className="text-white">Left Mouse Button</strong> to slide the viewport across the terrain.</p>
                    </div>
                  </div>

                  {/* Rotate */}
                  <div className="flex gap-4 items-center bg-white/5 border border-white/5 p-3.5 rounded-xl">
                    <div className="w-12 h-12 flex items-center justify-center bg-black/40 border border-white/10 rounded-lg shrink-0">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/80">
                        <rect x="6" y="2" width="12" height="20" rx="4" />
                        <path d="M12 2v6" />
                        <path d="M6 8h12" />
                        <path d="M9 20v-2" />
                        {/* Highlight Right Click */}
                        <path d="M18 8V6a4 4 0 0 0-4-4v6h4z" fill="currentColor" className="text-orange-500" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-white">Rotate Camera</p>
                      <p className="text-[10px] text-white/50 leading-relaxed mt-0.5">Drag with the <strong className="text-white">Right Mouse Button</strong> to orbit the camera and inspect in 3D.</p>
                    </div>
                  </div>

                  {/* Zoom */}
                  <div className="flex gap-4 items-center bg-white/5 border border-white/5 p-3.5 rounded-xl">
                    <div className="w-12 h-12 flex items-center justify-center bg-black/40 border border-white/10 rounded-lg shrink-0">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/80">
                        <rect x="6" y="2" width="12" height="20" rx="4" />
                        <path d="M6 8h12" />
                        <circle cx="12" cy="5" r="1.5" fill="currentColor" className="text-orange-500" />
                        <path d="M12 2v1.5M12 6.5v1.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-white">Zoom View</p>
                      <p className="text-[10px] text-white/50 leading-relaxed mt-0.5">Use the <strong className="text-white">Mouse Scroll Wheel</strong> to zoom closer or pull back.</p>
                    </div>
                  </div>

                  {/* Interact */}
                  <div className="flex gap-4 items-center bg-white/5 border border-white/5 p-3.5 rounded-xl">
                    <div className="w-12 h-12 flex flex-col items-center justify-center gap-1.5 bg-black/40 border border-white/10 rounded-lg shrink-0 font-mono text-[9px] font-bold text-white/80">
                      <div className="bg-orange-600/30 text-orange-400 border border-orange-500/20 px-1 rounded">Ctrl</div>
                      <div className="text-white/40">+</div>
                      <div className="border border-white/10 px-1 rounded">LMB</div>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-white">Interact / Paint / Build</p>
                      <p className="text-[10px] text-white/50 leading-relaxed mt-0.5">Hold <strong className="text-white">Ctrl</strong> and click/drag to build houses, paint layers, or inspect elements.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Paint/Build */}
                  <div className="flex gap-4 items-center bg-white/5 border border-white/5 p-3.5 rounded-xl">
                    <div className="w-12 h-12 flex items-center justify-center bg-black/40 border border-white/10 rounded-lg shrink-0">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
                        <circle cx="12" cy="12" r="2" fill="currentColor" />
                        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-white">1-Finger Interaction</p>
                      <p className="text-[10px] text-white/50 leading-relaxed mt-0.5">Tap or drag with <strong className="text-white">One Finger</strong> to immediately paint layers or place active buildings.</p>
                    </div>
                  </div>

                  {/* 2-Finger Move */}
                  <div className="flex gap-4 items-center bg-white/5 border border-white/5 p-3.5 rounded-xl">
                    <div className="w-12 h-12 flex items-center justify-center bg-black/40 border border-white/10 rounded-lg shrink-0">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
                        {/* 2-Finger Zoom/Pan/Orbit visual */}
                        <circle cx="8" cy="10" r="1.5" fill="currentColor" />
                        <circle cx="16" cy="10" r="1.5" fill="currentColor" />
                        <path d="M8 10c0-4 8-4 8 0" strokeDasharray="2,2" />
                        <path d="M3 12h18M12 3v18" strokeWidth="1" opacity="0.3" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-white">2-Finger Camera Controls</p>
                      <p className="text-[10px] text-white/50 leading-relaxed mt-0.5">Use <strong className="text-white">Two Fingers</strong> to pan (drag), rotate (spin), or zoom (pinch) the camera in a single fluid motion.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center">
              <button 
                onClick={() => setIsOpen(false)}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest text-[10px] py-2 rounded-xl transition-colors cursor-pointer"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

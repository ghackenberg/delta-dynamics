import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../hooks/useStore'

export const TopBar = () => {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mode = useStore((state) => state.mode)
  const isDirty = useStore((state) => state.isDirty)
  const saveActiveTerrain = useStore((state) => state.saveActiveTerrain)
  const activeTerrainId = useStore((state) => state.activeTerrainId)
  const fps = useStore((state) => state.fps)
  const fpsHistory = useStore((state) => state.fpsHistory)
  const resources = useStore((state) => state.resources)
  const rates = useStore((state) => state.rates)
  const gameTime = useStore((state) => state.gameTime)
  const day = useStore((state) => state.day)
  const isNight = useStore((state) => state.isNight)
  const rainIntensity = useStore((state) => state.rainIntensity)

  const isStandard = !activeTerrainId.startsWith('custom-')

  const handleModeChange = (targetMode: 'PLAY' | 'EDITOR') => {
    if (targetMode === mode) return
    if (targetMode === 'EDITOR' && isStandard) {
      navigate(`/duplicate/${activeTerrainId}`)
    } else {
      const route = targetMode === 'EDITOR' ? 'edit' : 'play'
      navigate(`/${route}/${activeTerrainId}`, { replace: true })
    }
  }

  const hours = Math.floor(gameTime / 60)
  const minutes = Math.floor(gameTime % 60)
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

  return (
    <header className="absolute top-0 left-0 right-0 h-16 border-b border-white/10 bg-black/30 backdrop-blur-xl flex items-center px-3 lg:px-6 justify-between z-48 shadow-2xl pointer-events-auto transition-all duration-300">
      
      {/* Left block (Logo and Controls) */}
      <div className="flex items-center gap-2 lg:gap-6 shrink-0">
        {/* Logo/Icon */}
        <div className="flex items-center gap-3 shrink-0">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="Delta Dynamics" className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg shadow-2xl border border-white/5" />
          <div className="hidden lg:flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white font-black">Delta Dynamics</span>
            <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Ecosystem Simulator</span>
          </div>
        </div>

        <div className="hidden lg:block h-8 w-[1px] bg-white/10 mx-1 shrink-0" />

        {/* Desktop Save/Exit actions */}
        <div className="hidden xl:flex gap-4 shrink-0">
          <button
            onClick={() => {
              if (mode === 'EDITOR') saveActiveTerrain()
            }}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
              mode === 'EDITOR' && isDirty
                ? 'bg-white/10 text-white hover:bg-white/20 border-white/10'
                : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'
            }`}
            disabled={mode !== 'EDITOR' || !isDirty}
          >
            Save
          </button>
          <button
            onClick={() => {
              navigate('/')
            }}
            className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-red-500/20 transition-all"
          >
            Exit
          </button>
        </div>

        <div className="hidden xl:block h-8 w-[1px] bg-white/10 mx-1 shrink-0" />

        {/* Desktop Mode Switcher */}
        <div className="hidden xl:flex items-center shrink-0">
          <div className="flex bg-white/5 border border-white/10 rounded-full p-1 shadow-inner">
            <button
              disabled={isStandard}
              onClick={() => handleModeChange('EDITOR')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 ${
                isStandard
                  ? 'opacity-30 cursor-not-allowed text-white/30'
                  : mode === 'EDITOR'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-500/10'
                  : 'text-white/40 hover:text-white/80'
              }`}
              title={isStandard ? "Template terrains are read-only" : "Switch to Editor"}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
              </svg>
              <span>Editor</span>
            </button>
            <button
              onClick={() => handleModeChange('PLAY')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 ${
                mode === 'PLAY'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-500/10'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <span>Simulate</span>
            </button>
          </div>
        </div>

        <div className="hidden xl:block h-8 w-[1px] bg-white/10 mx-1 shrink-0" />

        {/* Desktop Performance diagnostics */}
        <div className="hidden xl:flex flex-col shrink-0">
          <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Performance</span>
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-2">
              <span className={`text-lg font-mono font-bold ${fps < 30 ? 'text-red-500' : fps < 55 ? 'text-yellow-500' : 'text-green-500'}`}>{fps}</span>
              <span className="text-[9px] text-white/20 uppercase font-black">fps</span>
            </div>
            <div className="h-6 w-24 bg-white/5 rounded border border-white/5 overflow-hidden">
              <svg width="100%" height="100%" viewBox="0 0 100 24" preserveAspectRatio="none" className="block">
                <defs>
                  <linearGradient id="fpsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={fps < 30 ? '#ef4444' : fps < 55 ? '#eab308' : '#22c55e'} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={fps < 30 ? '#ef4444' : fps < 55 ? '#eab308' : '#22c55e'} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {fpsHistory.length > 1 && (
                  <>
                    <path
                      d={`M 0,24 L ${fpsHistory.map((v, i) => `${(i / (fpsHistory.length - 1)) * 100},${24 - (Math.min(v, 60) / 60) * 20 - 2}`).join(' L ')} L 100,24 Z`}
                      fill="url(#fpsGradient)"
                    />
                    <polyline
                      fill="none"
                      stroke={fps < 30 ? '#ef4444' : fps < 55 ? '#eab308' : '#22c55e'}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={fpsHistory
                        .map((v, i) => `${(i / (fpsHistory.length - 1)) * 100},${24 - (Math.min(v, 60) / 60) * 20 - 2}`)
                        .join(' ')}
                    />
                  </>
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden xl:block h-8 w-[1px] bg-white/10 mx-3 shrink-0" />

      {/* Resources bar (visible on both mobile and desktop, centered horizontally using flex-grow on Center block and shrink-0 on Left/Right blocks) */}
      <div className="flex-1 min-w-0 flex justify-center items-center mx-2 xl:mx-4 z-10">
        <div className="flex gap-3 xl:gap-6 overflow-x-auto overflow-y-hidden scrollbar-hide py-1 justify-start xl:justify-center max-w-full">
          {Object.entries(resources).map(([res, value]) => (
            <div key={res} className="flex flex-col shrink-0">
              <span className="text-[8px] xl:text-[9px] uppercase tracking-widest text-white/40 font-bold">{res}</span>
              <div className="flex items-baseline gap-1 xl:gap-2">
                <span className="text-xs xl:text-lg font-mono font-bold text-white">{Math.floor(value)}</span>
                <span className={`text-[8px] xl:text-[9px] font-bold ${rates[res as keyof typeof rates] >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {rates[res as keyof typeof rates] >= 0 ? '+' : ''}{rates[res as keyof typeof rates]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden xl:block h-8 w-[1px] bg-white/10 mx-3 shrink-0" />

      {/* Right block: Day/Time/Weather & Hamburger Menu Button */}
      <div className="flex items-center justify-end gap-2 xl:gap-6 shrink-0 z-20">
        {rainIntensity > 0.1 && (
          <div className="flex items-center gap-1 xl:gap-2 bg-blue-500/20 px-2 py-0.5 xl:px-3 xl:py-1 rounded-full border border-blue-500/30 animate-pulse">
            <span className="text-[8px] xl:text-[10px] text-blue-400 font-black tracking-widest uppercase">Rain</span>
          </div>
        )}

        <div className="flex flex-col items-end shrink-0">
          <span className="text-[8px] xl:text-[9px] uppercase tracking-widest text-white/40 font-bold mb-0.5">Day {day}</span>
          <div className="flex items-center gap-1 xl:gap-2">
            <span className="text-sm xl:text-xl font-mono font-bold text-white">{timeString}</span>
            {isNight && <span className="text-[8px] xl:text-[10px] bg-orange-500 text-white px-1 xl:px-1.5 py-0.5 rounded font-bold animate-pulse">FAST</span>}
          </div>
        </div>

        {/* Hamburger Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="xl:hidden w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Drawer Overlay - Full Screen blurred centered menu */}
      {mobileMenuOpen && createPortal(
        <div 
          className="xl:hidden fixed inset-0 bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center gap-6 p-6 z-50 animate-in fade-in duration-300"
          onClick={() => setMobileMenuOpen(false)}
        >
          {/* Menu Container */}
          <div 
            className="flex flex-col items-center justify-center gap-6 w-full max-w-xs text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Block */}
            <div className="flex flex-col items-center mb-2">
              <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="Delta Dynamics" className="w-14 h-14 rounded-2xl shadow-2xl border border-white/10 mb-3" />
              <span className="text-sm uppercase tracking-[0.2em] text-white font-black">Delta Dynamics</span>
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Ecosystem Simulator</span>
            </div>

            <div className="h-[1px] bg-white/10 w-full" />

            {/* Mode Switcher Toggle */}
            <div className="flex flex-col gap-2 w-full">
              <span className="text-[9px] uppercase tracking-widest text-white/30 font-black">Simulation Mode</span>
              <div className="flex bg-white/5 border border-white/10 rounded-full p-1 shadow-inner justify-between w-full">
                <button
                  disabled={isStandard}
                  onClick={() => {
                    handleModeChange('EDITOR')
                    setMobileMenuOpen(false)
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 ${
                    isStandard
                      ? 'opacity-30 cursor-not-allowed text-white/30'
                      : mode === 'EDITOR'
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-500/10'
                      : 'text-white/40 hover:text-white/80'
                  }`}
                  title={isStandard ? "Template terrains are read-only" : "Switch to Editor"}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"/>
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                  </svg>
                  <span>Editor</span>
                </button>
                <button
                  onClick={() => {
                    handleModeChange('PLAY')
                    setMobileMenuOpen(false)
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 ${
                    mode === 'PLAY'
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-500/10'
                      : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  <span>Simulate</span>
                </button>
              </div>
            </div>

            <div className="h-[1px] bg-white/10 w-full" />

            {/* Action Buttons: Save & Exit */}
            <div className="flex flex-col gap-2 w-full">
              <span className="text-[9px] uppercase tracking-widest text-white/30 font-black">Controls</span>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={() => {
                    if (mode === 'EDITOR') {
                      saveActiveTerrain()
                      setMobileMenuOpen(false)
                    }
                  }}
                  className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border text-center ${
                    mode === 'EDITOR' && isDirty
                      ? 'bg-white/15 text-white hover:bg-white/20 border-white/20'
                      : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'
                  }`}
                  disabled={mode !== 'EDITOR' || !isDirty}
                >
                  Save Game
                </button>
                <button
                  onClick={() => {
                    navigate('/')
                    setMobileMenuOpen(false)
                  }}
                  className="py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/50 bg-red-500/10 border border-red-500/20 hover:text-white hover:bg-red-500/20 transition-all text-center"
                >
                  Exit Game
                </button>
              </div>
            </div>

            <div className="h-[1px] bg-white/10 w-full" />

            {/* Performance Stats */}
            <div className="flex flex-col gap-2 w-full">
              <span className="text-[9px] uppercase tracking-widest text-white/30 font-black">Performance</span>
              <div className="flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-xl w-full">
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-mono font-bold ${fps < 30 ? 'text-red-500' : fps < 55 ? 'text-yellow-500' : 'text-green-500'}`}>{fps}</span>
                  <span className="text-[10px] text-white/20 uppercase font-black">fps</span>
                </div>
                <div className="h-10 w-44 bg-white/5 rounded border border-white/5 overflow-hidden">
                  <svg width="100%" height="100%" viewBox="0 0 100 24" preserveAspectRatio="none" className="block">
                    <defs>
                      <linearGradient id="fpsGradientMobile" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={fps < 30 ? '#ef4444' : fps < 55 ? '#eab308' : '#22c55e'} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={fps < 30 ? '#ef4444' : fps < 55 ? '#eab308' : '#22c55e'} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {fpsHistory.length > 1 && (
                      <>
                        <path
                          d={`M 0,24 L ${fpsHistory.map((v, i) => `${(i / (fpsHistory.length - 1)) * 100},${24 - (Math.min(v, 60) / 60) * 20 - 2}`).join(' L ')} L 100,24 Z`}
                          fill="url(#fpsGradientMobile)"
                        />
                        <polyline
                          fill="none"
                          stroke={fps < 30 ? '#ef4444' : fps < 55 ? '#eab308' : '#22c55e'}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={fpsHistory
                            .map((v, i) => `${(i / (fpsHistory.length - 1)) * 100},${24 - (Math.min(v, 60) / 60) * 20 - 2}`)
                            .join(' ')}
                        />
                      </>
                    )}
                  </svg>
                </div>
              </div>
            </div>

            {/* Close Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="mt-4 px-8 py-2.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-white/20 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest bg-white/5 w-full max-w-xs text-center"
            >
              Close Menu
            </button>
          </div>
        </div>,
        document.body
      )}
    </header>
  )
}

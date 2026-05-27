import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../../hooks/useStore'
import { terrains as standardTerrains } from '../../terrains'
import { storageManager } from '../../managers/StorageManager'
import type { TerrainConfig } from '../../types/game'
import { TerrainCard } from './TerrainCard'

export const MainMenu = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const gameState = useStore((state) => state.gameState)
  const [customTerrains, setCustomTerrains] = useState<TerrainConfig[]>([])

  useEffect(() => {
    if (gameState === 'MENU') {
      storageManager.getCustomTerrains().then(setCustomTerrains)
    }
  }, [gameState, location.pathname])

  const handleDuplicate = (terrain: TerrainConfig) => {
    navigate(`/duplicate/${terrain.id}`)
  }

  const handleRename = (terrain: TerrainConfig) => {
    navigate(`/rename/${terrain.id}`)
  }

  const handleEdit = (terrain: TerrainConfig) => {
    navigate(`/edit/${terrain.id}`)
  }

  const handleDelete = (terrain: TerrainConfig) => {
    navigate(`/delete/${terrain.id}`)
  }

  const sortedCustomTerrains = useMemo(() => {
    return [...customTerrains].sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0))
  }, [customTerrains])

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center bg-[#050505] pointer-events-auto overflow-y-auto scrollbar-hide py-12 px-6">
      <div className="w-full max-w-6xl flex flex-col items-center">
        <div className="flex flex-col md:flex-row items-center gap-6 mb-16 text-center md:text-left">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="Delta Dynamics" className="w-20 h-20 rounded-2xl shadow-2xl border border-white/10" />
          <div className="flex flex-col">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-[0.3em] text-white">Delta Dynamics</h1>
            <p className="text-sm text-white/40 font-bold uppercase tracking-[0.5em] mt-2">Ecosystem Simulator</p>
          </div>
        </div>

        <div className="w-full space-y-16">
          <section>
            <div className="flex items-center gap-6 mb-10">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rotate-45 border border-white/20 bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.05)]" />
                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-white/70">Standard Terrain Designs</h2>
              </div>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {standardTerrains.filter(t => t.category === 'STANDARD').map((t) => (
                <TerrainCard 
                  key={t.id} 
                  terrain={t} 
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-6 mb-10">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rotate-45 border border-white/20 bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.05)]" />
                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-white/70">Custom Terrain Designs</h2>
              </div>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Create New Card */}
              <div
                onClick={() => navigate('/create')}
                className="w-full h-full min-h-[340px] relative flex flex-col items-center justify-center rounded-[2.5rem] border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.06] hover:border-orange-500/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_40px_rgba(249,115,22,0.05)] transition-all duration-500 overflow-hidden cursor-pointer group hover:scale-[1.02] p-8 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/5 group-hover:bg-orange-500/10 border border-white/10 group-hover:border-orange-500/20 flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 shadow-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/40 group-hover:text-orange-500 transition-colors duration-500">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <span className="text-lg font-black uppercase tracking-[0.2em] text-white/60 group-hover:text-white transition-colors duration-500">
                  Create New
                </span>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-2 max-w-[200px] leading-relaxed">
                  Start a new landscape from scratch
                </p>
              </div>

              {sortedCustomTerrains.map((t) => (
                <TerrainCard 
                  key={t.id} 
                  terrain={t} 
                  onDuplicate={handleDuplicate}
                  onRename={handleRename}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Redesigned Structured Footer */}
        <footer className="w-full border-t border-white/10 mt-32 pt-12 pb-16 flex flex-col items-center gap-10">
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            {/* Project Column */}
            <div className="flex flex-col gap-2.5 items-center md:items-start">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Ecosystem Simulator</span>
              <span className="text-sm font-black uppercase tracking-[0.15em] text-white">Delta Dynamics</span>
              <p className="text-[10px] text-white/30 leading-relaxed font-bold uppercase tracking-wider max-w-xs mx-auto md:mx-0">
                A sandbox ecosystem and water flow simulator for studying dynamic landscapes.
              </p>
            </div>
            
            {/* Author Column */}
            <div className="flex flex-col gap-2.5 items-center md:items-start">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Academic Advisor</span>
              <span className="text-sm font-black uppercase tracking-[0.15em] text-white">Dr. Georg Hackenberg</span>
              <a
                href="https://ghackenberg.github.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/10 hover:border-white/15 transition-all duration-300 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white active:scale-95 shadow-sm mt-1"
                title="Georg Hackenberg's Homepage"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30 group-hover:text-white transition-colors">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>ghackenberg.github.io</span>
              </a>
            </div>

            {/* Source Code Column */}
            <div className="flex flex-col gap-2.5 items-center md:items-start">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Repository</span>
              <span className="text-sm font-black uppercase tracking-[0.15em] text-white">Open Source Code</span>
              <a
                href="https://github.com/ghackenberg/delta-dynamics"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/10 hover:border-white/15 transition-all duration-300 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white active:scale-95 shadow-sm mt-1"
                title="View Source on GitHub"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30 group-hover:text-white transition-colors">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                  <path d="M9 18c-4.51 2-5-2-7-2"/>
                </svg>
                <span>GitHub Project Page</span>
              </a>
            </div>
          </div>
          
          {/* Build Info */}
          <div className="flex flex-col items-center gap-2 border-t border-white/5 w-full pt-8 opacity-25">
            <span className="text-[9px] font-black uppercase tracking-[0.4em]">Early Access Build</span>
            <div className="flex gap-8">
              <span className="text-[8px] font-bold">v0.8.2-delta</span>
              <span className="text-[8px] font-bold">2026.05.18</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

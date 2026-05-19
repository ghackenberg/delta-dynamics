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
          <img src="/icon.svg" alt="Delta Dynamics" className="w-20 h-20 rounded-2xl shadow-2xl border border-white/10" />
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

        <div className="mt-24 mb-12 flex flex-col items-center gap-4 opacity-20">
          <span className="text-[10px] font-black uppercase tracking-[0.4em]">Early Access Build</span>
          <div className="flex gap-8">
            <span className="text-[9px] font-bold">v0.8.2-delta</span>
            <span className="text-[9px] font-bold">2026.05.18</span>
          </div>
        </div>
      </div>
    </div>
  )
}

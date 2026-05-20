import { useMemo } from 'react'
import { useStore } from '../../hooks/useStore'
import { GRID_SIZE, TERRAIN_BASE_Y, MATERIAL_PROPERTIES } from '../../constants/gameConfig'

export const RightSidebar = () => {
  const hoveredCell = useStore((state) => state.hoveredCell)
  const hoveredEntityId = useStore((state) => state.hoveredEntityId)
  const buildingsState = useStore((state) => state.buildings)
  const humans = useStore((state) => state.humans)
  const animals = useStore((state) => state.animals)

  const terrainVertices = useStore((state) => state.terrainVertices)
  const sWater = useStore((state) => state.sWater)
  const gWater = useStore((state) => state.gWater)
  const tHeight = useStore((state) => state.tHeight)
  const aCap = useStore((state) => state.aCap)

  const rightSidebarOpen = useStore((state) => state.rightSidebarOpen)
  const setRightSidebarOpen = useStore((state) => state.setRightSidebarOpen)

  const hoveredEntity = useMemo(() => {
    if (!hoveredEntityId) return null
    return buildingsState.find(b => b.id === hoveredEntityId) ||
           humans.find(h => h.id === hoveredEntityId) ||
           animals.find(a => a.id === hoveredEntityId)
  }, [hoveredEntityId, buildingsState, humans, animals])

  return (
    <aside className={`fixed md:absolute top-20 right-0 md:right-4 bottom-32 w-80 border border-r-0 md:border-r border-white/10 bg-black/30 backdrop-blur-xl rounded-l-2xl md:rounded-2xl flex flex-col z-30 md:z-10 overflow-hidden shadow-2xl pointer-events-auto transition-transform duration-300 ease-in-out ${
      rightSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
    }`}>
      <div className="p-4 border-b border-white/5 flex justify-between items-center">
        <p className="text-white/40 text-[10px] uppercase tracking-widest font-black">Information</p>
        <div className="flex items-center gap-3">
          {(hoveredEntity || hoveredCell) && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />}
          <button 
            onClick={(e) => { e.stopPropagation(); setRightSidebarOpen(false); }}
            className="md:hidden text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 scrollbar-hide">
        {hoveredEntity ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold text-white mb-1">
              {'name' in hoveredEntity 
                ? hoveredEntity.name 
                : hoveredEntity.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
            </h2>
            <p className="text-xs text-white/50 mb-6 font-medium">
              {(() => {
                if ('state' in hoveredEntity) return `Current Status: ${hoveredEntity.state}`
                if (hoveredEntity.type.startsWith('TREE')) return 'Nature / Environment'
                return `Structure Level ${hoveredEntity.level}`
              })()}
            </p>

            <div className="space-y-3">
              {'progress' in hoveredEntity && !hoveredEntity.isReady && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex justify-between text-[10px] text-white/40 font-black uppercase mb-2">
                    <span>Construction Progress</span>
                    <span>{Math.floor(hoveredEntity.progress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden p-[1px]">
                     <div className="h-full bg-orange-500 rounded-full transition-all duration-300" style={{ width: `${hoveredEntity.progress}%` }} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="text-[9px] text-white/30 font-black uppercase block mb-1">Category</span>
                  <span className="text-xs text-white/90 font-mono">
                    {(() => {
                      if ('name' in hoveredEntity) return 'HUMAN'
                      if (hoveredEntity.type === 'DEER' || hoveredEntity.type === 'WOLF') return 'ANIMAL'
                      if (hoveredEntity.type.startsWith('TREE')) return 'FLORA'
                      return 'BUILDING'
                    })()}
                  </span>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="text-[9px] text-white/30 font-black uppercase block mb-1">ID Tag</span>
                  <span className="text-[10px] text-white/50 font-mono truncate block">
                    #{hoveredEntity.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : hoveredCell ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-baseline mb-6">
              <h2 className="text-xl font-bold text-white">Grid Sector</h2>
              <span className="text-sm font-mono text-white/40 font-bold bg-white/5 px-2 py-0.5 rounded">
                {hoveredCell.x} : {hoveredCell.z}
              </span>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest block mb-4">Surface Water</span>
                {(() => {
                  const idx = hoveredCell.z * GRID_SIZE + hoveredCell.x
                  const depth = sWater[idx]
                  const bottom = tHeight[idx]
                  const top = bottom + depth
                  return (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-white/20 uppercase font-black mb-1">Depth</span>
                        <span className="text-blue-300 font-mono font-bold text-lg">{depth.toFixed(3)}m</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-white/20 uppercase font-black mb-1">Surface RL</span>
                        <span className="text-white font-mono font-bold text-lg">{top.toFixed(2)}m</span>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="bg-cyan-500/10 rounded-xl p-4 border border-cyan-500/20">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest block">Aquifer</span>
                  {(() => {
                    const idx = hoveredCell.z * GRID_SIZE + hoveredCell.x
                    const saturation = (gWater[idx] / (aCap[idx] || 1)) * 100
                    return (
                      <span className="text-[10px] text-cyan-400 font-black bg-cyan-400/20 px-2 py-0.5 rounded">
                        {saturation.toFixed(0)}% SAT
                      </span>
                    )
                  })()}
                </div>
                {(() => {
                  const idx = hoveredCell.z * GRID_SIZE + hoveredCell.x
                  const volume = gWater[idx]
                  const cap = aCap[idx]
                  const waterTable = tHeight[idx] - 0.5 + (cap > 0 ? (volume / cap) * 0.5 : 0)
                  return (
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-white/20 uppercase font-black mb-1">Water Table</span>
                          <span className="text-cyan-300 font-mono font-bold text-lg">{waterTable.toFixed(2)}m</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] text-white/20 uppercase font-black mb-1">Volume</span>
                          <span className="text-white/80 font-mono font-bold">{volume.toFixed(3)}m³</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="space-y-4">
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-black block">Soil Profile</span>
                <div className="space-y-2">
                  {(() => {
                    const vertex = terrainVertices[hoveredCell.x][hoveredCell.z]
                    let currentTop = vertex.reduce((sum, l) => sum + l.thickness, TERRAIN_BASE_Y)
                    return [...vertex].reverse().map((layer, idx) => {
                      const layerBottom = currentTop - layer.thickness
                      currentTop = layerBottom
                      return (
                        <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/5 flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full border border-white/20 shadow-sm" 
                                style={{ backgroundColor: MATERIAL_PROPERTIES[layer.type].color }} 
                              />
                              <span className="text-xs text-white/80 font-bold">{layer.type}</span>
                            </div>
                            <span className="text-[10px] text-white/40 font-mono">{layer.thickness.toFixed(2)}m</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full" 
                              style={{ 
                                width: `${(layer.thickness / 5) * 100}%`,
                                backgroundColor: MATERIAL_PROPERTIES[layer.type].color,
                                opacity: 0.6
                              }} 
                            />
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-white mb-4 animate-[spin_10s_linear_infinite]" />
            <p className="text-[10px] uppercase tracking-[0.3em] font-black">No Selection</p>
            <p className="text-[9px] mt-2">Hover over entities or terrain<br/>to inspect details</p>
          </div>
        )}
      </div>
    </aside>
  )
}

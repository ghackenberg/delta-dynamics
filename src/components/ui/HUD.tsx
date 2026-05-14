import { useMemo } from 'react'
import { useStore } from '../../hooks/useStore'
import type { BuildingType } from '../../types/game'
import { GRID_SIZE, TERRAIN_BASE_Y } from '../../constants/gameConfig'

export const HUD = ({ onInitAI, onConsultAI }: { onInitAI: () => void, onConsultAI: () => void }) => {
  const resources = useStore((state) => state.resources)
  const rates = useStore((state) => state.rates)
  const aiStatus = useStore((state) => state.aiStatus)
  const isAiLoading = useStore((state) => state.isAiLoading)
  const aiResponse = useStore((state) => state.aiResponse)
  const selectedBuildingType = useStore((state) => state.selectedBuildingType)
  const setSelectedBuildingType = useStore((state) => state.setSelectedBuildingType)
  
  const gameTime = useStore((state) => state.gameTime)
  const day = useStore((state) => state.day)
  const isNight = useStore((state) => state.isNight)

  const setRainIntensity = useStore((state) => state.setRainIntensity)
  const rainIntensity = useStore((state) => state.rainIntensity)

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

  const hoveredEntity = useMemo(() => {
    if (!hoveredEntityId) return null
    return buildingsState.find(b => b.id === hoveredEntityId) ||
           humans.find(h => h.id === hoveredEntityId) ||
           animals.find(a => a.id === hoveredEntityId)
  }, [hoveredEntityId, buildingsState, humans, animals])

  const hours = Math.floor(gameTime / 60)
  const minutes = Math.floor(gameTime % 60)
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

  const buildings: { type: BuildingType, label: string, cost: string }[] = [
    { type: 'HOUSE', label: 'House', cost: '50W' },
    { type: 'FARM', label: 'Farm', cost: '30W' },
    { type: 'LUMBER_MILL', label: 'Lumber Mill', cost: '20W 20S' },
    { type: 'QUARRY', label: 'Quarry', cost: '50W 10S' },
    { type: 'FENCE', label: 'Fence', cost: '5W' },
    { type: 'TREE_CONIFER', label: 'Conifer', cost: '5W' },
    { type: 'TREE_DECIDUOUS', label: 'Deciduous', cost: '5W' },
    { type: 'TREE_BIRCH', label: 'Birch', cost: '5W' },
    { type: 'CUT_TREE', label: 'Cut Tree', cost: '+10W' },
    { type: 'PUMP', label: 'Pump', cost: '40W 60S' },
    { type: 'DIKE', label: 'Dike', cost: '10S' },
    { type: 'ROAD', label: 'Road', cost: '10S' },
    { type: 'EXCAVATE', label: 'Excavate', cost: 'Free' },
    { type: 'FILL', label: 'Fill', cost: '10S' },
  ]

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden">
      {/* Top Bar: Resources & Time */}
      <div className="absolute top-6 left-0 right-0 flex flex-col items-center gap-4">
        <div className="flex justify-center gap-4">
          <div className="bg-black/80 backdrop-blur-md border border-white/20 px-6 py-2 rounded-xl pointer-events-auto flex flex-col items-center min-w-32 shadow-xl">
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Day {day}</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-bold text-white">{timeString}</span>
              {isNight && <span className="text-[10px] bg-orange-500 text-white px-1.5 rounded font-bold animate-pulse">FF ⏩</span>}
            </div>
            {rainIntensity > 0.1 && (
               <span className="text-[9px] text-blue-400 font-bold animate-pulse">🌧️ RAINING</span>
            )}
          </div>
          
          {Object.entries(resources).map(([res, value]) => (
            <div key={res} className="bg-black/60 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full pointer-events-auto flex flex-col items-center min-w-24 shadow-lg">
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{res}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-mono font-bold text-white">{Math.floor(value)}</span>
                <span className={`text-[10px] font-bold ${rates[res as keyof typeof rates] >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {rates[res as keyof typeof rates] >= 0 ? '+' : ''}{rates[res as keyof typeof rates]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Side Bar: Building Menu */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-auto max-h-[80vh] overflow-y-auto pr-4 scrollbar-hide">
        <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-2 ml-2">Construction</p>
        {buildings.map((b) => (
          <button
            key={b.type}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBuildingType(b.type);
            }}
            className={`flex flex-col items-start p-4 rounded-xl border transition-all w-32 shadow-lg shrink-0 ${
              selectedBuildingType === b.type 
              ? 'bg-white text-black border-white scale-105' 
              : 'bg-black/60 text-white border-white/10 hover:border-white/30'
            }`}
          >
            <span className="text-xs font-bold">{b.label}</span>
            <span className={`text-[10px] mt-1 ${selectedBuildingType === b.type ? 'text-black/60' : 'text-white/40'}`}>
              {b.cost}
            </span>
          </button>
        ))}

        <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mt-4 mb-2 ml-2">Events</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setRainIntensity(1.0);
          }}
          className="flex flex-col items-center justify-center p-4 rounded-xl border bg-blue-600/40 text-white border-blue-500/50 hover:bg-blue-600/60 transition-all w-32 shadow-lg shrink-0"
        >
          <span className="text-xs font-bold italic">Simulate Rain</span>
          <span className="text-[10px] mt-1 text-blue-200/60 text-center">Raises Water</span>
        </button>
      </div>

      {/* Right Area: Selection Info */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 items-end">
        {hoveredEntity && (
          <div className="bg-black/80 backdrop-blur-xl border border-white/20 p-6 rounded-2xl w-64 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Selected Entity</span>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
            
            <h2 className="text-xl font-bold text-white mb-1">
              {'name' in hoveredEntity 
                ? hoveredEntity.name 
                : hoveredEntity.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
            </h2>
            <p className="text-xs text-white/60 mb-4 font-medium">
              {(() => {
                if ('state' in hoveredEntity) return `Status: ${hoveredEntity.state}`
                if (hoveredEntity.type.startsWith('TREE')) return 'Nature / Resource'
                return `Level ${hoveredEntity.level}`
              })()}
            </p>

            <div className="grid grid-cols-2 gap-2 mt-4">
              {'progress' in hoveredEntity && !hoveredEntity.isReady && (
                <div className="col-span-2 bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex justify-between text-[10px] text-white/40 font-bold uppercase mb-2">
                    <span>Construction</span>
                    <span>{Math.floor(hoveredEntity.progress)}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: `${hoveredEntity.progress}%` }} />
                  </div>
                </div>
              )}
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <span className="text-[10px] text-white/40 font-bold uppercase block mb-1">Category</span>
                <span className="text-xs text-white font-mono">
                  {(() => {
                    if ('name' in hoveredEntity) return 'Human'
                    if (hoveredEntity.type === 'DEER' || hoveredEntity.type === 'WOLF') return 'Animal'
                    if (hoveredEntity.type.startsWith('TREE')) return 'Flora'
                    return 'Building'
                  })()}
                </span>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <span className="text-[10px] text-white/40 font-bold uppercase block mb-1">ID</span>
                <span className="text-[10px] text-white/60 font-mono truncate block">
                  #{hoveredEntity.id.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>
        )}

        {hoveredCell && !hoveredEntity && (
          <div className="bg-black/80 backdrop-blur-xl border border-white/20 p-6 rounded-2xl w-80 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
              <span className="text-xs uppercase tracking-widest text-white/40 font-bold">Grid Cell</span>
              <span className="text-sm font-mono text-white font-bold">
                {hoveredCell.x} : {hoveredCell.z}
              </span>
            </div>

            <div className="space-y-6">
              {/* Overground Water */}
              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                <span className="text-xs text-blue-400 font-bold uppercase tracking-tight block mb-3">Overground Water</span>
                {(() => {
                  const idx = hoveredCell.z * GRID_SIZE + hoveredCell.x
                  const depth = sWater[idx]
                  const bottom = tHeight[idx]
                  const top = bottom + depth
                  return (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/30 uppercase font-bold">Thickness</span>
                        <span className="text-blue-300 font-mono font-bold">{depth.toFixed(3)}m</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-white/30 uppercase font-bold">Top Edge</span>
                        <span className="text-white font-mono font-bold">{top.toFixed(2)}m</span>
                      </div>
                      <div className="col-span-2 mt-1 pt-1 border-t border-white/5 flex justify-between items-baseline">
                        <span className="text-[10px] text-white/30 uppercase font-bold">Bottom Edge</span>
                        <span className="text-white font-mono font-bold">{bottom.toFixed(2)}m</span>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Underground Water */}
              <div className="bg-cyan-500/10 rounded-xl p-4 border border-cyan-500/20">
                <span className="text-xs text-cyan-400 font-bold uppercase tracking-tight block mb-3">Underground Water</span>
                {(() => {
                  const idx = hoveredCell.z * GRID_SIZE + hoveredCell.x
                  const volume = gWater[idx]
                  const cap = aCap[idx]
                  const waterTable = tHeight[idx] - 0.5 + (cap > 0 ? (volume / cap) * 0.5 : 0)
                  return (
                    <div className="flex flex-col gap-3 text-sm">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/30 uppercase font-bold">Water Table</span>
                          <span className="text-cyan-300 font-mono font-bold">{waterTable.toFixed(2)}m</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-white/30 uppercase font-bold">Saturation</span>
                          <span className="text-cyan-400 font-bold bg-cyan-400/20 px-2 py-0.5 rounded text-xs">
                            {((volume / (cap || 1)) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-baseline pt-2 border-t border-white/5">
                        <span className="text-[10px] text-white/30 uppercase font-bold">Volume / Cap</span>
                        <span className="text-white/60 font-mono text-xs font-bold">{volume.toFixed(3)} / {cap.toFixed(2)}m</span>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Terrain Layers */}
              <div className="space-y-4">
                <span className="text-[11px] uppercase tracking-widest text-white/40 font-bold block">Terrain Layers (Top → Bottom)</span>
                <div className="space-y-3">
                  {(() => {
                    const vertex = terrainVertices[hoveredCell.x][hoveredCell.z]
                    let currentTop = vertex.reduce((sum, l) => sum + l.thickness, TERRAIN_BASE_Y)
                    return [...vertex].reverse().map((layer, idx) => {
                      const layerTop = currentTop
                      const layerBottom = currentTop - layer.thickness
                      currentTop = layerBottom
                      return (
                        <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-white font-bold">{layer.type}</span>
                            <span className="text-xs text-white/60 font-mono font-bold">{layer.thickness.toFixed(2)}m</span>
                          </div>
                          <div className="flex justify-between items-baseline text-[10px] font-mono">
                            <div className="flex flex-col">
                              <span className="text-white/20 uppercase font-bold mb-0.5">Top</span>
                              <span className="text-white/40">{layerTop.toFixed(2)}m</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-white/20 uppercase font-bold mb-0.5">Bottom</span>
                              <span className="text-white/40">{layerBottom.toFixed(2)}m</span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Area: AI Panel & Controls */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4">
        {/* AI Narrative / Advisor Panel */}
        {aiResponse && (
          <div className="bg-black/80 backdrop-blur-lg border border-white/20 p-6 rounded-2xl pointer-events-auto w-full max-w-2xl max-h-[30vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl">
            <p className="text-white/60 text-[10px] uppercase tracking-widest mb-2 font-bold flex justify-between">
              <span>Steward AI Advisor</span>
              {isAiLoading && <span className="text-orange-400 animate-pulse text-[10px]">Processing...</span>}
            </p>
            <div className="text-white text-base leading-relaxed italic font-serif">
              "{aiResponse}"
            </div>
          </div>
        )}

        {/* Bottom Bar: AI Control & Status */}
        <div className="bg-black/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl pointer-events-auto w-full max-w-md flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isAiLoading ? 'bg-yellow-400 animate-pulse' : aiStatus.includes('Ready') ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-white/80 text-xs font-medium uppercase tracking-tight">{aiStatus}</span>
          </div>
          
          <div className="flex gap-2">
            {aiStatus === 'AI Ready' && (
              <button 
                onClick={(e) => { e.stopPropagation(); onConsultAI(); }}
                className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-400 transition-all uppercase tracking-tighter"
              >
                Consult AI
              </button>
            )}
            {aiStatus === 'Idle' && (
              <button 
                onClick={(e) => { e.stopPropagation(); onInitAI(); }}
                className="bg-white text-black px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-white/80 transition-all uppercase tracking-tighter shadow-md"
              >
                Initialize AI
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

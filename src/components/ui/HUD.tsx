import { useMemo, type ReactNode } from 'react'
import { useStore } from '../../hooks/useStore'
import type { BuildingType, LayerType } from '../../types/game'
import { GRID_SIZE, TERRAIN_BASE_Y, MATERIAL_PROPERTIES } from '../../constants/gameConfig'

interface HUDProps {
  children: ReactNode
  onInitAI: () => void
  onConsultAI: () => void
}

export const HUD = ({ children, onInitAI, onConsultAI }: HUDProps) => {
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
  const resetTerrain = useStore((state) => state.resetTerrain)

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
  const fps = useStore((state) => state.fps)
  const fpsHistory = useStore((state) => state.fpsHistory)

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

  const mode = useStore((state) => state.mode)
  const setMode = useStore((state) => state.setMode)
  const editorLayerType = useStore((state) => state.editorLayerType)
  const setEditorLayerType = useStore((state) => state.setEditorLayerType)
  const editorBrushSize = useStore((state) => state.editorBrushSize)
  const setEditorBrushSize = useStore((state) => state.setEditorBrushSize)
  const editorBrushStrength = useStore((state) => state.editorBrushStrength)
  const setEditorBrushStrength = useStore((state) => state.setEditorBrushStrength)

  const layerTypes: { type: LayerType, label: string }[] = [
    { type: 'ROCK', label: 'Rock' },
    { type: 'GRAVEL', label: 'Gravel' },
    { type: 'SAND', label: 'Sand' },
    { type: 'HUMUS', label: 'Humus' },
    { type: 'PAVEMENT', label: 'Pavement' },
    { type: 'RAIN', label: 'Rain' },
  ]

  return (
    <div className="relative h-screen w-screen bg-[#050505] text-white overflow-hidden select-none font-sans pointer-events-none">
      {/* Background 3D Scene */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        {children}
      </div>

      {/* Top Bar Overlay */}
      <header className="absolute top-0 left-0 right-0 h-16 border-b border-white/10 bg-black/30 backdrop-blur-xl flex items-center px-6 justify-between z-20 shadow-2xl pointer-events-auto">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="Delta Dynamics" className="w-10 h-10 rounded-lg shadow-2xl border border-white/5" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white font-black">Delta Dynamics</span>
              <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Colony Simulator</span>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-white/10 mx-2" />

          <div className="flex gap-4">
            <button
              onClick={() => setMode('PLAY')}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                mode === 'PLAY' 
                ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              Play Mode
            </button>
            <button
              onClick={() => setMode('EDITOR')}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                mode === 'EDITOR' 
                ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' 
                : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              Terrain Editor
            </button>
          </div>

          <div className="h-8 w-[1px] bg-white/10 mx-2" />

          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Performance</span>
              <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-2">
                  <span className={`text-lg font-mono font-bold ${fps < 30 ? 'text-red-500' : fps < 55 ? 'text-yellow-500' : 'text-green-500'}`}>{fps}</span>
                  <span className="text-[9px] text-white/20 uppercase font-black">fps</span>
                </div>
                {/* FPS Line Chart */}
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

            <div className="h-8 w-[1px] bg-white/10 mx-2" />

            {Object.entries(resources).map(([res, value]) => (
              <div key={res} className="flex flex-col">
                <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">{res}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-mono font-bold text-white">{Math.floor(value)}</span>
                  <span className={`text-[9px] font-bold ${rates[res as keyof typeof rates] >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {rates[res as keyof typeof rates] >= 0 ? '+' : ''}{rates[res as keyof typeof rates]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {rainIntensity > 0.1 && (
            <div className="flex items-center gap-2 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-500/30 animate-pulse">
              <span className="text-[10px] text-blue-400 font-black tracking-widest uppercase">Heavy Rain</span>
            </div>
          )}

          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold mb-0.5">Day {day}</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-mono font-bold text-white">{timeString}</span>
              {isNight && <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold animate-pulse">FAST</span>}
            </div>
          </div>
        </div>
      </header>

      {/* Left Sidebar Overlay */}
      <aside className="absolute top-20 left-4 bottom-32 w-48 border border-white/10 bg-black/30 backdrop-blur-xl rounded-2xl flex flex-col z-10 overflow-hidden shadow-2xl pointer-events-auto">
        {mode === 'PLAY' ? (
          <>
            <div className="p-4 border-b border-white/5">
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-black">Construction</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-hide">
              {buildings.map((b) => (
                <button
                  key={b.type}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBuildingType(b.type);
                  }}
                  className={`flex flex-col items-start p-3 rounded-xl border transition-all shadow-sm group ${
                    selectedBuildingType === b.type 
                    ? 'bg-white text-black border-white' 
                    : 'bg-white/5 text-white/80 border-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-bold">{b.label}</span>
                  <span className={`text-[9px] mt-0.5 font-medium ${selectedBuildingType === b.type ? 'text-black/60' : 'text-white/30'}`}>
                    {b.cost}
                  </span>
                </button>
              ))}

              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-black mb-3">Simulation</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRainIntensity(1.0);
                  }}
                  className="w-full flex flex-col items-center justify-center p-3 rounded-xl border bg-blue-600/20 text-blue-200 border-blue-500/30 hover:bg-blue-600/30 transition-all shadow-sm"
                >
                  <span className="text-[11px] font-bold">Trigger Storm</span>
                  <span className="text-[9px] mt-0.5 text-blue-200/40">Floods terrain</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b border-white/5">
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-black">Paint Tools</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 scrollbar-hide">
              <div className="space-y-2">
                <p className="text-white/30 text-[9px] uppercase tracking-widest font-black px-1">Layers</p>
                {layerTypes.map((l) => (
                  <button
                    key={l.type}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditorLayerType(l.type);
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                      editorLayerType === l.type 
                      ? 'bg-orange-500 text-white border-orange-400 shadow-lg' 
                      : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: MATERIAL_PROPERTIES[l.type].color }} />
                    <span className="text-[11px] font-bold">{l.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-3 px-1 mt-2">
                <div className="flex justify-between items-center">
                  <p className="text-white/30 text-[9px] uppercase tracking-widest font-black">Brush Size</p>
                  <span className="text-[10px] text-white/60 font-mono">{editorBrushSize}</span>
                </div>
                <input 
                  type="range" min="1" max="15" step="1"
                  value={editorBrushSize}
                  onChange={(e) => setEditorBrushSize(parseInt(e.target.value))}
                  className="w-full accent-orange-500"
                />

                <div className="flex justify-between items-center mt-4">
                  <p className="text-white/30 text-[9px] uppercase tracking-widest font-black">Strength</p>
                  <span className="text-[10px] text-white/60 font-mono">{editorBrushStrength.toFixed(2)}</span>
                </div>
                <input 
                  type="range" min="0.01" max="1" step="0.01"
                  value={editorBrushStrength}
                  onChange={(e) => setEditorBrushStrength(parseFloat(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] text-white/40 leading-relaxed font-medium">
                  <span className="text-white/60 font-bold block mb-1 uppercase tracking-wider text-[9px]">Controls</span>
                  Hold <span className="text-orange-400 font-black">CTRL</span> to sculpt:<br/>
                  <span className="text-orange-400">Left Click</span> to paint<br/>
                  <span className="text-orange-400">Right Click</span> to erase
                </p>
              </div>

              <div className="mt-auto pt-4 border-t border-white/5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Clear all terrain and entities?')) {
                      resetTerrain();
                    }
                  }}
                  className="w-full flex flex-col items-center justify-center p-3 rounded-xl border bg-red-600/20 text-red-200 border-red-500/30 hover:bg-red-600/30 transition-all shadow-sm"
                >
                  <span className="text-[11px] font-bold">Clear Terrain</span>
                  <span className="text-[9px] mt-0.5 text-red-200/40">Resets to flat land</span>
                </button>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Right Sidebar Overlay */}
      <aside className="absolute top-20 right-4 bottom-32 w-80 border border-white/10 bg-black/30 backdrop-blur-xl rounded-2xl flex flex-col z-10 overflow-hidden shadow-2xl pointer-events-auto">
        <div className="p-4 border-b border-white/5 flex justify-between items-center">
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-black">Information</p>
          {(hoveredEntity || hoveredCell) && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />}
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
                {/* Overground Water */}
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

                {/* Underground Water */}
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

                {/* Terrain Layers */}
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
                              <span className="text-xs text-white/80 font-bold">{layer.type}</span>
                              <span className="text-[10px] text-white/40 font-mono">{layer.thickness.toFixed(2)}m</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-white/10" style={{ width: `${(layer.thickness / 5) * 100}%` }} />
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

      {/* Bottom Bar Overlay: AI Advisor */}
      <footer className="absolute bottom-4 left-4 right-4 h-24 border border-white/10 bg-black/30 backdrop-blur-xl rounded-2xl flex items-center px-6 gap-6 z-20 shadow-2xl pointer-events-auto">
        {/* AI Status & Trigger */}
        <div className="w-48 shrink-0 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isAiLoading ? 'bg-yellow-400 animate-pulse' : aiStatus.includes('Ready') ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]' : 'bg-red-400'}`} />
            <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">{aiStatus}</span>
          </div>
          
          {aiStatus === 'AI Ready' ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onConsultAI(); }}
              className="w-full bg-orange-600/80 hover:bg-orange-600 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 border border-orange-500/20"
            >
              Consult Advisor
            </button>
          ) : aiStatus === 'Idle' ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onInitAI(); }}
              className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 border border-white/10"
            >
              Initialize AI
            </button>
          ) : (
             <div className="w-full bg-white/5 text-white/20 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-center border border-white/5">
               {isAiLoading ? 'Processing...' : 'Unavailable'}
             </div>
          )}
        </div>

        <div className="h-12 w-[1px] bg-white/10" />

        {/* AI Narrative Content */}
        <div className="flex-1 h-16 overflow-hidden relative group">
          {aiResponse ? (
            <div className="h-full overflow-y-auto pr-4 scrollbar-hide animate-in fade-in slide-in-from-bottom-2 duration-500">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/20 font-black mb-1">Advisor Logs</p>
              <div className="text-sm text-white/90 leading-relaxed font-serif italic">
                "{aiResponse}"
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center text-white/10 italic text-sm">
              Waiting for advisor input...
            </div>
          )}
          <div className="absolute bottom-0 right-4 pointer-events-none text-[8px] text-white/5 uppercase font-black tracking-widest group-hover:text-white/20 transition-colors">
            End of Transcript
          </div>
        </div>

        <div className="h-12 w-[1px] bg-white/10" />

        {/* Developer Attribution */}
        <div className="shrink-0 flex items-center gap-5 px-2">
          <div className="flex flex-col items-end justify-center text-right">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-white tracking-wide">Dr. Georg Hackenberg</span>
              <span className="text-[9px] text-white/60 font-bold uppercase tracking-wide mt-0.5">Professor for Industrial Informatics</span>
              <span className="text-[8px] text-white/40 font-bold uppercase tracking-tight mt-0.5">School of Engineering | FH Upper Austria</span>
            </div>
          </div>
          <div className="h-10 w-10 bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/10 flex items-center justify-center">
            <img
              src="https://upload.wikimedia.org/wikipedia/de/e/e5/Fhooe-logo.svg"
              alt="FH Upper Austria"
              className="w-full h-full object-contain brightness-0 invert opacity-80"
            />
          </div>
        </div>

      </footer>
    </div>
  )
}

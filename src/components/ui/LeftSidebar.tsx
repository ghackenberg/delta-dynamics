import { useStore } from '../../hooks/useStore'
import { MATERIAL_PROPERTIES } from '../../constants/gameConfig'
import type { BuildingType, LayerType } from '../../types/game'

export const LeftSidebar = () => {
  const mode = useStore((state) => state.mode)
  const selectedBuildingType = useStore((state) => state.selectedBuildingType)
  const setSelectedBuildingType = useStore((state) => state.setSelectedBuildingType)
  const setRainIntensity = useStore((state) => state.setRainIntensity)
  const resetTerrain = useStore((state) => state.resetTerrain)

  const editorLayerType = useStore((state) => state.editorLayerType)
  const setEditorLayerType = useStore((state) => state.setEditorLayerType)
  const editorBrushSize = useStore((state) => state.editorBrushSize)
  const setEditorBrushSize = useStore((state) => state.setEditorBrushSize)
  const editorBrushStrength = useStore((state) => state.editorBrushStrength)
  const setEditorBrushStrength = useStore((state) => state.setEditorBrushStrength)
  const editorBrushAction = useStore((state) => state.editorBrushAction)
  const setEditorBrushAction = useStore((state) => state.setEditorBrushAction)

  const leftSidebarOpen = useStore((state) => state.leftSidebarOpen)
  const setLeftSidebarOpen = useStore((state) => state.setLeftSidebarOpen)

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

  const layerTypes: { type: LayerType, label: string }[] = [
    { type: 'ROCK', label: 'Rock' },
    { type: 'GRAVEL', label: 'Gravel' },
    { type: 'SAND', label: 'Sand' },
    { type: 'HUMUS', label: 'Humus' },
    { type: 'PAVEMENT', label: 'Pavement' },
    { type: 'RAIN', label: 'Rain' },
    { type: 'WATER_SOURCE', label: 'Water Source' },
    { type: 'WATER_SINK', label: 'Water Sink' },
  ]

  return (
    <aside className={`fixed md:absolute top-20 left-0 md:left-4 bottom-32 w-48 border border-l-0 md:border-l border-white/10 bg-black/30 backdrop-blur-xl rounded-r-2xl md:rounded-2xl flex flex-col z-30 md:z-10 overflow-hidden shadow-2xl pointer-events-auto transition-transform duration-300 ease-in-out ${
      leftSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    }`}>
      {mode === 'PLAY' ? (
        <>
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-black">Construction</p>
            <button 
              onClick={(e) => { e.stopPropagation(); setLeftSidebarOpen(false); }}
              className="md:hidden text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-hide">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBuildingType('NONE');
              }}
              className={`flex flex-col items-start p-3 rounded-xl border transition-all shadow-sm group ${
                selectedBuildingType === 'NONE'
                ? 'bg-white text-black border-white'
                : 'bg-white/5 text-white/80 border-white/5 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <span className="text-xs font-bold">Inspect / Camera</span>
              </div>
              <span className={`text-[9px] mt-0.5 font-medium ${selectedBuildingType === 'NONE' ? 'text-black/60' : 'text-white/30'}`}>
                Move camera & inspect details
              </span>
            </button>

            {buildings.map((b) => (
              <button
                key={b.type}
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedBuildingType === b.type) {
                    setSelectedBuildingType('NONE');
                  } else {
                    setSelectedBuildingType(b.type);
                  }
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
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-black">Paint Tools</p>
            <button 
              onClick={(e) => { e.stopPropagation(); setLeftSidebarOpen(false); }}
              className="md:hidden text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 scrollbar-hide">
            <div className="space-y-2">
              <p className="text-white/30 text-[9px] uppercase tracking-widest font-black px-1">Layers & Tools</p>
              {layerTypes.map((l) => (
                <button
                  key={l.type}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditorLayerType(l.type);
                    setEditorBrushAction('PAINT');
                  }}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                    editorBrushAction === 'PAINT' && editorLayerType === l.type 
                    ? 'bg-orange-500 text-white border-orange-400 shadow-lg' 
                    : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: MATERIAL_PROPERTIES[l.type].color }} />
                  <span className="text-[11px] font-bold">{l.label}</span>
                </button>
              ))}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditorBrushAction('ERASE');
                }}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                  editorBrushAction === 'ERASE' 
                  ? 'bg-red-500 text-white border-red-400 shadow-lg' 
                  : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10'
                }`}
              >
                <div className="w-3 h-3 flex items-center justify-center text-red-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M20 20H4"/>
                    <path d="M20 7.6L13.4 1c-.8-.8-2-.8-2.8 0L1.6 10c-.8.8-.8 2 0 2.8L7.6 20h10c.8 0 1.5-.5 1.8-1.2l3-6.2c.4-.8.4-1.8 0-2.6L20 7.6z"/>
                  </svg>
                </div>
                <span className="text-[11px] font-bold">Erase Tool</span>
              </button>
            </div>

            <div className="space-y-3 px-1 mt-2">
              <div className="flex justify-between items-center">
                <p className="text-white/30 text-[9px] uppercase tracking-widest font-black">Brush Size</p>
                <span className="text-[10px] text-white/60 font-mono">{editorBrushSize}</span>
              </div>
              <input 
                type="range" min="0" max="15" step="1"
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

            <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5 animate-in fade-in duration-300">
              <p className="text-[10px] text-white/40 leading-relaxed font-medium">
                <span className="text-white/60 font-bold block mb-1.5 uppercase tracking-wider text-[9.5px]">Controls</span>
                <span className="text-white/60 block font-bold text-[8.5px] uppercase tracking-wider mt-1">Touch:</span>
                • 1 finger: Sculpt / Paint / Build / Inspect<br/>
                • 2 fingers: Zoom / Pan / Rotate camera<br/>
                <span className="text-white/60 block font-bold text-[8.5px] uppercase tracking-wider mt-2">Mouse/Keyboard:</span>
                • Left-click/drag: Sculpt / Paint / Build / Inspect<br/>
                • WASD / Arrow Keys: Pan camera<br/>
                • Space + Left-drag: Pan camera<br/>
                • Right-click/drag: Rotate camera<br/>
                • Middle-click/drag: Pan camera<br/>
                • Scroll wheel: Zoom (Smart focus under mouse)
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
  )
}

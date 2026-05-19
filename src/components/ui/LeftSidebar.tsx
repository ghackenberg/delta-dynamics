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
  )
}

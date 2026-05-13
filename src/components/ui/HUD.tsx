import { useStore } from '../../hooks/useStore'
import type { BuildingType } from '../../types/game'

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

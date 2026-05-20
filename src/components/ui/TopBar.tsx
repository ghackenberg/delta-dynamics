import { useNavigate } from 'react-router-dom'
import { useStore } from '../../hooks/useStore'

export const TopBar = () => {
  const navigate = useNavigate()
  const mode = useStore((state) => state.mode)
  const isDirty = useStore((state) => state.isDirty)
  const saveActiveTerrain = useStore((state) => state.saveActiveTerrain)
  const fps = useStore((state) => state.fps)
  const fpsHistory = useStore((state) => state.fpsHistory)
  const resources = useStore((state) => state.resources)
  const rates = useStore((state) => state.rates)
  const gameTime = useStore((state) => state.gameTime)
  const day = useStore((state) => state.day)
  const isNight = useStore((state) => state.isNight)
  const rainIntensity = useStore((state) => state.rainIntensity)

  const hours = Math.floor(gameTime / 60)
  const minutes = Math.floor(gameTime % 60)
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

  return (
    <header className="absolute top-0 left-0 right-0 h-16 border-b border-white/10 bg-black/30 backdrop-blur-xl flex items-center px-6 justify-between z-20 shadow-2xl pointer-events-auto">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="Delta Dynamics" className="w-10 h-10 rounded-lg shadow-2xl border border-white/5" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white font-black">Delta Dynamics</span>
            <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Ecosystem Simulator</span>
          </div>
        </div>

        <div className="h-8 w-[1px] bg-white/10 mx-2" />

        <div className="flex gap-4">
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
              navigate(-1)
            }}
            className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-red-500/20 transition-all"
          >
            Exit to Menu
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
  )
}

import { useStore } from '../../hooks/useStore'

interface BottomBarProps {
  onInitAI: () => void
  onConsultAI: () => void
}

export const BottomBar = ({ onInitAI, onConsultAI }: BottomBarProps) => {
  const aiStatus = useStore((state) => state.aiStatus)
  const isAiLoading = useStore((state) => state.isAiLoading)
  const aiResponse = useStore((state) => state.aiResponse)

  return (
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
  )
}

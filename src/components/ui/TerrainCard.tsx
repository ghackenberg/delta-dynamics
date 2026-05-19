import { useNavigate } from 'react-router-dom'
import type { TerrainConfig } from '../../types/game'
import { DuplicateIcon, RenameIcon, EditIcon, TrashIcon } from './Icons'

interface TerrainCardProps {
  terrain: TerrainConfig
  onDuplicate: (terrain: TerrainConfig) => void
  onRename?: (terrain: TerrainConfig) => void
  onEdit?: (terrain: TerrainConfig) => void
  onDelete?: (terrain: TerrainConfig) => void
}

export const TerrainCard = ({ terrain, onDuplicate, onRename, onEdit, onDelete }: TerrainCardProps) => {
  const navigate = useNavigate()
  const isStandard = terrain.category === 'STANDARD'

  return (
    <div className="relative group">
      <div
        onClick={() => navigate(`/play/${terrain.id}`)}
        className={`w-full relative flex flex-col items-center p-10 rounded-[2.5rem] border transition-all duration-500 overflow-hidden backdrop-blur-xl cursor-pointer ${
          isStandard
            ? 'border-white/30 bg-white/[0.1] group-hover:bg-white/[0.18] group-hover:border-orange-500/70 group-hover:shadow-[0_20px_50_rgba(0,0,0,0.6),0_0_50px_rgba(249,115,22,0.2)]'
            : 'border-white/30 bg-white/[0.1] group-hover:bg-white/[0.18] group-hover:border-white/50 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_50px_rgba(255,255,255,0.1)]'
        }`}
      >
        <span className="text-xl font-black uppercase tracking-[0.2em] text-white group-hover:text-white transition-all duration-500 truncate w-full text-center px-4">
          {terrain.name}
        </span>
        {terrain.lastModified && (
          <div className="flex flex-col items-center mt-2">
            <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
              Modified {new Date(terrain.lastModified).toLocaleDateString()}
            </span>
          </div>
        )}
        <div className={`mt-8 w-12 h-0.5 transition-all duration-500 group-hover:w-24 ${
          isStandard ? 'bg-white/30 group-hover:bg-orange-500' : 'bg-white/30 group-hover:bg-white/60'
        }`} />

        <div className="flex gap-2.5 mt-6">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDuplicate(terrain)
            }}
            className="p-3 rounded-2xl border transition-all duration-300 z-20 group/btn bg-white/20 hover:bg-white/30 border-white/20 hover:border-white/50"
            title="Duplicate Terrain"
          >
            <DuplicateIcon size={18} className="transition-colors text-white/60 group-hover/btn:text-white" />
          </button>

          {!isStandard && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRename?.(terrain)
                }}
                className="p-3 rounded-2xl border bg-white/20 hover:bg-white/30 border-white/20 hover:border-white/50 transition-all duration-300 z-20 group/btn"
                title="Rename Terrain"
              >
                <RenameIcon size={18} className="text-white/60 group-hover/btn:text-white transition-colors" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit?.(terrain)
                }}
                className="p-3 rounded-2xl border bg-white/20 hover:bg-white/30 border-white/20 hover:border-white/50 transition-all duration-300 z-20 group/btn"
                title="Edit Terrain"
              >
                <EditIcon size={18} className="text-white/60 group-hover/btn:text-white transition-colors" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.(terrain)
                }}
                className="p-3 rounded-2xl border bg-red-500/10 hover:bg-red-500/20 border-red-500/20 hover:border-red-500/40 transition-all duration-300 z-20 group/btn"
                title="Delete Terrain"
              >
                <TrashIcon size={18} className="text-red-400/60 group-hover/btn:text-red-400 transition-colors" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

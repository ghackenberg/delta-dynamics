import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { TerrainConfig } from '../../types/game'
import { DuplicateIcon, RenameIcon, EditIcon, TrashIcon } from './Icons'
import { previewManager } from '../../managers/PreviewManager'

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
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!terrain.preview && !generatedPreview) {
      const fetchPreview = async () => {
        try {
          // For standard terrains, the worker can generate the data from the ID.
          // For custom terrains, we need to generate it here and pass it.
          const terrainData = !isStandard ? terrain.generate() : undefined
          const previewUrl = await previewManager.getPreview(terrain.id, terrainData)
          setGeneratedPreview(previewUrl)
        } catch (err) {
          console.error(`Failed to generate preview for ${terrain.id}:`, err)
        }
      }
      fetchPreview()
    }
  }, [terrain, generatedPreview, isStandard])

  const previewSrc = terrain.preview || generatedPreview

  return (
    <div className="relative group">
      <div
        onClick={() => {
          if (isStandard) {
            navigate(`/play/${terrain.id}`)
          } else {
            navigate(`/edit/${terrain.id}`)
          }
        }}
        className={`w-full relative flex flex-col items-center rounded-[2.5rem] border transition-all duration-500 overflow-hidden backdrop-blur-xl cursor-pointer group-hover:scale-[1.02] ${
          isStandard
            ? 'border-white/20 bg-white/[0.05] group-hover:bg-white/[0.08] group-hover:border-orange-500/70 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_50px_rgba(249,115,22,0.15)]'
            : 'border-white/20 bg-white/[0.05] group-hover:bg-white/[0.08] group-hover:border-white/40 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_50px_rgba(255,255,255,0.08)]'
        }`}
      >
        {/* Terrain Preview Header */}
        <div className="w-full aspect-video relative overflow-hidden bg-black/40 border-b border-white/10">
          {previewSrc ? (
            <img 
              src={previewSrc} 
              alt={terrain.name} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100" 
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
                {terrain.preview === undefined && !generatedPreview ? 'Generating...' : 'No Preview'}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
          
          {/* Status Badges */}
          {isStandard ? (
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-white/50 text-[8px] font-black uppercase tracking-widest backdrop-blur-md">
              Template
            </div>
          ) : (
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-orange-600/80 border border-orange-500/20 text-white text-[8px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg shadow-orange-500/10">
              Custom
            </div>
          )}
        </div>

        <div className="p-8 w-full flex flex-col items-center">
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
          <div className={`mt-6 w-12 h-0.5 transition-all duration-500 group-hover:w-24 ${
            isStandard ? 'bg-white/30 group-hover:bg-orange-500' : 'bg-white/30 group-hover:bg-white/60'
          }`} />

          {/* Redesigned Button Section */}
          {isStandard ? (
            <div className="flex w-full gap-2.5 mt-6">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicate(terrain)
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all duration-300 z-20 group/btn bg-orange-600 hover:bg-orange-500 border-orange-500/20 hover:border-orange-500/40 text-white font-black uppercase tracking-wider text-[10px] shadow-lg shadow-orange-500/10 active:scale-95"
                title="Duplicate Template to Edit"
              >
                <DuplicateIcon size={14} className="text-white" />
                <span>Duplicate to Edit</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/play/${terrain.id}`)
                }}
                className="p-3 rounded-2xl border bg-white/10 hover:bg-white/20 border-white/10 hover:border-white/30 transition-all duration-300 z-20 group/btn active:scale-95"
                title="Run Simulation (Play Mode)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white/60 group-hover/btn:text-white transition-colors">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col w-full gap-3 mt-6">
              <div className="flex w-full gap-2.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit?.(terrain)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all duration-300 z-20 group/btn bg-white hover:bg-white/95 border-white text-black font-black uppercase tracking-wider text-[10px] active:scale-95 shadow-md"
                  title="Open in Editor"
                >
                  <EditIcon size={14} className="text-black" />
                  <span>Open Editor</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/play/${terrain.id}`)
                  }}
                  className="p-3 rounded-2xl border bg-white/10 hover:bg-white/20 border-white/10 hover:border-white/30 transition-all duration-300 z-20 group/btn active:scale-95"
                  title="Run Simulation (Play Mode)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white/60 group-hover/btn:text-white transition-colors">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-2 justify-center w-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicate(terrain)
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10 transition-all duration-300 z-20 text-[9px] font-bold text-white/50 hover:text-white active:scale-95"
                  title="Duplicate Design"
                >
                  <DuplicateIcon size={12} className="text-white/40 group-hover/btn:text-white/80" />
                  <span>Copy</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRename?.(terrain)
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10 transition-all duration-300 z-20 text-[9px] font-bold text-white/50 hover:text-white active:scale-95"
                  title="Rename Design"
                >
                  <RenameIcon size={12} className="text-white/40 group-hover/btn:text-white/80" />
                  <span>Rename</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete?.(terrain)
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border bg-red-500/5 hover:bg-red-500/10 border-red-500/10 hover:border-red-500/20 transition-all duration-300 z-20 text-[9px] font-bold text-red-400/50 hover:text-red-400 active:scale-95"
                  title="Delete Design"
                >
                  <TrashIcon size={12} className="text-red-400/40 group-hover/btn:text-red-400/80" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

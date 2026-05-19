import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storageManager } from '../../managers/StorageManager'
import { terrains as standardTerrains } from '../../terrains'
import type { TerrainConfig } from '../../types/game'
import { DuplicateIcon } from './Icons'

interface DuplicateModalProps {
  terrainId: string
}

export const DuplicateModal = ({ terrainId }: DuplicateModalProps) => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [sourceTerrain, setSourceTerrain] = useState<TerrainConfig | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadSource = async () => {
      // Check standard terrains first
      let source = standardTerrains.find(t => t.id === terrainId)
      
      // If not found, check custom terrains
      if (!source) {
        const custom = await storageManager.getCustomTerrains()
        source = custom.find(t => t.id === terrainId)
      }

      if (source) {
        setSourceTerrain(source)
        setName(`${source.name} (Copy)`)
      } else {
        console.error('Source terrain not found:', terrainId)
        navigate(-1)
      }
    }

    loadSource()
  }, [terrainId, navigate])

  const handleConfirm = async () => {
    if (!sourceTerrain || !name.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const newId = await storageManager.duplicateTerrain(sourceTerrain, name.trim())
      // Use replace: true to remove the /duplicate/:id from history
      navigate(`/edit/${newId}`, { replace: true })
    } catch (error) {
      console.error('Failed to duplicate terrain:', error)
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate(-1)
  }

  if (!sourceTerrain) return null

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto transition-all duration-300"
      onClick={handleCancel}
    >
      <div 
        className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-6">
            <DuplicateIcon size={32} className="text-orange-500" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-[0.3em] text-white">Duplicate Terrain</h2>
          <p className="text-xs text-white/40 font-bold uppercase tracking-[0.2em] mt-3">Enter a name for your new design</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] text-white/20 font-black uppercase tracking-widest px-1">Terrain Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleConfirm()
                if (e.key === 'Escape') handleCancel()
              }}
              placeholder="Enter name..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 focus:outline-none focus:border-orange-500/50 transition-all font-bold"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleCancel}
              className="flex-1 px-6 py-4 rounded-2xl border border-white/20 text-white/70 font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!name.trim() || isSubmitting}
              className={`flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 ${
                !name.trim() || isSubmitting
                ? 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed'
                : 'bg-orange-600 text-white shadow-[0_10px_30px_rgba(234,88,12,0.3)] hover:bg-orange-500'
              }`}
            >
              {isSubmitting ? 'Copying...' : 'Duplicate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

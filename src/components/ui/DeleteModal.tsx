import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storageManager } from '../../managers/StorageManager'
import type { TerrainConfig } from '../../types/game'
import { TrashIcon } from './Icons'

interface DeleteModalProps {
  terrainId: string
}

export const DeleteModal = ({ terrainId }: DeleteModalProps) => {
  const navigate = useNavigate()
  const [terrain, setTerrain] = useState<TerrainConfig | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const loadTerrain = async () => {
      const custom = await storageManager.getCustomTerrains()
      const found = custom.find(t => t.id === terrainId)
      if (found) {
        setTerrain(found)
      } else {
        navigate('/', { replace: true })
      }
    }
    loadTerrain()
  }, [terrainId, navigate])

  const handleConfirm = async () => {
    if (!terrain || isDeleting) return

    setIsDeleting(true)
    try {
      await storageManager.deleteTerrain(terrain.id)
      navigate('/', { replace: true })
    } catch (error) {
      console.error('Failed to delete terrain:', error)
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    navigate('/', { replace: true })
  }

  if (!terrain) return null

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
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
            <TrashIcon size={32} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-[0.3em] text-white">Delete Terrain</h2>
          <p className="text-xs text-white/40 font-bold uppercase tracking-[0.2em] mt-3 px-4">
            Are you sure you want to delete <span className="text-white">"{terrain.name}"</span>? This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleCancel}
            className="flex-1 px-6 py-4 rounded-2xl border border-white/20 text-white/70 font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className={`flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 ${
              isDeleting
              ? 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed'
              : 'bg-red-600 text-white shadow-[0_10px_30px_rgba(220,38,38,0.3)] hover:bg-red-500'
            }`}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { storageManager } from '../../managers/StorageManager'
import { flatTerrain } from '../../terrains/flat'

export const CreateModal = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('New Terrain')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!name.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const newId = await storageManager.duplicateTerrain(flatTerrain, name.trim())
      // Navigate directly to edit the new custom terrain
      navigate(`/edit/${newId}`, { replace: true })
    } catch (error) {
      console.error('Failed to create new terrain:', error)
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate(-1)
  }

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto transition-all duration-300"
      onClick={handleCancel}
    >
      <div 
        className="w-[calc(100%-2rem)] mx-4 max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center mb-6 sm:mb-10">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-6">
            {/* Plus Icon */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-[0.3em] text-white">Create Terrain</h2>
          <p className="text-xs text-white/40 font-bold uppercase tracking-[0.2em] mt-3">Design a new landscape from scratch</p>
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
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 sm:px-6 sm:py-4 text-white placeholder:text-white/10 focus:outline-none focus:border-orange-500/50 transition-all font-bold"
            />
          </div>

          <div className="flex gap-4 pt-2 sm:pt-4">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-3 sm:px-6 sm:py-4 rounded-2xl border border-white/20 text-white/70 font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all active:scale-95 text-xs sm:text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!name.trim() || isSubmitting}
              className={`flex-1 px-4 py-3 sm:px-6 sm:py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 text-xs sm:text-sm ${
                !name.trim() || isSubmitting
                ? 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed'
                : 'bg-orange-600 text-white shadow-[0_10px_30px_rgba(234,88,12,0.3)] hover:bg-orange-500'
              }`}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

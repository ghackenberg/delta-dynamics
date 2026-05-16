import type { StateCreator } from 'zustand'

export interface UiSlice {
  hoveredCell: { x: number, z: number } | null
  hoveredEntityId: string | null
  fps: number
  fpsHistory: number[]
  setHoveredCell: (cell: { x: number, z: number } | null) => void
  setHoveredEntityId: (id: string | null) => void
  setFps: (fps: number) => void
}

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  hoveredCell: null,
  hoveredEntityId: null,
  fps: 0,
  fpsHistory: [],
  setHoveredCell: (cell) => set({ hoveredCell: cell }),
  setHoveredEntityId: (id) => set({ hoveredEntityId: id }),
  setFps: (fps) => set((state) => ({ 
    fps, 
    fpsHistory: [...state.fpsHistory.slice(-29), fps] 
  })),
})

import type { StateCreator } from 'zustand'

export interface UiSlice {
  isLoading: boolean
  hoveredCell: { x: number, z: number } | null
  hoveredEntityId: string | null
  fps: number
  fpsHistory: number[]
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  lastOpenedSidebar: 'left' | 'right' | null
  setIsLoading: (isLoading: boolean) => void
  setHoveredCell: (cell: { x: number, z: number } | null) => void
  setHoveredEntityId: (id: string | null) => void
  setFps: (fps: number) => void
  setLeftSidebarOpen: (open: boolean) => void
  setRightSidebarOpen: (open: boolean) => void
}

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  isLoading: false,
  hoveredCell: null,
  hoveredEntityId: null,
  fps: 0,
  fpsHistory: [],
  leftSidebarOpen: false,
  rightSidebarOpen: false,
  lastOpenedSidebar: null,
  setIsLoading: (isLoading) => set({ isLoading }),
  setHoveredCell: (cell) => set({ hoveredCell: cell }),
  setHoveredEntityId: (id) => set({ hoveredEntityId: id }),
  setFps: (fps) => set((state) => ({ 
    fps, 
    fpsHistory: [...state.fpsHistory.slice(-29), fps] 
  })),
  setLeftSidebarOpen: (open) => set((state) => ({ 
    leftSidebarOpen: open,
    lastOpenedSidebar: open ? 'left' : state.lastOpenedSidebar === 'left' ? null : state.lastOpenedSidebar
  })),
  setRightSidebarOpen: (open) => set((state) => ({ 
    rightSidebarOpen: open,
    lastOpenedSidebar: open ? 'right' : state.lastOpenedSidebar === 'right' ? null : state.lastOpenedSidebar
  })),
})

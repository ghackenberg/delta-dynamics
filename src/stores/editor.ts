import type { StateCreator } from 'zustand'
import type { GameMode, LayerType, BuildingType } from '../types/game'

export interface EditorSlice {
  mode: GameMode
  selectedBuildingType: BuildingType
  editorLayerType: LayerType
  editorBrushSize: number
  editorBrushStrength: number
  isEditorInteracting: boolean
  isCtrlPressed: boolean
  isDirty: boolean
  editorBrushAction: 'PAINT' | 'ERASE'
  setMode: (mode: GameMode) => void
  setSelectedBuildingType: (type: BuildingType) => void
  setEditorLayerType: (type: LayerType) => void
  setEditorBrushSize: (size: number) => void
  setEditorBrushStrength: (strength: number) => void
  setCtrlPressed: (isPressed: boolean) => void
  setEditorInteracting: (isInteracting: boolean) => void
  setDirty: (isDirty: boolean) => void
  setEditorBrushAction: (action: 'PAINT' | 'ERASE') => void
}

export const createEditorSlice: StateCreator<EditorSlice> = (set) => ({
  mode: 'PLAY',
  selectedBuildingType: 'HOUSE',
  editorLayerType: 'HUMUS',
  editorBrushSize: 5,
  editorBrushStrength: 0.5,
  isEditorInteracting: false,
  isCtrlPressed: false,
  isDirty: false,
  editorBrushAction: 'PAINT',
  setMode: (mode) => set({ mode }),
  setSelectedBuildingType: (type) => set({ selectedBuildingType: type }),
  setEditorLayerType: (type) => set({ editorLayerType: type }),
  setEditorBrushSize: (size) => set({ editorBrushSize: size }),
  setEditorBrushStrength: (strength) => set({ editorBrushStrength: strength }),
  setCtrlPressed: (isPressed) => set({ isCtrlPressed: isPressed }),
  setEditorInteracting: (isInteracting) => set({ isEditorInteracting: isInteracting }),
  setDirty: (isDirty) => set({ isDirty }),
  setEditorBrushAction: (editorBrushAction) => set({ editorBrushAction }),
})

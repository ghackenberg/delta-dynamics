import { create } from 'zustand'
import { createGameSlice } from '../stores/game'
import type { StoreState as GameState } from '../stores/game'
import { createEditorSlice } from '../stores/editor'
import { createAiSlice } from '../stores/ai'
import { createUiSlice } from '../stores/ui'

export type { GameState }

export const useStore = create<GameState>((...a) => ({
  ...createGameSlice(...a),
  ...createEditorSlice(...a),
  ...createAiSlice(...a),
  ...createUiSlice(...a),
}))

import type { StateCreator } from 'zustand'

export interface AiSlice {
  aiStatus: string
  isAiLoading: boolean
  aiResponse: string
  setAiStatus: (status: string) => void
  setAiLoading: (loading: boolean) => void
  setAiResponse: (response: string) => void
}

export const createAiSlice: StateCreator<AiSlice> = (set) => ({
  aiStatus: 'Idle',
  isAiLoading: false,
  aiResponse: '',
  setAiStatus: (status) => set({ aiStatus: status }),
  setAiLoading: (loading) => set({ isAiLoading: loading }),
  setAiResponse: (response) => set({ aiResponse: response }),
})

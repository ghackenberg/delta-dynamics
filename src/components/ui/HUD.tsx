import { type ReactNode } from 'react'
import { useMatch } from 'react-router-dom'
import { useStore } from '../../hooks/useStore'
import { MainMenu } from './MainMenu'
import { TopBar } from './TopBar'
import { LeftSidebar } from './LeftSidebar'
import { RightSidebar } from './RightSidebar'
import { BottomBar } from './BottomBar'
import { LoadingOverlay } from './LoadingOverlay'
import { DuplicateModal } from './DuplicateModal'
import { RenameModal } from './RenameModal'
import { DeleteModal } from './DeleteModal'

interface HUDProps {
  children: ReactNode
  onInitAI: () => void
  onConsultAI: () => void
}

export const HUD = ({ children, onInitAI, onConsultAI }: HUDProps) => {
  const gameState = useStore((state) => state.gameState)
  const leftSidebarOpen = useStore((state) => state.leftSidebarOpen)
  const rightSidebarOpen = useStore((state) => state.rightSidebarOpen)
  const setLeftSidebarOpen = useStore((state) => state.setLeftSidebarOpen)
  const setRightSidebarOpen = useStore((state) => state.setRightSidebarOpen)
  const mode = useStore((state) => state.mode)

  const duplicateMatch = useMatch('/duplicate/:terrainId')
  const renameMatch = useMatch('/rename/:terrainId')
  const deleteMatch = useMatch('/delete/:terrainId')

  return (
    <div className="relative h-screen w-screen bg-[#050505] text-white overflow-hidden select-none font-sans pointer-events-none">
      {/* Background 3D Scene */}
      {gameState !== 'MENU' && (
        <div className="absolute inset-0 z-0 pointer-events-auto">
          {children}
        </div>
      )}

      {gameState === 'MENU' && <MainMenu />}

      {gameState !== 'MENU' && (
        <>
          <TopBar />
          <LeftSidebar />
          <RightSidebar />
          <BottomBar onInitAI={onInitAI} onConsultAI={onConsultAI} />

          {/* Floating Mobile Toggle Buttons */}
          {!leftSidebarOpen && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setLeftSidebarOpen(true)
              }}
              className="md:hidden pointer-events-auto fixed top-20 left-4 z-20 flex items-center justify-center w-10 h-10 rounded-xl bg-black/60 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition-all backdrop-blur-md shadow-lg"
              title="Open Tools"
            >
              {mode === 'PLAY' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                  <path d="M7.5 10.5c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5z"/>
                  <path d="M11.5 7.5c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5z"/>
                  <path d="M16.5 9.5c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5z"/>
                  <path d="M6 14c0-2 2-3 4-3 2.5 0 3 1.5 4.5 2.5S17 14 18 16c.5 1-1.5 2-3 2H9c-2 0-3-2-3-2z"/>
                </svg>
              )}
            </button>
          )}

          {!rightSidebarOpen && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setRightSidebarOpen(true)
              }}
              className="md:hidden pointer-events-auto fixed top-20 right-4 z-20 flex items-center justify-center w-10 h-10 rounded-xl bg-black/60 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition-all backdrop-blur-md shadow-lg"
              title="Open Info"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </button>
          )}
        </>
      )}

      <LoadingOverlay />
      {duplicateMatch && duplicateMatch.params.terrainId && (
        <DuplicateModal terrainId={duplicateMatch.params.terrainId} />
      )}
      {renameMatch && renameMatch.params.terrainId && (
        <RenameModal terrainId={renameMatch.params.terrainId} />
      )}
      {deleteMatch && deleteMatch.params.terrainId && (
        <DeleteModal terrainId={deleteMatch.params.terrainId} />
      )}
    </div>
  )
}

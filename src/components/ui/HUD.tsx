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
import { DeleteModal } from './DeleteModal'

interface HUDProps {
  children: ReactNode
  onInitAI: () => void
  onConsultAI: () => void
}

export const HUD = ({ children, onInitAI, onConsultAI }: HUDProps) => {
  const gameState = useStore((state) => state.gameState)
  const duplicateMatch = useMatch('/duplicate/:terrainId')
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
        </>
      )}

      <LoadingOverlay />
      {duplicateMatch && duplicateMatch.params.terrainId && (
        <DuplicateModal terrainId={duplicateMatch.params.terrainId} />
      )}
      {deleteMatch && deleteMatch.params.terrainId && (
        <DeleteModal terrainId={deleteMatch.params.terrainId} />
      )}
    </div>
  )
}

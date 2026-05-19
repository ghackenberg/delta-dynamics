import { type ReactNode } from 'react'
import { useStore } from '../../hooks/useStore'
import { MainMenu } from './MainMenu'
import { TopBar } from './TopBar'
import { LeftSidebar } from './LeftSidebar'
import { RightSidebar } from './RightSidebar'
import { BottomBar } from './BottomBar'
import { LoadingOverlay } from './LoadingOverlay'

interface HUDProps {
  children: ReactNode
  onInitAI: () => void
  onConsultAI: () => void
}

export const HUD = ({ children, onInitAI, onConsultAI }: HUDProps) => {
  const gameState = useStore((state) => state.gameState)

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
    </div>
  )
}

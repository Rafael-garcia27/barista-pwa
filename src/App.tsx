import { useState, useEffect, useRef } from 'react'
import { TabBar, type TabId } from './components/TabBar'
import { BrewScreen } from './screens/BrewScreen'
import { LogbookScreen } from './screens/LogbookScreen'
import { BeansScreen } from './screens/BeansScreen'
import { BaristaAssistant } from './components/BaristaAssistant'
import { DevNotes } from './components/DevNotes'
import { seedIfEmpty } from './db'

const EDGE_THRESHOLD = 28   // px from left edge to start gesture
const SWIPE_MIN_DX = 55     // px horizontal movement to trigger open

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('brew')
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [devNotesOpen, setDevNotesOpen] = useState(false)

  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const edgeSwipeActive = useRef(false)

  useEffect(() => {
    seedIfEmpty()
  }, [])

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      const x = e.touches[0].clientX
      touchStartX.current = x
      touchStartY.current = e.touches[0].clientY
      edgeSwipeActive.current = x < EDGE_THRESHOLD
    }

    function onTouchMove(e: TouchEvent) {
      if (!edgeSwipeActive.current || touchStartX.current === null || touchStartY.current === null) return
      const dx = e.touches[0].clientX - touchStartX.current
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
      if (dx > SWIPE_MIN_DX && dy < dx * 0.6) {
        setDevNotesOpen(true)
        edgeSwipeActive.current = false
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col max-w-md mx-auto">
      <main className="flex-1 overflow-y-auto p-4 pb-2">
        {activeTab === 'brew' && <BrewScreen onNavigateToTab={setActiveTab} />}
        {activeTab === 'logbook' && <LogbookScreen />}
        {activeTab === 'beans' && <BeansScreen />}
      </main>

      {/* Floating Barista button */}
      <button
        type="button"
        onClick={() => setAssistantOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-amber-600 text-xl shadow-lg active:bg-amber-700"
        aria-label="Ask the Barista"
      >
        ☕
      </button>

      <TabBar activeTab={activeTab} onChange={setActiveTab} />

      <BaristaAssistant isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} />
      <DevNotes isOpen={devNotesOpen} onClose={() => setDevNotesOpen(false)} />
    </div>
  )
}

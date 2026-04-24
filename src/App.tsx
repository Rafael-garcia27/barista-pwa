import { useState, useEffect, useRef } from 'react'
import { TabBar, type TabId } from './components/TabBar'
import { BrewScreen } from './screens/BrewScreen'
import { LogbookScreen } from './screens/LogbookScreen'
import { BeansScreen } from './screens/BeansScreen'
import { BaristaAssistant } from './components/BaristaAssistant'
import { DevNotes } from './components/DevNotes'
import { seedIfEmpty } from './db'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('brew')
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [devNotesOpen, setDevNotesOpen] = useState(false)

  const tabTouchStartY = useRef<number | null>(null)

  useEffect(() => {
    seedIfEmpty()
  }, [])

  function handleTabTouchStart(e: React.TouchEvent) {
    tabTouchStartY.current = e.touches[0].clientY
  }

  function handleTabTouchMove(e: React.TouchEvent) {
    if (tabTouchStartY.current === null) return
    if (e.touches[0].clientY - tabTouchStartY.current < -38) {
      setDevNotesOpen(true)
      tabTouchStartY.current = null
    }
  }

  function handleTabTouchEnd() {
    tabTouchStartY.current = null
  }

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

      {/* Nav area with hidden pull-tab */}
      <div className="relative border-t border-gray-200 bg-white">
        {/* Pull-tab trigger — looks like a small switch, opens Dev Notes on swipe-up */}
        <div
          className="absolute -top-4 left-4 z-20 flex h-7 w-9 items-end justify-center pb-1 cursor-pointer"
          onTouchStart={handleTabTouchStart}
          onTouchMove={handleTabTouchMove}
          onTouchEnd={handleTabTouchEnd}
          onClick={() => setDevNotesOpen(true)}
        >
          <div className="h-[3px] w-7 rounded-full bg-gray-300" />
        </div>

        <TabBar activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <BaristaAssistant isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} />
      <DevNotes isOpen={devNotesOpen} onClose={() => setDevNotesOpen(false)} />
    </div>
  )
}

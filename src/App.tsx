import { useState, useEffect, useRef } from 'react'
import { TabBar, type TabId } from './components/TabBar'
import { BrewScreen, type BrewScreenHandle } from './screens/BrewScreen'
import { LogbookScreen } from './screens/LogbookScreen'
import { BeansScreen } from './screens/BeansScreen'
import { BaristaAssistant } from './components/BaristaAssistant'
import { DevNotes } from './components/DevNotes'
import { seedIfEmpty } from './db'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('brew')
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [devNotesOpen, setDevNotesOpen] = useState(false)
  const [isBrewing, setIsBrewing] = useState(false)

  const brewScreenRef = useRef<BrewScreenHandle>(null)
  const tabTouchStartY = useRef<number | null>(null)

  useEffect(() => {
    seedIfEmpty()
  }, [])

  function handleTabChange(tab: TabId) {
    if (tab === activeTab && tab === 'brew') {
      // Re-tapping brew: go to setup (unless actively brewing — BrewScreen guards that)
      brewScreenRef.current?.handleTabReselect()
      return
    }
    setActiveTab(tab)
  }

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
        {/* All screens stay mounted so state (and the brew timer) persists across tab switches */}
        <div className={activeTab !== 'brew' ? 'hidden' : undefined}>
          <BrewScreen
            ref={brewScreenRef}
            onNavigateToTab={setActiveTab}
            onBrewStatusChange={setIsBrewing}
          />
        </div>
        <div className={activeTab !== 'logbook' ? 'hidden' : undefined}>
          <LogbookScreen isActive={activeTab === 'logbook'} />
        </div>
        <div className={activeTab !== 'beans' ? 'hidden' : undefined}>
          <BeansScreen isActive={activeTab === 'beans'} />
        </div>
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

      <TabBar activeTab={activeTab} onChange={handleTabChange} isBrewing={isBrewing} />

      {/* Dev Notes pull-tab — vertical lip on the left edge, bottom of screen */}
      <div
        className="fixed bottom-24 left-0 z-20 flex items-center"
        onTouchStart={handleTabTouchStart}
        onTouchMove={handleTabTouchMove}
        onTouchEnd={handleTabTouchEnd}
        onClick={() => setDevNotesOpen(true)}
      >
        <div className="flex h-16 w-6 items-center justify-start">
          <div className="h-10 w-[5px] rounded-r-full bg-gray-400 shadow-md" />
        </div>
      </div>

      <BaristaAssistant isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} />
      <DevNotes isOpen={devNotesOpen} onClose={() => setDevNotesOpen(false)} />
    </div>
  )
}

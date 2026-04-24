import { useState, useEffect } from 'react'
import { TabBar, type TabId } from './components/TabBar'
import { BrewScreen } from './screens/BrewScreen'
import { LogbookScreen } from './screens/LogbookScreen'
import { BeansScreen } from './screens/BeansScreen'
import { BaristaAssistant } from './components/BaristaAssistant'
import { seedIfEmpty } from './db'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('brew')
  const [assistantOpen, setAssistantOpen] = useState(false)

  useEffect(() => {
    seedIfEmpty()
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
    </div>
  )
}

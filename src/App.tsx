import { useState, useEffect } from 'react'
import { TabBar, type TabId } from './components/TabBar'
import { BrewScreen } from './screens/BrewScreen'
import { LogbookScreen } from './screens/LogbookScreen'
import { BeansScreen } from './screens/BeansScreen'
import { seedIfEmpty } from './db'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('brew')

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
      <TabBar activeTab={activeTab} onChange={setActiveTab} />
    </div>
  )
}

import { Coffee, BookOpen, Bean } from 'lucide-react'

export type TabId = 'brew' | 'logbook' | 'beans'

interface TabBarProps {
  activeTab: TabId
  onChange: (tab: TabId) => void
}

export function TabBar({ activeTab, onChange }: TabBarProps) {
  return (
    <nav className="border-t border-gray-200 bg-white">
      <div className="flex">
        {([
          { id: 'brew' as TabId, label: 'Brew', icon: <Coffee size={22} /> },
          { id: 'logbook' as TabId, label: 'Logbook', icon: <BookOpen size={22} /> },
          { id: 'beans' as TabId, label: 'Shelf', icon: <Bean size={22} /> },
        ] as const).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex flex-1 flex-col items-center gap-1 py-4 text-xs font-medium transition-colors ${
              activeTab === tab.id ? 'text-amber-600' : 'text-gray-400'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

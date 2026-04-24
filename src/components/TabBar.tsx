import { Coffee, BookOpen, Bean } from 'lucide-react'

export type TabId = 'brew' | 'logbook' | 'beans'

interface TabBarProps {
  activeTab: TabId
  onChange: (tab: TabId) => void
  isBrewing?: boolean
}

export function TabBar({ activeTab, onChange, isBrewing }: TabBarProps) {
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
            <div className="relative">
              {tab.icon}
              {tab.id === 'brew' && isBrewing && (
                <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 ring-2 ring-white" />
                </span>
              )}
            </div>
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

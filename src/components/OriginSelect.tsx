import { useRef, useState } from 'react'

interface OriginSelectProps {
  value: string[]
  onChange: (origins: string[]) => void
  pool: string[]
}

export function OriginSelect({ value, onChange, pool }: OriginSelectProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = input.trim()
    ? pool.filter(o => !value.includes(o) && o.toLowerCase().includes(input.toLowerCase()))
    : []

  function addOrigin(origin: string) {
    const trimmed = origin.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setInput('')
    inputRef.current?.focus()
  }

  function removeOrigin(origin: string) {
    onChange(value.filter(o => o !== origin))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (input.trim()) addOrigin(input)
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeOrigin(value[value.length - 1])
    }
  }

  return (
    <div className="space-y-1.5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(origin => (
            <span key={origin} className="flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5 text-xs font-medium">
              {origin}
              <button type="button" onClick={() => removeOrigin(origin)} className="text-amber-600 hover:text-amber-900 leading-none">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          placeholder={value.length === 0 ? 'Type origin, press Enter…' : 'Add another…'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {suggestions.slice(0, 8).map(s => (
              <button key={s} type="button"
                onMouseDown={e => { e.preventDefault(); addOrigin(s) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 text-gray-700">
                {s}
              </button>
            ))}
            {input.trim() && !pool.some(o => o.toLowerCase() === input.toLowerCase()) && (
              <button type="button"
                onMouseDown={e => { e.preventDefault(); addOrigin(input) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 text-gray-500 border-t border-gray-100">
                Add "{input.trim()}"
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

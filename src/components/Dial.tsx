interface DialProps {
  value: number
  min: number
  max: number
  step: number
  label: string
  onChange: (value: number) => void
}

export function Dial({ value, min, max, step, label, onChange }: DialProps) {
  function decrement() {
    const next = Math.round((value - step) * 100) / 100
    if (next >= min) onChange(next)
  }
  function increment() {
    const next = Math.round((value + step) * 100) / 100
    if (next <= max) onChange(next)
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={decrement}
          className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 text-lg leading-none flex items-center justify-center">
          −
        </button>
        <span className="w-14 text-center text-lg font-semibold tabular-nums">{value}</span>
        <button type="button" onClick={increment}
          className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 text-lg leading-none flex items-center justify-center">
          +
        </button>
      </div>
    </div>
  )
}

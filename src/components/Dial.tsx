import { useRef } from 'react'

interface DialProps {
  value: number
  min: number
  max: number
  step: number
  label: string
  onChange: (value: number) => void
}

const PIXELS_PER_STEP = 10

export function Dial({ value, min, max, step, label, onChange }: DialProps) {
  const touchStartY = useRef<number | null>(null)
  const startValue = useRef(value)

  function clamp(v: number) {
    return Math.min(max, Math.max(min, Math.round(v * 100) / 100))
  }

  function inc() { onChange(clamp(value + step)) }
  function dec() { onChange(clamp(value - step)) }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
    startValue.current = value
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === null) return
    const dy = touchStartY.current - e.touches[0].clientY
    const steps = Math.round(dy / PIXELS_PER_STEP)
    onChange(clamp(startValue.current + steps * step))
  }

  function handleTouchEnd() {
    touchStartY.current = null
  }

  return (
    <div className="flex flex-col items-center select-none py-2">
      <div className="text-[9px] font-bold uppercase tracking-wide text-gray-400 mb-1.5 text-center leading-tight px-1">
        {label}
      </div>
      <button
        type="button"
        onClick={inc}
        className="text-amber-500 text-[10px] py-1.5 w-full text-center active:text-amber-700 leading-none"
      >
        ▲
      </button>
      <div
        className="touch-none cursor-ns-resize py-1 text-3xl font-bold tabular-nums text-gray-900 leading-none text-center min-w-[2.5rem]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {value}
      </div>
      <button
        type="button"
        onClick={dec}
        className="text-amber-500 text-[10px] py-1.5 w-full text-center active:text-amber-700 leading-none"
      >
        ▼
      </button>
    </div>
  )
}

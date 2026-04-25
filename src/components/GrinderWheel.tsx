import { useRef, useCallback } from 'react'
import { clicksToScale } from '../engine/grinder'

interface GrinderWheelProps {
  value: number
  min: number
  max: number
  recMin?: number
  recMax?: number
  onChange: (clicks: number) => void
}

const CELL_PX = 32

// Method zones shown as labels between the scale and divider
const METHOD_ZONES = [
  { label: 'Espresso', center: 25, range: '2–3' },
  { label: 'AeroPress', center: 40, range: '3–5' },
  { label: 'V60', center: 65, range: '5–8' },
]

export function GrinderWheel({ value, min, max, recMin, recMax, onChange }: GrinderWheelProps) {
  const dragRef = useRef<{ startX: number; startValue: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const clamp = (v: number) => Math.max(min, Math.min(max, v))

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragRef.current = { startX: e.touches[0].clientX, startValue: value }
  }, [value])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current) return
    const dx = e.touches[0].clientX - dragRef.current.startX
    const delta = Math.round(dx / (CELL_PX / 2))
    onChange(clamp(dragRef.current.startValue + delta))
  }, [onChange, clamp])

  const onTouchEnd = useCallback(() => { dragRef.current = null }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startValue: value }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const delta = Math.round(dx / (CELL_PX / 2))
      onChange(clamp(dragRef.current.startValue + delta))
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [value, onChange, clamp])

  const visibleCount = 9
  const half = Math.floor(visibleCount / 2)
  const ticks = Array.from({ length: visibleCount }, (_, i) => value - half + i)

  const recMinScale = recMin != null ? parseFloat(clicksToScale(recMin)) : null
  const recMaxScale = recMax != null ? parseFloat(clicksToScale(recMax)) : null

  return (
    <div className="space-y-1.5">
      {/* Header row: label left, recommended range right */}
      <div className="flex items-center justify-between px-1">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Grinder</div>
        <div className="text-sm font-bold tabular-nums">
          {recMinScale != null && recMaxScale != null ? (
            <>
              <span className="text-amber-600">{recMinScale.toFixed(1)}–{recMaxScale.toFixed(1)}</span>
              <span className="text-xs font-normal text-gray-400 ml-1">rec</span>
            </>
          ) : (
            <span className="text-gray-800">{clicksToScale(value)}</span>
          )}
        </div>
      </div>

      {/* Wheel */}
      <div
        ref={containerRef}
        className="relative select-none overflow-hidden rounded-xl bg-gray-100 cursor-grab active:cursor-grabbing"
        style={{ height: 96, touchAction: 'none' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
      >
        {/* Recommendation band — aligned to tick positions via calc() */}
        {recMin != null && recMax != null && (
          <div
            className="absolute inset-y-0 bg-amber-100 opacity-70"
            style={{
              left: `calc(50% + ${(recMin - value) * CELL_PX}px)`,
              width: `${(recMax - recMin) * CELL_PX}px`,
            }}
          />
        )}

        {/* Divider line */}
        <div className="absolute inset-x-0 top-1/2 border-t border-gray-300 pointer-events-none" />

        {/* Top half: scale numbers near top, method zone labels near divider */}
        <div className="absolute inset-x-0 top-0 h-1/2 pointer-events-none">
          {/* Scale numbers — same direction as drum so they align */}
          {ticks.map((tick) => {
            const offsetFromCenter = tick - value
            const xPos = `calc(50% + ${offsetFromCenter * CELL_PX}px)`
            const isRec = recMin != null && recMax != null && tick >= recMin && tick <= recMax
            const isCenter = tick === value

            return (
              <div
                key={tick}
                className="absolute flex items-center justify-center"
                style={{ left: xPos, top: 6, transform: 'translateX(-50%)' }}
              >
                <span className={`font-mono leading-none ${
                  isCenter
                    ? 'text-amber-600 font-bold text-[14px]'
                    : isRec
                    ? 'text-amber-500 text-[11px]'
                    : tick < min || tick > max
                    ? 'text-gray-200 text-[11px]'
                    : 'text-gray-400 text-[11px]'
                }`}>
                  {tick >= min && tick <= max ? clicksToScale(tick) : '·'}
                </span>
              </div>
            )
          })}

          {/* Method zone labels — centered in their respective scale range */}
          {METHOD_ZONES.map(({ label, center, range }) => {
            const offsetFromCenter = center - value
            const xPos = `calc(50% + ${offsetFromCenter * CELL_PX}px)`
            return (
              <div
                key={label}
                className="absolute flex flex-col items-center"
                style={{ left: xPos, bottom: 3, transform: 'translateX(-50%)' }}
              >
                <span className="text-[9px] font-semibold text-gray-400 whitespace-nowrap leading-tight tabular-nums">
                  {range}
                </span>
                <span className="text-[7px] text-gray-300 whitespace-nowrap leading-tight">
                  {label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Bottom half: drum ticks */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 flex items-center pointer-events-none">
          {ticks.map((tick) => {
            const offsetFromCenter = tick - value
            const xPos = `calc(50% + ${offsetFromCenter * CELL_PX}px)`
            const isCenter = tick === value
            const isMajor = tick % 5 === 0
            const isRec = recMin != null && recMax != null && tick >= recMin && tick <= recMax

            return (
              <div
                key={tick}
                className="absolute flex flex-col items-center justify-center"
                style={{ left: xPos, transform: 'translateX(-50%)' }}
              >
                <div className={`rounded-full ${
                  isCenter
                    ? 'w-[3px] h-6 bg-amber-500'
                    : isMajor
                    ? 'w-[2px] h-4 ' + (isRec ? 'bg-amber-400' : 'bg-gray-400')
                    : 'w-px h-3 ' + (isRec ? 'bg-amber-300' : 'bg-gray-300')
                }`} />
                {isMajor && tick >= min && tick <= max && (
                  <span className={`text-[9px] font-mono mt-0.5 ${
                    isCenter ? 'text-amber-600 font-bold' : isRec ? 'text-amber-400' : 'text-gray-300'
                  }`}>
                    {tick}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Center indicator line */}
        <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-amber-500 opacity-40 pointer-events-none" />

        {/* Edge vignette */}
        <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-gray-100 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-gray-100 to-transparent pointer-events-none" />
      </div>

      {/* Current scale value */}
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-[10px] text-gray-400">Scale</span>
        <span className="text-sm font-bold text-amber-600 tabular-nums">{clicksToScale(value)}</span>
      </div>
    </div>
  )
}

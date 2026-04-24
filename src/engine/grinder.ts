import type { BrewMethod, RoastLevel } from '../types'
import type { FreshnessStage } from './freshness'

export function clicksToScale(clicks: number): string {
  return (clicks / 10).toFixed(1)
}

// User-confirmed ranges (clicks). Overlapping — treat as a continuous spectrum.
export const GRINDER_RANGES: Record<BrewMethod, { min: number; max: number }> = {
  espresso:  { min: 20, max: 30 },
  aeropress: { min: 30, max: 50 },
  v60:       { min: 50, max: 80 },
}

// Darker roast → coarser (higher clicks). Lighter → finer (more resistance = better extraction).
const ROAST_OFFSET: Record<RoastLevel, number> = {
  light:         -3,
  medium:         0,
  'medium-dark':  3,
  dark:           5,
}

// Freshness-driven adjustment.
// Aging/old beans lose solubility → grind finer to extract more.
// Very fresh espresso → slightly coarser: CO₂ under pressure causes channeling, not under-extraction.
// Pour over / AeroPress are much more forgiving of fresh beans (no pressure amplification).
const FRESHNESS_OFFSET: Partial<Record<FreshnessStage, number>> = {
  tooFresh:  2,   // coarser (espresso: CO₂ + pressure = over-extraction risk)
  aging:    -2,   // finer
  old:      -3,
}

export interface GrinderRecommendation {
  clicksMin: number
  clicksMax: number
  clicksCenter: number
  scaleRange: string   // e.g. "2.2–2.8"
  note?: string
}

export function getGrinderRecommendation(
  method: BrewMethod,
  roastLevel: RoastLevel,
  freshnessStage?: FreshnessStage,
): GrinderRecommendation {
  const range = GRINDER_RANGES[method]
  const baseCenter = (range.min + range.max) / 2
  const roastAdj = ROAST_OFFSET[roastLevel]
  const freshAdj = freshnessStage ? (FRESHNESS_OFFSET[freshnessStage] ?? 0) : 0

  const center = Math.round(baseCenter + roastAdj + freshAdj)
  // Spread: espresso is very sensitive (±3), AeroPress medium (±5), V60 more forgiving (±7)
  const spread = method === 'espresso' ? 3 : method === 'aeropress' ? 5 : 7

  const clicksMin = Math.max(range.min, center - spread)
  const clicksMax = Math.min(range.max, center + spread)
  const clicksCenter = Math.max(range.min, Math.min(range.max, center))

  let note: string | undefined
  if (freshnessStage === 'aging' || freshnessStage === 'old') {
    note = 'Aging beans lose solubility — grind slightly finer than usual.'
  } else if (freshnessStage === 'tooFresh' && method === 'espresso') {
    note = 'Very fresh — go slightly coarser. CO₂ under pressure overshoots extraction fast.'
  }

  return {
    clicksMin,
    clicksMax,
    clicksCenter,
    scaleRange: `${clicksToScale(clicksMin)}–${clicksToScale(clicksMax)}`,
    note,
  }
}

// Flag when the logged grinder setting is clearly outside the method's range.
export function analyzeGrinderOutOfRange(
  grinderClicks: number,
  method: BrewMethod,
): { direction: 'increase' | 'decrease'; reason: string } | null {
  const { min, max } = GRINDER_RANGES[method]
  const methodName = method === 'v60' ? 'pour over' : method
  const tolerance = 5

  if (grinderClicks < min - tolerance) {
    return {
      direction: 'increase',
      reason: `Grinder at ${clicksToScale(grinderClicks)} (${grinderClicks} clicks) is very fine for ${methodName}. Typical range: ${clicksToScale(min)}–${clicksToScale(max)}.`,
    }
  }
  if (grinderClicks > max + tolerance) {
    return {
      direction: 'decrease',
      reason: `Grinder at ${clicksToScale(grinderClicks)} (${grinderClicks} clicks) is very coarse for ${methodName}. Typical range: ${clicksToScale(min)}–${clicksToScale(max)}.`,
    }
  }
  return null
}

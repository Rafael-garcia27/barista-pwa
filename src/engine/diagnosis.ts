import type { Bean, BrewLog, Diagnosis, Suggestion, EspressoParams, V60Params, AeroPressParams } from '../types'
import { THRESHOLDS } from './rules'
import { getFreshness } from './freshness'

function espressoDiagnosis(params: EspressoParams, tags: string[]): { score: number; suggestions: Suggestion[]; warning?: string } {
  const suggestions: Suggestion[] = []
  const ratio = params.doseOut / params.doseIn
  const { ratioMin, ratioMax, timeMin, timeMax } = THRESHOLDS.espresso

  const sour = tags.includes('sour')
  const bitter = tags.includes('bitter')
  const harsh = tags.includes('harsh')
  const watery = tags.includes('watery')

  let score = 100
  let warning: string | undefined

  if (params.timeSeconds < timeMin) {
    score -= 20
    suggestions.push({ parameter: 'Grind', direction: 'decrease', reason: 'Shot pulled too fast — grind finer to slow extraction.', tip: 'Aim for 25–35s.' })
  } else if (params.timeSeconds > timeMax) {
    score -= 20
    suggestions.push({ parameter: 'Grind', direction: 'increase', reason: 'Shot pulled too slow — grind coarser to speed extraction.', tip: 'Aim for 25–35s.' })
  }

  if (ratio < ratioMin) {
    score -= 15
    suggestions.push({ parameter: 'Yield', direction: 'increase', reason: `Ratio ${ratio.toFixed(1)}x is very low — increase output weight.` })
  } else if (ratio > ratioMax) {
    score -= 15
    suggestions.push({ parameter: 'Yield', direction: 'decrease', reason: `Ratio ${ratio.toFixed(1)}x is very high — decrease output weight.` })
  }

  if (sour && !bitter) {
    score -= 15
    suggestions.push({ parameter: 'Extraction', direction: 'increase', reason: 'Sour notes indicate under-extraction.', tip: 'Grind finer or increase dose.' })
  }
  if (bitter && !sour) {
    score -= 15
    suggestions.push({ parameter: 'Extraction', direction: 'decrease', reason: 'Bitter notes indicate over-extraction.', tip: 'Grind coarser or reduce dose.' })
  }
  if (harsh) {
    score -= 10
    suggestions.push({ parameter: 'Temperature', direction: 'decrease', reason: 'Harsh taste often means brew temp is too high.' })
  }
  if (watery) {
    score -= 10
    suggestions.push({ parameter: 'Dose', direction: 'increase', reason: 'Watery shot — try increasing dose or decreasing yield.' })
  }

  if (params.puckState === 'wet') {
    score -= 5
    suggestions.push({ parameter: 'Distribution', direction: 'adjust', reason: 'Wet puck suggests channelling — work on distribution and tamp.' })
  }
  if (params.flowState === 'choked') {
    score -= 10
    warning = 'Shot choked — grind is too fine for this bean/dose.'
    suggestions.push({ parameter: 'Grind', direction: 'increase', reason: 'Choked flow means grind is too fine.', tip: 'Go coarser in small steps.' })
  }
  if (params.flowState === 'fast') {
    score -= 10
    suggestions.push({ parameter: 'Grind', direction: 'decrease', reason: 'Fast flow means grind is too coarse.', tip: 'Go finer in small steps.' })
  }

  return { score: Math.max(0, score), suggestions, warning }
}

function filterDiagnosis(params: V60Params | AeroPressParams, tags: string[], method: 'v60' | 'aeropress'): { score: number; suggestions: Suggestion[]; warning?: string } {
  const suggestions: Suggestion[] = []
  const t = THRESHOLDS[method]
  const ratio = params.waterGrams / params.doseIn

  let score = 100

  if (ratio < t.ratioMin) {
    score -= 15
    suggestions.push({ parameter: 'Water', direction: 'increase', reason: `Ratio 1:${ratio.toFixed(0)} is too strong — add more water.` })
  } else if (ratio > t.ratioMax) {
    score -= 15
    suggestions.push({ parameter: 'Dose', direction: 'increase', reason: `Ratio 1:${ratio.toFixed(0)} is too weak — use more coffee.` })
  }

  if (params.timeSeconds < t.timeMin) {
    score -= 20
    suggestions.push({ parameter: 'Grind', direction: 'decrease', reason: 'Brew finished too fast — grind finer for better extraction.' })
  } else if (params.timeSeconds > t.timeMax) {
    score -= 20
    suggestions.push({ parameter: 'Grind', direction: 'increase', reason: 'Brew took too long — grind coarser to improve flow.' })
  }

  if (tags.includes('sour')) {
    score -= 15
    suggestions.push({ parameter: 'Extraction', direction: 'increase', reason: 'Sour taste — grind finer or increase steep time.' })
  }
  if (tags.includes('bitter')) {
    score -= 15
    suggestions.push({ parameter: 'Extraction', direction: 'decrease', reason: 'Bitter taste — grind coarser or reduce steep time.' })
  }
  if (tags.includes('watery') || tags.includes('flat')) {
    score -= 10
    suggestions.push({ parameter: 'Dose', direction: 'increase', reason: 'Weak cup — try more coffee or less water.' })
  }

  return { score: Math.max(0, score), suggestions }
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'Excellent shot — great parameters.'
  if (score >= 80) return 'Good brew — minor tweaks may improve it.'
  if (score >= 60) return 'Decent — some parameters need attention.'
  if (score >= 40) return 'Needs work — several issues detected.'
  return 'Poor result — significant adjustments needed.'
}

export function diagnose(brew: BrewLog, bean: Bean, roastDate?: string): Diagnosis {
  const tags = brew.tasteTags as string[]
  let result: { score: number; suggestions: Suggestion[]; warning?: string }

  if (brew.params.method === 'espresso') {
    result = espressoDiagnosis(brew.params as EspressoParams, tags)
  } else if (brew.params.method === 'v60') {
    result = filterDiagnosis(brew.params as V60Params, tags, 'v60')
  } else {
    result = filterDiagnosis(brew.params as AeroPressParams, tags, 'aeropress')
  }

  // Rating adjustment
  if (brew.rating >= 4) result.score = Math.min(100, result.score + 5)
  if (brew.rating <= 2) result.score = Math.max(0, result.score - 10)

  let freshnessWarning: string | undefined
  if (roastDate) {
    const f = getFreshness(roastDate, brew.params.method, bean.roastLevel, bean.process)
    freshnessWarning = f.warning
  }

  const warning = [result.warning, freshnessWarning].filter(Boolean).join(' ') || undefined

  return {
    score: result.score,
    summary: scoreLabel(result.score),
    suggestions: result.suggestions,
    warning,
  }
}

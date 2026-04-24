import type { Bean, BrewLog, BrewMethod, BrewParams, StartingPoint } from '../types'
import { ESPRESSO_STARTING_POINTS, V60_STARTING_POINTS, AEROPRESS_STARTING_POINTS } from './rules'
import { getFreshness } from './freshness'
import { getGrinderRecommendation } from './grinder'

function originNote(origins: string[], method: BrewMethod): string | undefined {
  const has = (kws: string[]) => origins.some(o => kws.some(k => o.toLowerCase().includes(k)))
  if (method === 'espresso') {
    if (has(['ethiopia','kenya','rwanda','burundi','uganda','tanzania'])) return 'East African origins have high natural acidity — use a higher ratio (2.5–3x) to avoid sharpness.'
    if (has(['brazil'])) return 'Brazilian beans are low-acid and body-forward — ideal for espresso. Lower ratios (1.8–2x) enhance sweetness.'
    if (has(['indonesia','sumatra','java','sulawesi','flores','papua'])) return 'Indonesian origins are earthy and full-bodied — keep the ratio tight (1.8–2x).'
  }
  if (method === 'v60') {
    if (has(['ethiopia','kenya','rwanda','burundi','uganda','tanzania'])) return 'East African beans shine on V60 — expect bright citrus, floral, and stone fruit notes.'
    if (has(['brazil'])) return 'Brazilian beans on V60 produce a mild, nutty cup — AeroPress may better highlight body and sweetness.'
    if (has(['indonesia','sumatra','java','sulawesi','flores','papua'])) return 'Indonesian origins tend to be earthy and heavy — AeroPress is a better fit.'
  }
  if (method === 'aeropress') {
    if (has(['brazil'])) return 'Brazilian beans work well in AeroPress — body and chocolate notes come through nicely.'
    if (has(['ethiopia','kenya','rwanda','burundi','uganda','tanzania'])) return 'East African beans in AeroPress produce a clean, bright cup — steep on the shorter end.'
  }
  return undefined
}

function brewDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function brewTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  return m > 0 ? `${m}:${String(seconds % 60).padStart(2, '0')}` : `${seconds}s`
}

export function getStartingPoint(
  bean: Bean,
  method: BrewMethod,
  roastDate?: string,
  previousBrews?: BrewLog[],
): StartingPoint {
  const origins = bean.origins ?? []
  const freshnessResult = roastDate
    ? getFreshness(roastDate, method, bean.roastLevel, bean.process)
    : undefined
  const freshnessWarn = freshnessResult?.warning
  const oNote = originNote(origins, method)
  const warning = [freshnessWarn, oNote].filter(Boolean).join(' ') || undefined
  const grinderRec = getGrinderRecommendation(method, bean.roastLevel, freshnessResult?.stage)

  // ── Personal history ────────────────────────────────────────────────────────
  // All brews of this bean × method, regardless of rating
  const methodBrews = (previousBrews ?? []).filter(b => b.params.method === method)
  const brewCountForMethod = methodBrews.length

  // Candidates: rated ≥4 only. Sort: highest rating first, then most recent.
  const candidates = methodBrews
    .filter(b => b.rating >= 4)
    .sort((a, b) =>
      b.rating !== a.rating
        ? b.rating - a.rating
        : b.createdAt.localeCompare(a.createdAt),
    )

  const best = candidates[0]

  if (best) {
    const bp = best.params
    const stars = '★'.repeat(best.rating)
    const date = brewDate(best.createdAt)
    let params: BrewParams
    let rationale: string

    if (bp.method === 'espresso') {
      const ratio = (bp.doseOut / bp.doseIn).toFixed(1)
      params = {
        method: 'espresso',
        doseIn: bp.doseIn,
        doseOut: bp.doseOut,
        timeSeconds: bp.timeSeconds,
        puckState: null,
        flowState: null,
        grinderClicks: bp.grinderClicks,
      }
      rationale = `${stars} · ${date} — ${bp.doseIn}g in → ${bp.doseOut}g out (${ratio}x) in ${brewTime(bp.timeSeconds)}`
    } else if (bp.method === 'v60') {
      const ratio = Math.round(bp.waterGrams / bp.doseIn)
      params = {
        method: 'v60',
        doseIn: bp.doseIn,
        waterGrams: bp.waterGrams,
        timeSeconds: bp.timeSeconds,
        grinderClicks: bp.grinderClicks,
      }
      rationale = `${stars} · ${date} — ${bp.doseIn}g / ${bp.waterGrams}g water (1:${ratio}) in ${brewTime(bp.timeSeconds)}`
    } else {
      const ratio = Math.round(bp.waterGrams / bp.doseIn)
      params = {
        method: 'aeropress',
        doseIn: bp.doseIn,
        waterGrams: bp.waterGrams,
        timeSeconds: bp.timeSeconds,
        grinderClicks: bp.grinderClicks,
      }
      rationale = `${stars} · ${date} — ${bp.doseIn}g / ${bp.waterGrams}g water (1:${ratio}), steeped ${brewTime(bp.timeSeconds)}`
    }

    return {
      params,
      rationale,
      warning,
      grinderRec,
      source: 'personal',
      personalBrewRating: best.rating,
      personalBrewDate: best.createdAt,
      brewCountForMethod,
    }
  }

  // ── Rule-based defaults ─────────────────────────────────────────────────────
  const defaultBase = { source: 'default' as const, brewCountForMethod }

  if (method === 'espresso') {
    const row = (ESPRESSO_STARTING_POINTS[bean.roastLevel][bean.process] ?? ESPRESSO_STARTING_POINTS[bean.roastLevel]['any'])!
    const doseOut = Math.round(row.doseIn * ((row.multiplierMin + row.multiplierMax) / 2) * 10) / 10
    const params: BrewParams = {
      method: 'espresso',
      doseIn: row.doseIn,
      doseOut,
      timeSeconds: Math.round((row.timeMin + row.timeMax) / 2),
      puckState: null,
      flowState: null,
    }
    return {
      ...defaultBase,
      params,
      rationale: `${row.doseIn}g in → ${doseOut}g out (${row.multiplierMin}–${row.multiplierMax}x) in ${row.timeMin}–${row.timeMax}s`,
      warning: [row.warning, warning].filter(Boolean).join(' ') || undefined,
      grinderRec,
    }
  }

  if (method === 'v60') {
    const row = V60_STARTING_POINTS[bean.roastLevel]
    const params: BrewParams = {
      method: 'v60',
      doseIn: row.doseIn,
      waterGrams: row.waterGrams,
      timeSeconds: Math.round((row.timeMin + row.timeMax) / 2),
    }
    return {
      ...defaultBase,
      params,
      rationale: `${row.doseIn}g coffee / ${row.waterGrams}g water (1:${Math.round(row.waterGrams / row.doseIn)}) — target ${Math.floor(row.timeMin / 60)}:${String(row.timeMin % 60).padStart(2, '0')}–${Math.floor(row.timeMax / 60)}:${String(row.timeMax % 60).padStart(2, '0')}`,
      warning,
      grinderRec,
    }
  }

  const row = AEROPRESS_STARTING_POINTS[bean.roastLevel]
  const params: BrewParams = {
    method: 'aeropress',
    doseIn: row.doseIn,
    waterGrams: row.waterGrams,
    timeSeconds: Math.round((row.timeMin + row.timeMax) / 2),
  }
  return {
    ...defaultBase,
    params,
    rationale: `${row.doseIn}g coffee / ${row.waterGrams}g water (1:${Math.round(row.waterGrams / row.doseIn)}) — steep ${row.timeMin}–${row.timeMax}s`,
    warning,
    grinderRec,
  }
}

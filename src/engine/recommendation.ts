import type { Bean, BrewMethod, BrewParams, StartingPoint } from '../types'
import { ESPRESSO_STARTING_POINTS, V60_STARTING_POINTS, AEROPRESS_STARTING_POINTS } from './rules'
import { getFreshness } from './freshness'

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

export function getStartingPoint(bean: Bean, method: BrewMethod, roastDate?: string): StartingPoint {
  const origins = bean.origins ?? []
  const freshnessWarn = roastDate ? getFreshness(roastDate, method, bean.roastLevel, bean.process).warning : undefined
  const oNote = originNote(origins, method)
  const warning = [freshnessWarn, oNote].filter(Boolean).join(' ') || undefined

  if (method === 'espresso') {
    const row = (ESPRESSO_STARTING_POINTS[bean.roastLevel][bean.process] ?? ESPRESSO_STARTING_POINTS[bean.roastLevel]['any'])!
    const doseOut = Math.round(row.doseIn * ((row.multiplierMin + row.multiplierMax) / 2) * 10) / 10
    const params: BrewParams = { method:'espresso', doseIn:row.doseIn, doseOut, timeSeconds:Math.round((row.timeMin+row.timeMax)/2), puckState:null, flowState:null }
    return { params, rationale:`${row.doseIn}g in → ${doseOut}g out (${row.multiplierMin}–${row.multiplierMax}x) in ${row.timeMin}–${row.timeMax}s`, warning:[row.warning,warning].filter(Boolean).join(' ')||undefined }
  }
  if (method === 'v60') {
    const row = V60_STARTING_POINTS[bean.roastLevel]
    const params: BrewParams = { method:'v60', doseIn:row.doseIn, waterGrams:row.waterGrams, timeSeconds:Math.round((row.timeMin+row.timeMax)/2) }
    return { params, rationale:`${row.doseIn}g coffee / ${row.waterGrams}g water (1:${Math.round(row.waterGrams/row.doseIn)}) — target ${Math.floor(row.timeMin/60)}:${String(row.timeMin%60).padStart(2,'0')}–${Math.floor(row.timeMax/60)}:${String(row.timeMax%60).padStart(2,'0')}`, warning }
  }
  const row = AEROPRESS_STARTING_POINTS[bean.roastLevel]
  const params: BrewParams = { method:'aeropress', doseIn:row.doseIn, waterGrams:row.waterGrams, timeSeconds:Math.round((row.timeMin+row.timeMax)/2) }
  return { params, rationale:`${row.doseIn}g coffee / ${row.waterGrams}g water (1:${Math.round(row.waterGrams/row.doseIn)}) — steep ${row.timeMin}–${row.timeMax}s`, warning }
}

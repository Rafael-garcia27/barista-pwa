import type { Bean, BrewMethod, RoastLevel, Process } from '../types'

const ESPRESSO: Record<RoastLevel, Record<Process, number>> = {
  'dark':        { natural: 95, honey: 90, washed: 85 },
  'medium-dark': { natural: 92, honey: 88, washed: 82 },
  'medium':      { natural: 74, honey: 71, washed: 68 },
  'light':       { honey: 48,  natural: 42, washed: 22 },
}
const V60: Record<RoastLevel, Record<Process, number>> = {
  'light':       { washed: 98, natural: 88, honey: 82 },
  'medium':      { washed: 80, honey: 72,   natural: 70 },
  'medium-dark': { washed: 55, honey: 50,   natural: 48 },
  'dark':        { washed: 38, honey: 34,   natural: 32 },
}
const AEROPRESS: Record<RoastLevel, Record<Process, number>> = {
  'light':       { natural: 88, honey: 80, washed: 74 },
  'medium':      { natural: 92, honey: 90, washed: 88 },
  'medium-dark': { natural: 85, honey: 82, washed: 80 },
  'dark':        { natural: 70, honey: 66, washed: 62 },
}
const BASE: Record<BrewMethod, Record<RoastLevel, Record<Process, number>>> = {
  espresso: ESPRESSO, v60: V60, aeropress: AEROPRESS,
}

const ORIGIN_MODIFIERS: Array<{ keywords: string[]; delta: Partial<Record<BrewMethod, number>> }> = [
  { keywords: ['ethiopia','kenya','rwanda','burundi','uganda','tanzania'], delta: { espresso:-6, v60:+8, aeropress:+5 } },
  { keywords: ['brazil'],                                                   delta: { espresso:+8, v60:-5, aeropress:+4 } },
  { keywords: ['indonesia','sumatra','java','sulawesi','flores','papua'],   delta: { espresso:+6, v60:-8, aeropress:+4 } },
  { keywords: ['colombia','guatemala','costa rica','honduras','el salvador','nicaragua','mexico','peru','bolivia','ecuador'], delta: { espresso:+3, v60:+3, aeropress:+2 } },
  { keywords: ['yemen'],                                                    delta: { espresso:-3, v60:+6, aeropress:+5 } },
]

function originDelta(origins: string[], method: BrewMethod): number {
  let total = 0
  for (const { keywords, delta } of ORIGIN_MODIFIERS) {
    if (origins.some(o => keywords.some(k => o.toLowerCase().includes(k)))) total += delta[method] ?? 0
  }
  return total
}

export function getBeanSuitability(bean: Bean, method: BrewMethod): number {
  const base = BASE[method][bean.roastLevel][bean.process]
  return Math.min(100, Math.max(0, base + originDelta(bean.origins, method)))
}

export function sortBeansByMethod(beans: Bean[], method: BrewMethod): Bean[] {
  return [...beans].sort((a, b) => getBeanSuitability(b, method) - getBeanSuitability(a, method))
}

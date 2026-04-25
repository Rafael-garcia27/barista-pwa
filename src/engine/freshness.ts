import type { BrewMethod, RoastLevel, Process } from '../types'

export type FreshnessStage = 'tooFresh' | 'earlyPeak' | 'peak' | 'latePeak' | 'aging' | 'old'

export interface FreshnessResult {
  age: number
  stage: FreshnessStage
  position: number
  label: string
  recommendation: string
  warning?: string
}

type WindowSet = Record<FreshnessStage, [number, number]>

// Research-backed windows (days post-roast) per method × roast level × process.
// Sources: Scott Rao, James Hoffmann, SCA, Cafe Kreyol peer-reviewed study.
// Key findings:
//   - Light roasts degas 3× slower than dark (denser cell structure)
//   - Natural/honey process adds 3-7 days vs washed
//   - Espresso needs more rest than filter (pressure amplifies CO₂ harshness)
const WINDOWS: Record<BrewMethod, Record<RoastLevel, Record<Process, WindowSet>>> = {
  espresso: {
    light: {
      washed:  { tooFresh:[0,7],  earlyPeak:[8,10],  peak:[11,14], latePeak:[15,18], aging:[19,21], old:[22,999] },
      honey:   { tooFresh:[0,5],  earlyPeak:[6,9],   peak:[10,13], latePeak:[14,16], aging:[17,19], old:[20,999] },
      natural: { tooFresh:[0,3],  earlyPeak:[4,8],   peak:[9,13],  latePeak:[14,17], aging:[18,21], old:[22,999] },
    },
    medium: {
      washed:  { tooFresh:[0,5],  earlyPeak:[6,7],   peak:[8,12],  latePeak:[13,15], aging:[16,19], old:[20,999] },
      honey:   { tooFresh:[0,4],  earlyPeak:[5,7],   peak:[8,11],  latePeak:[12,14], aging:[15,18], old:[19,999] },
      natural: { tooFresh:[0,3],  earlyPeak:[4,7],   peak:[8,12],  latePeak:[13,15], aging:[16,19], old:[20,999] },
    },
    'medium-dark': {
      washed:  { tooFresh:[0,3],  earlyPeak:[4,5],   peak:[6,10],  latePeak:[11,13], aging:[14,17], old:[18,999] },
      honey:   { tooFresh:[0,2],  earlyPeak:[3,5],   peak:[6,9],   latePeak:[10,12], aging:[13,16], old:[17,999] },
      natural: { tooFresh:[0,1],  earlyPeak:[2,4],   peak:[5,8],   latePeak:[9,11],  aging:[12,15], old:[16,999] },
    },
    dark: {
      washed:  { tooFresh:[0,1],  earlyPeak:[2,2],   peak:[3,7],   latePeak:[8,10],  aging:[11,15], old:[16,999] },
      honey:   { tooFresh:[0,1],  earlyPeak:[2,2],   peak:[3,6],   latePeak:[7,9],   aging:[10,14], old:[15,999] },
      natural: { tooFresh:[0,0],  earlyPeak:[1,1],   peak:[2,5],   latePeak:[6,8],   aging:[9,12],  old:[13,999] },
    },
  },
  v60: {
    light: {
      washed:  { tooFresh:[0,4],  earlyPeak:[5,7],   peak:[8,14],  latePeak:[15,17], aging:[18,21], old:[22,999] },
      honey:   { tooFresh:[0,3],  earlyPeak:[4,6],   peak:[7,12],  latePeak:[13,15], aging:[16,19], old:[20,999] },
      natural: { tooFresh:[0,2],  earlyPeak:[3,6],   peak:[7,14],  latePeak:[15,18], aging:[19,22], old:[23,999] },
    },
    medium: {
      washed:  { tooFresh:[0,3],  earlyPeak:[4,5],   peak:[6,11],  latePeak:[12,14], aging:[15,18], old:[19,999] },
      honey:   { tooFresh:[0,2],  earlyPeak:[3,5],   peak:[6,10],  latePeak:[11,13], aging:[14,17], old:[18,999] },
      natural: { tooFresh:[0,2],  earlyPeak:[3,5],   peak:[7,12],  latePeak:[13,15], aging:[16,19], old:[20,999] },
    },
    'medium-dark': {
      washed:  { tooFresh:[0,2],  earlyPeak:[3,4],   peak:[5,9],   latePeak:[10,12], aging:[13,16], old:[17,999] },
      honey:   { tooFresh:[0,1],  earlyPeak:[2,4],   peak:[5,8],   latePeak:[9,11],  aging:[12,15], old:[16,999] },
      natural: { tooFresh:[0,1],  earlyPeak:[2,3],   peak:[4,8],   latePeak:[9,11],  aging:[12,15], old:[16,999] },
    },
    dark: {
      washed:  { tooFresh:[0,1],  earlyPeak:[2,3],   peak:[4,8],   latePeak:[9,11],  aging:[12,16], old:[17,999] },
      honey:   { tooFresh:[0,0],  earlyPeak:[1,2],   peak:[3,7],   latePeak:[8,10],  aging:[11,15], old:[16,999] },
      natural: { tooFresh:[0,0],  earlyPeak:[1,2],   peak:[3,6],   latePeak:[7,9],   aging:[10,14], old:[15,999] },
    },
  },
  aeropress: {
    light: {
      washed:  { tooFresh:[0,4],  earlyPeak:[5,7],   peak:[8,13],  latePeak:[14,16], aging:[17,20], old:[21,999] },
      honey:   { tooFresh:[0,3],  earlyPeak:[4,6],   peak:[7,11],  latePeak:[12,14], aging:[15,18], old:[19,999] },
      natural: { tooFresh:[0,2],  earlyPeak:[3,6],   peak:[7,13],  latePeak:[14,17], aging:[18,21], old:[22,999] },
    },
    medium: {
      washed:  { tooFresh:[0,3],  earlyPeak:[4,5],   peak:[6,10],  latePeak:[11,13], aging:[14,17], old:[18,999] },
      honey:   { tooFresh:[0,2],  earlyPeak:[3,5],   peak:[6,9],   latePeak:[10,12], aging:[13,16], old:[17,999] },
      natural: { tooFresh:[0,2],  earlyPeak:[3,4],   peak:[6,11],  latePeak:[12,14], aging:[15,18], old:[19,999] },
    },
    'medium-dark': {
      washed:  { tooFresh:[0,2],  earlyPeak:[3,4],   peak:[5,8],   latePeak:[9,11],  aging:[12,15], old:[16,999] },
      honey:   { tooFresh:[0,1],  earlyPeak:[2,3],   peak:[4,7],   latePeak:[8,10],  aging:[11,14], old:[15,999] },
      natural: { tooFresh:[0,1],  earlyPeak:[2,3],   peak:[4,7],   latePeak:[8,10],  aging:[11,14], old:[15,999] },
    },
    dark: {
      washed:  { tooFresh:[0,1],  earlyPeak:[2,3],   peak:[4,7],   latePeak:[8,10],  aging:[11,15], old:[16,999] },
      honey:   { tooFresh:[0,0],  earlyPeak:[1,2],   peak:[3,6],   latePeak:[7,9],   aging:[10,13], old:[14,999] },
      natural: { tooFresh:[0,0],  earlyPeak:[1,2],   peak:[3,5],   latePeak:[6,8],   aging:[9,12],  old:[13,999] },
    },
  },
}

const STAGE_ORDER: FreshnessStage[] = ['tooFresh', 'earlyPeak', 'peak', 'latePeak', 'aging', 'old']

const LABELS: Record<FreshnessStage, string> = {
  tooFresh: 'Too Fresh', earlyPeak: 'Early Peak', peak: 'Peak',
  latePeak: 'Late Peak', aging: 'Aging', old: 'Old',
}

const RECOMMENDATIONS: Record<FreshnessStage, string> = {
  tooFresh: 'Too fresh — let it rest', earlyPeak: 'Getting there',
  peak: 'Ideal', latePeak: 'Still very good',
  aging: 'Past peak, use soon', old: 'Not recommended',
}

export const FRESHNESS_BADGE_CLASS: Record<FreshnessStage, string> = {
  tooFresh: 'bg-slate-100 text-slate-600', earlyPeak: 'bg-sky-100 text-sky-700',
  peak: 'bg-green-100 text-green-800', latePeak: 'bg-teal-100 text-teal-800',
  aging: 'bg-orange-100 text-orange-800', old: 'bg-red-100 text-red-700',
}

// Decaf beans have almost no CO₂ retention (decaf process opens cellular structure).
// They're ready to brew immediately and reach peak 3 days sooner, but also age faster.
// We model this by advancing the effective age by 3 days before stage lookup.
const DECAF_AGE_SHIFT = 3

export function getFreshness(
  roastDate: string,
  method: BrewMethod,
  roastLevel: RoastLevel = 'medium',
  process: Process = 'washed',
  isDecaf = false,
): FreshnessResult {
  const age = Math.floor((Date.now() - new Date(roastDate).getTime()) / 86_400_000)
  const windows = WINDOWS[method][roastLevel][process]
  const effectiveAge = isDecaf ? age + DECAF_AGE_SHIFT : age
  const stage = STAGE_ORDER.find(s => effectiveAge >= windows[s][0] && effectiveAge <= windows[s][1]) ?? 'old'
  const position = Math.min(1, Math.max(0, effectiveAge / windows.aging[1]))

  let warning: string | undefined
  if (stage === 'tooFresh') {
    if (isDecaf) {
      warning = `Roasted ${age}d ago — decaf is ready from day 1, but this is very fresh. Good to brew now.`
    } else {
      const waitUntil = windows.earlyPeak[0]
      warning = `Only ${age}d old — CO₂ still degassing. Wait until day ${waitUntil}.`
    }
  } else if (stage === 'aging') {
    warning = `${age} days old — flavor fading. Use soon.`
  } else if (stage === 'old') {
    warning = `${age} days old — oils oxidized. Expect flat flavor.`
  }

  return { age, stage, position, label: LABELS[stage], recommendation: RECOMMENDATIONS[stage], warning }
}

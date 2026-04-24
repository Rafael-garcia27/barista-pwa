import type { RoastLevel, Process } from '../types'

interface EspressoRow {
  doseIn: number
  multiplierMin: number
  multiplierMax: number
  timeMin: number
  timeMax: number
  warning?: string
}

interface FilterRow {
  doseIn: number
  waterGrams: number
  timeMin: number
  timeMax: number
}

export const ESPRESSO_STARTING_POINTS: Record<RoastLevel, Partial<Record<Process | 'any', EspressoRow>>> = {
  light: {
    washed: { doseIn: 18, multiplierMin: 2.5, multiplierMax: 3.0, timeMin: 25, timeMax: 35, warning: 'Light washed beans are challenging for espresso — high acidity under pressure. Consider V60.' },
    natural: { doseIn: 18, multiplierMin: 2.2, multiplierMax: 2.8, timeMin: 25, timeMax: 35 },
    honey:   { doseIn: 18, multiplierMin: 2.2, multiplierMax: 2.8, timeMin: 25, timeMax: 35 },
    any:     { doseIn: 18, multiplierMin: 2.5, multiplierMax: 3.0, timeMin: 25, timeMax: 35 },
  },
  medium: {
    washed:  { doseIn: 18, multiplierMin: 2.0, multiplierMax: 2.5, timeMin: 25, timeMax: 32 },
    natural: { doseIn: 18, multiplierMin: 2.0, multiplierMax: 2.5, timeMin: 25, timeMax: 32 },
    honey:   { doseIn: 18, multiplierMin: 2.0, multiplierMax: 2.5, timeMin: 25, timeMax: 32 },
    any:     { doseIn: 18, multiplierMin: 2.0, multiplierMax: 2.5, timeMin: 25, timeMax: 32 },
  },
  'medium-dark': {
    washed:  { doseIn: 18, multiplierMin: 1.9, multiplierMax: 2.3, timeMin: 24, timeMax: 30 },
    natural: { doseIn: 18, multiplierMin: 1.9, multiplierMax: 2.3, timeMin: 24, timeMax: 30 },
    honey:   { doseIn: 18, multiplierMin: 1.9, multiplierMax: 2.3, timeMin: 24, timeMax: 30 },
    any:     { doseIn: 18, multiplierMin: 1.9, multiplierMax: 2.3, timeMin: 24, timeMax: 30 },
  },
  dark: {
    washed:  { doseIn: 18, multiplierMin: 1.8, multiplierMax: 2.2, timeMin: 22, timeMax: 28 },
    natural: { doseIn: 18, multiplierMin: 1.8, multiplierMax: 2.2, timeMin: 22, timeMax: 28 },
    honey:   { doseIn: 18, multiplierMin: 1.8, multiplierMax: 2.2, timeMin: 22, timeMax: 28 },
    any:     { doseIn: 18, multiplierMin: 1.8, multiplierMax: 2.2, timeMin: 22, timeMax: 28 },
  },
}

export const V60_STARTING_POINTS: Record<RoastLevel, FilterRow> = {
  light:       { doseIn: 15, waterGrams: 250, timeMin: 150, timeMax: 210 },
  medium:      { doseIn: 15, waterGrams: 240, timeMin: 150, timeMax: 210 },
  'medium-dark': { doseIn: 16, waterGrams: 240, timeMin: 150, timeMax: 200 },
  dark:        { doseIn: 17, waterGrams: 240, timeMin: 140, timeMax: 190 },
}

export const AEROPRESS_STARTING_POINTS: Record<RoastLevel, FilterRow> = {
  light:       { doseIn: 15, waterGrams: 200, timeMin: 90,  timeMax: 150 },
  medium:      { doseIn: 15, waterGrams: 200, timeMin: 90,  timeMax: 150 },
  'medium-dark': { doseIn: 16, waterGrams: 200, timeMin: 80, timeMax: 120 },
  dark:        { doseIn: 17, waterGrams: 200, timeMin: 60,  timeMax: 100 },
}

export const THRESHOLDS = {
  espresso: { ratioMin: 1.5, ratioMax: 3.5, timeMin: 20, timeMax: 40 },
  v60:      { ratioMin: 14,  ratioMax: 18,  timeMin: 120, timeMax: 240 },
  aeropress: { ratioMin: 8,  ratioMax: 16,  timeMin: 45, timeMax: 240 },
}

import type { Bag, BrewLog } from '../types'

const WASTE_FACTOR = 1.12

export function computeRemainingGrams(bag: Bag, brews: BrewLog[]): number | null {
  if (bag.remainingGrams !== undefined) return bag.remainingGrams
  if (!bag.purchasedGrams) return null
  const used = brews.reduce((sum, b) => sum + b.params.doseIn * WASTE_FACTOR, 0)
  return Math.max(0, bag.purchasedGrams - used)
}

export function isEffectivelyEmpty(remaining: number | null): boolean {
  return remaining !== null && remaining < 15
}

export function remainingLabel(remaining: number): string {
  return `~${Math.round(remaining)}g left`
}

export function remainingColor(remaining: number, purchasedGrams: number): 'green' | 'amber' | 'red' {
  const ratio = remaining / purchasedGrams
  if (ratio > 0.4) return 'green'
  if (ratio > 0.15) return 'amber'
  return 'red'
}

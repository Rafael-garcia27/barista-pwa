export type BrewMethod = 'espresso' | 'v60' | 'aeropress'
export type RoastLevel = 'light' | 'medium' | 'medium-dark' | 'dark'
export type Process = 'washed' | 'natural' | 'honey'
export type TasteTag = 'sour' | 'bitter' | 'watery' | 'flat' | 'harsh'
export type PuckState = 'wet' | 'dry' | 'choked'
export type FlowState = 'choked' | 'fast' | 'uneven' | 'normal'

// Bean = the coffee identity (what the coffee IS — never depletes)
export interface Bean {
  id: string
  name: string
  roaster?: string
  origins: string[]   // one or more for blends
  roastLevel: RoastLevel
  process: Process
  preferredMethod: BrewMethod
  createdAt: string
}

// Bag = one physical purchase of a Bean
export interface Bag {
  id: string
  beanId: string
  roastDate?: string
  purchasedGrams?: number
  remainingGrams?: number   // manual override; auto-decremented with each logged brew
  depleted: boolean
  createdAt: string
}

export interface EspressoParams {
  method: 'espresso'
  doseIn: number
  doseOut: number
  timeSeconds: number
  puckState: PuckState | null
  flowState: FlowState | null
}

export interface V60Params {
  method: 'v60'
  doseIn: number
  waterGrams: number
  timeSeconds: number
}

export interface AeroPressParams {
  method: 'aeropress'
  doseIn: number
  waterGrams: number
  timeSeconds: number
}

export type BrewParams = EspressoParams | V60Params | AeroPressParams

// BrewLog links to a Bag (bag determines which bean and which purchase)
export interface BrewLog {
  id: string
  bagId: string
  params: BrewParams
  rating: 1 | 2 | 3 | 4 | 5
  tasteTags: TasteTag[]
  notes?: string
  isBest: boolean
  createdAt: string
}

export interface Suggestion {
  parameter: string
  direction: 'increase' | 'decrease' | 'adjust'
  reason: string
  tip?: string
}

export interface Diagnosis {
  score: number
  summary: string
  suggestions: Suggestion[]
  warning?: string
}

export interface StartingPoint {
  params: BrewParams
  rationale: string
  warning?: string
}

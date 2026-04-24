import type { BrewMethod, RoastLevel, Process, TasteTag, PuckState, FlowState } from './types'

export const BREW_METHODS: { id: BrewMethod; label: string }[] = [
  { id: 'espresso', label: 'Espresso' },
  { id: 'v60', label: 'V60' },
  { id: 'aeropress', label: 'AeroPress' },
]

export const ROAST_LEVELS: { id: RoastLevel; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'medium', label: 'Medium' },
  { id: 'medium-dark', label: 'Medium Dark' },
  { id: 'dark', label: 'Dark' },
]

export const PROCESSES: { id: Process; label: string }[] = [
  { id: 'washed', label: 'Washed' },
  { id: 'natural', label: 'Natural' },
  { id: 'honey', label: 'Honey' },
]

export const TASTE_TAGS: { id: TasteTag; label: string }[] = [
  { id: 'sour', label: 'Sour' },
  { id: 'bitter', label: 'Bitter' },
  { id: 'watery', label: 'Watery' },
  { id: 'flat', label: 'Flat' },
  { id: 'harsh', label: 'Harsh' },
]

export const PUCK_STATES: { id: PuckState; label: string }[] = [
  { id: 'wet', label: 'Wet' },
  { id: 'dry', label: 'Dry' },
  { id: 'choked', label: 'Choked' },
]

export const FLOW_STATES: { id: FlowState; label: string }[] = [
  { id: 'choked', label: 'Choked (too slow)' },
  { id: 'fast', label: 'Too fast' },
  { id: 'uneven', label: 'Uneven / channeling' },
  { id: 'normal', label: 'Normal' },
]

export const KNOWN_ORIGINS: string[] = [
  'Ethiopia', 'Kenya', 'Rwanda', 'Burundi', 'Uganda', 'Tanzania',
  'Malawi', 'Zambia', 'Zimbabwe', 'Congo', 'Cameroon', 'Mozambique',
  'Brazil', 'Colombia', 'Guatemala', 'Costa Rica', 'Honduras',
  'El Salvador', 'Nicaragua', 'Mexico', 'Peru', 'Bolivia',
  'Panama', 'Ecuador', 'Venezuela', 'Jamaica', 'Haiti', 'Cuba',
  'Indonesia', 'Sumatra', 'Java', 'Sulawesi', 'Flores', 'Papua New Guinea',
  'India', 'Vietnam', 'Thailand', 'Myanmar', 'Laos', 'Philippines',
  'Yemen', 'Hawaii',
]

import type { PokemonType } from '../data/typeChart'

export interface EnemyMove {
  key: string
  type: PokemonType
}

export interface EnemyPokemon {
  key: string
  types: PokemonType[]
  moves: (EnemyMove | null)[]
  selectedSpreadIndex: number
  megaActive?: boolean
  item?: string | null
}

export interface MatchEntry {
  id: string
  date: string           // ISO string
  myIndices: number[]    // 4 (preset actif) ou 6 (toute la team)
  myPresetName?: string
  enemySlots: (EnemyPokemon | null)[]
  result: 'win' | 'loss' | null
  notes: string
}

import pokemonNamesData from '../data/i18n/pokemon.json'
import moveNamesData from '../data/i18n/moves.json'
import pokemonTypesFlatData from '../data/i18n/pokemon-types-flat.json'
import movesMetaData from '../data/moves.json'
import type { PokemonType } from '../data/typeChart'

type MovesMeta = Record<string, { type: string; power: number | null }>
const MOVES_META = movesMetaData as MovesMeta

export type Lang = 'en' | 'fr'

type NameEntry = { en: string; fr: string }

const POKEMON_NAMES = pokemonNamesData as Record<string, NameEntry>
const MOVE_NAMES    = moveNamesData    as Record<string, NameEntry>

export const POKEMON_TYPES_FLAT = pokemonTypesFlatData as Record<string, PokemonType[]>
export const ALL_POKEMON_KEYS   = Object.keys(POKEMON_TYPES_FLAT)

function formatKey(key: string): string {
  return key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function pokemonName(key: string, lang: Lang): string {
  const entry = POKEMON_NAMES[key]
  return entry?.[lang] ?? entry?.en ?? formatKey(key)
}

export function moveName(key: string, lang: Lang): string {
  const entry = MOVE_NAMES[key]
  return entry?.[lang] ?? entry?.en ?? formatKey(key)
}

export function searchMove(query: string): string[] {
  if (query.length < 2) return []
  const q = query.toLowerCase()
  const normalized = q.replace(/\s+/g, '-')

  return Object.keys(MOVE_NAMES)
    .filter(k => {
      if (!MOVES_META[k]) return false
      const names = MOVE_NAMES[k]
      return k.includes(normalized)
        || names?.en?.toLowerCase().includes(q)
        || names?.fr?.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const score = (k: string) => {
        if (k.startsWith(normalized)) return 0
        const n = MOVE_NAMES[k]
        if (n?.en?.toLowerCase().startsWith(q) || n?.fr?.toLowerCase().startsWith(q)) return 1
        return 2
      }
      const diff = score(a) - score(b)
      return diff !== 0 ? diff : a.localeCompare(b)
    })
    .slice(0, 8)
}

export function searchPokemon(query: string): string[] {
  if (query.length < 2) return []
  const q = query.toLowerCase()
  const normalized = q.replace(/\s+/g, '-')

  return ALL_POKEMON_KEYS
    .filter(k => {
      const names = POKEMON_NAMES[k]
      return k.includes(normalized)
        || names?.en?.toLowerCase().includes(q)
        || names?.fr?.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const score = (k: string) => {
        if (k.startsWith(normalized)) return 0
        const n = POKEMON_NAMES[k]
        if (n?.en?.toLowerCase().startsWith(q) || n?.fr?.toLowerCase().startsWith(q)) return 1
        return 2
      }
      const diff = score(a) - score(b)
      return diff !== 0 ? diff : a.localeCompare(b)
    })
    .slice(0, 8)
}

import type { PokemonType } from '../data/typeChart'
import pokemonData from '../data/pokemon.json'
import movesData from '../data/moves.json'
import megaStonesData from '../data/mega-stones.json'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedMove {
  rawName: string
  normalizedName: string   // lowercase, spaces → hyphens (PokeAPI key)
  type: PokemonType | null // null if move not found in moves.json
  power: number | null     // null = status/non-damaging move
}

export interface EVSpread {
  hp: number; atk: number; def: number; spa: number; spd: number; spe: number
}

export interface ParsedPokemon {
  rawName: string
  normalizedName: string   // PokeAPI key (e.g. "charizard")
  item: string | null      // normalized item name (e.g. "charizardite-y")
  rawItem: string | null
  ability: string | null
  level: number
  moves: ParsedMove[]
  // Resolved types (base form by default)
  types: PokemonType[]
  // Mega form, if item is a known mega stone
  megaForm: string | null
  megaTypes: PokemonType[] | null
  // Competitive data
  evs: EVSpread
  nature: string | null  // lowercase, e.g. "timid"
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

function normalizeName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-')
}

function normalizeMoveName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-')
}

// ---------------------------------------------------------------------------
// Data lookups
// ---------------------------------------------------------------------------

type PokemonEntry = {
  types: string[]
  megaForms?: Record<string, { types: string[] }>
}

const pokemon = pokemonData as Record<string, PokemonEntry>
const moves = movesData as Record<string, { type: string; power: number | null }>
const megaStones = megaStonesData as Record<string, string>

// Showdown exports gendered forms as "-M" / "-F" (e.g. "Basculegion-F").
// Translate to PokeAPI convention ("-male" / "-female") if the target key exists.
function resolveShowdownGender(name: string): string {
  if (name.endsWith('-f') && pokemon[name.slice(0, -2) + '-female']) return name.slice(0, -2) + '-female'
  if (name.endsWith('-m') && pokemon[name.slice(0, -2) + '-male'])   return name.slice(0, -2) + '-male'
  return name
}

function lookupPokemonTypes(normalizedName: string): PokemonType[] | null {
  const entry = pokemon[normalizedName]
  if (!entry) return null
  return entry.types as PokemonType[]
}

function lookupMegaForm(
  normalizedPokemonName: string,
  normalizedItemName: string,
): { megaForm: string; megaTypes: PokemonType[] } | null {
  const entry = pokemon[normalizedPokemonName]
  if (!entry?.megaForms) return null

  // Try to find a mega form name that matches the pokemon + item pattern
  // e.g. pokemon "charizard" + item "charizardite-y" → form "charizard-mega-y"
  for (const [formName, formData] of Object.entries(entry.megaForms)) {
    // Simple heuristic: if the item name contains "-x" and the form is "-mega-x", match
    const itemSuffix = normalizedItemName.match(/-(x|y)$/)?.[1]
    const formSuffix = formName.match(/-mega-(x|y)$/)?.[1]

    if (itemSuffix && formSuffix) {
      if (itemSuffix === formSuffix) {
        return { megaForm: formName, megaTypes: formData.types as PokemonType[] }
      }
    } else if (!itemSuffix && !formSuffix) {
      // Single mega form, no X/Y variant
      return { megaForm: formName, megaTypes: formData.types as PokemonType[] }
    }
  }

  return null
}

function lookupMove(normalizedMoveName: string): { type: PokemonType | null; power: number | null } {
  const entry = moves[normalizedMoveName]
  if (!entry) return { type: null, power: null }
  return { type: entry.type as PokemonType, power: entry.power }
}

// ---------------------------------------------------------------------------
// Block parser
// ---------------------------------------------------------------------------

function parseBlock(lines: string[]): ParsedPokemon | null {
  const nonEmpty = lines.filter(l => l.trim())
  if (nonEmpty.length === 0) return null

  // First line: "Name @ Item" or just "Name"
  const firstLine = nonEmpty[0]
  let rawName: string
  let rawItem: string | null = null

  const atIndex = firstLine.indexOf(' @ ')
  if (atIndex !== -1) {
    rawName = firstLine.slice(0, atIndex).trim()
    rawItem = firstLine.slice(atIndex + 3).trim()
  } else {
    rawName = firstLine.trim()
  }

  // Strip "-mega", "-mega-x", "-mega-y" suffixes from the name if present.
  // Showdown sometimes exports "Gengar-Mega @ Gengarite" — we resolve the Mega
  // form through the item anyway, so the base name is what we need for lookup.
  const normalizedName = resolveShowdownGender(
    normalizeName(rawName.replace(/\s*\(([MF])\)/i, '-$1')).replace(/-mega(-[xy])?$/, '')
  )
  const normalizedItem = rawItem ? normalizeName(rawItem) : null

  let ability: string | null = null
  let level = 50
  const moveNames: string[] = []
  let nature: string | null = null
  const evs: EVSpread = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }

  const EV_STAT: Record<string, keyof EVSpread> = {
    HP: 'hp', Atk: 'atk', Def: 'def', SpA: 'spa', SpD: 'spd', Spe: 'spe',
  }

  for (const line of nonEmpty.slice(1)) {
    const trimmed = line.trim()

    if (trimmed.startsWith('- ')) {
      moveNames.push(trimmed.slice(2).trim())
    } else if (trimmed.startsWith('Ability:')) {
      ability = trimmed.slice(8).trim()
    } else if (trimmed.startsWith('Level:')) {
      level = parseInt(trimmed.slice(6).trim(), 10) || 50
    } else if (trimmed.startsWith('EVs:')) {
      for (const part of trimmed.slice(4).split('/')) {
        const m = part.trim().match(/^(\d+)\s+(\w+)$/)
        if (m) {
          const stat = EV_STAT[m[2]]
          if (stat) evs[stat] = parseInt(m[1], 10)
        }
      }
    } else if (trimmed.endsWith(' Nature')) {
      nature = trimmed.slice(0, -7).trim().toLowerCase()
    }
  }

  const parsedMoves: ParsedMove[] = moveNames.map(rawMoveName => {
    const normalizedMoveName = normalizeMoveName(rawMoveName)
    const { type, power } = lookupMove(normalizedMoveName)
    return { rawName: rawMoveName, normalizedName: normalizedMoveName, type, power }
  })

  const types = lookupPokemonTypes(normalizedName)
  if (!types) {
    console.warn(`[parser] Unknown Pokemon: "${rawName}" (normalized: "${normalizedName}")`)
  }

  const isMegaStone = normalizedItem !== null && normalizedItem in megaStones
  const megaResolved = isMegaStone
    ? lookupMegaForm(normalizedName, normalizedItem!)
    : null

  return {
    rawName,
    normalizedName,
    item: normalizedItem,
    rawItem,
    ability,
    level,
    moves: parsedMoves,
    types: types ?? [],
    megaForm: megaResolved?.megaForm ?? null,
    megaTypes: megaResolved?.megaTypes ?? null,
    evs,
    nature,
  }
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parses a Pokémon Showdown team paste and returns up to 6 ParsedPokemon.
 *
 * Handles both blank-line-separated and compact (no blank lines) formats.
 */
export function parseShowdownPaste(paste: string): ParsedPokemon[] {
  const lines = paste.split('\n').map(l => l.trimEnd())

  // Split into blocks: a new block starts when we see a non-empty line that is
  // NOT a metadata line (Ability/Level/EVs/IVs/Nature) and NOT a move line (- ...)
  const blocks: string[][] = []
  let current: string[] = []

  const isNewPokemonLine = (line: string) => {
    const t = line.trim()
    if (!t) return false
    if (t.startsWith('- ')) return false
    if (/^(Ability|Level|EVs|IVs):/i.test(t)) return false
    if (/Nature$/i.test(t)) return false
    // Heuristic: contains a capital letter at start and no leading spaces
    return /^[A-Z]/.test(t)
  }

  for (const line of lines) {
    if (isNewPokemonLine(line) && current.length > 0) {
      blocks.push(current)
      current = [line]
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) blocks.push(current)

  return blocks
    .map(parseBlock)
    .filter((p): p is ParsedPokemon => p !== null)
    .slice(0, 6)
}

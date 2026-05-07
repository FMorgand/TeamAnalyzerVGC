import { ALL_TYPES, typeChart, getDefensiveProfile, getDefensiveMultiplier } from '../data/typeChart'
import type { PokemonType } from '../data/typeChart'
import type { ParsedPokemon } from './parseShowdown'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DefensiveProfile {
  pokemon: ParsedPokemon
  weaknesses: PokemonType[]    // ×2 or ×4
  immunities: PokemonType[]    // ×0
  resistances: PokemonType[]   // <1
  // Same for mega form (null if no mega)
  megaWeaknesses: PokemonType[] | null
  megaImmunities: PokemonType[] | null
  megaResistances: PokemonType[] | null
}

export interface CoveringMove {
  moveName: string     // raw move name from paste
  pokemonName: string  // raw Pokemon name
  moveType: PokemonType
  power: number
  multiplier: number   // effectiveness against the defending type (1, 2, or 4)
}

export interface OffensiveCoverage {
  covered: PokemonType[]
  uncovered: PokemonType[]
  byType: Partial<Record<PokemonType, CoveringMove[]>>       // ×2 or ×4 moves per defending type
  neutralByType: Partial<Record<PokemonType, CoveringMove[]>> // ×1 moves per defending type
}

export interface SwitchInCandidate {
  pokemon: ParsedPokemon
  sharedWeaknesses: PokemonType[]   // weaknesses shared with the active pokemon
  resistanceBonuses: PokemonType[]  // active's weaknesses that this pokemon resists/ignores
  score: number  // lower = better (shared weaknesses count)
  bonus: number  // higher = better (resistance bonus count)
}

// ---------------------------------------------------------------------------
// 1. Defensive profiles
// ---------------------------------------------------------------------------

export function getTeamDefensiveProfiles(team: ParsedPokemon[]): DefensiveProfile[] {
  return team.map(pokemon => {
    const base = getDefensiveProfile(pokemon.types)

    let megaWeaknesses = null
    let megaImmunities = null
    let megaResistances = null

    if (pokemon.megaTypes) {
      const mega = getDefensiveProfile(pokemon.megaTypes)
      megaWeaknesses = mega.weaknesses
      megaImmunities = mega.immunities
      megaResistances = mega.resistances
    }

    return {
      pokemon,
      weaknesses: base.weaknesses,
      immunities: base.immunities,
      resistances: base.resistances,
      megaWeaknesses,
      megaImmunities,
      megaResistances,
    }
  })
}

// ---------------------------------------------------------------------------
// 2. Offensive coverage
// ---------------------------------------------------------------------------

/**
 * For each of the 18 defending types, finds all team moves that are super effective (×2 or ×4)
 * against that type. A type is "covered" if at least one such move exists.
 */
export function getOffensiveCoverage(team: ParsedPokemon[]): OffensiveCoverage {
  // Collect all damaging moves across the team (without defending-type context yet)
  type RawMove = { moveName: string; pokemonName: string; moveType: PokemonType; power: number }
  const damagingMoves: RawMove[] = []
  for (const pokemon of team) {
    for (const move of pokemon.moves) {
      if (move.type !== null && move.power !== null && move.power > 0) {
        damagingMoves.push({ moveName: move.rawName, pokemonName: pokemon.rawName, moveType: move.type, power: move.power })
      }
    }
  }

  const byType: Partial<Record<PokemonType, CoveringMove[]>> = {}
  const neutralByType: Partial<Record<PokemonType, CoveringMove[]>> = {}

  for (const defendingType of ALL_TYPES) {
    const superEffective: CoveringMove[] = damagingMoves
      .filter(m => typeChart[m.moveType][defendingType] >= 2)
      .map(m => ({ ...m, multiplier: typeChart[m.moveType][defendingType] }))
    if (superEffective.length > 0) byType[defendingType] = superEffective

    const neutral: CoveringMove[] = damagingMoves
      .filter(m => typeChart[m.moveType][defendingType] === 1)
      .map(m => ({ ...m, multiplier: 1 }))
    if (neutral.length > 0) neutralByType[defendingType] = neutral
  }

  const covered = ALL_TYPES.filter(t => t in byType)
  const uncovered = ALL_TYPES.filter(t => !(t in byType))

  return { covered, uncovered, byType, neutralByType }
}

// ---------------------------------------------------------------------------
// 3. Switch-in ranking
// ---------------------------------------------------------------------------

/**
 * Given an active Pokemon, ranks the rest of the team as switch-in candidates.
 *
 * Scoring:
 * - Primary (lower = better): number of weaknesses shared with the active Pokemon
 * - Secondary bonus (higher = better): number of the active Pokemon's weaknesses
 *   that this candidate resists (×0.5 or less) or ignores (×0)
 *
 * @param useActiveMega - whether to use the Mega form for the active Pokemon's analysis
 *   (candidates always use their Mega form if available)
 */
export function rankSwitchIns(
  activePokemon: ParsedPokemon,
  team: ParsedPokemon[],
  useActiveMega = false,
): SwitchInCandidate[] {
  const activeTypes =
    useActiveMega && activePokemon.megaTypes
      ? activePokemon.megaTypes
      : activePokemon.types
  const activeProfile = getDefensiveProfile(activeTypes)

  const candidates = team.filter(p => p !== activePokemon)

  return candidates
    .map(pokemon => {
      const candidateTypes = pokemon.megaTypes ?? pokemon.types
      const candidateProfile = getDefensiveProfile(candidateTypes)
      const candidateWeaknessSet = new Set(candidateProfile.weaknesses)

      // Weaknesses shared between active and candidate
      const sharedWeaknesses = activeProfile.weaknesses.filter(t =>
        candidateWeaknessSet.has(t),
      )

      // For each of the active's weaknesses: does the candidate resist or ignore it?
      const resistanceBonuses = activeProfile.weaknesses.filter(t => {
        const mult = getDefensiveMultiplier(t, candidateTypes)
        return mult < 1 // includes ×0.5 and ×0 (immune)
      })

      return {
        pokemon,
        sharedWeaknesses,
        resistanceBonuses,
        score: sharedWeaknesses.length,
        bonus: resistanceBonuses.length,
      }
    })
    .sort((a, b) => {
      // Primary: fewer shared weaknesses is better
      if (a.score !== b.score) return a.score - b.score
      // Tiebreak: more resistance bonuses is better
      return b.bonus - a.bonus
    })
}

// ---------------------------------------------------------------------------
// 4. Team composition analysis
// ---------------------------------------------------------------------------

export interface CompositionMoveHit {
  moveName: string
  moveType: PokemonType
  isStab: boolean
  power: number
  multiplier: number  // 2 or 4 against the defending type
  pokemonName: string
}

export interface PokemonCompositionData {
  pokemon: ParsedPokemon
  quadWeaknesses: PokemonType[]
  doubleWeaknesses: PokemonType[]
  /** Defending types this Pokemon can hit ×2 or ×4, sorted by (multiplier desc, isStab desc, power desc) */
  offensiveByType: Partial<Record<PokemonType, CompositionMoveHit[]>>
}

export interface GroupCompositionData {
  /** Types where ≥1 selected Pokemon is weak, sorted by weakCount desc */
  defensiveExposure: {
    type: PokemonType
    weakNames: string[]
    coveringNames: string[]  // Pokemon that resist (×0.5 or ×0) this type
  }[]
  /** Union of all SE hits from the group, best hit per type at index 0 */
  offensiveByType: Partial<Record<PokemonType, CompositionMoveHit[]>>
  uncoveredTypes: PokemonType[]
}

function sortHits(hits: CompositionMoveHit[]): CompositionMoveHit[] {
  return hits.sort((a, b) => {
    if (a.multiplier !== b.multiplier) return b.multiplier - a.multiplier
    if (a.isStab !== b.isStab) return a.isStab ? -1 : 1
    return b.power - a.power
  })
}

export function getPokemonCompositionData(pokemon: ParsedPokemon): PokemonCompositionData {
  const quadWeaknesses = ALL_TYPES.filter(t => getDefensiveMultiplier(t, pokemon.types) >= 4)
  const doubleWeaknesses = ALL_TYPES.filter(t => getDefensiveMultiplier(t, pokemon.types) === 2)

  const damagingMoves = pokemon.moves.filter(
    m => m.type !== null && m.power !== null && m.power > 0,
  )

  const offensiveByType: Partial<Record<PokemonType, CompositionMoveHit[]>> = {}

  for (const defendingType of ALL_TYPES) {
    const hits: CompositionMoveHit[] = damagingMoves
      .filter(m => typeChart[m.type!][defendingType] >= 2)
      .map(m => ({
        moveName: m.rawName,
        moveType: m.type!,
        isStab: pokemon.types.includes(m.type!),
        power: m.power!,
        multiplier: typeChart[m.type!][defendingType],
        pokemonName: pokemon.rawName,
      }))

    if (hits.length > 0) offensiveByType[defendingType] = sortHits(hits)
  }

  return { pokemon, quadWeaknesses, doubleWeaknesses, offensiveByType }
}

export function getGroupCompositionData(selected: ParsedPokemon[]): GroupCompositionData {
  const defensiveExposure: GroupCompositionData['defensiveExposure'] = []

  for (const type of ALL_TYPES) {
    const weakNames: string[] = []
    const coveringNames: string[] = []

    for (const pokemon of selected) {
      const mult = getDefensiveMultiplier(type, pokemon.types)
      if (mult > 1) weakNames.push(pokemon.rawName)
      else if (mult < 1) coveringNames.push(pokemon.rawName)
    }

    if (weakNames.length > 0) defensiveExposure.push({ type, weakNames, coveringNames })
  }

  defensiveExposure.sort((a, b) => b.weakNames.length - a.weakNames.length)

  const offensiveByType: Partial<Record<PokemonType, CompositionMoveHit[]>> = {}

  for (const pokemon of selected) {
    const data = getPokemonCompositionData(pokemon)
    for (const type of ALL_TYPES) {
      const hits = data.offensiveByType[type]
      if (hits && hits.length > 0) {
        if (!offensiveByType[type]) offensiveByType[type] = []
        offensiveByType[type]!.push(...hits)
      }
    }
  }

  for (const type of ALL_TYPES) {
    const hits = offensiveByType[type]
    if (hits) sortHits(hits)
  }

  const uncoveredTypes = ALL_TYPES.filter(t => !offensiveByType[t])

  return { defensiveExposure, offensiveByType, uncoveredTypes }
}

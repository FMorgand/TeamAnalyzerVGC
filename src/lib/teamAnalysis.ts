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
}

export interface OffensiveCoverage {
  covered: PokemonType[]
  uncovered: PokemonType[]
  byType: Partial<Record<PokemonType, CoveringMove[]>>
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
  // Collect all damaging moves across the team
  const damagingMoves: CoveringMove[] = []
  for (const pokemon of team) {
    for (const move of pokemon.moves) {
      if (move.type !== null && move.power !== null && move.power > 0) {
        damagingMoves.push({ moveName: move.rawName, pokemonName: pokemon.rawName, moveType: move.type })
      }
    }
  }

  const byType: Partial<Record<PokemonType, CoveringMove[]>> = {}

  for (const defendingType of ALL_TYPES) {
    const superEffective = damagingMoves.filter(m => typeChart[m.moveType][defendingType] >= 2)
    if (superEffective.length > 0) {
      byType[defendingType] = superEffective
    }
  }

  const covered = ALL_TYPES.filter(t => t in byType)
  const uncovered = ALL_TYPES.filter(t => !(t in byType))

  return { covered, uncovered, byType }
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

/**
 * Type effectiveness chart — Gen 9 (unchanged from Gen 6+)
 *
 * typeChart[attackingType][defendingType] = multiplier
 * Multipliers: 0 (immune), 0.5 (resistant), 1 (neutral), 2 (super effective)
 */

export type PokemonType =
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice'
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug'
  | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy'

export const ALL_TYPES: PokemonType[] = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
]

// typeChart[attacking][defending] = multiplier
export const typeChart: Record<PokemonType, Record<PokemonType, number>> = {
  normal: {
    normal: 1, fire: 1, water: 1, electric: 1, grass: 1, ice: 1,
    fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 1,
    rock: 0.5, ghost: 0, dragon: 1, dark: 1, steel: 0.5, fairy: 1,
  },
  fire: {
    normal: 1, fire: 0.5, water: 0.5, electric: 1, grass: 2, ice: 2,
    fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 2,
    rock: 0.5, ghost: 1, dragon: 0.5, dark: 1, steel: 2, fairy: 1,
  },
  water: {
    normal: 1, fire: 2, water: 0.5, electric: 1, grass: 0.5, ice: 1,
    fighting: 1, poison: 1, ground: 2, flying: 1, psychic: 1, bug: 1,
    rock: 2, ghost: 1, dragon: 0.5, dark: 1, steel: 1, fairy: 1,
  },
  electric: {
    normal: 1, fire: 1, water: 2, electric: 0.5, grass: 0.5, ice: 1,
    fighting: 1, poison: 1, ground: 0, flying: 2, psychic: 1, bug: 1,
    rock: 1, ghost: 1, dragon: 0.5, dark: 1, steel: 1, fairy: 1,
  },
  grass: {
    normal: 1, fire: 0.5, water: 2, electric: 1, grass: 0.5, ice: 1,
    fighting: 1, poison: 0.5, ground: 2, flying: 0.5, psychic: 1, bug: 0.5,
    rock: 2, ghost: 1, dragon: 0.5, dark: 1, steel: 0.5, fairy: 1,
  },
  ice: {
    normal: 1, fire: 0.5, water: 0.5, electric: 1, grass: 2, ice: 0.5,
    fighting: 1, poison: 1, ground: 2, flying: 2, psychic: 1, bug: 1,
    rock: 1, ghost: 1, dragon: 2, dark: 1, steel: 0.5, fairy: 1,
  },
  fighting: {
    normal: 2, fire: 1, water: 1, electric: 1, grass: 1, ice: 2,
    fighting: 1, poison: 0.5, ground: 1, flying: 0.5, psychic: 0.5, bug: 0.5,
    rock: 2, ghost: 0, dragon: 1, dark: 2, steel: 2, fairy: 0.5,
  },
  poison: {
    normal: 1, fire: 1, water: 1, electric: 1, grass: 2, ice: 1,
    fighting: 1, poison: 0.5, ground: 0.5, flying: 1, psychic: 1, bug: 1,
    rock: 0.5, ghost: 0.5, dragon: 1, dark: 1, steel: 0, fairy: 2,
  },
  ground: {
    normal: 1, fire: 2, water: 1, electric: 2, grass: 0.5, ice: 1,
    fighting: 1, poison: 2, ground: 1, flying: 0, psychic: 1, bug: 0.5,
    rock: 2, ghost: 1, dragon: 1, dark: 1, steel: 2, fairy: 1,
  },
  flying: {
    normal: 1, fire: 1, water: 1, electric: 0.5, grass: 2, ice: 1,
    fighting: 2, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 2,
    rock: 0.5, ghost: 1, dragon: 1, dark: 1, steel: 0.5, fairy: 1,
  },
  psychic: {
    normal: 1, fire: 1, water: 1, electric: 1, grass: 1, ice: 1,
    fighting: 2, poison: 2, ground: 1, flying: 1, psychic: 0.5, bug: 1,
    rock: 1, ghost: 1, dragon: 1, dark: 0, steel: 0.5, fairy: 1,
  },
  bug: {
    normal: 1, fire: 0.5, water: 1, electric: 1, grass: 2, ice: 1,
    fighting: 0.5, poison: 0.5, ground: 1, flying: 0.5, psychic: 2, bug: 1,
    rock: 1, ghost: 0.5, dragon: 1, dark: 2, steel: 0.5, fairy: 0.5,
  },
  rock: {
    normal: 1, fire: 2, water: 1, electric: 1, grass: 1, ice: 2,
    fighting: 0.5, poison: 1, ground: 0.5, flying: 2, psychic: 1, bug: 2,
    rock: 1, ghost: 1, dragon: 1, dark: 1, steel: 0.5, fairy: 1,
  },
  ghost: {
    normal: 0, fire: 1, water: 1, electric: 1, grass: 1, ice: 1,
    fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 2, bug: 1,
    rock: 1, ghost: 2, dragon: 1, dark: 0.5, steel: 1, fairy: 1,
  },
  dragon: {
    normal: 1, fire: 1, water: 1, electric: 1, grass: 1, ice: 1,
    fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 1,
    rock: 1, ghost: 1, dragon: 2, dark: 1, steel: 0.5, fairy: 0,
  },
  dark: {
    normal: 1, fire: 1, water: 1, electric: 1, grass: 1, ice: 1,
    fighting: 0.5, poison: 1, ground: 1, flying: 1, psychic: 2, bug: 1,
    rock: 1, ghost: 2, dragon: 1, dark: 0.5, steel: 0.5, fairy: 0.5,
  },
  steel: {
    normal: 1, fire: 0.5, water: 0.5, electric: 0.5, grass: 1, ice: 2,
    fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 1,
    rock: 2, ghost: 1, dragon: 1, dark: 1, steel: 0.5, fairy: 2,
  },
  fairy: {
    normal: 1, fire: 0.5, water: 1, electric: 1, grass: 1, ice: 1,
    fighting: 2, poison: 0.5, ground: 1, flying: 1, psychic: 1, bug: 1,
    rock: 1, ghost: 1, dragon: 2, dark: 2, steel: 0.5, fairy: 1,
  },
}

/**
 * Returns the combined defensive multiplier for a Pokemon with the given types
 * against an attacking type.
 */
export function getDefensiveMultiplier(
  attackingType: PokemonType,
  defendingTypes: PokemonType[],
): number {
  return defendingTypes.reduce(
    (mult, defType) => mult * typeChart[attackingType][defType],
    1,
  )
}

/**
 * Returns the defensive profile of a Pokemon:
 * - weaknesses: attacking types that deal >1x damage
 * - immunities: attacking types that deal 0x damage
 * - resistances: attacking types that deal <1x damage
 */
export function getDefensiveProfile(types: PokemonType[]) {
  const weaknesses: PokemonType[] = []
  const immunities: PokemonType[] = []
  const resistances: PokemonType[] = []

  for (const attackingType of ALL_TYPES) {
    const mult = getDefensiveMultiplier(attackingType, types)
    if (mult === 0) immunities.push(attackingType)
    else if (mult > 1) weaknesses.push(attackingType)
    else if (mult < 1) resistances.push(attackingType)
  }

  return { weaknesses, immunities, resistances }
}

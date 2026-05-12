import pokemonData from '../data/pokemon.json'

type PokemonEntry = {
  sprite?: string | null
  megaForms?: Record<string, { sprite?: string | null }>
}

const pokemon = pokemonData as Record<string, PokemonEntry>

function toOfficialArtwork(battleSpriteUrl: string): string {
  return battleSpriteUrl.replace(
    '/sprites/pokemon/',
    '/sprites/pokemon/other/official-artwork/',
  )
}

export function getSpriteUrl(normalizedName: string): string | null {
  const entry = pokemon[normalizedName]
  if (entry?.sprite) return toOfficialArtwork(entry.sprite)
  // Fallback for gender-differentiated species without explicit gender (e.g. "indeedee" → "indeedee-male")
  const maleEntry = pokemon[normalizedName + '-male']
  if (maleEntry?.sprite) return toOfficialArtwork(maleEntry.sprite)
  return null
}

export function getMegaSpriteUrl(normalizedName: string, megaFormName: string): string | null {
  const megaEntry = pokemon[normalizedName]?.megaForms?.[megaFormName]
  if (!megaEntry?.sprite) return null
  return toOfficialArtwork(megaEntry.sprite)
}

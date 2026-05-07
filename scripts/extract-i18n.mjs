import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSV_DIR = join(__dirname, 'pokeapi-csv')
const DATA_DIR = join(__dirname, '..', 'src', 'data')

const FR = '5'
const EN = '9'

// ─── CSV parser (handles quoted fields) ───────────────────────────────────────

function parseCSV(filename) {
  const raw = readFileSync(join(CSV_DIR, filename), 'utf8').replace(/\r/g, '')
  const lines = raw.trim().split('\n')
  const headers = lines[0].split(',')

  return lines.slice(1).map(line => {
    const values = []
    let current = ''
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { values.push(current); current = '' }
      else { current += ch }
    }
    values.push(current)

    const obj = {}
    headers.forEach((h, i) => { obj[h.trim()] = (values[i] ?? '').trim() })
    return obj
  })
}

// ─── 1. Pokémon species  ──────────────────────────────────────────────────────

const speciesById = new Map()   // id → identifier
for (const row of parseCSV('pokemon_species.csv')) {
  speciesById.set(row.id, row.identifier)
}

const speciesNames = new Map()  // identifier → { en, fr }
for (const row of parseCSV('pokemon_species_names.csv')) {
  if (row.local_language_id !== EN && row.local_language_id !== FR) continue
  const identifier = speciesById.get(row.pokemon_species_id)
  if (!identifier) continue
  if (!speciesNames.has(identifier)) speciesNames.set(identifier, {})
  const entry = speciesNames.get(identifier)
  if (row.local_language_id === EN) entry.en = row.name
  if (row.local_language_id === FR) entry.fr = row.name
}

// ─── 2. Pokémon forms ─────────────────────────────────────────────────────────

const formById = new Map()      // id → identifier
for (const row of parseCSV('pokemon_forms.csv')) {
  formById.set(row.id, row.identifier)
}

const formNames = new Map()     // identifier → { en, fr }
for (const row of parseCSV('pokemon_form_names.csv')) {
  if (row.local_language_id !== EN && row.local_language_id !== FR) continue
  const identifier = formById.get(row.pokemon_form_id)
  if (!identifier) continue
  // pokemon_name = full localized name (e.g. "Méga-Dracaufeu X"), prefer over form_name
  const name = row.pokemon_name || row.form_name
  if (!name) continue
  if (!formNames.has(identifier)) formNames.set(identifier, {})
  const entry = formNames.get(identifier)
  if (row.local_language_id === EN) entry.en = name
  if (row.local_language_id === FR) entry.fr = name
}

// ─── 3. Moves ─────────────────────────────────────────────────────────────────

const moveById = new Map()      // id → identifier
for (const row of parseCSV('moves.csv')) {
  moveById.set(row.id, row.identifier)
}

const moveNames = new Map()     // identifier → { en, fr }
for (const row of parseCSV('move_names.csv')) {
  if (row.local_language_id !== EN && row.local_language_id !== FR) continue
  const identifier = moveById.get(row.move_id)
  if (!identifier) continue
  if (!moveNames.has(identifier)) moveNames.set(identifier, {})
  const entry = moveNames.get(identifier)
  if (row.local_language_id === EN) entry.en = row.name
  if (row.local_language_id === FR) entry.fr = row.name
}

// ─── 4. Generate output ───────────────────────────────────────────────────────

function fallbackName(key) {
  return key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function resolvePokemon(key) {
  // Try exact species match, then form match, then fallback
  const names = speciesNames.get(key) ?? formNames.get(key) ?? {}
  return {
    en: names.en || fallbackName(key),
    fr: names.fr || names.en || fallbackName(key),
  }
}

function resolveMove(key) {
  const names = moveNames.get(key) ?? {}
  return {
    en: names.en || fallbackName(key),
    fr: names.fr || names.en || fallbackName(key),
  }
}

const pokemonData = JSON.parse(readFileSync(join(DATA_DIR, 'pokemon.json'), 'utf8'))
const movesData   = JSON.parse(readFileSync(join(DATA_DIR, 'moves.json'), 'utf8'))

// Collect all keys: top-level + nested megaForms
const allPokemonKeys = new Set()
for (const [key, value] of Object.entries(pokemonData)) {
  allPokemonKeys.add(key)
  if (value.megaForms) {
    for (const megaKey of Object.keys(value.megaForms)) {
      allPokemonKeys.add(megaKey)
    }
  }
}

const pokemonI18n = {}
let pokemonFallbacks = 0
for (const key of allPokemonKeys) {
  const entry = resolvePokemon(key)
  pokemonI18n[key] = entry
  if (entry.fr === fallbackName(key)) pokemonFallbacks++
}

const movesI18n = {}
let moveFallbacks = 0
for (const key of Object.keys(movesData)) {
  const entry = resolveMove(key)
  movesI18n[key] = entry
  if (entry.fr === fallbackName(key)) moveFallbacks++
}

mkdirSync(join(DATA_DIR, 'i18n'), { recursive: true })
writeFileSync(join(DATA_DIR, 'i18n', 'pokemon.json'), JSON.stringify(pokemonI18n, null, 2))
writeFileSync(join(DATA_DIR, 'i18n', 'moves.json'),   JSON.stringify(movesI18n,   null, 2))

console.log(`✓ Pokémon : ${Object.keys(pokemonI18n).length} entrées (${pokemonFallbacks} sans traduction FR)`)
console.log(`✓ Moves   : ${Object.keys(movesI18n).length} entrées (${moveFallbacks} sans traduction FR)`)

// Spot-check
console.log('\nVérifications :')
console.log('  charizard        →', pokemonI18n['charizard'])
console.log('  charizard-mega-y →', pokemonI18n['charizard-mega-y'])
console.log('  raichu-alola     →', pokemonI18n['raichu-alola'])
console.log('  basculegion      →', pokemonI18n['basculegion'])
console.log('  flamethrower     →', movesI18n['flamethrower'])
console.log('  earthquake       →', movesI18n['earthquake'])
console.log('  solar-beam       →', movesI18n['solar-beam'])

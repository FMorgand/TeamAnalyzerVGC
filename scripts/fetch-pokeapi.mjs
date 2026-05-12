/**
 * fetch-pokeapi.mjs
 *
 * Comprehensive data pipeline: fetches all Pokémon game data from PokeAPI's
 * GitHub raw mirror, caches raw responses in scripts/cache/, then assembles
 * compact JSON files for the app bundle.
 *
 * Usage:
 *   node scripts/fetch-pokeapi.mjs           # use cache when available
 *   node scripts/fetch-pokeapi.mjs --force   # re-fetch everything from network
 *
 * Generates:
 *   src/data/pokemon.json              — types, abilities, sprite, megaForms
 *   src/data/base-stats.json           — hp/atk/def/spa/spd/spe at Lv.50
 *   src/data/moves.json                — type, power, category
 *   src/data/i18n/pokemon.json         — { fr, en } per Pokémon key
 *   src/data/i18n/moves.json           — { fr, en } per move key
 *   src/data/i18n/pokemon-types-flat.json — key → types[] (all forms)
 *
 * Replaces: extract-pokeapi-data.mjs, fetch-base-stats.mjs,
 *           add-move-categories.mjs, extract-i18n.mjs,
 *           inject-alt-forms.mjs, add-mega-forms.mjs
 *
 * NOT generated here — manually maintained:
 *   src/data/mega-stones.json  (PokeAPI held_by_pokemon is unreliable for stones)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE_DIR  = join(__dirname, 'cache')
const DATA_DIR   = join(__dirname, '..', 'src', 'data')
const FORCE      = process.argv.includes('--force')

// GitHub raw mirror — includes Z-A Megas not yet in the live API
const GITHUB_RAW = 'https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2'
// Live API — only for list endpoints (move count, mega-stone category)
const LIVE_API   = 'https://pokeapi.co/api/v2'
const CONCURRENCY = 20

// ─── Utilities ────────────────────────────────────────────────────────────────

async function fetchJSON(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url)
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      if (attempt === retries - 1) { console.warn(`\n  [warn] ${url} — ${err.message}`); return null }
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
    }
  }
}

async function fetchWithCache(url, cacheKey) {
  const cachePath = join(CACHE_DIR, `${cacheKey}.json`)
  if (!FORCE && existsSync(cachePath)) {
    try { return JSON.parse(readFileSync(cachePath, 'utf8')) } catch {}
  }
  const data = await fetchJSON(url)
  if (data) {
    mkdirSync(dirname(cachePath), { recursive: true })
    writeFileSync(cachePath, JSON.stringify(data))
  }
  return data
}

async function runConcurrent(items, fn, limit = CONCURRENCY) {
  const results = new Array(items.length)
  let index = 0
  const worker = async () => { while (index < items.length) { const i = index++; results[i] = await fn(items[i], i) } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

function progress(label, current, total) {
  process.stdout.write(`\r  ${label}: ${current}/${total}`)
  if (current === total) process.stdout.write('\n')
}

function pickName(names, lang) {
  return names?.find(n => n.language.name === lang)?.name ?? null
}

function fallbackName(key) {
  return key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const STAT_KEYS = {
  'hp': 'hp', 'attack': 'atk', 'defense': 'def',
  'special-attack': 'spa', 'special-defense': 'spd', 'speed': 'spe',
}

// ─── Manual data: ZA megas not yet indexed by PokeAPI ─────────────────────────

const ZA_MEGA_FORMS = {
  'garchomp':        [['garchomp-mega-z',     ['dragon']]],
  'absol':           [['absol-mega-z',         ['dark', 'ghost']]],
  'lucario':         [['lucario-mega-z',        ['fighting', 'steel']]],
  'raichu':          [['raichu-mega-x',         ['electric']], ['raichu-mega-y', ['electric']]],
  'chimecho':        [['chimecho-mega',         ['psychic', 'steel']]],
  'golisopod':       [['golisopod-mega',        ['bug', 'steel']]],
  'golurk':          [['golurk-mega',           ['ground', 'ghost']]],
  'staraptor':       [['staraptor-mega',        ['fighting', 'flying']]],
  'crabominable':    [['crabominable-mega',     ['fighting', 'ice']]],
  'heatran':         [['heatran-mega',          ['fire', 'steel']]],
  'darkrai':         [['darkrai-mega',          ['dark']]],
  'magearna':        [['magearna-mega',         ['steel', 'fairy']]],
  'zeraora':         [['zeraora-mega',          ['electric']]],
  'scovillain':      [['scovillain-mega',       ['grass', 'fire']]],
  'glimmora':        [['glimmora-mega',         ['rock', 'poison']]],
  'baxcalibur':      [['baxcalibur-mega',       ['dragon', 'ice']]],
  'meowstic-male':   [['meowstic-mega',         ['psychic']]],
  'tatsugiri-curly': [['tatsugiri-mega',        ['dragon', 'water']]],
}

// Standalone entries missing from PokeAPI (or needing explicit mega attachment)
const ZA_NEW_ENTRIES = {
  'tatsugiri-droopy':   { types: ['dragon', 'water'], megaForms: { 'tatsugiri-mega':  { types: ['dragon', 'water'] } } },
  'tatsugiri-stretchy': { types: ['dragon', 'water'], megaForms: { 'tatsugiri-mega':  { types: ['dragon', 'water'] } } },
  'meowstic-female':    { types: ['psychic'],          megaForms: { 'meowstic-mega':   { types: ['psychic'] } } },
  'magearna-original':  { types: ['steel', 'fairy'],   megaForms: { 'magearna-mega':   { types: ['steel', 'fairy'] } } },
}

// Showdown base names that map to a specific alternate form
const ALIASES = {
  'aegislash':     'aegislash-shield',
  'oricorio':      'oricorio-baile',
  'lycanroc':      'lycanroc-midday',
  'eiscue':        'eiscue-ice',
  'indeedee':      'indeedee-male',
  'urshifu':       'urshifu-single-strike',
  'basculin':      'basculin-red-striped',
  'tauros-paldea': 'tauros-paldea-combat-breed',
  // Gendered Pokémon whose canonical PokeAPI name is the male form
  'frillish':      'frillish-male',
  'jellicent':     'jellicent-male',
  'pyroar':        'pyroar-male',
  'meowstic':      'meowstic-male',
  'basculegion':   'basculegion-male',
  'oinkologne':    'oinkologne-male',
}

// ─── Phase 1: Fetch all Pokémon (base + all forms) ────────────────────────────

async function fetchAllPokemon() {
  console.log('\n[1/5] Fetching Pokémon (base + alternate forms)...')

  const baseIds = Array.from({ length: 1025 }, (_, i) => i + 1)
  const formIds = Array.from({ length: 10303 - 10001 + 1 }, (_, i) => i + 10001)
  const allIds  = [...baseIds, ...formIds]
  let done = 0

  const raws = await runConcurrent(allIds, async (id) => {
    const data = await fetchWithCache(`${GITHUB_RAW}/pokemon/${id}/index.json`, `pokemon/${id}`)
    progress('Pokémon', ++done, allIds.length)
    return data
  })

  const basePokemon = {}  // key → { types, stats, abilities, sprite, speciesId }
  const megaForms   = {}  // key → { types, stats, baseSpecies, id }
  const altForms    = {}  // key → { types, stats, speciesId, id }

  for (const entry of raws) {
    if (!entry) continue
    const name  = entry.name
    const types = entry.types.sort((a, b) => a.slot - b.slot).map(t => t.type.name)
    const stats = {}
    for (const s of (entry.stats ?? [])) {
      const k = STAT_KEYS[s.stat.name]
      if (k) stats[k] = s.base_stat
    }
    const abilities  = (entry.abilities ?? []).sort((a, b) => a.slot - b.slot).map(a => a.ability.name)
    const sprite     = entry.sprites?.front_default ?? null
    const speciesId  = entry.species ? parseInt(entry.species.url.split('/').filter(Boolean).pop()) : null
    // Use the pokemon-form endpoint ID (distinct from the pokemon ID)
    const formId = entry.forms?.[0]
      ? parseInt(entry.forms[0].url.split('/').filter(Boolean).pop())
      : entry.id

    if (name.includes('-mega')) {
      megaForms[name] = { types, stats, baseSpecies: name.replace(/-mega.*$/, ''), id: formId }
    } else if (entry.id <= 1025) {
      basePokemon[name] = { types, stats, abilities, sprite, speciesId }
    } else {
      altForms[name] = { types, stats, speciesId, id: formId }
    }
  }

  return { basePokemon, megaForms, altForms }
}

// ─── Phase 2: Fetch species names (base Pokémon i18n) ─────────────────────────

async function fetchSpeciesNames(speciesIds) {
  console.log('\n[2/5] Fetching species names...')
  const ids = [...new Set(speciesIds.filter(Boolean))]
  let done = 0
  const raws = await runConcurrent(ids, async (id) => {
    const data = await fetchWithCache(`${GITHUB_RAW}/pokemon-species/${id}/index.json`, `species/${id}`)
    progress('Species', ++done, ids.length)
    return data
  })
  const map = new Map()
  for (const entry of raws) {
    if (!entry) continue
    map.set(entry.id, { fr: pickName(entry.names, 'fr'), en: pickName(entry.names, 'en') })
  }
  return map
}

// ─── Phase 3: Fetch form names (mega + alternate form i18n) ──────────────────

async function fetchFormNames(formEntries) {
  console.log('\n[3/5] Fetching form names...')
  let done = 0
  const raws = await runConcurrent(formEntries, async ([name, id]) => {
    const data = await fetchWithCache(`${GITHUB_RAW}/pokemon-form/${id}/index.json`, `form/${id}`)
    progress('Forms', ++done, formEntries.length)
    return data ? { name, data } : null
  })
  const map = new Map()
  for (const result of raws) {
    if (!result) continue
    const fr = pickName(result.data.names, 'fr') ?? pickName(result.data.names, 'en')
    const en = pickName(result.data.names, 'en')
    if (fr || en) map.set(result.name, { fr, en })
  }
  return map
}

// ─── Phase 4: Fetch all moves ─────────────────────────────────────────────────

async function fetchAllMoves() {
  console.log('\n[4/5] Fetching moves...')
  const list  = await fetchJSON(`${LIVE_API}/move?limit=1`)
  const total = list?.count ?? 920
  const ids   = Array.from({ length: total }, (_, i) => i + 1)
  let done = 0

  const raws = await runConcurrent(ids, async (id) => {
    const data = await fetchWithCache(`${GITHUB_RAW}/move/${id}/index.json`, `move/${id}`)
    progress('Moves', ++done, ids.length)
    return data
  })

  const moves     = {}
  const movesI18n = {}
  for (const entry of raws) {
    if (!entry) continue
    const cat = entry.damage_class?.name ?? 'status'
    moves[entry.name] = {
      type:     entry.type.name,
      power:    entry.power ?? null,
      category: cat === 'physical' ? 'physical' : cat === 'special' ? 'special' : 'status',
    }
    movesI18n[entry.name] = {
      fr: pickName(entry.names, 'fr') ?? pickName(entry.names, 'en') ?? entry.name,
      en: pickName(entry.names, 'en') ?? entry.name,
    }
  }
  return { moves, movesI18n }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Team Analyzer VGC — Data Pipeline ===')
  console.log(FORCE ? '  Mode: --force (re-fetching all)' : '  Mode: cache (use --force to reset)')
  mkdirSync(CACHE_DIR, { recursive: true })
  mkdirSync(join(DATA_DIR, 'i18n'), { recursive: true })

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const { basePokemon, megaForms, altForms } = await fetchAllPokemon()

  const allSpeciesIds = [
    ...Object.values(basePokemon).map(p => p.speciesId),
    ...Object.values(altForms).map(p => p.speciesId),
  ]
  const speciesNames = await fetchSpeciesNames(allSpeciesIds)

  const formEntries = [
    ...Object.entries(megaForms).map(([name, d]) => [name, d.id]),
    ...Object.entries(altForms).map(([name, d]) => [name, d.id]),
  ]
  const formNames = await fetchFormNames(formEntries)

  const { moves, movesI18n } = await fetchAllMoves()

  // ── Assemble pokemon.json ─────────────────────────────────────────────────
  const pokemonOut = {}

  for (const [name, d] of Object.entries(basePokemon)) {
    pokemonOut[name] = { types: d.types, abilities: d.abilities, sprite: d.sprite }
  }
  for (const [megaName, d] of Object.entries(megaForms)) {
    const base = pokemonOut[d.baseSpecies]
    if (!base) continue
    if (!base.megaForms) base.megaForms = {}
    base.megaForms[megaName] = { types: d.types }
  }
  for (const [name, d] of Object.entries(altForms)) {
    if (!pokemonOut[name]) pokemonOut[name] = { types: d.types }
  }
  // ZA megas (not in PokeAPI yet)
  for (const [baseName, forms] of Object.entries(ZA_MEGA_FORMS)) {
    if (!pokemonOut[baseName]) continue
    if (!pokemonOut[baseName].megaForms) pokemonOut[baseName].megaForms = {}
    for (const [formKey, types] of forms) {
      if (!pokemonOut[baseName].megaForms[formKey]) {
        pokemonOut[baseName].megaForms[formKey] = { types }
      }
    }
  }
  for (const [key, entry] of Object.entries(ZA_NEW_ENTRIES)) {
    if (!pokemonOut[key]) pokemonOut[key] = entry
    else {
      if (!pokemonOut[key].megaForms) pokemonOut[key].megaForms = {}
      Object.assign(pokemonOut[key].megaForms, entry.megaForms)
    }
  }
  // Aliases
  for (const [alias, target] of Object.entries(ALIASES)) {
    if (!pokemonOut[alias] && pokemonOut[target]) {
      pokemonOut[alias] = { types: pokemonOut[target].types }
    }
  }

  // ── Assemble base-stats.json ──────────────────────────────────────────────
  const baseStatsOut = {}
  for (const [name, d] of Object.entries(basePokemon))  { if (Object.keys(d.stats).length) baseStatsOut[name]     = d.stats }
  for (const [name, d] of Object.entries(megaForms))    { if (Object.keys(d.stats).length) baseStatsOut[name]     = d.stats }
  for (const [name, d] of Object.entries(altForms))     { if (Object.keys(d.stats).length) baseStatsOut[name]     = d.stats }

  // ── Assemble i18n ─────────────────────────────────────────────────────────
  const pokemonI18n     = {}
  const pokemonTypesFlat = {}

  function resolveI18n(key, speciesId, isAlt = false) {
    const specEntry  = speciesId ? speciesNames.get(speciesId) : null
    const formEntry  = formNames.get(key)

    if (formEntry?.en) {
      return { fr: formEntry.fr ?? formEntry.en, en: formEntry.en }
    }
    if (specEntry?.en) {
      return { fr: specEntry.fr ?? specEntry.en, en: specEntry.en }
    }
    return { fr: fallbackName(key), en: fallbackName(key) }
  }

  for (const [name, d] of Object.entries(pokemonOut)) {
    const baseD     = basePokemon[name]
    const altD      = altForms[name]
    const targetKey = ALIASES[name]
    const speciesId = baseD?.speciesId ?? altD?.speciesId
      ?? (targetKey ? (basePokemon[targetKey]?.speciesId ?? altForms[targetKey]?.speciesId) : null)
      ?? null

    pokemonI18n[name]      = resolveI18n(name, speciesId)
    pokemonTypesFlat[name] = d.types

    for (const [megaName, megaD] of Object.entries(d.megaForms ?? {})) {
      const formEntry = formNames.get(megaName)
      if (formEntry?.en) {
        pokemonI18n[megaName] = { fr: formEntry.fr ?? formEntry.en, en: formEntry.en }
      } else {
        const baseEn  = pokemonI18n[name]?.en ?? fallbackName(name)
        const baseFr  = pokemonI18n[name]?.fr ?? fallbackName(name)
        const xySuffix = megaName.endsWith('-mega-x') ? ' X' : megaName.endsWith('-mega-y') ? ' Y' : ''
        pokemonI18n[megaName] = { fr: `Méga-${baseFr}${xySuffix}`, en: `Mega ${baseEn}${xySuffix}` }
      }
      pokemonTypesFlat[megaName] = megaD.types
    }
  }

  // ── Write all files ───────────────────────────────────────────────────────
  writeFileSync(join(DATA_DIR, 'pokemon.json'),                   JSON.stringify(pokemonOut,       null, 2))
  writeFileSync(join(DATA_DIR, 'base-stats.json'),                JSON.stringify(baseStatsOut,     null, 2))
  writeFileSync(join(DATA_DIR, 'moves.json'),                     JSON.stringify(moves,            null, 2))
  writeFileSync(join(DATA_DIR, 'i18n', 'pokemon.json'),           JSON.stringify(pokemonI18n,      null, 2))
  writeFileSync(join(DATA_DIR, 'i18n', 'moves.json'),             JSON.stringify(movesI18n,        null, 2))
  writeFileSync(join(DATA_DIR, 'i18n', 'pokemon-types-flat.json'),JSON.stringify(pokemonTypesFlat, null, 2))

  console.log('\n=== Done ===')
  console.log(`  pokemon.json               → ${Object.keys(pokemonOut).length} Pokémon`)
  console.log(`  base-stats.json            → ${Object.keys(baseStatsOut).length} entries`)
  console.log(`  moves.json                 → ${Object.keys(moves).length} moves`)
  console.log(`  mega-stones.json           → (manually maintained, not modified)`)
  console.log(`  i18n/pokemon.json          → ${Object.keys(pokemonI18n).length} entries`)
  console.log(`  i18n/moves.json            → ${Object.keys(movesI18n).length} entries`)
  console.log(`  i18n/pokemon-types-flat    → ${Object.keys(pokemonTypesFlat).length} entries`)

  console.log('\nSpot-checks:')
  const checks = [
    ['charizard',       pokemonOut['charizard']],
    ['charizard-mega-y',pokemonOut['charizard']?.megaForms?.['charizard-mega-y']],
    ['raichu',          pokemonOut['raichu']],
    ['raichu-mega-x',   pokemonOut['raichu']?.megaForms?.['raichu-mega-x']],
    ['flutter-mane',    pokemonOut['flutter-mane']],
  ]
  for (const [label, entry] of checks) {
    if (entry) console.log(`  ${label}: [${entry.types.join('/')}]${entry.abilities ? ` — ${entry.abilities.slice(0, 2).join(', ')}` : ''}`)
    else       console.log(`  ${label}: NOT FOUND`)
  }
}

main().catch(err => { console.error('\nFatal:', err); process.exit(1) })

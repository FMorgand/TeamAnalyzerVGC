/**
 * fetch-item-sprites.mjs
 *
 * Fetches item sprite URLs from PokeAPI for all competitive items:
 *   - Mega stones (from mega-stones.json)
 *   - Items seen in VGC stats (from vgc-stats.json)
 *   - Common competitive items (hardcoded list)
 *
 * Strategy: fetch the full PokeAPI item list once to build a norm→key index,
 * then construct sprite URLs directly without per-item requests.
 * URL pattern: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/{key}.png
 *
 * Usage:
 *   node scripts/fetch-item-sprites.mjs           # use cache
 *   node scripts/fetch-item-sprites.mjs --force   # re-fetch item list
 *
 * Generates:
 *   src/data/item-sprites.json  — { "item-key": "sprite-url" }
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = join(__dirname, 'cache')
const DATA_DIR  = join(__dirname, '..', 'src', 'data')
const FORCE     = process.argv.includes('--force')

const SPRITES_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items'

// ─── Utilities ────────────────────────────────────────────────────────────────

async function fetchJSON(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url)
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      if (attempt === retries - 1) { console.warn(`  [warn] ${url} — ${err.message}`); return null }
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

// Normalize to Smogon-style key (lowercase, alphanumeric only) for matching
function norm(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// ─── Step 1 — Build norm → PokeAPI key index from full item list ──────────────

console.log('Fetching PokeAPI item list…')
const itemList = await fetchWithCache(
  'https://pokeapi.co/api/v2/item?limit=2000',
  'items/item-list'
)
if (!itemList?.results) {
  console.error('✗ Failed to fetch item list')
  process.exit(1)
}

const normToKey = new Map()
for (const { name } of itemList.results) {
  normToKey.set(norm(name), name)
}
console.log(`  ${normToKey.size} items indexed`)

// ─── Step 2 — Collect all needed item keys ────────────────────────────────────

const neededNormKeys = new Set()

// Mega stones (already PokeAPI keys with hyphens → norm them for lookup)
const megaStones = JSON.parse(readFileSync(join(DATA_DIR, 'mega-stones.json'), 'utf8'))
for (const key of Object.keys(megaStones)) {
  neededNormKeys.add(norm(key))
}

// Items seen in VGC stats (stored in Smogon norm format, already norm)
const vgcStats = JSON.parse(readFileSync(join(DATA_DIR, 'vgc-stats.json'), 'utf8'))
for (const entry of Object.values(vgcStats.pokemon)) {
  for (const item of (entry.items ?? [])) {
    neededNormKeys.add(norm(item.key))
  }
}

// Common competitive items not necessarily in VGC stats
const EXTRA_ITEMS = [
  'sitrus-berry', 'lum-berry', 'aguav-berry', 'iapapa-berry', 'wiki-berry',
  'mago-berry', 'figy-berry', 'chesto-berry', 'oran-berry',
  'focus-sash', 'life-orb', 'choice-band', 'choice-scarf', 'choice-specs',
  'assault-vest', 'leftovers', 'rocky-helmet', 'eviolite',
  'booster-energy', 'clear-amulet', 'covert-cloak', 'mirror-herb',
  'safety-goggles', 'mental-herb', 'power-herb', 'white-herb',
  'throat-spray', 'wise-glasses', 'muscle-band',
  'chople-berry', 'occa-berry', 'passho-berry', 'wacan-berry',
  'rindo-berry', 'yache-berry', 'chilan-berry', 'haban-berry',
  'colbur-berry', 'babiri-berry', 'tanga-berry', 'charti-berry',
  'kasib-berry', 'kebia-berry', 'shuca-berry', 'coba-berry',
  'payapa-berry', 'roseli-berry', 'vacuum-wave', // not an item, skip
  'red-card', 'room-service', 'lagging-tail',
  'electric-seed', 'grassy-seed', 'misty-seed', 'psychic-seed',
  'terrain-extender', 'heavy-duty-boots',
]
for (const key of EXTRA_ITEMS) {
  neededNormKeys.add(norm(key))
}

// ─── Step 3 — Resolve to PokeAPI keys and build sprite map ───────────────────

console.log(`\nResolving ${neededNormKeys.size} unique items…`)

const sprites = {}
let found = 0
let missing = 0

for (const normKey of neededNormKeys) {
  const pokeKey = normToKey.get(normKey)
  if (!pokeKey) {
    missing++
    continue
  }
  sprites[pokeKey] = `${SPRITES_BASE}/${pokeKey}.png`
  found++
}

console.log(`  ${found} resolved, ${missing} not found in PokeAPI`)

// ─── Step 4 — Write output ────────────────────────────────────────────────────

const sorted = Object.fromEntries(Object.entries(sprites).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(join(DATA_DIR, 'item-sprites.json'), JSON.stringify(sorted, null, 2))
console.log(`\n✓ ${found} item sprites written to src/data/item-sprites.json`)

// Spot check
const checks = ['sitrus-berry', 'focus-sash', 'life-orb', 'charizardite-y', 'assault-vest']
console.log('\nVérifications :')
for (const key of checks) {
  console.log(`  ${key}: ${sprites[key] ?? '✗ absent'}`)
}

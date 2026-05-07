import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'src', 'data')

const FORMAT = 'gen9championsvgc2026regma'
const MONTH = '2026-04'
const URL = `https://www.smogon.com/stats/${MONTH}/chaos/${FORMAT}-0.json`

// ─── Normalization helpers ─────────────────────────────────────────────────────

function norm(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Manual overrides for Smogon names that don't map cleanly to PokeAPI keys
const POKEMON_OVERRIDES = {
  'calyrexshadow':         'calyrex-shadow-rider',
  'calyrexice':            'calyrex-ice-rider',
  'urshifurapidstrike':    'urshifu-rapid-strike',
  'urshifusinglestrike':   'urshifu-single-strike',
  'zamazentacrowned':      'zamazenta-crowned-shield',
  'zaciancrowned':         'zacian-crowned-sword',
  'ogerponwellspring':     'ogerpon-wellspring-mask',
  'ogerponteal':           'ogerpon-teal-mask',
  'ogerponcornerstone':    'ogerpon-cornerstone-mask',
  'ogerponhearthflame':    'ogerpon-hearthflame-mask',
  'palafintero':           'palafin-hero',
  'mausholdfour':          'maushold-family-of-four',
  'mausholdthree':         'maushold-family-of-three',
  'tatsugiridroopy':       'tatsugiri-droopy',
  'tatsugiristretchy':     'tatsugiri-stretchy',
  'tatsugiricurly':        'tatsugiri-curly',
  'gimmighoulchest':       'gimmighoul-chest',
  'dudunsparcetwosegment': 'dudunsparce-two-segment',
  'dudunsparce':           'dudunsparce-two-segment',
  'fluttermane':           'flutter-mane',
  'ironhands':             'iron-hands',
  'ironbundle':            'iron-bundle',
  'ironmoth':              'iron-moth',
  'ironvaliant':           'iron-valiant',
  'ironleaves':            'iron-leaves',
  'ironthorns':            'iron-thorns',
  'ironjugulis':           'iron-jugulis',
  'irontreads':            'iron-treads',
  'chienpao':              'chien-pao',
  'tinglu':                'ting-lu',
  'chiyu':                 'chi-yu',
  'wochien':               'wo-chien',
  'greattusk':             'great-tusk',
  'scovillain':            'scovillain',
  'annihilape':            'annihilape',
  'clodsire':              'clodsire',
  'kilowattrel':           'kilowattrel',
  'pawmot':                'pawmot',
  'brambleghast':          'brambleghast',
  'cyclizar':              'cyclizar',
  'bombirdier':            'bombirdier',
  'veluza':                'veluza',
  'farigiraf':             'farigiraf',
  'dondozo':               'dondozo',
  'toedscruel':            'toedscruel',
  'rabsca':                'rabsca',
  'glimmora':              'glimmora',
  'grafaiai':              'grafaiai',
  'sneasler':              'sneasler',
  'overqwil':              'overqwil',
}

// Build lookup: normalized → PokeAPI key
const pokemonData = JSON.parse(readFileSync(join(DATA_DIR, 'pokemon.json'), 'utf8'))
const pokemonByNorm = new Map()
for (const [key, val] of Object.entries(pokemonData)) {
  pokemonByNorm.set(norm(key), key)
  if (val.megaForms) {
    for (const megaKey of Object.keys(val.megaForms)) {
      pokemonByNorm.set(norm(megaKey), megaKey)
    }
  }
}

function resolveSmogonPokemon(smogonName) {
  const n = norm(smogonName)
  return POKEMON_OVERRIDES[n] ?? pokemonByNorm.get(n) ?? null
}

// Build lookup: normalized → PokeAPI move key
const movesData = JSON.parse(readFileSync(join(DATA_DIR, 'moves.json'), 'utf8'))
const moveByNorm = new Map()
for (const key of Object.keys(movesData)) {
  moveByNorm.set(norm(key), key)
}

function resolveSmogonMove(smogonMove) {
  return moveByNorm.get(norm(smogonMove)) ?? null
}

// ─── EV conversion ─────────────────────────────────────────────────────────────

// Smogon chaos uses compact EVs (÷8, where 32 ≈ 252).
// Convert back: ×8, capped at 252.
function parseSpread(spreadStr) {
  const [nature, evStr] = spreadStr.split(':')
  const parts = evStr.split('/').map(Number)
  const maxVal = Math.max(...parts)
  const scale = maxVal <= 63 ? 8 : 1  // compact if max ≤ 63
  const labels = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
  const evs = {}
  parts.forEach((v, i) => {
    const converted = Math.min(v * scale, 252)
    if (converted > 0) evs[labels[i]] = converted
  })
  return { nature, evs }
}

// ─── Fetch & process ───────────────────────────────────────────────────────────

console.log(`Fetching ${URL}...`)
const res = await fetch(URL)
if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
const json = await res.json()

const { data } = json
const result = {}
let skipped = 0

for (const [smogonName, entry] of Object.entries(data)) {
  const key = resolveSmogonPokemon(smogonName)
  if (!key) {
    console.warn(`  [skip] Unknown Pokémon: "${smogonName}"`)
    skipped++
    continue
  }

  const rawCount = entry['Raw count']
  const usage = Math.round(entry.usage * 10000) / 100

  // Top 5 spreads
  const spreads = Object.entries(entry.Spreads ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([spreadStr, count]) => ({
      ...parseSpread(spreadStr),
      pct: Math.round((count / rawCount) * 1000) / 10,
    }))

  // Top 6 moves (with %)
  const moves = Object.entries(entry.Moves ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([smogonMove, count]) => {
      const moveKey = resolveSmogonMove(smogonMove)
      if (!moveKey) return null
      return { key: moveKey, pct: Math.round((count / rawCount) * 1000) / 10 }
    })
    .filter(Boolean)
    .slice(0, 6)

  // Top 3 items
  const items = Object.entries(entry.Items ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([itemKey, count]) => ({
      key: itemKey,
      pct: Math.round((count / rawCount) * 1000) / 10,
    }))

  result[key] = { usage, spreads, moves, items }
}

const output = { format: FORMAT, month: MONTH, pokemon: result }
writeFileSync(join(DATA_DIR, 'vgc-stats.json'), JSON.stringify(output, null, 2))

console.log(`✓ ${Object.keys(result).length} Pokémon écrits dans src/data/vgc-stats.json`)
if (skipped > 0) console.log(`  (${skipped} Pokémon inconnus ignorés)`)
console.log(`\nVérifications :`)
for (const key of ['incineroar', 'sneasler', 'garchomp', 'landorus-therian', 'flutter-mane']) {
  const entry = result[key]
  if (entry) {
    const topSpread = entry.spreads[0]
    const evsStr = Object.entries(topSpread?.evs ?? {}).map(([k, v]) => `${v}${k.toUpperCase()}`).join('/')
    console.log(`  ${key}: ${entry.usage}% — ${topSpread?.nature} ${evsStr}`)
  } else {
    console.log(`  ${key}: non trouvé`)
  }
}

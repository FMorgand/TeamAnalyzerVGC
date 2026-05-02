/**
 * Injects alternate form entries from PokeAPI CSV into pokemon.json.
 * Only skips mega forms (already stored as nested megaForms in the existing entries).
 * All other forms (gmax, totem, primal, regional, cosplay, etc.) are added.
 * Run with: node scripts/inject-alt-forms.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pokemonPath = join(__dirname, '../src/data/pokemon.json')
const csvPath = join(__dirname, 'alt-forms.csv')

const data = JSON.parse(readFileSync(pokemonPath, 'utf-8'))
const csv = readFileSync(csvPath, 'utf-8')

// ---------------------------------------------------------------------------
// Parse CSV — skip only mega forms (already handled as nested megaForms)
// ---------------------------------------------------------------------------

const lines = csv.trim().split('\n').slice(1) // skip header
let added = 0
let skipped = 0
let updated = 0

for (const line of lines) {
  const [, identifier, type1, type2] = line.split(',')
  if (!identifier || !type1) continue

  // Skip mega forms — they are stored as nested megaForms under the base entry
  if (/-mega/.test(identifier)) {
    skipped++
    continue
  }

  const types = type2 ? [type1, type2] : [type1]

  if (data[identifier]) {
    // Already exists — update types if they differ
    const existing = JSON.stringify(data[identifier].types)
    const incoming = JSON.stringify(types)
    if (existing !== incoming) {
      console.log(`  ~ ${identifier}: [${data[identifier].types}] → [${types}]`)
      data[identifier].types = types
      updated++
    }
    // else: identical, nothing to do
  } else {
    data[identifier] = { types }
    console.log(`  + ${identifier}: [${types.join(', ')}]`)
    added++
  }
}

// ---------------------------------------------------------------------------
// Special aliases: Showdown base name → default form
// Added only if the base key doesn't already exist in pokemon.json
// ---------------------------------------------------------------------------

const ALIASES = {
  'aegislash':  'aegislash-shield',         // Showdown exports "Aegislash" (Shield form)
  'oricorio':   'oricorio-baile',
  'lycanroc':   'lycanroc-midday',
  'eiscue':     'eiscue-ice',
  'indeedee':   'indeedee-male',
  'urshifu':    'urshifu-single-strike',
  'basculin':   'basculin-red-striped',
  'tauros-paldea': 'tauros-paldea-combat-breed',
}

console.log('\n--- Aliases ---')
for (const [alias, target] of Object.entries(ALIASES)) {
  if (data[alias]) {
    console.log(`  skip (exists) ${alias}`)
    continue
  }
  if (!data[target]) {
    console.log(`  WARN: alias target not found: ${target}`)
    continue
  }
  data[alias] = { types: data[target].types }
  console.log(`  + alias ${alias} → [${data[target].types.join(', ')}]`)
  added++
}

// ---------------------------------------------------------------------------
// Write back
// ---------------------------------------------------------------------------

writeFileSync(pokemonPath, JSON.stringify(data, null, 2))
console.log(`\nDone. Added: ${added}, Updated: ${updated}, Skipped (megas): ${skipped}`)

/**
 * Verifies mega stone item names against PokeAPI raw GitHub data.
 * Run with: node scripts/verify-mega-stones.mjs
 */

const BASE = 'https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2/item'

// Candidate stone names → pokemon base name
// Exceptions to the simple `{pokemon}ite` pattern are handled explicitly
const CANDIDATES = {
  // Gen 1
  'venusaurite':    'venusaur',
  'charizardite-x': 'charizard',
  'charizardite-y': 'charizard',
  'blastoisinite':  'blastoise',
  'beedrillite':    'beedrill',
  'pidgeotite':     'pidgeot',
  'alakazite':      'alakazam',   // NOT alakazamite
  'slowbronite':    'slowbro',    // NOT slowbroite
  'gengarite':      'gengar',
  'kangaskhanite':  'kangaskhan',
  'pinsirite':      'pinsir',
  'gyaradosite':    'gyarados',
  'aerodactylite':  'aerodactyl',
  'mewtwonite-x':   'mewtwo',     // NOT mewtwoite-x
  'mewtwonite-y':   'mewtwo',
  // Gen 2
  'ampharosite':    'ampharos',
  'steelixite':     'steelix',
  'scizorite':      'scizor',
  'heracronite':    'heracross',  // NOT heracrosssite
  'houndoominite':  'houndoom',
  'tyranitarite':   'tyranitar',
  // Gen 3
  'sceptilite':     'sceptile',
  'blazikenite':    'blaziken',
  'swampertite':    'swampert',
  'gardevoirite':   'gardevoir',
  'sableyite':      'sableye',
  'mawilite':       'mawile',
  'aggronite':      'aggron',
  'medichamite':    'medicham',
  'manectite':      'manectric',  // NOT manectricite
  'sharpedonite':   'sharpedo',
  'cameruptite':    'camerupt',
  'altarianite':    'altaria',
  'banettite':      'banette',
  'absolite':       'absol',
  'glalitite':      'glalie',
  'salamencite':    'salamence',
  'metagrossite':   'metagross',
  'latiasite':      'latias',
  'latiosite':      'latios',
  // Gen 4
  'lopunnite':      'lopunny',
  'garchompite':    'garchomp',
  'lucarionite':    'lucario',
  'abomasite':      'abomasnow',  // NOT abomasnowite
  'galladite':      'gallade',
  'audinite':       'audino',
  // Gen 6
  'diancite':       'diancie',
}

async function checkStone(stone) {
  try {
    const res = await fetch(`${BASE}/${stone}/index.json`)
    return res.ok
  } catch {
    return false
  }
}

const CONCURRENCY = 10
const entries = Object.entries(CANDIDATES)
const confirmed = {}
const failed = []

for (let i = 0; i < entries.length; i += CONCURRENCY) {
  const batch = entries.slice(i, i + CONCURRENCY)
  const results = await Promise.all(
    batch.map(async ([stone, pokemon]) => {
      const ok = await checkStone(stone)
      return { stone, pokemon, ok }
    })
  )
  for (const { stone, pokemon, ok } of results) {
    if (ok) {
      confirmed[stone] = pokemon
      process.stdout.write(`  ✓ ${stone}\n`)
    } else {
      failed.push(stone)
      process.stdout.write(`  ✗ ${stone} — NOT FOUND\n`)
    }
  }
}

console.log('\n--- Summary ---')
console.log(`Confirmed: ${Object.keys(confirmed).length}`)
if (failed.length > 0) {
  console.log(`Failed: ${failed.join(', ')}`)
}

// Write confirmed stones to mega-stones.json
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../src/data/mega-stones.json')
writeFileSync(outPath, JSON.stringify(confirmed, null, 2))
console.log(`\nWritten to ${outPath}`)

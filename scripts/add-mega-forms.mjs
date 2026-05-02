/**
 * Adds missing mega forms to pokemon.json for MD/ZA Pokémon.
 * Run with: node scripts/add-mega-forms.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const filePath = join(__dirname, '../src/data/pokemon.json')
const data = JSON.parse(readFileSync(filePath, 'utf-8'))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addMegaForm(pokemonKey, formKey, types) {
  if (!data[pokemonKey]) {
    console.warn(`SKIP: ${pokemonKey} not found`)
    return
  }
  if (!data[pokemonKey].megaForms) data[pokemonKey].megaForms = {}
  data[pokemonKey].megaForms[formKey] = { types }
  console.log(`  + ${pokemonKey} → ${formKey}: [${types.join(', ')}]`)
}

function addPokemon(key, types, megaFormKey, megaTypes) {
  if (data[key]) {
    console.log(`EXISTS: ${key} — only adding mega form`)
    addMegaForm(key, megaFormKey, megaTypes)
    return
  }
  data[key] = { types, megaForms: { [megaFormKey]: { types: megaTypes } } }
  console.log(`  + NEW ${key} [${types.join(', ')}] → ${megaFormKey}: [${megaTypes.join(', ')}]`)
}

// ---------------------------------------------------------------------------
// Updates
// ---------------------------------------------------------------------------

console.log('\n--- Existing entries: add mega-z forms ---')
addMegaForm('garchomp', 'garchomp-mega-z', ['dragon'])
addMegaForm('absol',    'absol-mega-z',    ['dark', 'ghost'])
addMegaForm('lucario',  'lucario-mega-z',  ['fighting', 'steel'])

console.log('\n--- Existing entries: add first mega form ---')
addMegaForm('raichu',        'raichu-mega-x',      ['electric'])
addMegaForm('raichu',        'raichu-mega-y',      ['electric'])
addMegaForm('chimecho',      'chimecho-mega',      ['psychic', 'steel'])
addMegaForm('golisopod',     'golisopod-mega',     ['bug', 'steel'])
addMegaForm('golurk',        'golurk-mega',        ['ground', 'ghost'])
addMegaForm('staraptor',     'staraptor-mega',     ['fighting', 'flying'])
addMegaForm('crabominable',  'crabominable-mega',  ['fighting', 'ice'])
addMegaForm('heatran',       'heatran-mega',       ['fire', 'steel'])
addMegaForm('darkrai',       'darkrai-mega',       ['dark'])
addMegaForm('magearna',      'magearna-mega',      ['steel', 'fairy'])
addMegaForm('zeraora',       'zeraora-mega',       ['electric'])
addMegaForm('scovillain',    'scovillain-mega',    ['grass', 'fire'])
addMegaForm('glimmora',      'glimmora-mega',      ['rock', 'poison'])
addMegaForm('baxcalibur',    'baxcalibur-mega',    ['dragon', 'ice'])
addMegaForm('meowstic-male', 'meowstic-mega',      ['psychic'])
addMegaForm('tatsugiri-curly','tatsugiri-mega',    ['dragon', 'water'])

console.log('\n--- Missing forms: add as new entries ---')
// Tatsugiri droopy/stretchy not in pokemon.json
addPokemon('tatsugiri-droopy',   ['dragon', 'water'], 'tatsugiri-mega',  ['dragon', 'water'])
addPokemon('tatsugiri-stretchy', ['dragon', 'water'], 'tatsugiri-mega',  ['dragon', 'water'])
// Meowstic female not in pokemon.json
addPokemon('meowstic-female',    ['psychic'],         'meowstic-mega',   ['psychic'])
// Magearna original color not in pokemon.json
addPokemon('magearna-original',  ['steel', 'fairy'],  'magearna-mega',   ['steel', 'fairy'])

// ---------------------------------------------------------------------------
// Write back
// ---------------------------------------------------------------------------

writeFileSync(filePath, JSON.stringify(data, null, 2))
console.log('\nDone. pokemon.json updated.')

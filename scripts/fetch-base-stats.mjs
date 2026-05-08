import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'src', 'data')

const STAT_NAME = {
  'hp': 'hp', 'attack': 'atk', 'defense': 'def',
  'special-attack': 'spa', 'special-defense': 'spd', 'speed': 'spe',
}

// All keys including mega forms
const flatTypes = JSON.parse(readFileSync(join(DATA_DIR, 'i18n', 'pokemon-types-flat.json'), 'utf8'))
const allKeys = Object.keys(flatTypes)
console.log(`Fetching base stats for ${allKeys.length} Pokémon...`)

const result = {}
const BATCH = 15

for (let i = 0; i < allKeys.length; i += BATCH) {
  const batch = allKeys.slice(i, i + BATCH)
  await Promise.all(batch.map(async key => {
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${key}`)
      if (!res.ok) return  // silently skip unknown forms
      const data = await res.json()
      const stats = {}
      for (const s of data.stats) {
        const short = STAT_NAME[s.stat.name]
        if (short) stats[short] = s.base_stat
      }
      result[key] = stats
    } catch { /* skip */ }
  }))
  if ((i + BATCH) % 150 === 0 || i + BATCH >= allKeys.length) {
    console.log(`  ${Math.min(i + BATCH, allKeys.length)}/${allKeys.length}...`)
  }
  await new Promise(r => setTimeout(r, 150))
}

writeFileSync(join(DATA_DIR, 'base-stats.json'), JSON.stringify(result, null, 2))
console.log(`✓ ${Object.keys(result).length}/${allKeys.length} Pokémon écrits dans src/data/base-stats.json`)

// Spot-check
for (const key of ['incineroar', 'garchomp', 'sneasler', 'charizard-mega-y']) {
  const s = result[key]
  if (s) console.log(`  ${key}: ${s.hp}HP ${s.atk}Atk ${s.def}Def ${s.spa}SpA ${s.spd}SpD ${s.spe}Spe`)
  else console.log(`  ${key}: non trouvé`)
}

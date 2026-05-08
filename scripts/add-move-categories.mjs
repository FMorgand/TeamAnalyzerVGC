import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSV_DIR = join(__dirname, 'pokeapi-csv')
const DATA_DIR = join(__dirname, '..', 'src', 'data')

function parseCSV(filename) {
  const raw = readFileSync(join(CSV_DIR, filename), 'utf8').replace(/\r/g, '')
  const lines = raw.trim().split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    const obj = {}
    const values = []
    let cur = '', inQuotes = false
    for (const ch of line) {
      if (ch === '"') inQuotes = !inQuotes
      else if (ch === ',' && !inQuotes) { values.push(cur); cur = '' }
      else cur += ch
    }
    values.push(cur)
    headers.forEach((h, i) => { obj[h.trim()] = (values[i] ?? '').trim() })
    return obj
  })
}

const CATEGORY = { '1': 'status', '2': 'physical', '3': 'special' }

const categoryByKey = new Map()
for (const row of parseCSV('moves.csv')) {
  categoryByKey.set(row.identifier, CATEGORY[row.damage_class_id] ?? 'status')
}

const movesData = JSON.parse(readFileSync(join(DATA_DIR, 'moves.json'), 'utf8'))

let updated = 0
for (const [key, val] of Object.entries(movesData)) {
  const cat = categoryByKey.get(key)
  if (cat) { val.category = cat; updated++ }
}

writeFileSync(join(DATA_DIR, 'moves.json'), JSON.stringify(movesData, null, 2))
console.log(`✓ ${updated}/${Object.keys(movesData).length} moves mis à jour avec category`)

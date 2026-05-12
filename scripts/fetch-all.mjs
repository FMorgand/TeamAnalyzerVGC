/**
 * fetch-all.mjs
 *
 * Entry point for the full data pipeline.
 *
 * Usage:
 *   node scripts/fetch-all.mjs           # use cache
 *   node scripts/fetch-all.mjs --force   # re-fetch everything
 *
 * Steps:
 *   1. fetch-pokeapi.mjs   — Pokémon, moves, mega stones, i18n, base stats
 *   2. fetch-vgc-stats.mjs — Smogon VGC usage statistics
 */

import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)

function run(script) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [join(__dirname, script), ...args], { stdio: 'inherit' })
    child.on('close', code =>
      code === 0 ? resolve() : reject(new Error(`${script} exited with code ${code}`))
    )
  })
}

console.log('╔══════════════════════════════════════╗')
console.log('║  Team Analyzer VGC — Data Pipeline   ║')
console.log('╚══════════════════════════════════════╝')

try {
  await run('fetch-pokeapi.mjs')
  console.log()
  await run('fetch-vgc-stats.mjs')
  console.log('\n✓ All data files up to date.')
} catch (err) {
  console.error(`\n✗ ${err.message}`)
  process.exit(1)
}

/**
 * extract-pokeapi-data.mjs
 *
 * Generates src/data/pokemon.json, src/data/moves.json, and src/data/mega-stones.json
 * by fetching from PokeAPI's raw GitHub data (includes Z-A Mega Evolutions).
 *
 * Usage: node scripts/extract-pokeapi-data.mjs
 * Requirements: Node >= 18
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '../src/data');

// Source: PokeAPI/api-data master branch (includes Z-A Megas, unlike live v2.9.0)
const GITHUB_RAW = 'https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2';
// Live API used only for list endpoints (counts, item categories)
const LIVE_API = 'https://pokeapi.co/api/v2';

const CONCURRENCY = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJSON(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries - 1) {
        console.warn(`  [warn] Failed after ${retries} attempts: ${url} — ${err.message}`);
        return null;
      }
      await sleep(500 * (attempt + 1));
    }
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runConcurrent(items, fn, limit = CONCURRENCY) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function progress(current, total, label) {
  const pct = Math.round((current / total) * 100);
  process.stdout.write(`\r  ${label}: ${current}/${total} (${pct}%)`);
  if (current === total) process.stdout.write('\n');
}

// ---------------------------------------------------------------------------
// Pokemon extraction
// ---------------------------------------------------------------------------

async function extractPokemon() {
  console.log('\n[1/3] Extracting Pokemon...');

  // Base Pokemon: IDs 1–1025
  const baseIds = Array.from({ length: 1025 }, (_, i) => i + 1);

  // Alternate forms with Mega Evolutions:
  //   - Old Megas (Gen 6/7): IDs ~10033–10115
  //   - Z-A Megas: IDs 10278–10303 (confirmed via PR #1317)
  //   We fetch the full 10001–10303 range and keep only mega forms.
  const formIds = Array.from({ length: 10303 - 10001 + 1 }, (_, i) => i + 10001);

  const allIds = [...baseIds, ...formIds];
  let done = 0;

  const rawEntries = await runConcurrent(allIds, async (id) => {
    const data = await fetchJSON(`${GITHUB_RAW}/pokemon/${id}/index.json`);
    progress(++done, allIds.length, 'Pokemon');
    return data;
  });

  // Separate base pokemon and mega forms
  const basePokemon = {};   // name → { types: string[] }
  const megaForms = {};     // name → { types: string[], baseSpecies: string }

  for (const entry of rawEntries) {
    if (!entry) continue;

    const name = entry.name;
    const types = entry.types
      .sort((a, b) => a.slot - b.slot)
      .map(t => t.type.name);

    const isMega = name.includes('-mega');

    if (isMega) {
      // e.g. "charizard-mega-x" → base species is "charizard"
      const baseSpecies = name.replace(/-mega.*$/, '');
      megaForms[name] = { types, baseSpecies };
    } else if (entry.id <= 1025) {
      basePokemon[name] = { types };
    }
  }

  // Attach mega forms to their base species
  for (const [megaName, megaData] of Object.entries(megaForms)) {
    const base = basePokemon[megaData.baseSpecies];
    if (!base) {
      console.warn(`  [warn] Base species not found for mega: ${megaName}`);
      continue;
    }
    if (!base.megaForms) base.megaForms = {};
    base.megaForms[megaName] = { types: megaData.types };
  }

  return basePokemon;
}

// ---------------------------------------------------------------------------
// Moves extraction
// ---------------------------------------------------------------------------

async function extractMoves() {
  console.log('\n[2/3] Extracting moves...');

  // Get total move count from live API (stable for Gen 1–9 moves)
  const list = await fetchJSON(`${LIVE_API}/move?limit=1`);
  const total = list?.count ?? 920;
  const ids = Array.from({ length: total }, (_, i) => i + 1);

  let done = 0;
  const rawMoves = await runConcurrent(ids, async (id) => {
    const data = await fetchJSON(`${GITHUB_RAW}/move/${id}/index.json`);
    progress(++done, ids.length, 'Moves');
    return data;
  });

  const moves = {};
  for (const entry of rawMoves) {
    if (!entry) continue;
    moves[entry.name] = {
      type: entry.type.name,
      power: entry.power ?? null,
    };
  }

  return moves;
}

// ---------------------------------------------------------------------------
// Mega Stones extraction
// ---------------------------------------------------------------------------

async function extractMegaStones() {
  console.log('\n[3/3] Extracting mega stones...');

  // Fetch mega-stone item category from live API
  const category = await fetchJSON(`${LIVE_API}/item-category/mega-stones`);
  if (!category) {
    console.warn('  [warn] Could not fetch mega-stone category from live API');
    return {};
  }

  const stoneItems = category.items;
  let done = 0;
  const megaStones = {};
  const unmapped = [];

  await runConcurrent(stoneItems, async (item) => {
    const data = await fetchJSON(`${LIVE_API}/item/${item.name}`);
    progress(++done, stoneItems.length, 'Mega stones');
    if (!data) return;

    // Each stone is held by its base Pokemon. Derive the mega form name.
    const holders = data.held_by_pokemon.map(h => h.pokemon.name);
    if (holders.length === 0) {
      unmapped.push(item.name);
      return;
    }

    // Most stones: one holder → one mega form
    // Charizard has two stones (X and Y) → two mega forms
    for (const baseSpecies of holders) {
      const stoneName = item.name; // e.g. "charizardite-x"
      const suffix = stoneName.includes('-x') ? '-mega-x'
                   : stoneName.includes('-y') ? '-mega-y'
                   : '-mega';
      megaStones[stoneName] = `${baseSpecies}${suffix}`;
    }
  });

  if (unmapped.length > 0) {
    console.warn(`\n  [warn] ${unmapped.length} stone(s) could not be mapped: ${unmapped.join(', ')}`);
    console.warn('  → Add these manually to src/data/mega-stones.json');
  }

  return megaStones;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Team Analyzer VGC — Data Extraction ===');
  console.log(`Source: ${GITHUB_RAW}`);
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const [pokemon, moves, megaStones] = await Promise.all([
    extractPokemon(),
    extractMoves(),
    extractMegaStones(),
  ]);

  writeFileSync(join(OUTPUT_DIR, 'pokemon.json'), JSON.stringify(pokemon, null, 2));
  writeFileSync(join(OUTPUT_DIR, 'moves.json'), JSON.stringify(moves, null, 2));
  writeFileSync(join(OUTPUT_DIR, 'mega-stones.json'), JSON.stringify(megaStones, null, 2));

  console.log('\n=== Done ===');
  console.log(`  pokemon.json   → ${Object.keys(pokemon).length} Pokemon`);
  console.log(`  moves.json     → ${Object.keys(moves).length} moves`);
  console.log(`  mega-stones.json → ${Object.keys(megaStones).length} stones`);
  console.log('\nNext: review src/data/ and manually fill any [warn] gaps.');
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});

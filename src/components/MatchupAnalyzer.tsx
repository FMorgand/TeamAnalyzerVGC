import { useState, useEffect } from 'react'
import type { ParsedPokemon, ParsedMove } from '../lib/parseShowdown'
import { parseShowdownPaste } from '../lib/parseShowdown'
import enemyPresetsData from '../data/enemy-presets.json'
import { typeChart } from '../data/typeChart'
import type { PokemonType } from '../data/typeChart'
import { TypeBadge } from './TypeBadge'
import { PokemonSprite } from './PokemonSprite'
import { useLang } from '../contexts/LangContext'
import { pokemonName, moveName, searchPokemon, searchMove, POKEMON_TYPES_FLAT } from '../lib/i18n'
import { getSpriteUrl, getItemSpriteUrl } from '../lib/sprites'
import movesData from '../data/moves.json'
import pokemonJsonData from '../data/pokemon.json'
import vgcStatsData from '../data/vgc-stats.json'
import baseStatsData from '../data/base-stats.json'
import { calcHP, calcStat, calcDamage } from '../lib/damage'
import type { EnemyPokemon as EnemyPokemonType, EnemyMove as EnemyMoveType } from '../lib/matchHistory'

interface Props {
  team: ParsedPokemon[]
  activeIndices?: number[] | null
  megaActive?: Set<number>
  onSaveMatch?: (slots: (EnemyPokemonType | null)[]) => void
  reloadTrigger?: { slots: (EnemyPokemonType | null)[]; id: string } | null
}

type MatrixMode = 'offense' | 'defense'
type MoveEntry = { type: string; power: number | null; category?: string }
const MOVES_DB = movesData as Record<string, MoveEntry>
type BaseStatEntry = { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }
const BASE_STATS = baseStatsData as Record<string, BaseStatEntry>

function lookupBaseStats(key: string): BaseStatEntry | undefined {
  return BASE_STATS[key] ?? BASE_STATS[`${key}-male`] ?? BASE_STATS[`${key}-m`]
}

// ─── VGC stats types ──────────────────────────────────────────────────────────

interface VGCPokemonStats {
  usage: number
  spreads: { nature: string; evs: Record<string, number>; pct: number }[]
  moves: { key: string; pct: number }[]
  items: { key: string; pct: number }[]
}

const VGC_STATS = (vgcStatsData as unknown as { pokemon: Record<string, VGCPokemonStats> }).pokemon

interface EnemyPreset { name: string; paste: string }
const ENEMY_PRESETS = enemyPresetsData as EnemyPreset[]

type PokemonDataEntry = {
  types: string[]
  megaForms?: Record<string, { types: string[]; sprite?: string | null }>
  sprite?: string | null
}
const POKEMON_DATA = pokemonJsonData as Record<string, PokemonDataEntry>

function toOfficialArtwork(url: string): string {
  return url.replace('/sprites/pokemon/', '/sprites/pokemon/other/official-artwork/')
}

function getMegaTypes(megaFormKey: string): PokemonType[] | null {
  for (const entry of Object.values(POKEMON_DATA)) {
    if (entry.megaForms?.[megaFormKey]) {
      return entry.megaForms[megaFormKey].types as PokemonType[]
    }
  }
  return null
}

function getMegaFormForItem(
  pokemonKey: string,
  itemKey: string | null | undefined,
): { formKey: string; types: PokemonType[]; sprite: string | null } | null {
  const entry = POKEMON_DATA[pokemonKey]
  if (!entry?.megaForms) return null
  const megaForms = Object.entries(entry.megaForms)
  if (megaForms.length === 0) return null

  if (itemKey) {
    const suffix = itemKey.match(/-(x|y)$/)?.[1]
    if (suffix) {
      const match = megaForms.find(([name]) => name.endsWith(`-mega-${suffix}`))
      if (match) return { formKey: match[0], types: match[1].types as PokemonType[], sprite: match[1].sprite ? toOfficialArtwork(match[1].sprite) : null }
    }
  }

  const [formKey, formData] = megaForms[0]
  return { formKey, types: formData.types as PokemonType[], sprite: formData.sprite ? toOfficialArtwork(formData.sprite) : null }
}

function getEffectiveEnemyTypes(enemy: EnemyPokemon): PokemonType[] {
  if (!enemy.megaActive) return enemy.types
  return getMegaFormForItem(enemy.key, enemy.item)?.types ?? enemy.types
}

function parsedToEnemy(p: ParsedPokemon): EnemyPokemon {
  const moves: (EnemyMove | null)[] = [null, null, null, null]
  p.moves.slice(0, 4).forEach((m, i) => {
    if (m.type) moves[i] = { key: m.normalizedName, type: m.type }
  })
  return { key: p.normalizedName, types: p.types, moves, selectedSpreadIndex: 0, item: p.item }
}

const EV_LABELS: Record<string, string> = {
  hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe',
}

const ITEM_NAMES: Record<string, string> = {
  sitrusberry: 'Sitrus Berry', chopleberry: 'Chople Berry', leftovers: 'Leftovers',
  assaultvest: 'Assault Vest', choiceband: 'Choice Band', choicescarf: 'Choice Scarf',
  choicespecs: 'Choice Specs', focussash: 'Focus Sash', lifeorb: 'Life Orb',
  rockyhelmet: 'Rocky Helmet', boosterenergy: 'Booster Energy', clearamulet: 'Clear Amulet',
  mentalherb: 'Mental Herb', powerherb: 'Power Herb', safetygoggles: 'Safety Goggles',
  throatspray: 'Throat Spray', wiseglasses: 'Wise Glasses', muscleband: 'Muscle Band',
  lumberry: 'Lum Berry', aguavberry: 'Aguav Berry', iapapberry: 'Iapapa Berry',
  mirrorherb: 'Mirror Herb', covertcloak: 'Covert Cloak', eviolite: 'Eviolite',
  heavydutyboots: 'Heavy-Duty Boots', redcard: 'Red Card', whiteherb: 'White Herb',
  electricseed: 'Electric Seed', grassyseed: 'Grassy Seed', mistyseed: 'Misty Seed',
  psychicseed: 'Psychic Seed', terrainextender: 'Terrain Extender',
  roomservice: 'Room Service', laggingail: 'Lagging Tail', trickroom: 'Trick Room',
}

function formatItemName(key: string): string {
  return ITEM_NAMES[key]
    ?? key.replace(/berry$/, ' Berry').replace(/herb$/, ' Herb').replace(/seed$/, ' Seed')
       .replace(/\b\w/g, c => c.toUpperCase())
}

function formatEVs(evs: Record<string, number>): string {
  return Object.entries(evs)
    .map(([k, v]) => `${v}${EV_LABELS[k] ?? k}`)
    .join(' / ')
}

type EnemyMove = EnemyMoveType
type EnemyPokemon = EnemyPokemonType

function offenseMultiplierVsEnemy(myPokemon: ParsedPokemon, enemy: EnemyPokemon): number {
  return offenseMultiplier(myPokemon, getEffectiveEnemyTypes(enemy))
}

function offenseMultiplier(myPokemon: ParsedPokemon, enemyTypes: PokemonType[]): number {
  let best = 0
  for (const move of myPokemon.moves) {
    if (!move.type || !move.power || move.power <= 0) continue
    const mult = enemyTypes.reduce((acc, t) => acc * typeChart[move.type!][t], 1)
    if (mult > best) best = mult
  }
  return best
}

function defenseMultiplier(enemyMoves: (EnemyMove | null)[], myTypes: PokemonType[]): number {
  let best = 0
  for (const move of enemyMoves) {
    if (!move) continue
    const mult = myTypes.reduce((acc, t) => acc * typeChart[move.type][t], 1)
    if (mult > best) best = mult
  }
  return best
}

type DamageResult = { move: EnemyMove; mult: number; minPct: number; maxPct: number }

function bestEnemyMoveAndDamage(enemy: EnemyPokemon, myPokemon: ParsedPokemon, myMegaKey?: string | null): DamageResult | null {
  let maxMult = 0
  for (const move of enemy.moves) {
    if (!move) continue
    const mult = myPokemon.types.reduce((acc, t) => acc * typeChart[move.type][t], 1)
    if (mult > maxMult) maxMult = mult
  }
  if (maxMult < 2) return null

  const enemyMegaKey = enemy.megaActive ? getMegaFormForItem(enemy.key, enemy.item)?.formKey : null
  const enemyBase = lookupBaseStats(enemyMegaKey ?? enemy.key)
  const defenderBase = lookupBaseStats(myMegaKey ?? myPokemon.normalizedName)
  const vgcStats = VGC_STATS[enemy.key]
  const spread = vgcStats?.spreads[enemy.selectedSpreadIndex] ?? null
  const attackerNature = spread?.nature?.toLowerCase() ?? null
  const attackerEVs = (spread?.evs ?? {}) as Record<string, number | undefined>

  let best: DamageResult | null = null

  for (const move of enemy.moves) {
    if (!move) continue
    const mult = myPokemon.types.reduce((acc, t) => acc * typeChart[move.type][t], 1)
    if (mult < maxMult) continue

    const moveEntry = MOVES_DB[move.key]
    if (!moveEntry?.power || moveEntry.power <= 0) {
      if (!best) best = { move, mult, minPct: 0, maxPct: 0 }
      continue
    }

    if (enemyBase && defenderBase) {
      const isPhysical = moveEntry.category === 'physical'
      const attackerStat = isPhysical
        ? calcStat(enemyBase.atk, attackerEVs['atk'] ?? 0, attackerNature, 'atk')
        : calcStat(enemyBase.spa, attackerEVs['spa'] ?? 0, attackerNature, 'spa')
      const defenderHP = calcHP(defenderBase.hp, myPokemon.evs.hp)
      const defenderStat = isPhysical
        ? calcStat(defenderBase.def, myPokemon.evs.def, myPokemon.nature, 'def')
        : calcStat(defenderBase.spd, myPokemon.evs.spd, myPokemon.nature, 'spd')
      const stab = getEffectiveEnemyTypes(enemy).includes(move.type)
      const { min, max } = calcDamage({ bp: moveEntry.power, attackerStat, defenderStat, defenderHP, stab, effectiveness: mult })
      if (!best || max > best.maxPct) best = { move, mult, minPct: min, maxPct: max }
    } else if (!best) {
      best = { move, mult, minPct: 0, maxPct: 0 }
    }
  }

  return best
}

function bestMyMoveAndDamage(myPokemon: ParsedPokemon, enemy: EnemyPokemon, myMegaKey?: string | null): DamageResult | null {
  let maxMult = 0
  const effectiveEnemyTypes = getEffectiveEnemyTypes(enemy)
  for (const move of myPokemon.moves) {
    if (!move.type || !move.power || move.power <= 0) continue
    const mult = effectiveEnemyTypes.reduce((acc, t) => acc * typeChart[move.type!][t], 1)
    if (mult > maxMult) maxMult = mult
  }
  if (maxMult < 2) return null

  const enemyMegaKey = enemy.megaActive ? getMegaFormForItem(enemy.key, enemy.item)?.formKey : null
  const attackerBase = lookupBaseStats(myMegaKey ?? myPokemon.normalizedName)
  const defenderBase = lookupBaseStats(enemyMegaKey ?? enemy.key)
  const vgcStats = VGC_STATS[enemy.key]
  const spread = vgcStats?.spreads[enemy.selectedSpreadIndex] ?? null
  const defenderNature = spread?.nature?.toLowerCase() ?? null
  const defenderEVs = (spread?.evs ?? {}) as Record<string, number | undefined>
  const attackerTypes = myMegaKey ? (getMegaTypes(myMegaKey) ?? myPokemon.types) : myPokemon.types

  let best: DamageResult | null = null

  for (const move of myPokemon.moves) {
    if (!move.type || !move.power || move.power <= 0) continue
    const mult = effectiveEnemyTypes.reduce((acc, t) => acc * typeChart[move.type!][t], 1)
    if (mult < maxMult) continue

    const moveEntry = MOVES_DB[move.normalizedName]
    if (!moveEntry?.power || moveEntry.power <= 0) continue

    if (attackerBase && defenderBase) {
      const isPhysical = moveEntry.category === 'physical'
      const attackerStat = isPhysical
        ? calcStat(attackerBase.atk, myPokemon.evs.atk, myPokemon.nature, 'atk')
        : calcStat(attackerBase.spa, myPokemon.evs.spa, myPokemon.nature, 'spa')
      const defenderHP = calcHP(defenderBase.hp, defenderEVs['hp'] ?? 0)
      const defenderStat = isPhysical
        ? calcStat(defenderBase.def, defenderEVs['def'] ?? 0, defenderNature, 'def')
        : calcStat(defenderBase.spd, defenderEVs['spd'] ?? 0, defenderNature, 'spd')
      const stab = attackerTypes.includes(move.type!)
      const { min, max } = calcDamage({ bp: moveEntry.power, attackerStat, defenderStat, defenderHP, stab, effectiveness: mult })
      if (!best || max > best.maxPct) best = { move: { key: move.normalizedName, type: move.type! }, mult, minPct: min, maxPct: max }
    } else if (!best) {
      best = { move: { key: move.normalizedName, type: move.type! }, mult, minPct: 0, maxPct: 0 }
    }
  }

  return best
}

// ─── Preset selector ─────────────────────────────────────────────────────────

function PresetSelector({ onSelect }: { onSelect: (slots: (EnemyPokemon | null)[]) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)

  const results = ENEMY_PRESETS.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (preset: EnemyPreset) => {
    const parsed = parseShowdownPaste(preset.paste)
    const slots: (EnemyPokemon | null)[] = Array(6).fill(null)
    parsed.slice(0, 6).forEach((p, i) => { slots[i] = parsedToEnemy(p) })
    onSelect(slots)
    setQuery('')
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={ENEMY_PRESETS.length > 0 ? 'Preset d\'équipe…' : 'Aucun preset disponible'}
        disabled={ENEMY_PRESETS.length === 0}
        style={{
          background: '#1a1a2e',
          border: '1px solid #2a2a3e',
          borderRadius: 6,
          color: '#e0e0e0',
          fontSize: 12,
          padding: '5px 10px',
          width: '100%',
          boxSizing: 'border-box',
          outline: 'none',
          opacity: ENEMY_PRESETS.length === 0 ? 0.4 : 1,
        }}
      />
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 2px)',
          left: 0,
          zIndex: 300,
          background: '#1e1e2e',
          border: '1px solid #444',
          borderRadius: 6,
          minWidth: '100%',
          maxHeight: 260,
          overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        }}>
          {results.map((preset, i) => (
            <div
              key={i}
              onMouseDown={() => handleSelect(preset)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: 12,
                color: '#ddd',
                background: hovered === i ? '#2a2a3e' : 'transparent',
                borderBottom: i < results.length - 1 ? '1px solid #2a2a3e' : 'none',
              }}
            >
              {preset.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Move search input ────────────────────────────────────────────────────────

function MoveSearchInput({
  index,
  value,
  onSelect,
  onClear,
}: {
  index: number
  value: EnemyMove | null
  onSelect: (m: EnemyMove) => void
  onClear: () => void
}) {
  const { lang } = useLang()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)

  const results = searchMove(query)

  const handleSelect = (key: string) => {
    const entry = MOVES_DB[key]
    if (!entry?.type) return
    onSelect({ key, type: entry.type as PokemonType })
    setQuery('')
    setOpen(false)
  }

  if (value) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: '#181828',
        border: '1px solid #2a2a3e',
        borderRadius: 4,
        padding: '3px 6px',
        minHeight: 26,
      }}>
        <TypeBadge type={value.type} size="sm" />
        <span style={{ fontSize: 11, color: '#ccc', flex: 1 }}>{moveName(value.key, lang)}</span>
        <button
          onClick={onClear}
          style={{ background: 'none', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer', lineHeight: 1, padding: 0 }}
        >×</button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => { if (e.key === 'Enter' && results.length > 0) handleSelect(results[0]) }}
        placeholder={`Capacité ${index + 1}…`}
        style={{
          background: '#181828',
          border: '1px solid #2a2a3e',
          borderRadius: 4,
          color: '#aaa',
          fontSize: 11,
          padding: '3px 7px',
          width: '100%',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 2px)',
          left: 0,
          zIndex: 300,
          background: '#1e1e2e',
          border: '1px solid #444',
          borderRadius: 6,
          minWidth: 220,
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}>
          {results.map((key, i) => {
            const entry = MOVES_DB[key]
            return (
              <div
                key={key}
                onMouseDown={() => handleSelect(key)}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  padding: '4px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: hovered === key ? '#2a2a3e' : 'transparent',
                  borderBottom: i < results.length - 1 ? '1px solid #2a2a3e' : 'none',
                }}
              >
                <span style={{ fontSize: 11, color: '#ddd', flex: 1 }}>{moveName(key, lang)}</span>
                {entry?.type && <TypeBadge type={entry.type as PokemonType} size="sm" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Enemy slot card ──────────────────────────────────────────────────────────

function EnemySlotCard({
  slot,
  value,
  onSelectPokemon,
  onClearPokemon,
  onSelectMove,
  onClearMove,
  onSelectSpread,
  onToggleMega,
  onItemChange,
}: {
  slot: number
  value: EnemyPokemon | null
  onSelectPokemon: (p: EnemyPokemon) => void
  onClearPokemon: () => void
  onSelectMove: (mi: number, m: EnemyMove) => void
  onClearMove: (mi: number) => void
  onSelectSpread: (i: number) => void
  onToggleMega: () => void
  onItemChange: (key: string | null) => void
}) {
  const { lang } = useLang()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null)

  useEffect(() => {
    const initial = value ? (value.item ?? VGC_STATS[value.key]?.items[0]?.key ?? null) : null
    setSelectedItemKey(initial)
    onItemChange(initial)
  }, [value?.key])

  const results = searchPokemon(query)

  const handleSelectPokemon = (key: string) => {
    const types = POKEMON_TYPES_FLAT[key] ?? []
    onSelectPokemon({ key, types, moves: [null, null, null, null], selectedSpreadIndex: 0 })
    setQuery('')
    setOpen(false)
  }

  if (!value) {
    return (
      <div style={{ position: 'relative', minWidth: 180 }}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={e => { if (e.key === 'Enter' && results.length > 0) handleSelectPokemon(results[0]) }}
          placeholder={`Pokémon ${slot + 1}…`}
          style={{
            background: '#1a1a2e',
            border: '1px solid #333',
            borderRadius: 6,
            color: '#e0e0e0',
            fontSize: 12,
            padding: '5px 8px',
            width: '100%',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        {open && results.length > 0 && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 2px)',
            left: 0,
            zIndex: 200,
            background: '#1e1e2e',
            border: '1px solid #444',
            borderRadius: 6,
            minWidth: 220,
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            overflow: 'hidden',
          }}>
            {results.map((key, i) => {
              const types = POKEMON_TYPES_FLAT[key] ?? []
              return (
                <div
                  key={key}
                  onMouseDown={() => handleSelectPokemon(key)}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    padding: '5px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: hovered === key ? '#2a2a3e' : 'transparent',
                    borderBottom: i < results.length - 1 ? '1px solid #2a2a3e' : 'none',
                  }}
                >
                  <span style={{ fontSize: 12, color: '#ddd', flex: 1 }}>{pokemonName(key, lang)}</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const stats = VGC_STATS[value.key] ?? null
  const toggleItem = (key: string) => {
    const next = selectedItemKey === key ? null : key
    setSelectedItemKey(next)
    onItemChange(next)
  }
  const megaInfo = getMegaFormForItem(value.key, selectedItemKey)
  const effectiveTypes = value.megaActive && megaInfo ? megaInfo.types : value.types
  const displaySprite = value.megaActive && megaInfo?.sprite ? megaInfo.sprite : getSpriteUrl(value.key)

  return (
    <div style={{
      background: '#1e1e2e',
      border: '1px solid #333',
      borderRadius: 6,
      padding: '6px 8px',
      minWidth: 180,
      maxWidth: 220,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <PokemonSprite src={displaySprite} name={pokemonName(value.key, lang)} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#eee' }}>
              {pokemonName(value.key, lang)}
            </span>
            {stats && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: '#888',
                background: '#252540', border: '1px solid #3a3a5e',
                borderRadius: 3, padding: '1px 4px',
              }}>
                {stats.usage}%
              </span>
            )}
            {megaInfo && (
              <button
                onClick={onToggleMega}
                style={{
                  fontSize: 9, fontWeight: 700,
                  background: value.megaActive ? '#1a3a1a' : '#1e1e2e',
                  border: `1px solid ${value.megaActive ? '#3a7a3a' : '#3a3a5e'}`,
                  borderRadius: 3,
                  color: value.megaActive ? '#6dba6d' : '#555',
                  padding: '1px 5px',
                  cursor: 'pointer',
                  lineHeight: 1.4,
                }}
              >
                Méga
              </button>
            )}
          </div>
          {/* Types */}
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginBottom: 3 }}>
            {effectiveTypes.map(t => <TypeBadge key={t} type={t} size="sm" />)}
          </div>
          {/* Ability placeholder */}
          <div style={{ fontSize: 10, color: '#555', marginBottom: 3 }}>—</div>
          {/* Selected item */}
          {selectedItemKey && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <PokemonSprite
                src={getItemSpriteUrl(selectedItemKey)}
                name={formatItemName(selectedItemKey)}
                size={18}
              />
              <span style={{ fontSize: 10, color: '#888' }}>
                {formatItemName(selectedItemKey)}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onClearPokemon}
          style={{ background: 'none', border: 'none', color: '#555', fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
        >×</button>
      </div>

      {/* Move inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, borderTop: '1px solid #2a2a3e', paddingTop: 4 }}>
        {value.moves.map((move, mi) => (
          <MoveSearchInput
            key={mi}
            index={mi}
            value={move}
            onSelect={m => onSelectMove(mi, m)}
            onClear={() => onClearMove(mi)}
          />
        ))}
      </div>

      {/* Common moves chips */}
      {stats && stats.moves.length > 0 && (
        <div style={{ borderTop: '1px solid #2a2a3e', paddingTop: 4 }}>
          <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
            Fréquent
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {stats.moves.map(m => {
              const alreadyIn = value.moves.some(mv => mv?.key === m.key)
              return (
                <button
                  key={m.key}
                  onClick={() => {
                    if (alreadyIn) return
                    const firstEmpty = value.moves.findIndex(mv => mv === null)
                    if (firstEmpty === -1) return
                    const entry = MOVES_DB[m.key]
                    if (entry?.type) onSelectMove(firstEmpty, { key: m.key, type: entry.type as PokemonType })
                  }}
                  style={{
                    background: alreadyIn ? '#181828' : '#1e1e3e',
                    border: `1px solid ${alreadyIn ? '#252525' : '#3a3a5e'}`,
                    borderRadius: 3,
                    color: alreadyIn ? '#333' : '#9090c0',
                    fontSize: 10,
                    padding: '2px 6px',
                    cursor: alreadyIn ? 'default' : 'pointer',
                  }}
                >
                  {moveName(m.key, lang)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Top spreads */}
      {stats && stats.spreads.length > 0 && (
        <div style={{ borderTop: '1px solid #2a2a3e', paddingTop: 4 }}>
          <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
            Spreads
          </div>
          {stats.spreads.slice(0, 3).map((s, i) => {
            const selected = value.selectedSpreadIndex === i
            return (
              <div
                key={i}
                onClick={() => onSelectSpread(i)}
                style={{
                  fontSize: 10,
                  marginBottom: 2,
                  lineHeight: 1.4,
                  cursor: 'pointer',
                  background: selected ? '#22223a' : 'transparent',
                  borderRadius: 3,
                  padding: '1px 3px',
                  border: selected ? '1px solid #3a3a6e' : '1px solid transparent',
                }}
              >
                <span style={{ color: selected ? '#ddd' : '#777', fontWeight: 600 }}>{s.nature}</span>
                {Object.keys(s.evs).length > 0 && (
                  <span style={{ color: selected ? '#999' : '#555' }}> · {formatEVs(s.evs)}</span>
                )}
                <span style={{ color: selected ? '#6060aa' : '#3a3a5e', marginLeft: 4 }}>{s.pct}%</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Top items — clickable */}
      {stats && stats.items.length > 0 && (
        <div style={{ borderTop: '1px solid #2a2a3e', paddingTop: 4 }}>
          <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
            Objets
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {stats.items.map((item) => {
              const selected = selectedItemKey === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => toggleItem(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: selected ? '#1e2e3e' : 'transparent',
                    border: `1px solid ${selected ? '#3a5a7e' : 'transparent'}`,
                    borderRadius: 4,
                    padding: '2px 4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <PokemonSprite
                    src={getItemSpriteUrl(item.key)}
                    name={formatItemName(item.key)}
                    size={16}
                  />
                  <span style={{ fontSize: 10, color: selected ? '#9ab' : '#555', flex: 1 }}>
                    {formatItemName(item.key)}
                  </span>
                  <span style={{ fontSize: 9, color: '#3a3a5e' }}>{item.pct}%</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Matchup matrix ───────────────────────────────────────────────────────────

function MultiplierCell({ mult, danger }: { mult: number; danger: boolean }) {
  if (mult >= 4) return (
    <span style={{ fontSize: 12, fontWeight: 800, color: danger ? '#f55' : '#4caf50' }}>×4</span>
  )
  if (mult === 2) return (
    <span style={{ fontSize: 12, fontWeight: 700, color: danger ? '#f87' : '#8bc34a' }}>×2</span>
  )
  return null
}

function DefenseDamageCell({ result, danger = true }: { result: DamageResult | null; danger?: boolean }) {
  const { lang } = useLang()
  if (!result) return null

  const isOHKO = result.maxPct >= 100
  const barColor = danger
    ? (isOHKO ? '#ff3333' : result.maxPct >= 50 ? '#ff6644' : '#ff9966')
    : (isOHKO ? '#44dd44' : result.maxPct >= 50 ? '#8bc34a' : '#4caf50')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, maxWidth: 108 }}>
        <TypeBadge type={result.move.type} size="sm" />
        <span style={{ fontSize: 10, color: '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80 }}>
          {moveName(result.move.key, lang)}
        </span>
      </div>
      <MultiplierCell mult={result.mult} danger />
      {result.maxPct > 0 && (
        <>
          <div style={{ width: 90, height: 5, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(result.maxPct, 100)}%`, height: '100%', background: barColor, borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 9, color: isOHKO ? (danger ? '#ff5555' : '#44dd44') : '#888' }}>
            {result.minPct}–{result.maxPct}%{isOHKO ? ' KO' : ''}
          </span>
        </>
      )}
    </div>
  )
}

// ─── Matchup detail modal ─────────────────────────────────────────────────────

function MoveRow({
  moveKey, moveType, mult, minPct, maxPct, danger,
}: {
  moveKey: string
  moveType: PokemonType | null
  mult: number
  minPct: number | null
  maxPct: number | null
  danger: boolean
}) {
  const { lang } = useLang()
  const isStatus = minPct === null || maxPct === null
  const isOHKO = (maxPct ?? 0) >= 100
  const barColor = danger
    ? (isOHKO ? '#ff3333' : (maxPct ?? 0) >= 50 ? '#ff6644' : '#ff9966')
    : (isOHKO ? '#44dd44' : (maxPct ?? 0) >= 50 ? '#8bc34a' : '#4caf50')
  const multLabel = mult === 0 ? 'Imm' : mult >= 4 ? '×4' : mult >= 2 ? '×2' : mult === 1 ? '×1' : `×${mult}`
  const multColor = mult === 0 ? '#2a2a3e'
    : mult >= 4 ? (danger ? '#f55' : '#4caf50')
    : mult >= 2 ? (danger ? '#f87' : '#8bc34a')
    : mult < 1  ? (danger ? '#4caf50' : '#555')
    : '#555'

  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {moveType
          ? <TypeBadge type={moveType} size="sm" />
          : <span style={{ width: 28, height: 14, background: '#1a1a2a', borderRadius: 3, display: 'inline-block' }} />
        }
        <span style={{ fontSize: 11, color: '#ccc', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {moveName(moveKey, lang)}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: multColor, minWidth: 26, textAlign: 'right' }}>
          {multLabel}
        </span>
      </div>
      {!isStatus && maxPct !== null && minPct !== null && mult > 0 && (
        <>
          <div style={{ height: 4, background: '#111', borderRadius: 2, overflow: 'hidden', margin: '3px 0 2px' }}>
            <div style={{ width: `${Math.min(maxPct, 100)}%`, height: '100%', background: barColor, borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 10, color: isOHKO ? (danger ? '#ff5555' : '#44dd44') : '#555', textAlign: 'right' }}>
            {minPct}–{maxPct}%{isOHKO ? ' KO' : ''}
          </div>
        </>
      )}
      {(isStatus || mult === 0) && (
        <div style={{ fontSize: 10, color: '#2a2a3e', textAlign: 'right' }}>
          {mult === 0 ? 'immunité' : 'statut'}
        </div>
      )}
    </div>
  )
}

function MatchupDetailModal({
  myPokemon,
  enemy: initialEnemy,
  onClose,
}: {
  myPokemon: ParsedPokemon
  enemy: EnemyPokemon
  onClose: () => void
}) {
  const { lang } = useLang()
  const [spreadIndex, setSpreadIndex] = useState(initialEnemy.selectedSpreadIndex)

  const vgcStats = VGC_STATS[initialEnemy.key]
  const enemyMegaKey = initialEnemy.megaActive ? getMegaFormForItem(initialEnemy.key, initialEnemy.item)?.formKey : null
  const myBase = lookupBaseStats(myPokemon.megaForm ?? myPokemon.normalizedName)
  const enemyBase = lookupBaseStats(enemyMegaKey ?? initialEnemy.key)
  const spread = vgcStats?.spreads[spreadIndex] ?? null
  const enemyNature = spread?.nature?.toLowerCase() ?? null
  const enemyEVs = (spread?.evs ?? {}) as Record<string, number | undefined>
  const myTypes = myPokemon.megaTypes ?? myPokemon.types

  const myMoveDamage = (move: ParsedMove) => {
    if (!move.type) return { mult: 0, minPct: null as null, maxPct: null as null }
    const mult = initialEnemy.types.reduce((acc, t) => acc * typeChart[move.type!][t], 1)
    const entry = MOVES_DB[move.normalizedName]
    if (!entry?.power || entry.power <= 0 || !myBase || !enemyBase) return { mult, minPct: null as null, maxPct: null as null }
    const isPhys = entry.category === 'physical'
    const atkStat = isPhys ? calcStat(myBase.atk, myPokemon.evs.atk, myPokemon.nature, 'atk') : calcStat(myBase.spa, myPokemon.evs.spa, myPokemon.nature, 'spa')
    const defHP = calcHP(enemyBase.hp, enemyEVs['hp'] ?? 0)
    const defStat = isPhys ? calcStat(enemyBase.def, enemyEVs['def'] ?? 0, enemyNature, 'def') : calcStat(enemyBase.spd, enemyEVs['spd'] ?? 0, enemyNature, 'spd')
    const { min, max } = calcDamage({ bp: entry.power, attackerStat: atkStat, defenderStat: defStat, defenderHP: defHP, stab: myTypes.includes(move.type!), effectiveness: mult })
    return { mult, minPct: min, maxPct: max }
  }

  const enemyMoveDamage = (move: EnemyMove) => {
    const mult = myPokemon.types.reduce((acc, t) => acc * typeChart[move.type][t], 1)
    const entry = MOVES_DB[move.key]
    if (!entry?.power || entry.power <= 0 || !enemyBase || !myBase) return { mult, minPct: null as null, maxPct: null as null }
    const isPhys = entry.category === 'physical'
    const atkStat = isPhys ? calcStat(enemyBase.atk, enemyEVs['atk'] ?? 0, enemyNature, 'atk') : calcStat(enemyBase.spa, enemyEVs['spa'] ?? 0, enemyNature, 'spa')
    const myHP = calcHP(myBase.hp, myPokemon.evs.hp)
    const myStat = isPhys ? calcStat(myBase.def, myPokemon.evs.def, myPokemon.nature, 'def') : calcStat(myBase.spd, myPokemon.evs.spd, myPokemon.nature, 'spd')
    const { min, max } = calcDamage({ bp: entry.power, attackerStat: atkStat, defenderStat: myStat, defenderHP: myHP, stab: initialEnemy.types.includes(move.type), effectiveness: mult })
    return { mult, minPct: min, maxPct: max }
  }

  const setMoveKeys = new Set(initialEnemy.moves.filter(Boolean).map(m => m!.key))
  const enemyMoves: EnemyMove[] = [
    ...initialEnemy.moves.filter((m): m is EnemyMove => m !== null),
    ...(vgcStats?.moves ?? [])
      .filter(m => !setMoveKeys.has(m.key))
      .slice(0, Math.max(0, 8 - setMoveKeys.size))
      .flatMap(m => {
        const entry = MOVES_DB[m.key]
        if (!entry?.type) return []
        return [{ key: m.key, type: entry.type as PokemonType }]
      }),
  ]

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#16162a', border: '1px solid #2a2a4e', borderRadius: 10, padding: '1.25rem 1.5rem', width: 600, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.8)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#eee' }}>{pokemonName(myPokemon.normalizedName, lang)}</span>
            <div style={{ display: 'flex', gap: 3 }}>{myTypes.map(t => <TypeBadge key={t} type={t} size="sm" />)}</div>
            <span style={{ color: '#444', fontSize: 12 }}>vs</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#eee' }}>{pokemonName(initialEnemy.key, lang)}</span>
            <div style={{ display: 'flex', gap: 3 }}>{initialEnemy.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px', marginLeft: 8 }}>×</button>
        </div>

        {/* Spread selector */}
        {vgcStats?.spreads && vgcStats.spreads.length > 0 && (
          <div style={{ marginBottom: '0.75rem', background: '#111122', borderRadius: 6, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
              Spread de {pokemonName(initialEnemy.key, lang)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {vgcStats.spreads.slice(0, 5).map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSpreadIndex(i)}
                  style={{
                    background: spreadIndex === i ? '#3a3a6e' : 'transparent',
                    border: `1px solid ${spreadIndex === i ? '#5a5aae' : '#2a2a4e'}`,
                    borderRadius: 5,
                    color: spreadIndex === i ? '#ddd' : '#555',
                    fontSize: 10,
                    padding: '3px 8px',
                    cursor: 'pointer',
                    fontWeight: spreadIndex === i ? 600 : 400,
                  }}
                >
                  <span style={{ color: spreadIndex === i ? '#fff' : '#777' }}>{s.nature}</span>
                  {Object.keys(s.evs).length > 0 && <span> · {formatEVs(s.evs)}</span>}
                  <span style={{ color: '#444', marginLeft: 4 }}>{s.pct}%</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #2a2a3e' }}>
              Mes attaques → {pokemonName(initialEnemy.key, lang)}
            </div>
            {myPokemon.moves.length === 0
              ? <div style={{ fontSize: 11, color: '#333', fontStyle: 'italic' }}>Aucun move parsé</div>
              : myPokemon.moves.map((move, mi) => {
                  const { mult, minPct, maxPct } = myMoveDamage(move)
                  return <MoveRow key={mi} moveKey={move.normalizedName} moveType={move.type} mult={mult} minPct={minPct} maxPct={maxPct} danger={false} />
                })
            }
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #2a2a3e' }}>
              {pokemonName(initialEnemy.key, lang)} → moi
            </div>
            {enemyMoves.length === 0
              ? <div style={{ fontSize: 11, color: '#333', fontStyle: 'italic' }}>Aucun move connu</div>
              : enemyMoves.map((move, mi) => {
                  const { mult, minPct, maxPct } = enemyMoveDamage(move)
                  return <MoveRow key={mi} moveKey={move.key} moveType={move.type} mult={mult} minPct={minPct} maxPct={maxPct} danger={true} />
                })
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Matchup matrix ───────────────────────────────────────────────────────────

function MatchupMatrix({ myTeam, enemy, mode, myMegaKeys }: {
  myTeam: ParsedPokemon[]
  enemy: EnemyPokemon[]
  mode: MatrixMode
  myMegaKeys?: (string | null)[]
}) {
  const { lang } = useLang()
  const [modalCell, setModalCell] = useState<{ myPokemon: ParsedPokemon; enemy: EnemyPokemon } | null>(null)

  const matrix = myTeam.map(p =>
    enemy.map(e =>
      mode === 'offense'
        ? offenseMultiplierVsEnemy(p, e)
        : defenseMultiplier(e.moves, p.types)
    )
  )

  const myScores = matrix.map(row => row.filter(m => m >= 2).length)
  const enemyScores = enemy.map((_, ei) => matrix.filter(row => row[ei] >= 2).length)

  const cellStyle = (mult: number, danger: boolean): React.CSSProperties => ({
    background: mult >= 4
      ? (danger ? '#2e1a1a' : '#1a2e1a')
      : mult === 2
        ? (danger ? '#201818' : '#182018')
        : '#181828',
    textAlign: 'center',
    verticalAlign: 'middle',
    padding: '6px 4px',
    border: '1px solid #1e1e2e',
    minWidth: 52,
    height: 40,
  })

  const headerCellStyle: React.CSSProperties = {
    background: '#1a1a2e',
    padding: '6px 8px',
    textAlign: 'center',
    borderBottom: '1px solid #2a2a3e',
    borderRight: '1px solid #1e1e2e',
    minWidth: 110,
    verticalAlign: 'bottom',
  }

  const colFooter = (ei: number) => {
    const n = enemyScores[ei]
    if (mode === 'offense') return n > 0
      ? <span style={{ color: '#4caf50' }}>{n} counter{n > 1 ? 's' : ''}</span>
      : <span style={{ color: '#f55' }}>non couvert</span>
    return n > 0
      ? <span style={{ color: '#f55' }}>menace {n}</span>
      : <span style={{ color: '#4caf50' }}>inoffensif</span>
  }

  const rowScore = (pi: number) => {
    const n = myScores[pi]
    if (mode === 'offense') return n > 0
      ? <span style={{ color: '#4caf50' }}>{n}/{enemy.length}</span>
      : <span style={{ color: '#555' }}>0/{enemy.length}</span>
    return n > 0
      ? <span style={{ color: '#f55' }}>{n}/{enemy.length}</span>
      : <span style={{ color: '#4caf50' }}>0/{enemy.length}</span>
  }

  return (
    <>
    <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #2a2a3e' }}>
      <table style={{ borderCollapse: 'collapse', minWidth: 'max-content', width: '100%' }}>
        <thead>
          <tr>
            <th style={{
              background: '#1a1a2e',
              borderBottom: '1px solid #2a2a3e',
              borderRight: '1px solid #2a2a3e',
              minWidth: 160,
            }} />
            {enemy.map((e, ei) => (
              <th key={ei} style={headerCellStyle}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                  <PokemonSprite src={getSpriteUrl(e.key)} name={pokemonName(e.key, lang)} size={40} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#eee', marginBottom: 3 }}>
                  {pokemonName(e.key, lang)}
                </div>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {getEffectiveEnemyTypes(e).map(t => <TypeBadge key={t} type={t} size="sm" />)}
                </div>
                <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                  {colFooter(ei)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {myTeam.map((p, pi) => (
            <tr key={pi}>
              <td style={{
                background: '#181828',
                padding: '6px 12px',
                borderBottom: pi < myTeam.length - 1 ? '1px solid #2a2a3e' : 'none',
                borderRight: '1px solid #2a2a3e',
                verticalAlign: 'middle',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PokemonSprite src={getSpriteUrl(p.normalizedName)} name={pokemonName(p.normalizedName, lang)} size={36} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#eee', marginBottom: 3 }}>
                      {pokemonName(p.normalizedName, lang)}
                      <span style={{ fontSize: 10, color: '#666', fontWeight: 400, marginLeft: 6 }}>
                        {rowScore(pi)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {p.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
                    </div>
                  </div>
                </div>
              </td>
              {enemy.map((e, ei) => {
                const mult = matrix[pi][ei]
                const megaKey = myMegaKeys?.[pi]
                const offResult = mode === 'offense' ? bestMyMoveAndDamage(p, e, megaKey) : null
                const defResult = mode === 'defense' ? bestEnemyMoveAndDamage(e, p, megaKey) : null
                return (
                  <td
                    key={ei}
                    style={{ ...cellStyle(mult, mode === 'defense'), cursor: 'pointer' }}
                    onClick={() => setModalCell({ myPokemon: p, enemy: e })}
                  >
                    {mode === 'offense'
                      ? <DefenseDamageCell result={offResult} danger={false} />
                      : <DefenseDamageCell result={defResult} danger={true} />
                    }
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {modalCell && (
      <MatchupDetailModal
        myPokemon={modalCell.myPokemon}
        enemy={modalCell.enemy}
        onClose={() => setModalCell(null)}
      />
    )}
    </>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function MatchupAnalyzer({ team, activeIndices, megaActive, onSaveMatch, reloadTrigger }: Props) {
  const displayTeam = activeIndices ? team.filter((_, i) => activeIndices.includes(i)) : team

  // Effective base-stats key per display-team member (mega when toggled or paste has mega stone)
  const myMegaKeys: (string | null)[] = displayTeam.map((p, pi) => {
    const originalIdx = activeIndices ? activeIndices[pi] : pi
    const isMegaOn = megaActive?.has(originalIdx) ?? false
    if (!isMegaOn) return null
    return p.megaForm ?? getMegaFormForItem(p.normalizedName, p.item)?.formKey ?? null
  })

  const [slots, setSlots] = useState<(EnemyPokemon | null)[]>(() => {
    try {
      const stored = localStorage.getItem('teamanalyzer-enemy-slots')
      if (stored) return JSON.parse(stored)
    } catch {}
    return Array(6).fill(null)
  })
  const [mode, setMode] = useState<MatrixMode>('offense')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const handlePasteImport = () => {
    const parsed = parseShowdownPaste(pasteText)
    if (parsed.length === 0) return
    const next: (EnemyPokemon | null)[] = Array(6).fill(null)
    parsed.slice(0, 6).forEach((p, i) => { next[i] = parsedToEnemy(p) })
    setSlots(next)
    setPasteText('')
    setPasteOpen(false)
  }

  useEffect(() => {
    localStorage.setItem('teamanalyzer-enemy-slots', JSON.stringify(slots))
  }, [slots])

  useEffect(() => {
    if (reloadTrigger) setSlots(reloadTrigger.slots)
  }, [reloadTrigger])

  if (team.length === 0) return null

  const setSlot = (i: number, p: EnemyPokemon | null) => {
    setSlots(prev => { const next = [...prev]; next[i] = p; return next })
  }

  const setSlotMove = (slotIndex: number, moveIndex: number, move: EnemyMove | null) => {
    setSlots(prev => {
      const next = [...prev]
      const slot = next[slotIndex]
      if (!slot) return prev
      const newMoves = [...slot.moves]
      newMoves[moveIndex] = move
      next[slotIndex] = { ...slot, moves: newMoves }
      return next
    })
  }

  const setSlotSpread = (slotIndex: number, spreadIndex: number) => {
    setSlots(prev => {
      const next = [...prev]
      const slot = next[slotIndex]
      if (!slot) return prev
      next[slotIndex] = { ...slot, selectedSpreadIndex: spreadIndex }
      return next
    })
  }

  const setSlotItem = (slotIndex: number, itemKey: string | null) => {
    setSlots(prev => {
      const next = [...prev]
      const slot = next[slotIndex]
      if (!slot) return prev
      next[slotIndex] = { ...slot, item: itemKey }
      return next
    })
  }

  const toggleSlotMega = (slotIndex: number) => {
    setSlots(prev => {
      const next = [...prev]
      const slot = next[slotIndex]
      if (!slot) return prev
      next[slotIndex] = { ...slot, megaActive: !slot.megaActive }
      return next
    })
  }

  const filledEnemy = slots.filter((s): s is EnemyPokemon => s !== null)

  return (
    <section style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#ccc', margin: 0 }}>Matchup</h2>
        {filledEnemy.length > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            {onSaveMatch && (
              <button
                onClick={() => onSaveMatch(slots)}
                style={{
                  background: '#1a2e1a',
                  border: '1px solid #3a6040',
                  borderRadius: 6,
                  color: '#5caf60',
                  fontSize: 11,
                  padding: '4px 12px',
                  cursor: 'pointer',
                }}
              >
                Sauvegarder la partie
              </button>
            )}
            <button
              onClick={() => setSlots(Array(6).fill(null))}
              style={{
                background: 'transparent',
                border: '1px solid #3a2a2a',
                borderRadius: 6,
                color: '#664444',
                fontSize: 11,
                padding: '4px 12px',
                cursor: 'pointer',
              }}
            >
              Réinitialiser
            </button>
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#555', marginBottom: '0.75rem' }}>
        Définis l'équipe adverse pour voir les matchups.
      </div>

      {/* Preset selector + paste import */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '0.75rem', alignItems: 'flex-start' }}>
        <PresetSelector onSelect={setSlots} />
        <button
          onClick={() => setPasteOpen(v => !v)}
          style={{
            background: pasteOpen ? '#2a2a4e' : '#1a1a2e',
            border: `1px solid ${pasteOpen ? '#5a5aae' : '#2a2a3e'}`,
            borderRadius: 6,
            color: pasteOpen ? '#aab' : '#666',
            fontSize: 12,
            padding: '5px 14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Importer un paste
        </button>
      </div>

      {pasteOpen && (
        <div style={{ marginBottom: '0.75rem', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8, padding: '10px 12px' }}>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="Colle ici le paste Showdown de l'équipe adverse…"
            rows={8}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#12121e',
              border: '1px solid #333',
              borderRadius: 6,
              color: '#e0e0e0',
              fontSize: 11,
              fontFamily: 'monospace',
              padding: '8px 10px',
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={handlePasteImport}
              disabled={pasteText.trim() === ''}
              style={{
                background: pasteText.trim() ? '#3a3a6e' : '#1e1e2e',
                border: '1px solid #5a5aae',
                borderRadius: 6,
                color: pasteText.trim() ? '#fff' : '#444',
                fontSize: 12,
                fontWeight: 600,
                padding: '5px 18px',
                cursor: pasteText.trim() ? 'pointer' : 'default',
              }}
            >
              Valider
            </button>
            <button
              onClick={() => { setPasteOpen(false); setPasteText('') }}
              style={{
                background: 'transparent',
                border: '1px solid #2a2a3e',
                borderRadius: 6,
                color: '#555',
                fontSize: 12,
                padding: '5px 14px',
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {slots.map((slot, i) => (
          <EnemySlotCard
            key={i}
            slot={i}
            value={slot}
            onSelectPokemon={p => setSlot(i, p)}
            onClearPokemon={() => setSlot(i, null)}
            onSelectMove={(mi, m) => setSlotMove(i, mi, m)}
            onClearMove={mi => setSlotMove(i, mi, null)}
            onSelectSpread={si => setSlotSpread(i, si)}
            onToggleMega={() => toggleSlotMega(i)}
            onItemChange={key => setSlotItem(i, key)}
          />
        ))}
      </div>

      {filledEnemy.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 6, overflow: 'hidden' }}>
              {(['offense', 'defense'] as MatrixMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    background: mode === m ? '#3a3a6e' : 'transparent',
                    color: mode === m ? '#fff' : '#555',
                    border: 'none',
                    padding: '4px 14px',
                    fontSize: 11,
                    fontWeight: mode === m ? 700 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {m === 'offense' ? "J'attaque" : 'Je défends'}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 11, color: '#555' }}>
              {mode === 'offense'
                ? 'Lesquels de mes Pokémon peuvent frapper en ×2 ou ×4.'
                : 'Lesquels de mes Pokémon sont mis en danger par les attaques ennemies.'}
            </span>
          </div>
          <MatchupMatrix myTeam={displayTeam} enemy={filledEnemy} mode={mode} myMegaKeys={myMegaKeys} />
        </div>
      )}
    </section>
  )
}

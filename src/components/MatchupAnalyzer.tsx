import { useState } from 'react'
import type { ParsedPokemon } from '../lib/parseShowdown'
import { typeChart } from '../data/typeChart'
import type { PokemonType } from '../data/typeChart'
import { TypeBadge } from './TypeBadge'
import { useLang } from '../contexts/LangContext'
import { pokemonName, moveName, searchPokemon, searchMove, POKEMON_TYPES_FLAT } from '../lib/i18n'
import movesData from '../data/moves.json'
import vgcStatsData from '../data/vgc-stats.json'

interface Props {
  team: ParsedPokemon[]
}

type MatrixMode = 'offense' | 'defense'
const MOVES_DB = movesData as Record<string, { type: string; power: number | null }>

// ─── VGC stats types ──────────────────────────────────────────────────────────

interface VGCPokemonStats {
  usage: number
  spreads: { nature: string; evs: Record<string, number>; pct: number }[]
  moves: { key: string; pct: number }[]
  items: { key: string; pct: number }[]
}

const VGC_STATS = (vgcStatsData as unknown as { pokemon: Record<string, VGCPokemonStats> }).pokemon

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

interface EnemyMove {
  key: string
  type: PokemonType
}

interface EnemyPokemon {
  key: string
  types: PokemonType[]
  moves: (EnemyMove | null)[]
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
}: {
  slot: number
  value: EnemyPokemon | null
  onSelectPokemon: (p: EnemyPokemon) => void
  onClearPokemon: () => void
  onSelectMove: (mi: number, m: EnemyMove) => void
  onClearMove: (mi: number) => void
}) {
  const { lang } = useLang()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)

  const results = searchPokemon(query)

  const handleSelectPokemon = (key: string) => {
    const types = POKEMON_TYPES_FLAT[key] ?? []
    onSelectPokemon({ key, types, moves: [null, null, null, null] })
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
        <div style={{ flex: 1 }}>
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
          </div>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {value.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
          </div>
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
          {stats.spreads.slice(0, 3).map((s, i) => (
            <div key={i} style={{ fontSize: 10, color: '#555', marginBottom: 2, lineHeight: 1.4 }}>
              <span style={{ color: '#777', fontWeight: 600 }}>{s.nature}</span>
              {Object.keys(s.evs).length > 0 && (
                <span style={{ color: '#555' }}> · {formatEVs(s.evs)}</span>
              )}
              <span style={{ color: '#3a3a5e', marginLeft: 4 }}>{s.pct}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Top items */}
      {stats && stats.items.length > 0 && (
        <div style={{ borderTop: '1px solid #2a2a3e', paddingTop: 4 }}>
          <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
            Objets
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {stats.items.map((item, i) => (
              <span key={i} style={{
                fontSize: 10, color: '#555',
                background: '#181828', border: '1px solid #252535',
                borderRadius: 3, padding: '1px 5px',
              }}>
                {formatItemName(item.key)}
              </span>
            ))}
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

function MatchupMatrix({ myTeam, enemy, mode }: {
  myTeam: ParsedPokemon[]
  enemy: EnemyPokemon[]
  mode: MatrixMode
}) {
  const { lang } = useLang()

  const matrix = myTeam.map(p =>
    enemy.map(e =>
      mode === 'offense'
        ? offenseMultiplier(p, e.types)
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
                <div style={{ fontSize: 11, fontWeight: 700, color: '#eee', marginBottom: 3 }}>
                  {pokemonName(e.key, lang)}
                </div>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {e.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
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
                <div style={{ fontWeight: 700, fontSize: 12, color: '#eee', marginBottom: 3 }}>
                  {pokemonName(p.normalizedName, lang)}
                  <span style={{ fontSize: 10, color: '#666', fontWeight: 400, marginLeft: 6 }}>
                    {rowScore(pi)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {p.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
                </div>
              </td>
              {matrix[pi].map((mult, ei) => (
                <td key={ei} style={cellStyle(mult, mode === 'defense')}>
                  <MultiplierCell mult={mult} danger={mode === 'defense'} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function MatchupAnalyzer({ team }: Props) {
  const [slots, setSlots] = useState<(EnemyPokemon | null)[]>(Array(6).fill(null))
  const [mode, setMode] = useState<MatrixMode>('offense')

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

  const filledEnemy = slots.filter((s): s is EnemyPokemon => s !== null)

  return (
    <section style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#ccc', margin: 0 }}>Matchup</h2>
        {filledEnemy.length > 0 && (
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
        )}
      </div>
      <div style={{ fontSize: 11, color: '#555', marginBottom: '0.75rem' }}>
        {mode === 'offense'
          ? 'Lesquels de mes Pokémon peuvent frapper en ×2 ou ×4.'
          : 'Lesquels de mes Pokémon sont mis en danger par les attaques ennemies.'}
      </div>

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
          />
        ))}
      </div>

      {filledEnemy.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <MatchupMatrix myTeam={team} enemy={filledEnemy} mode={mode} />
        </div>
      )}
    </section>
  )
}

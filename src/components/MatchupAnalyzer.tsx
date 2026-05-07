import { useState } from 'react'
import type { ParsedPokemon } from '../lib/parseShowdown'
import pokemonData from '../data/pokemon.json'
import { typeChart } from '../data/typeChart'
import type { PokemonType } from '../data/typeChart'
import { TypeBadge } from './TypeBadge'

interface Props {
  team: ParsedPokemon[]
}

const POKEMON_DB = pokemonData as Record<string, { types: string[] }>
const ALL_KEYS = Object.keys(POKEMON_DB)

function formatName(key: string): string {
  return key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

interface EnemyPokemon {
  key: string
  displayName: string
  types: PokemonType[]
}

function searchPokemon(query: string): string[] {
  const q = query.toLowerCase().replace(/\s+/g, '-')
  if (q.length < 2) return []
  return ALL_KEYS
    .filter(k => k.includes(q))
    .sort((a, b) => {
      const aPrefix = a.startsWith(q) ? 0 : 1
      const bPrefix = b.startsWith(q) ? 0 : 1
      if (aPrefix !== bPrefix) return aPrefix - bPrefix
      return a.localeCompare(b)
    })
    .slice(0, 8)
}

function bestMultiplier(myPokemon: ParsedPokemon, enemyTypes: PokemonType[]): number {
  let best = 0
  for (const move of myPokemon.moves) {
    if (!move.type || !move.power || move.power <= 0) continue
    const mult = enemyTypes.reduce((acc, t) => acc * typeChart[move.type!][t], 1)
    if (mult > best) best = mult
  }
  return best
}

// ─── Autocomplete slot ────────────────────────────────────────────────────────

function PokemonSearchInput({
  slot,
  value,
  onSelect,
  onClear,
}: {
  slot: number
  value: EnemyPokemon | null
  onSelect: (p: EnemyPokemon) => void
  onClear: () => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)

  const results = searchPokemon(query)

  const handleSelect = (key: string) => {
    const entry = POKEMON_DB[key]
    onSelect({ key, displayName: formatName(key), types: entry.types as PokemonType[] })
    setQuery('')
    setOpen(false)
  }

  if (value) {
    return (
      <div style={{
        background: '#1e1e2e',
        border: '1px solid #333',
        borderRadius: 6,
        padding: '5px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        minWidth: 130,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#eee', marginBottom: 3 }}>
            {value.displayName}
          </div>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {value.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
          </div>
        </div>
        <button
          onClick={onClear}
          style={{ background: 'none', border: 'none', color: '#555', fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}
        >
          ×
        </button>
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
        placeholder={`Pokémon ${slot + 1}…`}
        style={{
          background: '#1a1a2e',
          border: '1px solid #333',
          borderRadius: 6,
          color: '#e0e0e0',
          fontSize: 12,
          padding: '5px 8px',
          width: 130,
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
          minWidth: 200,
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}>
          {results.map((key, i) => {
            const entry = POKEMON_DB[key]
            return (
              <div
                key={key}
                onMouseDown={() => handleSelect(key)}
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
                <span style={{ fontSize: 12, color: '#ddd', flex: 1 }}>{formatName(key)}</span>
                <div style={{ display: 'flex', gap: 2 }}>
                  {(entry.types as PokemonType[]).map(t => <TypeBadge key={t} type={t} size="sm" />)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Matchup matrix ───────────────────────────────────────────────────────────

function MultiplierCell({ mult }: { mult: number }) {
  if (mult >= 4) return (
    <span style={{ fontSize: 12, fontWeight: 800, color: '#4caf50' }}>×4</span>
  )
  if (mult === 2) return (
    <span style={{ fontSize: 12, fontWeight: 700, color: '#8bc34a' }}>×2</span>
  )
  return null
}

function MatchupMatrix({ myTeam, enemy }: { myTeam: ParsedPokemon[]; enemy: EnemyPokemon[] }) {
  // matrix[pi][ei] = best multiplier
  const matrix = myTeam.map(p => enemy.map(e => bestMultiplier(p, e.types)))

  // Summary: how many enemies each of my Pokemon can hit SE
  const myScores = matrix.map(row => row.filter(m => m >= 2).length)
  // How many of my Pokemon can hit each enemy SE
  const enemyScores = enemy.map((_, ei) => matrix.filter(row => row[ei] >= 2).length)

  const cellStyle = (mult: number): React.CSSProperties => ({
    background: mult >= 4 ? '#1a2e1a' : mult === 2 ? '#182018' : '#181828',
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

  return (
    <div style={{ overflowX: 'auto', marginTop: '1rem', borderRadius: 8, border: '1px solid #2a2a3e' }}>
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
                  {e.displayName}
                </div>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {e.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
                </div>
                <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                  {enemyScores[ei] > 0
                    ? <span style={{ color: '#4caf50' }}>{enemyScores[ei]} counter{enemyScores[ei] > 1 ? 's' : ''}</span>
                    : <span style={{ color: '#f55' }}>non couvert</span>
                  }
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
                  {p.rawName}
                  <span style={{ fontSize: 10, color: '#666', fontWeight: 400, marginLeft: 6 }}>
                    {myScores[pi] > 0
                      ? <span style={{ color: '#4caf50' }}>{myScores[pi]}/{enemy.length}</span>
                      : <span style={{ color: '#555' }}>0/{enemy.length}</span>
                    }
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {p.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
                </div>
              </td>
              {matrix[pi].map((mult, ei) => (
                <td key={ei} style={cellStyle(mult)}>
                  <MultiplierCell mult={mult} />
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

  if (team.length === 0) return null

  const setSlot = (i: number, p: EnemyPokemon | null) => {
    setSlots(prev => { const next = [...prev]; next[i] = p; return next })
  }

  const filledEnemy = slots.filter((s): s is EnemyPokemon => s !== null)

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: '0.5rem', color: '#ccc' }}>
        Matchup
      </h2>
      <div style={{ fontSize: 11, color: '#555', marginBottom: '0.75rem' }}>
        Saisis les Pokémon adverses pour voir lesquels de tes Pokémon peuvent les frapper en ×2 ou ×4.
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {slots.map((slot, i) => (
          <PokemonSearchInput
            key={i}
            slot={i}
            value={slot}
            onSelect={p => setSlot(i, p)}
            onClear={() => setSlot(i, null)}
          />
        ))}
      </div>

      {filledEnemy.length > 0 && (
        <MatchupMatrix myTeam={team} enemy={filledEnemy} />
      )}
    </section>
  )
}

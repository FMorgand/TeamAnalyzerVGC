import { useState } from 'react'
import type { ParsedPokemon } from '../lib/parseShowdown'
import { ALL_TYPES, typeChart } from '../data/typeChart'
import type { PokemonType } from '../data/typeChart'
import { TypeBadge } from './TypeBadge'

interface Props {
  team: ParsedPokemon[]
}

const POKEMON_COLORS = ['#4fc3f7', '#81c784', '#ffb74d', '#f06292', '#ba68c8', '#4db6ac']

function bestMultiplier(pokemon: ParsedPokemon, defendingType: PokemonType): number {
  let best = 0
  for (const move of pokemon.moves) {
    if (!move.type || !move.power || move.power <= 0) continue
    const mult = typeChart[move.type][defendingType]
    if (mult > best) best = mult
  }
  return best
}

export function CoverageMatrix({ team }: Props) {
  const [visible, setVisible] = useState<Set<number>>(new Set(team.map((_, i) => i)))

  if (team.length === 0) return null

  const toggle = (i: number) => {
    setVisible(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  // matrix[pi][ti] = best multiplier for pokemon pi against type ti
  const matrix = team.map(p => ALL_TYPES.map(t => bestMultiplier(p, t)))

  // A type column is a "gap" if no visible Pokémon can hit it ×2 or ×4
  const isGap = ALL_TYPES.map((_, ti) =>
    !team.some((_, pi) => visible.has(pi) && matrix[pi][ti] >= 2)
  )

  const visibleIndices = team.map((_, i) => i).filter(i => visible.has(i))

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: '0.5rem', color: '#ccc' }}>
        Grille de couverture offensive
      </h2>
      <div style={{ fontSize: 11, color: '#555', marginBottom: '0.75rem' }}>
        Les colonnes entièrement rouges ne sont couvertes par aucun Pokémon visible.
      </div>

      {/* Toggle buttons */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {team.map((p, i) => {
          const color = POKEMON_COLORS[i]
          const on = visible.has(i)
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              style={{
                background: on ? color + '22' : '#1e1e2e',
                color: on ? color : '#444',
                border: `2px solid ${on ? color : '#333'}`,
                borderRadius: 6,
                padding: '3px 12px',
                fontSize: 12,
                fontWeight: on ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              {p.rawName}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #2a2a3e' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 'max-content', width: '100%' }}>

          {/* Header row — 18 type badges */}
          <thead>
            <tr>
              <th style={{
                background: '#1a1a2e',
                padding: '6px 12px',
                textAlign: 'left',
                borderBottom: '1px solid #2a2a3e',
                borderRight: '1px solid #2a2a3e',
                minWidth: 160,
              }} />
              {ALL_TYPES.map((type, ti) => (
                <th key={type} style={{
                  background: isGap[ti] ? '#2d1010' : '#1a1a2e',
                  padding: '5px 3px',
                  textAlign: 'center',
                  borderBottom: '1px solid #2a2a3e',
                  borderRight: '1px solid #1e1e2e',
                  minWidth: 48,
                }}>
                  <TypeBadge type={type} size="sm" />
                </th>
              ))}
            </tr>
          </thead>

          {/* Pokémon rows */}
          <tbody>
            {visibleIndices.map((pi, rowIndex) => {
              const pokemon = team[pi]
              const color = POKEMON_COLORS[pi]
              const isLast = rowIndex === visibleIndices.length - 1
              return (
                <tr key={pi}>
                  {/* Left cell — Pokémon name + types */}
                  <td style={{
                    background: '#181828',
                    padding: '6px 12px',
                    borderBottom: isLast ? 'none' : '1px solid #2a2a3e',
                    borderRight: '1px solid #2a2a3e',
                    verticalAlign: 'middle',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color, marginBottom: 3 }}>
                      {pokemon.rawName}
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {pokemon.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
                    </div>
                  </td>

                  {/* Coverage cells */}
                  {ALL_TYPES.map((_, ti) => {
                    const mult = matrix[pi][ti]
                    const gap = isGap[ti]
                    const covered = mult >= 2

                    let bg = gap ? '#2d1010' : '#181828'
                    if (covered) bg = '#1e1e2e'

                    return (
                      <td key={ti} style={{
                        background: bg,
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        padding: '6px 2px',
                        borderBottom: isLast ? 'none' : '1px solid #2a2a3e',
                        borderRight: '1px solid #1e1e2e',
                        height: 36,
                      }}>
                        {mult >= 4 && (
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#f55' }}>×4</span>
                        )}
                        {mult === 2 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#f87' }}>×2</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

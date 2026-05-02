import type { OffensiveCoverage as OffensiveCoverageData, CoveringMove } from '../lib/teamAnalysis'
import { ALL_TYPES } from '../data/typeChart'
import type { PokemonType } from '../data/typeChart'
import { TypeBadge } from './TypeBadge'

interface Props {
  coverage: OffensiveCoverageData
}

function MoveItem({ m, color }: { m: CoveringMove; color: string }) {
  return (
    <li style={{ fontSize: 11, marginTop: 2 }}>
      <span style={{ color }}>{m.moveName}</span>
      <span style={{ color: '#555' }}> ({m.moveType})</span>
      <span style={{ color: '#666' }}> — {m.pokemonName}</span>
    </li>
  )
}

function SuperEffectiveList({ moves }: { moves: CoveringMove[] }) {
  const quad = [...moves].filter(m => m.multiplier >= 4).sort((a, b) => b.power - a.power)
  const double = [...moves].filter(m => m.multiplier === 2).sort((a, b) => b.power - a.power)

  return (
    <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none' }}>
      {quad.length > 0 && (
        <li style={{ fontSize: 10, color: '#f55', fontWeight: 700, marginTop: 4 }}>×4</li>
      )}
      {quad.map((m, i) => <MoveItem key={i} m={m} color="#faa" />)}
      {double.length > 0 && (
        <li style={{ fontSize: 10, color: '#f87', fontWeight: 700, marginTop: quad.length > 0 ? 6 : 4 }}>×2</li>
      )}
      {double.map((m, i) => <MoveItem key={i} m={m} color="#ddd" />)}
    </ul>
  )
}

export function OffensiveCoverage({ coverage }: Props) {
  const { byType, neutralByType } = coverage

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: '1rem', color: '#ccc' }}>
        Couverture offensive
        <span style={{ fontWeight: 400, fontSize: 13, color: '#666', marginLeft: 8 }}>
          {coverage.covered.length}/18 types couverts
        </span>
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: '0.5rem',
      }}>
        {ALL_TYPES.map((type: PokemonType) => {
          const superMoves = byType[type]
          const covered = superMoves !== undefined
          const neutralMoves = neutralByType[type]

          return (
            <div
              key={type}
              style={{
                background: '#1e1e2e',
                border: `1px solid ${covered ? '#333' : '#2a1a1a'}`,
                borderRadius: 6,
                padding: '0.5rem 0.75rem',
              }}
            >
              <TypeBadge type={type} size="sm" />

              {covered ? (
                <SuperEffectiveList moves={superMoves!} />
              ) : (
                <>
                  <div style={{ fontSize: 11, color: '#c44', fontWeight: 600, marginTop: 4 }}>
                    Pas de super efficace
                  </div>
                  {neutralMoves && neutralMoves.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, color: '#555', marginTop: 5, marginBottom: 2 }}>
                        Attaques neutres (×1) :
                      </div>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {[...neutralMoves].sort((a, b) => b.power - a.power).slice(0, 6).map((m, i) => (
                          <MoveItem key={i} m={m} color="#888" />
                        ))}
                      </ul>
                    </>
                  )}
                  {(!neutralMoves || neutralMoves.length === 0) && (
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                      Aucune attaque efficace
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

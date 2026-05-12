import type { OffensiveCoverage as OffensiveCoverageData, CoveringMove } from '../lib/teamAnalysis'
import { ALL_TYPES } from '../data/typeChart'
import type { PokemonType } from '../data/typeChart'
import { TypeBadge } from './TypeBadge'
import { useLang } from '../contexts/LangContext'
import { pokemonName, moveName } from '../lib/i18n'

interface Props {
  coverage: OffensiveCoverageData
}

function MoveItem({ m, color }: { m: CoveringMove; color: string }) {
  const { lang } = useLang()
  return (
    <li style={{ fontSize: 11, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      <span style={{ color }}>{moveName(m.moveKey, lang)}</span>
      <TypeBadge type={m.moveType} size="sm" />
      <span style={{ color: '#666' }}>{pokemonName(m.pokemonKey, lang)}</span>
    </li>
  )
}

const MAX_SHOWN = 4

function SuperEffectiveList({ moves }: { moves: CoveringMove[] }) {
  // Sort by multiplier desc, then power desc
  const sorted = [...moves].sort((a, b) => b.multiplier - a.multiplier || b.power - a.power)
  const shown = sorted.slice(0, MAX_SHOWN)
  const remaining = sorted.length - shown.length

  const quad = shown.filter(m => m.multiplier >= 4)
  const double = shown.filter(m => m.multiplier === 2)

  return (
    <div style={{ marginTop: 4 }}>
      {quad.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: '#f55', fontWeight: 700, marginTop: 4 }}>×4</div>
          <ul style={{ margin: '2px 0 0', padding: 0, listStyle: 'none' }}>
            {quad.map((m, i) => <MoveItem key={i} m={m} color="#faa" />)}
          </ul>
        </>
      )}
      {double.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: '#f87', fontWeight: 700, marginTop: quad.length > 0 ? 6 : 4 }}>
            Super efficace
          </div>
          <ul style={{ margin: '2px 0 0', padding: 0, listStyle: 'none' }}>
            {double.map((m, i) => <MoveItem key={i} m={m} color="#ddd" />)}
          </ul>
        </>
      )}
      {remaining > 0 && (
        <div style={{ fontSize: 10, color: '#555', marginTop: 5 }}>
          + {remaining} attaque{remaining > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

export function OffensiveCoverage({ coverage }: Props) {
  const { byType, neutralByType } = coverage

  return (
    <section style={{ marginTop: '0.75rem' }}>
      <div style={{ fontSize: 12, color: '#666', marginBottom: '0.75rem' }}>
        {coverage.covered.length}/18 types couverts
      </div>
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
                background: covered ? '#1e1e2e' : '#2a1010',
                border: `1px solid ${covered ? '#333' : '#4a1a1a'}`,
                borderRadius: 6,
                padding: '0.5rem 0.75rem',
              }}
            >
              <TypeBadge type={type} size="sm" />

              {covered ? (
                <SuperEffectiveList moves={superMoves!} />
              ) : (
                <>
                  <div style={{ fontSize: 13, color: '#c44', fontWeight: 700, marginTop: 6 }}>
                    Pas de super efficace
                  </div>
                  {neutralMoves && neutralMoves.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, color: '#555', marginTop: 5, marginBottom: 2 }}>
                        Attaques neutres (×1) :
                      </div>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {[...neutralMoves].sort((a, b) => b.power - a.power).slice(0, MAX_SHOWN).map((m, i) => (
                          <MoveItem key={i} m={m} color="#888" />
                        ))}
                        {neutralMoves.length > MAX_SHOWN && (
                          <li style={{ fontSize: 10, color: '#555', marginTop: 4 }}>
                            + {neutralMoves.length - MAX_SHOWN} attaque{neutralMoves.length - MAX_SHOWN > 1 ? 's' : ''}
                          </li>
                        )}
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

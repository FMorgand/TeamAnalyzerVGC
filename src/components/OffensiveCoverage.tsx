import type { OffensiveCoverage as OffensiveCoverageData } from '../lib/teamAnalysis'
import { ALL_TYPES } from '../data/typeChart'
import type { PokemonType } from '../data/typeChart'
import { TypeBadge } from './TypeBadge'

interface Props {
  coverage: OffensiveCoverageData
}

export function OffensiveCoverage({ coverage }: Props) {
  const { byType } = coverage

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
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '0.5rem',
      }}>
        {ALL_TYPES.map((type: PokemonType) => {
          const moves = byType[type]
          const covered = moves !== undefined

          return (
            <div
              key={type}
              style={{
                background: '#1e1e2e',
                border: `1px solid ${covered ? '#333' : '#222'}`,
                borderRadius: 6,
                padding: '0.5rem 0.75rem',
                opacity: covered ? 1 : 0.4,
              }}
            >
              <TypeBadge type={type} size="sm" />
              {covered ? (
                <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none' }}>
                  {moves!.map((m, i) => (
                    <li key={i} style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                      <span style={{ color: '#ddd' }}>{m.moveName}</span>
                      <span style={{ color: '#555' }}> ({m.moveType})</span>
                      <span style={{ color: '#666' }}> — {m.pokemonName}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>Aucune attaque</div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

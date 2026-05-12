import type { ParsedPokemon } from '../lib/parseShowdown'
import type { CompositionMoveHit } from '../lib/teamAnalysis'
import { getGroupCompositionData } from '../lib/teamAnalysis'
import { TypeBadge } from './TypeBadge'
import { useLang } from '../contexts/LangContext'
import { pokemonName, moveName } from '../lib/i18n'

interface Props {
  team: ParsedPokemon[]
  megaActive: Set<number>
  activeIndices: number[] | null
}

function MoveTag({ hit }: { hit: CompositionMoveHit }) {
  const { lang } = useLang()
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11 }}>
      {hit.isStab && (
        <span style={{ color: '#f90', fontWeight: 800, fontSize: 10 }}>★</span>
      )}
      <span style={{ color: '#ccc' }}>{moveName(hit.moveKey, lang)}</span>
      <span style={{ color: hit.multiplier >= 4 ? '#f55' : '#f87', fontWeight: 700, fontSize: 10 }}>
        ×{hit.multiplier}
      </span>
    </span>
  )
}

function ColHeader({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10,
      color: '#555',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: 6,
    }}>
      {label}
    </div>
  )
}

export function TeamBilan({ team, megaActive, activeIndices }: Props) {
  const { lang } = useLang()

  const activeOriginalIndices = activeIndices ?? team.map((_, i) => i)

  if (activeOriginalIndices.length < 2) return null

  const resolvedTeam = activeOriginalIndices.map(i => {
    const p = team[i]
    return megaActive.has(i) && p.megaTypes ? { ...p, types: p.megaTypes } : p
  })
  const data = getGroupCompositionData(resolvedTeam)

  return (
    <section id="bilan" style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: '0.75rem', color: '#ccc' }}>
        Bilan d'équipe
      </h2>
      <div style={{
        background: '#1a1a2e',
        border: '1px solid #2a2a3e',
        borderRadius: 8,
        padding: '0.75rem 1rem',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>

          {/* Col 1 — Menaces principales / Résistance complémentaire */}
          <div>
            <ColHeader label="Menaces principales · Résistance complémentaire" />
            {data.defensiveExposure.length === 0 ? (
              <div style={{ fontSize: 11, color: '#4caf50', fontStyle: 'italic' }}>Aucune faiblesse commune.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {data.defensiveExposure.map(({ type, weakNames, coveringNames }) => (
                  <div key={type} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                    background: '#181828',
                    border: `1px solid ${coveringNames.length > 0 ? '#2a3a2a' : '#3a2020'}`,
                    borderRadius: 4,
                    padding: '3px 7px',
                  }}>
                    <TypeBadge type={type} size="sm" />
                    <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                      <span style={{ color: '#e88' }}>{weakNames.map(k => pokemonName(k, lang)).join(', ')}</span>
                      {coveringNames.length > 0 ? (
                        <span style={{ color: '#4caf50', marginLeft: 6 }}>✓ {coveringNames.map(k => pokemonName(k, lang)).join(', ')}</span>
                      ) : (
                        <span style={{ color: '#555', marginLeft: 6 }}>✗</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Col 2 — Réponse aux menaces */}
          <div>
            <ColHeader label="Réponse aux menaces" />
            {data.defensiveExposure.length === 0 ? (
              <div style={{ fontSize: 11, color: '#555', fontStyle: 'italic' }}>Aucune faiblesse.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {data.defensiveExposure.map(({ type }) => {
                  const best = data.offensiveByType[type]?.[0]
                  return (
                    <div key={type} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#181828',
                      border: `1px solid ${best ? '#2a3a2a' : '#3a2020'}`,
                      borderRadius: 4,
                      padding: '3px 7px',
                      minHeight: 26,
                    }}>
                      <TypeBadge type={type} size="sm" />
                      {best ? (
                        <span style={{ fontSize: 11, color: '#777', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {pokemonName(best.pokemonKey, lang)} — <MoveTag hit={best} />
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#555' }}>✗ non couvert</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Col 3 — Types non couverts */}
          <div>
            <ColHeader label="Types non couverts" />
            {data.uncoveredTypes.length === 0 ? (
              <div style={{ fontSize: 11, color: '#4caf50', fontStyle: 'italic' }}>Tous les types sont couverts.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {data.uncoveredTypes.map(t => <TypeBadge key={t} type={t} size="sm" />)}
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  )
}

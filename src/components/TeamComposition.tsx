import { useState } from 'react'
import type { ParsedPokemon } from '../lib/parseShowdown'
import type { PokemonCompositionData, GroupCompositionData, CompositionMoveHit } from '../lib/teamAnalysis'
import { getPokemonCompositionData, getGroupCompositionData } from '../lib/teamAnalysis'
import { ALL_TYPES } from '../data/typeChart'
import { TypeBadge } from './TypeBadge'
import { useLang } from '../contexts/LangContext'
import { pokemonName, moveName } from '../lib/i18n'

interface Props {
  team: ParsedPokemon[]
}

// ─── Selector ─────────────────────────────────────────────────────────────────

function PokemonSelector({
  team,
  selected,
  onToggle,
}: {
  team: ParsedPokemon[]
  selected: Set<number>
  onToggle: (i: number) => void
}) {
  const { lang } = useLang()
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {team.map((p, i) => {
        const isOn = selected.has(i)
        const disabled = !isOn && selected.size >= 4
        return (
          <button
            key={i}
            onClick={() => { if (!disabled) onToggle(i) }}
            style={{
              background: isOn ? '#3a3a5e' : '#1e1e2e',
              color: isOn ? '#eee' : '#555',
              border: `1px solid ${isOn ? '#5a5a9e' : '#333'}`,
              borderRadius: 6,
              padding: '4px 14px',
              fontSize: 12,
              fontWeight: isOn ? 700 : 400,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.4 : 1,
            }}
          >
            {pokemonName(p.normalizedName, lang)}
          </button>
        )
      })}
      <span style={{ fontSize: 11, color: '#555' }}>{selected.size}/4</span>
    </div>
  )
}

// ─── Move display ─────────────────────────────────────────────────────────────

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

// ─── Individual card ──────────────────────────────────────────────────────────

function PokemonCompositionCard({ data }: { data: PokemonCompositionData }) {
  const { lang } = useLang()
  const { pokemon, quadWeaknesses, doubleWeaknesses, offensiveByType } = data

  const offensiveTypes = ALL_TYPES.filter(t => offensiveByType[t])
  const quadTypes = offensiveTypes.filter(t => offensiveByType[t]![0].multiplier >= 4)
  const doubleTypes = offensiveTypes.filter(t => offensiveByType[t]![0].multiplier < 4)

  return (
    <div style={{
      background: '#1e1e2e',
      border: '1px solid #2a2a3e',
      borderRadius: 8,
      padding: '0.75rem',
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#eee', marginBottom: 3 }}>
        {pokemonName(pokemon.normalizedName, lang)}
      </div>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 8 }}>
        {pokemon.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
      </div>

      {/* Defense */}
      <div style={{ borderTop: '1px solid #2a2a3e', paddingTop: 6, marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          Défense
        </div>
        {quadWeaknesses.length === 0 && doubleWeaknesses.length === 0 ? (
          <span style={{ fontSize: 11, color: '#555', fontStyle: 'italic' }}>Aucune faiblesse</span>
        ) : (
          <>
            {quadWeaknesses.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: '#f55', fontWeight: 700, minWidth: 18 }}>×4</span>
                {quadWeaknesses.map(t => <TypeBadge key={t} type={t} size="sm" />)}
              </div>
            )}
            {doubleWeaknesses.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, color: '#f87', fontWeight: 700, minWidth: 18 }}>×2</span>
                {doubleWeaknesses.map(t => <TypeBadge key={t} type={t} size="sm" />)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Offense */}
      <div style={{ borderTop: '1px solid #2a2a3e', paddingTop: 6 }}>
        <div style={{ fontSize: 10, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          Offense
        </div>
        {offensiveTypes.length === 0 ? (
          <span style={{ fontSize: 11, color: '#555', fontStyle: 'italic' }}>Aucun move super efficace</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {quadTypes.length > 0 && (
              <div style={{ fontSize: 10, color: '#f55', fontWeight: 700 }}>×4</div>
            )}
            {quadTypes.map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <TypeBadge type={t} size="sm" />
                <MoveTag hit={offensiveByType[t]![0]} />
              </div>
            ))}
            {doubleTypes.length > 0 && (
              <div style={{ fontSize: 10, color: '#f87', fontWeight: 700, marginTop: quadTypes.length > 0 ? 4 : 0 }}>×2</div>
            )}
            {doubleTypes.map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <TypeBadge type={t} size="sm" />
                <MoveTag hit={offensiveByType[t]![0]} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Group panel ──────────────────────────────────────────────────────────────

function ColHeader({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 10, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
      {label}
    </div>
  )
}

function GroupPanel({ data, count }: { data: GroupCompositionData; count: number }) {
  const { lang } = useLang()
  const coveredTypes = ALL_TYPES.filter(t => data.offensiveByType[t])

  return (
    <div style={{
      marginTop: '0.75rem',
      background: '#1a1a2e',
      border: '1px solid #2a2a3e',
      borderRadius: 8,
      padding: '0.75rem 1rem',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#bbb', marginBottom: '0.75rem' }}>
        Bilan — {count} Pokémon
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>

        {/* Col 1 — Résistances internes */}
        <div>
          <ColHeader label="Résistances internes" />
          {data.defensiveExposure.length === 0 ? (
            <div style={{ fontSize: 11, color: '#4caf50', fontStyle: 'italic' }}>Aucune faiblesse.</div>
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

        {/* Col 2 — Réponses offensives (par faiblesse) */}
        <div>
          <ColHeader label="Réponses offensives" />
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

        {/* Col 3 — Menaces offensives globales */}
        <div>
          <ColHeader label="Menaces offensives" />
          {coveredTypes.length === 0 ? (
            <div style={{ fontSize: 11, color: '#555', fontStyle: 'italic' }}>Aucune couverture.</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {coveredTypes.map(type => {
                  const best = data.offensiveByType[type]![0]
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <TypeBadge type={type} size="sm" />
                      <span style={{ fontSize: 11, color: '#666' }}>{pokemonName(best.pokemonKey, lang)}</span>
                      <MoveTag hit={best} />
                    </div>
                  )
                })}
              </div>
              {data.uncoveredTypes.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>Non couverts :</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {data.uncoveredTypes.map(t => <TypeBadge key={t} type={t} size="sm" />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function TeamComposition({ team }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set([0, 1]))

  const toggle = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) {
        if (next.size <= 2) return prev
        next.delete(i)
      } else {
        if (next.size >= 4) return prev
        next.add(i)
      }
      return next
    })
  }

  if (team.length < 2) return null

  const validIndices = [...selected].filter(i => i < team.length).sort((a, b) => a - b)
  const selectedPokemon = validIndices.map(i => team[i])
  const pokemonData = selectedPokemon.map(getPokemonCompositionData)
  const groupData = getGroupCompositionData(selectedPokemon)

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: '0.5rem', color: '#ccc' }}>
        Composition d'équipe
      </h2>
      <div style={{ fontSize: 11, color: '#555', marginBottom: '0.75rem' }}>
        Sélectionne 2 à 4 Pokémon pour analyser leur synergie défensive et offensive. ★ = STAB
      </div>
      <PokemonSelector team={team} selected={selected} onToggle={toggle} />
      {selectedPokemon.length >= 2 && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${selectedPokemon.length}, 1fr)`,
            gap: '0.5rem',
            marginTop: '0.75rem',
          }}>
            {pokemonData.map((data, i) => (
              <PokemonCompositionCard key={validIndices[i]} data={data} />
            ))}
          </div>
          <GroupPanel data={groupData} count={selectedPokemon.length} />
        </>
      )}
    </section>
  )
}

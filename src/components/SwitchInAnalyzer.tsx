import { useState } from 'react'
import type { ParsedPokemon } from '../lib/parseShowdown'
import type { SwitchInCandidate } from '../lib/teamAnalysis'
import { rankSwitchIns } from '../lib/teamAnalysis'
import type { PokemonType } from '../data/typeChart'
import { TypeBadge } from './TypeBadge'
import { PokemonSprite } from './PokemonSprite'
import { useLang } from '../contexts/LangContext'
import { pokemonName } from '../lib/i18n'
import { getSpriteUrl } from '../lib/sprites'

interface Props {
  team: ParsedPokemon[]
  activeIndices: number[] | null
}

function scoreColor(score: number): string {
  if (score === 0) return '#4caf50'
  if (score <= 2) return '#ff9800'
  return '#f44336'
}

function CandidateMini({ candidate, rank }: { candidate: SwitchInCandidate; rank: number }) {
  const { lang } = useLang()
  const { pokemon, sharedWeaknesses, resistanceBonuses, score, bonus } = candidate
  const color = scoreColor(score)

  return (
    <div style={{
      background: '#181828',
      border: `1px solid #2a2a3e`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 4,
      padding: '5px 8px',
      marginTop: 4,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#ddd' }}>
          {rank}. {pokemonName(pokemon.normalizedName, lang)}
          {pokemon.megaForm && <span style={{ color: '#f90', fontSize: 10, marginLeft: 4 }}>★</span>}
        </span>
        <span style={{ fontSize: 11, color, fontWeight: 700 }}>
          {score}
          {bonus > 0 && <span style={{ color: '#4caf50', marginLeft: 3 }}>+{bonus}</span>}
        </span>
      </div>
      {sharedWeaknesses.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 3 }}>
          {sharedWeaknesses.map((t: PokemonType) => <TypeBadge key={t} type={t} size="sm" />)}
        </div>
      )}
      {resistanceBonuses.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 2 }}>
          {resistanceBonuses.map((t: PokemonType) => (
            <span key={t} style={{
              fontSize: 10, background: '#1a2e1a', border: '1px solid #2a4a2a',
              borderRadius: 3, padding: '1px 4px', color: '#4caf50',
            }}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function PokemonColumn({ pokemon, team }: { pokemon: ParsedPokemon; team: ParsedPokemon[] }) {
  const { lang } = useLang()
  const [useMega, setUseMega] = useState(false)
  const hasMega = pokemon.megaTypes !== null
  const types = useMega && hasMega ? pokemon.megaTypes! : pokemon.types
  const candidates = rankSwitchIns(pokemon, team, useMega).slice(0, 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Pokemon header card */}
      <div style={{
        background: '#1e1e2e',
        border: '1px solid #333',
        borderRadius: 6,
        padding: '0.5rem 0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PokemonSprite src={getSpriteUrl(pokemon.normalizedName)} name={pokemonName(pokemon.normalizedName, lang)} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#eee', lineHeight: 1.3 }}>
                {pokemonName(pokemon.normalizedName, lang)}
              </span>
              {hasMega && (
                <button
                  onClick={() => setUseMega(v => !v)}
                  style={{
                    background: useMega ? '#f90' : '#2a2a3e',
                    color: useMega ? '#111' : '#888',
                    border: '1px solid #444',
                    borderRadius: 3,
                    padding: '1px 6px',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  ★M
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4 }}>
              {types.map((t: PokemonType) => <TypeBadge key={t} type={t} size="sm" />)}
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 switch-ins */}
      <div>
        {candidates.map((c, i) => (
          <CandidateMini key={c.pokemon.rawName} candidate={c} rank={i + 1} />
        ))}
      </div>
    </div>
  )
}

export function SwitchInAnalyzer({ team, activeIndices }: Props) {
  const displayTeam = activeIndices ? activeIndices.map(i => team[i]) : team

  if (displayTeam.length === 0) return null

  return (
    <section id="switch-in" style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: '0.5rem', color: '#ccc' }}>
        Switch-in analyzer
      </h2>
      <div style={{ fontSize: 11, color: '#555', marginBottom: '1rem' }}>
        Score = faiblesses partagées (bas = meilleur) · +N = résistances aux menaces actives · ★M = analyser en forme Méga
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${displayTeam.length}, 1fr)`,
        gap: '0.5rem',
      }}>
        {displayTeam.map((p, i) => (
          <PokemonColumn key={i} pokemon={p} team={displayTeam} />
        ))}
      </div>
    </section>
  )
}

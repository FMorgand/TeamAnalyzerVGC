import { useState } from 'react'
import type { ParsedPokemon } from '../lib/parseShowdown'
import type { SwitchInCandidate } from '../lib/teamAnalysis'
import { rankSwitchIns } from '../lib/teamAnalysis'
import type { PokemonType } from '../data/typeChart'
import { TypeBadge } from './TypeBadge'

interface Props {
  team: ParsedPokemon[]
}

function scoreColor(score: number): string {
  if (score === 0) return '#4caf50'
  if (score <= 2) return '#ff9800'
  return '#f44336'
}

function WeaknessList({ label, types, color }: { label: string; types: PokemonType[]; color: string }) {
  if (types.length === 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
      <span style={{ fontSize: 11, color, fontWeight: 700, minWidth: 70 }}>{label}</span>
      {types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
    </div>
  )
}

function CandidateRow({ candidate, rank }: { candidate: SwitchInCandidate; rank: number }) {
  const { pokemon, sharedWeaknesses, resistanceBonuses, score, bonus } = candidate
  const types = pokemon.megaTypes ?? pokemon.types
  const color = scoreColor(score)

  return (
    <div style={{
      background: '#1e1e2e',
      border: `1px solid #333`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 6,
      padding: '0.75rem 1rem',
      display: 'flex',
      gap: '1rem',
      alignItems: 'flex-start',
    }}>
      {/* Rank + score */}
      <div style={{ textAlign: 'center', minWidth: 36 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#555' }}>#{rank}</div>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color,
          marginTop: 2,
        }}>
          {score}
        </div>
        {bonus > 0 && (
          <div style={{ fontSize: 11, color: '#4caf50', marginTop: 1 }}>+{bonus}</div>
        )}
      </div>

      {/* Pokemon info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
          {pokemon.rawName}
          {pokemon.megaForm && (
            <span style={{ color: '#f90', fontSize: 11, marginLeft: 6 }}>★ Méga</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
          {types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
        </div>
        <WeaknessList
          label="Faiblesses communes"
          types={sharedWeaknesses}
          color="#f87"
        />
        <WeaknessList
          label="Résistances bonus"
          types={resistanceBonuses}
          color="#4caf50"
        />
      </div>
    </div>
  )
}

export function SwitchInAnalyzer({ team }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [useMega, setUseMega] = useState(false)

  if (team.length === 0) return null

  const activePokemon = team[activeIndex]
  const hasMega = activePokemon.megaTypes !== null

  // Reset mega toggle when switching active Pokemon
  const handleSelectPokemon = (i: number) => {
    setActiveIndex(i)
    setUseMega(false)
  }

  const candidates = rankSwitchIns(activePokemon, team, useMega)

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: '1rem', color: '#ccc' }}>
        Switch-in analyzer
      </h2>

      {/* Pokemon selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {team.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSelectPokemon(i)}
            style={{
              background: i === activeIndex ? '#3a3a5e' : '#1e1e2e',
              color: i === activeIndex ? '#fff' : '#888',
              border: `1px solid ${i === activeIndex ? '#6666aa' : '#333'}`,
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: 13,
              fontWeight: i === activeIndex ? 700 : 400,
              cursor: 'pointer',
            }}
          >
            {p.rawName}
            {p.megaTypes && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.6 }}>★</span>}
          </button>
        ))}
      </div>

      {/* Mega toggle for active Pokemon */}
      {hasMega && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
          <span style={{ fontSize: 12, color: '#666' }}>Analyser sous la forme :</span>
          <button
            onClick={() => setUseMega(false)}
            style={{
              background: !useMega ? '#3a3a5e' : '#1e1e2e',
              color: !useMega ? '#fff' : '#666',
              border: `1px solid ${!useMega ? '#6666aa' : '#333'}`,
              borderRadius: 4, padding: '2px 10px', fontSize: 12, cursor: 'pointer',
            }}
          >
            Base
          </button>
          <button
            onClick={() => setUseMega(true)}
            style={{
              background: useMega ? '#f90' : '#1e1e2e',
              color: useMega ? '#111' : '#666',
              border: `1px solid ${useMega ? '#f90' : '#333'}`,
              borderRadius: 4, padding: '2px 10px', fontSize: 12, cursor: 'pointer',
            }}
          >
            ★ Méga ({activePokemon.megaForm})
          </button>
        </div>
      )}

      {/* Legend */}
      <div style={{ fontSize: 11, color: '#555', marginBottom: '0.75rem' }}>
        Score = faiblesses partagées (bas = meilleur) · +N = types menaçants pour {activePokemon.rawName}{useMega ? ' Méga' : ''} que ce Pokémon résiste
      </div>

      {/* Candidates */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {candidates.map((c, i) => (
          <CandidateRow key={c.pokemon.rawName} candidate={c} rank={i + 1} />
        ))}
      </div>
    </section>
  )
}

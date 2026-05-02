import type { DefensiveProfile } from '../lib/teamAnalysis'
import type { PokemonType } from '../data/typeChart'
import { PokemonCard } from './PokemonCard'
import { TypeBadge } from './TypeBadge'

interface Props {
  profiles: DefensiveProfile[]
}

function WeaknessSummary({ profiles }: { profiles: DefensiveProfile[] }) {
  // Count how many Pokémon (using base form) are weak to each type
  const counts = new Map<PokemonType, number>()

  for (const profile of profiles) {
    for (const type of profile.weaknesses) {
      counts.set(type, (counts.get(type) ?? 0) + 1)
    }
  }

  // Keep only types where at least 2 Pokémon are weak, sorted by count desc
  const sorted = [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])

  if (sorted.length === 0) return (
    <div style={{ fontSize: 12, color: '#555', marginBottom: '1.25rem', fontStyle: 'italic' }}>
      Aucune faiblesse partagée par 2+ Pokémon.
    </div>
  )

  return (
    <div style={{
      background: '#1a1a2e',
      border: '1px solid #333',
      borderRadius: 8,
      padding: '0.75rem 1rem',
      marginBottom: '1.25rem',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
      alignItems: 'center',
    }}>
      <span style={{ fontSize: 12, color: '#666', marginRight: 4 }}>Faiblesses communes :</span>
      {sorted.map(([type, count]) => (
        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <TypeBadge type={type} size="sm" />
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: count >= 4 ? '#f55' : count >= 3 ? '#f87' : '#aaa',
          }}>
            ×{count}
          </span>
        </div>
      ))}
    </div>
  )
}

export function TeamOverview({ profiles }: Props) {
  if (profiles.length === 0) {
    return (
      <div style={{ color: '#555', fontStyle: 'italic', marginTop: '1rem' }}>
        Colle une équipe Showdown pour commencer.
      </div>
    )
  }

  return (
    <section>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: '1rem', color: '#ccc' }}>
        Faiblesses défensives
      </h2>
      <WeaknessSummary profiles={profiles} />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '1rem',
      }}>
        {profiles.map((profile, i) => (
          <PokemonCard key={i} profile={profile} />
        ))}
      </div>
    </section>
  )
}

import type { DefensiveProfile } from '../lib/teamAnalysis'
import { PokemonCard } from './PokemonCard'

interface Props {
  profiles: DefensiveProfile[]
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

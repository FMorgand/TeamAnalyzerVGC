import { useState } from 'react'
import type { ParsedPokemon } from '../lib/parseShowdown'
import { CoverageGraph } from './CoverageGraph'
import { CoverageMatrix } from './CoverageMatrix'

interface Props {
  team: ParsedPokemon[]
}

type Tab = 'graph' | 'matrix'

export function CoverageSection({ team }: Props) {
  const [tab, setTab] = useState<Tab>('matrix')

  if (team.length === 0) return null

  return (
    <section style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#ccc', margin: 0 }}>
          Couverture offensive
        </h2>
        <div style={{ display: 'flex', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 6, overflow: 'hidden' }}>
          {(['graph', 'matrix'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? '#3a3a5e' : 'transparent',
                color: tab === t ? '#eee' : '#555',
                border: 'none',
                padding: '4px 14px',
                fontSize: 12,
                fontWeight: tab === t ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              {t === 'graph' ? 'Graphique' : 'Grille'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'graph' ? <CoverageGraph team={team} /> : <CoverageMatrix team={team} />}
    </section>
  )
}

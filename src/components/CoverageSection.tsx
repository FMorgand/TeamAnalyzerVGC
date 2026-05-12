import { useState, useEffect } from 'react'
import type { ParsedPokemon } from '../lib/parseShowdown'
import { getOffensiveCoverage } from '../lib/teamAnalysis'
import { CoverageGraph } from './CoverageGraph'
import { CoverageMatrix } from './CoverageMatrix'
import { OffensiveCoverage } from './OffensiveCoverage'

interface Props {
  team: ParsedPokemon[]
  activeTrigger?: { indices: number[] } | null
}

type Tab = 'liste' | 'graph' | 'matrix'

const TAB_LABELS: Record<Tab, string> = {
  liste: 'Liste',
  graph: 'Graphique',
  matrix: 'Grille',
}

export function CoverageSection({ team, activeTrigger }: Props) {
  const [tab, setTab] = useState<Tab>('matrix')
  const [visible, setVisible] = useState<Set<number>>(new Set(team.map((_, i) => i)))

  useEffect(() => {
    if (activeTrigger != null) {
      setVisible(new Set(activeTrigger.indices))
    } else {
      setVisible(new Set(team.map((_, i) => i)))
    }
  }, [activeTrigger, team])

  if (team.length === 0) return null

  const toggle = (i: number) => {
    setVisible(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const visibleTeam = team.filter((_, i) => visible.has(i))
  const coverage = getOffensiveCoverage(visibleTeam)

  return (
    <section style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#ccc', margin: 0 }}>
          Couverture offensive
        </h2>
        <div style={{ display: 'flex', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 6, overflow: 'hidden' }}>
          {(['liste', 'graph', 'matrix'] as Tab[]).map(t => (
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
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {tab === 'liste'  && <OffensiveCoverage coverage={coverage} />}
      {tab === 'graph'  && <CoverageGraph team={team} visible={visible} onToggle={toggle} />}
      {tab === 'matrix' && <CoverageMatrix team={team} visible={visible} />}
    </section>
  )
}

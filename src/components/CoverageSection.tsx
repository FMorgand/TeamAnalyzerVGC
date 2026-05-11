import { useState, useEffect } from 'react'
import type { ParsedPokemon } from '../lib/parseShowdown'
import { getOffensiveCoverage } from '../lib/teamAnalysis'
import { useLang } from '../contexts/LangContext'
import { pokemonName } from '../lib/i18n'
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

const POKEMON_COLORS = ['#4fc3f7', '#81c784', '#ffb74d', '#f06292', '#ba68c8', '#4db6ac']

export function CoverageSection({ team, activeTrigger }: Props) {
  const { lang } = useLang()
  const [tab, setTab] = useState<Tab>('matrix')
  const [visible, setVisible] = useState<Set<number>>(new Set(team.map((_, i) => i)))

  useEffect(() => {
    if (activeTrigger) setVisible(new Set(activeTrigger.indices))
  }, [activeTrigger])

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

      {/* Shared Pokémon selector — persists across tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {team.map((p, i) => {
          const color = POKEMON_COLORS[i]
          const on = visible.has(i)
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              style={{
                background: on ? color + '22' : '#1e1e2e',
                color: on ? color : '#444',
                border: `2px solid ${on ? color : '#333'}`,
                borderRadius: 6,
                padding: '3px 12px',
                fontSize: 12,
                fontWeight: on ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              {pokemonName(p.normalizedName, lang)}
            </button>
          )
        })}
      </div>

      {tab === 'liste'  && <OffensiveCoverage coverage={coverage} />}
      {tab === 'graph'  && <CoverageGraph team={team} visible={visible} onToggle={toggle} />}
      {tab === 'matrix' && <CoverageMatrix team={team} visible={visible} />}
    </section>
  )
}

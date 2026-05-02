import { useState } from 'react'
import type { DefensiveProfile } from '../lib/teamAnalysis'
import type { PokemonType } from '../data/typeChart'
import { getDefensiveMultiplier } from '../data/typeChart'
import { TypeBadge } from './TypeBadge'

interface Props {
  profile: DefensiveProfile
}

function TypeRow({ label, types, color }: { label: string; types: PokemonType[]; color: string }) {
  if (types.length === 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, color, fontWeight: 700, minWidth: 22, textAlign: 'right' }}>{label}</span>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
      </div>
    </div>
  )
}

export function PokemonCard({ profile }: Props) {
  const hasMega = profile.megaWeaknesses !== null
  const [showMega, setShowMega] = useState(false)
  const useMega = hasMega && showMega

  const types = useMega ? profile.pokemon.megaTypes! : profile.pokemon.types
  const weaknesses = useMega ? profile.megaWeaknesses! : profile.weaknesses
  const immunities = useMega ? profile.megaImmunities! : profile.immunities
  const resistances = useMega ? profile.megaResistances! : profile.resistances

  const quadWeaknesses = weaknesses.filter(t => getDefensiveMultiplier(t, types) >= 4)
  const doubleWeaknesses = weaknesses.filter(t => getDefensiveMultiplier(t, types) === 2)

  const { pokemon } = profile

  return (
    <div style={{
      background: '#1e1e2e',
      border: '1px solid #333',
      borderRadius: 8,
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {pokemon.rawName}
            {useMega && <span style={{ color: '#f90', marginLeft: 6, fontSize: 12 }}>({pokemon.megaForm})</span>}
          </div>
          {pokemon.rawItem && (
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{pokemon.rawItem}</div>
          )}
        </div>
        {hasMega && (
          <button
            onClick={() => setShowMega(v => !v)}
            style={{
              background: showMega ? '#f90' : '#2a2a3e',
              color: showMega ? '#111' : '#aaa',
              border: '1px solid #444',
              borderRadius: 4,
              padding: '2px 10px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showMega ? '★ Méga' : 'Méga'}
          </button>
        )}
      </div>

      {/* Types */}
      <div style={{ display: 'flex', gap: 4 }}>
        {types.map(t => <TypeBadge key={t} type={t} />)}
      </div>

      {/* Defensive data */}
      <div style={{ borderTop: '1px solid #333', paddingTop: 8, fontSize: 12 }}>
        <TypeRow label="×4" types={quadWeaknesses} color="#f55" />
        <TypeRow label="×2" types={doubleWeaknesses} color="#f87" />
        <TypeRow label="×0" types={immunities} color="#8cf" />
        <TypeRow label="½" types={resistances} color="#8c8" />
        {weaknesses.length === 0 && immunities.length === 0 && (
          <div style={{ color: '#555', fontStyle: 'italic' }}>Aucune faiblesse</div>
        )}
      </div>
    </div>
  )
}

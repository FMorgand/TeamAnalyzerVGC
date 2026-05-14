import { useState } from 'react'
import type { ParsedPokemon } from '../lib/parseShowdown'
import type { MatchEntry } from '../lib/matchHistory'
import { PokemonSprite } from './PokemonSprite'
import { useLang } from '../contexts/LangContext'
import { pokemonName } from '../lib/i18n'
import { getSpriteUrl } from '../lib/sprites'

interface Props {
  entries: MatchEntry[]
  team: ParsedPokemon[]
  onUpdateEntry: (id: string, updates: Partial<Pick<MatchEntry, 'result' | 'notes'>>) => void
  onDeleteEntry: (id: string) => void
  onReloadEnemy: (entry: MatchEntry) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function ResultToggle({ result, onChange }: {
  result: 'win' | 'loss' | null
  onChange: (v: 'win' | 'loss' | null) => void
}) {
  const btn = (label: string, value: 'win' | 'loss' | null, activeColor: string, activeBg: string) => {
    const isActive = result === value
    return (
      <button
        onClick={() => onChange(isActive ? null : value)}
        style={{
          background: isActive ? activeBg : '#111120',
          border: `1px solid ${isActive ? activeColor : '#2a2a3e'}`,
          borderRadius: 4,
          color: isActive ? activeColor : '#444',
          fontSize: 10,
          fontWeight: isActive ? 700 : 400,
          padding: '3px 10px',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {label}
      </button>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {btn('Gagné', 'win', '#5caf60', '#1a2e1a')}
      {btn('Défaite', 'loss', '#c05050', '#2e1a1a')}
    </div>
  )
}

function MatchCard({ entry, team, onUpdate, onDelete, onReload }: {
  entry: MatchEntry
  team: ParsedPokemon[]
  onUpdate: (updates: Partial<Pick<MatchEntry, 'result' | 'notes'>>) => void
  onDelete: () => void
  onReload: () => void
}) {
  const { lang } = useLang()
  const [notes, setNotes] = useState(entry.notes)
  const [reloaded, setReloaded] = useState(false)

  const myPokemon = entry.myIndices.map(i => team[i]).filter(Boolean)
  const enemyFilled = entry.enemySlots.filter(s => s !== null)

  const handleNotesBlur = () => {
    if (notes !== entry.notes) onUpdate({ notes })
  }

  const handleReload = () => {
    onReload()
    setReloaded(true)
    setTimeout(() => setReloaded(false), 2000)
  }

  return (
    <div style={{
      background: '#111120',
      border: '1px solid #1e1e2e',
      borderRadius: 8,
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Header: date + delete */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#555' }}>{formatDate(entry.date)}</span>
          {entry.myPresetName && (
            <span style={{
              fontSize: 10, color: '#5a5a9e', background: '#1a1a3a',
              border: '1px solid #2a2a5e', borderRadius: 3, padding: '1px 6px',
            }}>
              {entry.myPresetName}
            </span>
          )}
        </div>
        <button
          onClick={onDelete}
          title="Supprimer cette partie"
          style={{
            background: 'none', border: 'none', color: '#333',
            fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: '0 2px',
          }}
        >
          ×
        </button>
      </div>

      {/* Teams row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* My team */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mon équipe</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {myPokemon.map((p, i) => (
              <div key={i} title={pokemonName(p.normalizedName, lang)}>
                <PokemonSprite src={getSpriteUrl(p.normalizedName)} name={pokemonName(p.normalizedName, lang)} size={36} />
              </div>
            ))}
          </div>
        </div>

        <span style={{ color: '#2a2a4e', fontSize: 18 }}>→</span>

        {/* Enemy team */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adversaire</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {enemyFilled.length === 0 ? (
              <span style={{ fontSize: 10, color: '#333', alignSelf: 'center' }}>—</span>
            ) : (
              enemyFilled.map((s, i) => (
                <div key={i} title={pokemonName(s!.key, lang)}>
                  <PokemonSprite src={getSpriteUrl(s!.key)} name={pokemonName(s!.key, lang)} size={36} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Result + reload */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <ResultToggle
          result={entry.result}
          onChange={v => onUpdate({ result: v })}
        />
        {enemyFilled.length > 0 && (
          <button
            onClick={handleReload}
            style={{
              background: reloaded ? '#1a2e1a' : '#1a1a2e',
              border: `1px solid ${reloaded ? '#3a6040' : '#2a2a4e'}`,
              borderRadius: 4,
              color: reloaded ? '#5caf60' : '#666',
              fontSize: 10,
              padding: '3px 10px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {reloaded ? 'Chargé ✓' : 'Recharger l\'équipe adverse'}
          </button>
        )}
      </div>

      {/* Notes */}
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={handleNotesBlur}
        placeholder="Notes sur la partie — ce qui a bien marché, ce qui n'a pas marché…"
        style={{
          background: '#0e0e1a',
          border: '1px solid #1e1e2e',
          borderRadius: 4,
          color: '#aaa',
          fontSize: 11,
          padding: '8px 10px',
          resize: 'vertical',
          minHeight: 56,
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1.5,
          outline: 'none',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = '#2a2a5e' }}
        onBlur={e => { e.currentTarget.style.borderColor = '#1e1e2e'; handleNotesBlur() }}
      />
    </div>
  )
}

export function MatchHistory({ entries, team, onUpdateEntry, onDeleteEntry, onReloadEnemy }: Props) {
  if (entries.length === 0) {
    return (
      <section id="historique" style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: '0.75rem', color: '#ccc' }}>
          Historique
        </h2>
        <div style={{ fontSize: 12, color: '#333', fontStyle: 'italic' }}>
          Aucune partie enregistrée. Utilise le bouton "Sauvegarder la partie" depuis la section Matchup.
        </div>
      </section>
    )
  }

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  const wins = entries.filter(e => e.result === 'win').length
  const losses = entries.filter(e => e.result === 'loss').length
  const total = entries.length

  return (
    <section id="historique" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#ccc', margin: 0 }}>Historique</h2>
        <span style={{ fontSize: 11, color: '#555' }}>
          {total} partie{total > 1 ? 's' : ''}
          {(wins + losses) > 0 && (
            <> · <span style={{ color: '#5caf60' }}>{wins}V</span> <span style={{ color: '#c05050' }}>{losses}D</span></>
          )}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map(entry => (
          <MatchCard
            key={entry.id}
            entry={entry}
            team={team}
            onUpdate={updates => onUpdateEntry(entry.id, updates)}
            onDelete={() => onDeleteEntry(entry.id)}
            onReload={() => onReloadEnemy(entry)}
          />
        ))}
      </div>
    </section>
  )
}

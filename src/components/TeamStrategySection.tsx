import { useState } from 'react'
import type { ParsedPokemon } from '../lib/parseShowdown'
import type { TeamPreset } from './TeamBanner'
import { PokemonSprite } from './PokemonSprite'
import { useLang } from '../contexts/LangContext'
import { pokemonName } from '../lib/i18n'
import { getSpriteUrl } from '../lib/sprites'

interface Props {
  team: ParsedPokemon[]
  presets: TeamPreset[]
  onSavePresets: (presets: TeamPreset[]) => void
  activeIndices: number[] | null
  onActivate: (indices: number[] | null) => void
}

function PokemonPair({ team, indices }: { team: ParsedPokemon[]; indices: number[] }) {
  const { lang } = useLang()
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {indices.map(idx => {
        const p = team[idx]
        if (!p) return null
        return (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <PokemonSprite src={getSpriteUrl(p.normalizedName)} name={pokemonName(p.normalizedName, lang)} size={56} />
            <span style={{ fontSize: 10, color: '#666', whiteSpace: 'nowrap' }}>
              {pokemonName(p.normalizedName, lang)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function StrategyRow({
  preset,
  index,
  team,
  isActive,
  onSave,
  onActivate,
  onDelete,
}: {
  preset: TeamPreset
  index: number
  team: ParsedPokemon[]
  isActive: boolean
  onSave: (updated: TeamPreset) => void
  onActivate: () => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [draftName, setDraftName] = useState(preset.name)
  const [draftNote, setDraftNote] = useState(preset.note ?? '')

  const leads = preset.indices.slice(0, 2)
  const back = preset.indices.slice(2, 4)

  const handleSave = () => {
    onSave({ ...preset, name: draftName.trim() || preset.name, note: draftNote })
    setEditing(false)
  }

  const handleCancel = () => {
    setDraftName(preset.name)
    setDraftNote(preset.note ?? '')
    setEditing(false)
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '36px 1fr 1fr 2fr auto',
      alignItems: 'center',
      gap: 0,
      borderBottom: '1px solid #1e1e2e',
      background: isActive ? '#141428' : 'transparent',
      transition: 'background 0.15s',
    }}>
      {/* Number badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 0',
        alignSelf: 'stretch',
        background: '#111120',
        borderRight: '1px solid #1e1e2e',
      }}>
        <div style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#2a2a4e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: '#8888cc',
        }}>
          {index + 1}
        </div>
      </div>

      {/* Leads */}
      <div style={{
        padding: '12px 16px',
        borderRight: '1px solid #1e1e2e',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        alignItems: 'center',
      }}>
        {editing ? (
          <input
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            style={{
              background: '#12121e',
              border: '1px solid #3a3a6e',
              borderRadius: 4,
              color: '#ccc',
              fontSize: 11,
              padding: '3px 7px',
              width: '100%',
              outline: 'none',
              marginBottom: 6,
            }}
          />
        ) : preset.name && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#8888cc',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {preset.name}
          </span>
        )}
        <PokemonPair team={team} indices={leads} />
      </div>

      {/* Back */}
      <div style={{
        padding: '12px 16px',
        borderRight: '1px solid #1e1e2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <PokemonPair team={team} indices={back} />
      </div>

      {/* Strategy note */}
      <div style={{
        padding: '12px 16px',
        borderRight: '1px solid #1e1e2e',
        alignSelf: 'stretch',
        display: 'flex',
        alignItems: 'center',
      }}>
        {editing ? (
          <textarea
            value={draftNote}
            onChange={e => setDraftNote(e.target.value)}
            placeholder="Décris le plan de jeu, le match-up ciblé…"
            rows={3}
            style={{
              width: '100%',
              background: '#12121e',
              border: '1px solid #3a3a6e',
              borderRadius: 4,
              color: '#ccc',
              fontSize: 12,
              padding: '6px 8px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        ) : preset.note ? (
          <p style={{ margin: 0, fontSize: 12, color: '#bbb', lineHeight: 1.6 }}>
            {preset.note}
          </p>
        ) : (
          <span style={{ fontSize: 11, color: '#333', fontStyle: 'italic' }}>
            Aucune note — cliquer ✎ pour en ajouter une
          </span>
        )}
      </div>

      {/* Edit controls */}
      <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
        {editing ? (
          <>
            <button
              onClick={handleSave}
              style={{
                background: '#1e3e22',
                border: '1px solid #3a7040',
                borderRadius: 4,
                color: '#7dc87e',
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 10px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Sauver
            </button>
            <button
              onClick={handleCancel}
              style={{
                background: 'transparent',
                border: '1px solid #2a2a3e',
                borderRadius: 4,
                color: '#555',
                fontSize: 11,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
          </>
        ) : confirming ? (
            <>
              <span style={{ fontSize: 10, color: '#c06060', whiteSpace: 'nowrap' }}>Supprimer ?</span>
              <button
                onClick={onDelete}
                style={{
                  background: '#3e1e1e',
                  border: '1px solid #7a3a3a',
                  borderRadius: 4,
                  color: '#d07070',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Oui
              </button>
              <button
                onClick={() => setConfirming(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #2a2a3e',
                  borderRadius: 4,
                  color: '#555',
                  fontSize: 11,
                  padding: '4px 10px',
                  cursor: 'pointer',
                }}
              >
                Non
              </button>
            </>
        ) : (
            <>
              <button
                onClick={onActivate}
                title={isActive ? 'Désactiver' : 'Activer ce preset'}
                style={{
                  background: isActive ? '#1e3e22' : 'transparent',
                  border: `1px solid ${isActive ? '#3a7040' : '#2a2a3e'}`,
                  borderRadius: 4,
                  color: isActive ? '#7dc87e' : '#555',
                  fontSize: 13,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                {isActive ? '■' : '▶'}
              </button>
              <button
                onClick={() => { setDraftName(preset.name); setDraftNote(preset.note ?? ''); setEditing(true) }}
                title="Modifier"
                style={{
                  background: 'transparent',
                  border: '1px solid #2a2a3e',
                  borderRadius: 4,
                  color: '#555',
                  fontSize: 14,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ✎
              </button>
              <button
                onClick={() => setConfirming(true)}
                title="Supprimer ce preset"
                style={{
                  background: 'transparent',
                  border: '1px solid #2a2a3e',
                  borderRadius: 4,
                  color: '#4a2a2a',
                  fontSize: 14,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </>
        )}
      </div>
    </div>
  )
}

export function TeamStrategySection({ team, presets, onSavePresets, activeIndices, onActivate }: Props) {
  if (presets.length === 0) return null

  const handleSaveRow = (index: number, updated: TeamPreset) => {
    const next = [...presets]
    next[index] = updated
    onSavePresets(next)
  }

  const handleDeleteRow = (index: number) => {
    onSavePresets(presets.filter((_, i) => i !== index))
  }

  const isPresetActive = (preset: TeamPreset) =>
    activeIndices !== null &&
    preset.indices.length >= 2 &&
    preset.indices.every(idx => activeIndices.includes(idx)) &&
    activeIndices.every(idx => preset.indices.includes(idx))

  const handleActivateRow = (preset: TeamPreset) => {
    if (isPresetActive(preset)) {
      onActivate(null)
    } else {
      onActivate(preset.indices)
    }
  }

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#ccc', margin: '0 0 0.75rem' }}>
        Stratégies
      </h2>

      <div style={{
        background: '#1a1a2e',
        border: '1px solid #2a2a3e',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '36px 1fr 1fr 2fr auto',
          background: '#111120',
          borderBottom: '2px solid #2a2a3e',
        }}>
          <div />
          {['Leads', 'Back', 'Stratégie'].map(label => (
            <div key={label} style={{
              padding: '8px 16px',
              fontSize: 11,
              fontWeight: 700,
              color: '#666',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              borderRight: '1px solid #1e1e2e',
              textAlign: 'center',
            }}>
              {label}
            </div>
          ))}
          <div />
        </div>

        {/* Rows */}
        {presets.map((preset, i) => (
          <StrategyRow
            key={preset.name}
            preset={preset}
            index={i}
            team={team}
            isActive={isPresetActive(preset)}
            onSave={updated => handleSaveRow(i, updated)}
            onActivate={() => handleActivateRow(preset)}
            onDelete={() => handleDeleteRow(i)}
          />
        ))}
      </div>
    </section>
  )
}

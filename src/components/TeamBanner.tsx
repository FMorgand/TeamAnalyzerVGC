import { useState, useMemo } from 'react'
import type { ParsedPokemon } from '../lib/parseShowdown'
import { TypeBadge } from './TypeBadge'
import { useLang } from '../contexts/LangContext'
import { pokemonName } from '../lib/i18n'

interface TeamPreset {
  name: string
  indices: number[] // order = L1, L2, B1, B2
}

interface Props {
  team: ParsedPokemon[]
  megaActive: Set<number>
  onMegaToggle: (i: number) => void
  onActivate: (indices: number[] | null) => void
}

const STORAGE_KEY = 'teamanalyzer-team-of-four'
const ROLES = ['L1', 'L2', 'B1', 'B2']

function loadPresets(): TeamPreset[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
  catch { return [] }
}

export function TeamBanner({ team, megaActive, onMegaToggle, onActivate }: Props) {
  const { lang } = useLang()
  const [presets, setPresets] = useState<TeamPreset[]>(loadPresets)
  const [activePresetName, setActivePresetName] = useState<string>('')
  const [addingMode, setAddingMode] = useState(false)
  const [draftIndices, setDraftIndices] = useState<number[]>([])
  const [draftName, setDraftName] = useState('')

  const activePreset = presets.find(p => p.name === activePresetName) ?? null

  // Reorder: preset members first (L1→L2→B1→B2), then remaining in original order
  const displayOrder = useMemo(() => {
    if (!activePreset || addingMode) return team.map((_, i) => i)
    const inPreset = activePreset.indices
    const rest = team.map((_, i) => i).filter(i => !inPreset.includes(i))
    return [...inPreset, ...rest]
  }, [activePreset, addingMode, team])

  const savePresets = (updated: TeamPreset[]) => {
    setPresets(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const handleSelectPreset = (name: string) => {
    setActivePresetName(name)
    if (name === '') {
      onActivate(null)
    } else {
      const preset = presets.find(p => p.name === name)
      if (preset) onActivate(preset.indices)
    }
  }

  const handleSavePreset = () => {
    if (!draftName.trim() || draftIndices.length < 2) return
    const newPreset: TeamPreset = { name: draftName.trim(), indices: draftIndices }
    const updated = [...presets.filter(p => p.name !== newPreset.name), newPreset]
    savePresets(updated)
    setActivePresetName(newPreset.name)
    onActivate(newPreset.indices)
    setAddingMode(false)
    setDraftIndices([])
    setDraftName('')
  }

  const handleCancelAdd = () => {
    setAddingMode(false)
    setDraftIndices([])
    setDraftName('')
  }

  const handleChipClick = (i: number) => {
    if (!addingMode) return
    setDraftIndices(prev => {
      if (prev.includes(i)) return prev.filter(x => x !== i)
      if (prev.length >= 4) return prev
      return [...prev, i]
    })
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 1.5rem',
      height: 68,
      borderTop: '1px solid #1e1e2e',
    }}>
      {/* Pokémon chips */}
      <div style={{ display: 'flex', gap: 5, flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {displayOrder.map(i => {
          const p = team[i]
          const inActivePreset = activePreset ? activePreset.indices.includes(i) : true
          const draftPos = draftIndices.indexOf(i)
          const isDraftSelected = draftPos >= 0
          const rolePos = activePreset?.indices.indexOf(i) ?? -1
          const isMega = megaActive.has(i)
          const hasMega = p.megaForm !== null
          const displayTypes = isMega && p.megaTypes ? p.megaTypes : p.types

          return (
            <div
              key={i}
              onClick={() => handleChipClick(i)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 3,
                padding: '5px 8px',
                borderRadius: 6,
                border: `1px solid ${
                  isDraftSelected ? '#3a6a3e'
                  : isMega ? '#8a6a10'
                  : inActivePreset ? '#2a2a5e'
                  : '#1a1a26'
                }`,
                background: isDraftSelected ? '#1a2e1a'
                  : isMega ? '#1e1a08'
                  : inActivePreset ? '#18183a'
                  : '#111120',
                opacity: !inActivePreset && !addingMode ? 0.3 : 1,
                cursor: addingMode ? 'pointer' : 'default',
                transition: 'opacity 0.15s, border-color 0.15s, background 0.15s',
                flexShrink: 1,
                minWidth: 0,
              }}
            >
              {/* Top row: role + name + mega btn */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                {/* Role label */}
                {addingMode && isDraftSelected && (
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#5caf60', flexShrink: 0 }}>
                    {ROLES[draftPos]}
                  </span>
                )}
                {!addingMode && activePreset && rolePos >= 0 && (
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#8888cc', flexShrink: 0 }}>
                    {ROLES[rolePos]}
                  </span>
                )}
                {/* Name */}
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: inActivePreset || addingMode ? '#ccc' : '#555',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 90,
                  flexShrink: 1,
                }}>
                  {pokemonName(p.normalizedName, lang)}
                </span>
                {/* Mega toggle */}
                {hasMega && !addingMode && (
                  <button
                    onClick={e => { e.stopPropagation(); onMegaToggle(i) }}
                    title={isMega ? 'Forme Méga active — cliquer pour désactiver' : 'Activer forme Méga'}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0 2px',
                      cursor: 'pointer',
                      fontSize: 11,
                      color: isMega ? '#f4c430' : '#444',
                      flexShrink: 0,
                      lineHeight: 1,
                    }}
                  >
                    △
                  </button>
                )}
              </div>

              {/* Bottom row: item + types */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                {p.rawItem && (
                  <span style={{
                    fontSize: 10,
                    color: isMega ? '#a08020' : '#555',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 80,
                    flexShrink: 1,
                  }}>
                    {p.rawItem}
                  </span>
                )}
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  {displayTypes.map(t => <TypeBadge key={t} type={t} size="sm" />)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Controls */}
      {!addingMode ? (
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
          <select
            value={activePresetName}
            onChange={e => handleSelectPreset(e.target.value)}
            style={{
              background: '#1a1a2e',
              border: '1px solid #2a2a4e',
              borderRadius: 5,
              color: '#bbb',
              fontSize: 12,
              padding: '4px 8px',
              cursor: 'pointer',
              maxWidth: 150,
            }}
          >
            <option value=''>Tous (6)</option>
            {presets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
          {activePreset && (
            <button
              onClick={() => handleSelectPreset('')}
              title="Revenir à la Team of 6"
              style={{
                background: 'none',
                border: '1px solid #2a2a4e',
                borderRadius: 5,
                color: '#666',
                fontSize: 14,
                padding: '2px 8px',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
          <button
            onClick={() => setAddingMode(true)}
            title="Créer un preset Team of 4"
            style={{
              background: '#1a1a2e',
              border: '1px solid #2a2a4e',
              borderRadius: 5,
              color: '#888',
              fontSize: 14,
              padding: '2px 9px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            +
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>
            {draftIndices.length}/4
          </span>
          <input
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSavePreset() }}
            placeholder="Nom du preset…"
            autoFocus
            style={{
              background: '#12121e',
              border: '1px solid #2a2a4e',
              borderRadius: 5,
              color: '#ccc',
              fontSize: 12,
              padding: '4px 8px',
              width: 130,
            }}
          />
          <button
            onClick={handleSavePreset}
            disabled={!draftName.trim() || draftIndices.length < 2}
            style={{
              background: draftName.trim() && draftIndices.length >= 2 ? '#1e3e22' : '#141420',
              border: `1px solid ${draftName.trim() && draftIndices.length >= 2 ? '#3a7040' : '#2a2a3e'}`,
              borderRadius: 5,
              color: draftName.trim() && draftIndices.length >= 2 ? '#7dc87e' : '#444',
              fontSize: 12,
              padding: '4px 10px',
              cursor: draftName.trim() && draftIndices.length >= 2 ? 'pointer' : 'not-allowed',
            }}
          >
            Sauver
          </button>
          <button
            onClick={handleCancelAdd}
            style={{
              background: 'none',
              border: '1px solid #2a2a3e',
              borderRadius: 5,
              color: '#666',
              fontSize: 12,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}

import { useState, useMemo, useEffect, Fragment } from 'react'
import type { ParsedPokemon } from '../lib/parseShowdown'
import { TypeBadge } from './TypeBadge'
import { PokemonSprite } from './PokemonSprite'
import { useLang } from '../contexts/LangContext'
import { pokemonName } from '../lib/i18n'
import { getSpriteUrl, getMegaSpriteUrl } from '../lib/sprites'

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

  // Drag state
  const [dragOrder, setDragOrder] = useState<number[] | null>(null)
  const [draggedPos, setDraggedPos] = useState<number | null>(null)
  const [dragOverPos, setDragOverPos] = useState<number | null>(null)

  const activePreset = presets.find(p => p.name === activePresetName) ?? null
  const isDirty = dragOrder !== null

  // Reset drag order when the active preset changes
  useEffect(() => { setDragOrder(null) }, [activePresetName])

  // Chip display order: preset members first, then the rest
  const displayOrder = useMemo(() => {
    if (!activePreset || addingMode) return team.map((_, i) => i)
    const inPreset = activePreset.indices
    const rest = team.map((_, i) => i).filter(i => !inPreset.includes(i))
    return [...inPreset, ...rest]
  }, [activePreset, addingMode, team])

  const workingOrder = dragOrder ?? displayOrder

  const savePresets = (updated: TeamPreset[]) => {
    setPresets(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  // ── Preset management ────────────────────────────────────────────────────

  const handleSelectPreset = (name: string) => {
    setActivePresetName(name)
    setDragOrder(null)
    if (name === '') {
      onActivate(null)
    } else {
      const preset = presets.find(p => p.name === name)
      if (preset) onActivate(preset.indices)
    }
  }

  const handleSaveToCurrent = () => {
    if (!activePreset || !dragOrder) return
    const newIndices = dragOrder.slice(0, 4)
    const updated = presets.map(p =>
      p.name === activePresetName ? { ...p, indices: newIndices } : p
    )
    savePresets(updated)
    onActivate(newIndices)
    setDragOrder(null)
  }

  const handleOpenAddingMode = () => {
    // Pre-fill from drag order if available, otherwise start fresh
    setDraftIndices(dragOrder ? dragOrder.slice(0, 4) : [])
    setDraftName('')
    setAddingMode(true)
  }

  const handleSaveNewPreset = () => {
    if (!draftName.trim() || draftIndices.length < 2) return
    const newPreset: TeamPreset = { name: draftName.trim(), indices: draftIndices }
    const updated = [...presets.filter(p => p.name !== newPreset.name), newPreset]
    savePresets(updated)
    setActivePresetName(newPreset.name)
    onActivate(newPreset.indices)
    setAddingMode(false)
    setDragOrder(null)
    setDraftIndices([])
    setDraftName('')
  }

  const handleCancelAdd = () => {
    setAddingMode(false)
    setDraftIndices([])
    setDraftName('')
  }

  const handleChipClick = (teamIdx: number) => {
    if (!addingMode) return
    setDraftIndices(prev => {
      if (prev.includes(teamIdx)) return prev.filter(x => x !== teamIdx)
      if (prev.length >= 4) return prev
      return [...prev, teamIdx]
    })
  }

  // ── Drag & drop ──────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, pos: number) => {
    setDraggedPos(pos)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, pos: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverPos !== pos) setDragOverPos(pos)
  }

  const handleDragEnd = () => {
    setDraggedPos(null)
    setDragOverPos(null)
  }

  const handleDrop = (e: React.DragEvent, targetPos: number) => {
    e.preventDefault()
    if (draggedPos === null || draggedPos === targetPos) {
      setDraggedPos(null)
      setDragOverPos(null)
      return
    }
    const newOrder = [...workingOrder]
    const [moved] = newOrder.splice(draggedPos, 1)
    newOrder.splice(targetPos, 0, moved)
    setDragOrder(newOrder)
    setDraggedPos(null)
    setDragOverPos(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const hasPresetContext = activePreset !== null || isDirty

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 1.5rem',
      height: 78,
      borderTop: '1px solid #1e1e2e',
    }}>
      {/* Pokémon chips */}
      <div style={{ display: 'flex', gap: 5, flex: 1, minWidth: 0, overflow: 'hidden', alignItems: 'center' }}>
        {workingOrder.map((teamIdx, pos) => {
          const p = team[teamIdx]
          const isMega = megaActive.has(teamIdx)
          const hasMega = p.megaForm !== null
          const displayTypes = isMega && p.megaTypes ? p.megaTypes : p.types
          const spriteUrl = isMega && p.megaForm
            ? getMegaSpriteUrl(p.normalizedName, p.megaForm)
            : getSpriteUrl(p.normalizedName)

          // Role label
          const draftPos = draftIndices.indexOf(teamIdx)
          const rolePos = addingMode
            ? draftPos
            : isDirty ? (pos < 4 ? pos : -1)
            : (activePreset?.indices.indexOf(teamIdx) ?? -1)

          // Visual state
          const isInPresetSlot = !addingMode && hasPresetContext && pos < 4
          const isDraftSelected = addingMode && draftPos >= 0
          const isDragging = draggedPos === pos
          const isDragOver = dragOverPos === pos && draggedPos !== pos
          const dimmed = !addingMode && hasPresetContext && pos >= 4 && !isDragging

          return (
            <Fragment key={teamIdx}>
              {/* Separator between Team of 4 and bench */}
              {pos === 4 && team.length >= 5 && hasPresetContext && (
                <div style={{
                  width: 1,
                  alignSelf: 'stretch',
                  background: '#2a2a4e',
                  margin: '10px 2px',
                  flexShrink: 0,
                }} />
              )}
              <div
                draggable={!addingMode}
                onClick={() => handleChipClick(teamIdx)}
                onDragStart={e => handleDragStart(e, pos)}
                onDragOver={e => handleDragOver(e, pos)}
                onDragEnd={handleDragEnd}
                onDrop={e => handleDrop(e, pos)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 3,
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: `1px solid ${
                    isDragOver    ? '#5a5aae'
                    : isDraftSelected ? '#3a6a3e'
                    : isMega      ? '#8a6a10'
                    : isInPresetSlot ? '#2a2a5e'
                    : '#1a1a26'
                  }`,
                  background:
                    isDragOver    ? '#20204e'
                    : isDraftSelected ? '#1a2e1a'
                    : isMega      ? '#1e1a08'
                    : isInPresetSlot ? '#18183a'
                    : '#111120',
                  opacity: isDragging ? 0.3 : dimmed ? 0.3 : 1,
                  cursor: addingMode ? 'pointer' : 'grab',
                  transition: 'opacity 0.15s, border-color 0.15s, background 0.15s',
                  flexShrink: 1,
                  minWidth: 0,
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                {/* Sprite */}
                <PokemonSprite src={spriteUrl} name={pokemonName(p.normalizedName, lang)} size={44} />

                {/* Text content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
                {/* Mega button — top-right of card */}
                {hasMega && !addingMode && (
                  <button
                    draggable={false}
                    onClick={e => { e.stopPropagation(); onMegaToggle(teamIdx) }}
                    onDragStart={e => e.stopPropagation()}
                    title={isMega ? 'Forme Méga active — cliquer pour désactiver' : 'Activer forme Méga'}
                    style={{
                      position: 'absolute',
                      top: 3,
                      right: 3,
                      background: isMega ? '#1a3a1a' : '#1e1e2e',
                      border: `1px solid ${isMega ? '#3a7040' : '#333'}`,
                      borderRadius: 3,
                      color: isMega ? '#7dc87e' : '#555',
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '1px 5px',
                      cursor: 'pointer',
                      lineHeight: 1.4,
                      userSelect: 'none',
                    }}
                  >
                    Méga
                  </button>
                )}

                {/* Top row: role + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                  {rolePos >= 0 && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: isDraftSelected ? '#5caf60' : isDirty ? '#999' : '#8888cc',
                      flexShrink: 0,
                    }}>
                      {ROLES[rolePos]}
                    </span>
                  )}
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: dimmed ? '#555' : '#ccc',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 90,
                    flexShrink: 1,
                  }}>
                    {pokemonName(p.normalizedName, lang)}
                  </span>
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

                {/* Ability row */}
                {p.ability && (
                  <div style={{
                    fontSize: 10,
                    color: dimmed ? '#444' : '#555',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 110,
                  }}>
                    {p.ability}
                  </div>
                )}
                </div>{/* end text content */}
                </div>{/* end sprite+text row */}
              </div>
            </Fragment>
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

          {isDirty && activePreset && (
            <>
              <button
                onClick={handleSaveToCurrent}
                title={`Sauvegarder dans "${activePreset.name}"`}
                style={{
                  background: '#1e3e22',
                  border: '1px solid #3a7040',
                  borderRadius: 5,
                  color: '#7dc87e',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 10px',
                  cursor: 'pointer',
                }}
              >
                Sauver
              </button>
              <button
                onClick={() => setDragOrder(null)}
                title={`Revenir à l'ordre de "${activePreset.name}"`}
                style={{
                  background: 'none',
                  border: '1px solid #2a2a4e',
                  borderRadius: 5,
                  color: '#666',
                  fontSize: 12,
                  padding: '4px 10px',
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </>
          )}

          <button
            onClick={handleOpenAddingMode}
            title="Créer un nouveau preset"
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
            onKeyDown={e => { if (e.key === 'Enter') handleSaveNewPreset() }}
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
            onClick={handleSaveNewPreset}
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

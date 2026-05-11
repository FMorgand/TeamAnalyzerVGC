import { useState } from 'react'
import type { ParsedPokemon } from '../lib/parseShowdown'
import type { Lang } from '../lib/i18n'
import { pokemonName } from '../lib/i18n'
import { TypeBadge } from './TypeBadge'
import { useLang } from '../contexts/LangContext'

interface Preset {
  name: string
  indices: number[]
}

interface Props {
  team: ParsedPokemon[]
  onActivate: (indices: number[]) => void
}

const STORAGE_KEY = 'teamanalyzer-team-of-four'
const POKEMON_COLORS = ['#4fc3f7', '#81c784', '#ffb74d', '#f06292', '#ba68c8', '#4db6ac']

function loadPresets(): Preset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return []
}

function PokemonChip({ pokemon, color, active, lang }: {
  pokemon: ParsedPokemon | undefined
  color: string
  active: boolean
  lang: Lang
}) {
  if (!pokemon) return (
    <span style={{ fontSize: 11, color: '#222', background: '#111', borderRadius: 4, padding: '2px 8px' }}>?</span>
  )
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 3,
      background: active ? color + '18' : '#111122',
      border: `1px solid ${active ? color + '55' : '#1e1e2e'}`,
      borderRadius: 4, padding: '2px 7px',
    }}>
      <span style={{ fontSize: 11, color: active ? color : '#555', fontWeight: 600 }}>
        {pokemonName(pokemon.normalizedName, lang)}
      </span>
      <div style={{ display: 'flex', gap: 2 }}>
        {pokemon.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
      </div>
    </div>
  )
}

export function TeamOfFourSection({ team, onActivate }: Props) {
  const { lang } = useLang()
  const [presets, setPresets] = useState<Preset[]>(loadPresets)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [editing, setEditing] = useState<{ index: number | 'new'; name: string; indices: number[] } | null>(null)

  if (team.length === 0) return null

  const savePresets = (next: Preset[]) => {
    setPresets(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const handleActivate = (i: number) => {
    setActiveIndex(i)
    onActivate(presets[i].indices)
  }

  const startNew = () => {
    if (presets.length >= 10) return
    setEditing({ index: 'new', name: `Team ${presets.length + 1}`, indices: [] })
  }

  const startEdit = (i: number) => {
    setEditing({ index: i, name: presets[i].name, indices: [...presets[i].indices] })
  }

  const deletePreset = (i: number) => {
    savePresets(presets.filter((_, idx) => idx !== i))
    if (activeIndex === i) setActiveIndex(null)
    else if (activeIndex !== null && activeIndex > i) setActiveIndex(activeIndex - 1)
  }

  const toggleEditIndex = (pi: number) => {
    if (!editing) return
    const current = editing.indices
    if (current.includes(pi)) {
      setEditing({ ...editing, indices: current.filter(x => x !== pi) })
    } else if (current.length < 4) {
      setEditing({ ...editing, indices: [...current, pi] })
    }
  }

  const saveEdit = () => {
    if (!editing || editing.indices.length !== 4) return
    const preset: Preset = { name: editing.name.trim() || 'Team', indices: editing.indices }
    const next = editing.index === 'new'
      ? [...presets, preset]
      : presets.map((p, i) => i === editing.index ? preset : p)
    savePresets(next)
    setEditing(null)
  }

  const POS_LABELS = ['L1', 'L2', 'B1', 'B2']

  return (
    <section style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#ccc', margin: 0 }}>Team of 4</h2>
        {presets.length < 10 && !editing && (
          <button
            onClick={startNew}
            style={{
              background: '#1a1a2e', border: '1px solid #3a3a5e', borderRadius: 5,
              color: '#6666aa', fontSize: 12, padding: '3px 10px', cursor: 'pointer',
            }}
          >
            + Nouveau
          </button>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{
          background: '#1a1a2e', border: '1px solid #2a2a4e', borderRadius: 8,
          padding: '0.75rem 1rem', marginBottom: '0.75rem',
        }}>
          <input
            value={editing.name}
            onChange={e => setEditing({ ...editing, name: e.target.value })}
            placeholder="Nom…"
            style={{
              background: '#111122', border: '1px solid #2a2a3e', borderRadius: 4,
              color: '#eee', fontSize: 12, padding: '4px 8px', marginBottom: '0.5rem',
              outline: 'none', width: 200, display: 'block',
            }}
          />
          <div style={{ fontSize: 10, color: '#444', marginBottom: '0.4rem' }}>
            Clique dans l'ordre : lead 1, lead 2, backup 1, backup 2
          </div>

          {/* Team picker */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {team.map((p, pi) => {
              const position = editing.indices.indexOf(pi)
              const selected = position !== -1
              const color = POKEMON_COLORS[pi]
              return (
                <button
                  key={pi}
                  onClick={() => toggleEditIndex(pi)}
                  style={{
                    background: selected ? color + '22' : '#181828',
                    border: `2px solid ${selected ? color : '#2a2a3e'}`,
                    borderRadius: 6, padding: '3px 10px', fontSize: 12,
                    color: selected ? color : '#444', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                    opacity: !selected && editing.indices.length >= 4 ? 0.3 : 1,
                  }}
                >
                  {selected && (
                    <span style={{ fontSize: 9, fontWeight: 800, opacity: 0.8 }}>
                      {POS_LABELS[position]}
                    </span>
                  )}
                  {pokemonName(p.normalizedName, lang)}
                </button>
              )
            })}
          </div>

          {/* Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: '0.6rem' }}>
            <span style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lead</span>
            {[0, 1].map(i => (
              <span key={i} style={{
                fontSize: 11, borderRadius: 4, padding: '2px 8px',
                color: editing.indices[i] !== undefined ? POKEMON_COLORS[editing.indices[i]] : '#2a2a3e',
                background: '#111122', border: '1px solid #1e1e2e',
              }}>
                {editing.indices[i] !== undefined ? pokemonName(team[editing.indices[i]].normalizedName, lang) : '—'}
              </span>
            ))}
            <span style={{ color: '#2a2a3e' }}>·</span>
            {[2, 3].map(i => (
              <span key={i} style={{
                fontSize: 11, borderRadius: 4, padding: '2px 8px',
                color: editing.indices[i] !== undefined ? POKEMON_COLORS[editing.indices[i]] : '#2a2a3e',
                background: '#111122', border: '1px solid #1e1e2e',
              }}>
                {editing.indices[i] !== undefined ? pokemonName(team[editing.indices[i]].normalizedName, lang) : '—'}
              </span>
            ))}
            <span style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Backup</span>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={saveEdit}
              disabled={editing.indices.length !== 4}
              style={{
                background: editing.indices.length === 4 ? '#3a3a6e' : '#1a1a2e',
                border: '1px solid #3a3a5e', borderRadius: 5,
                color: editing.indices.length === 4 ? '#ddd' : '#333',
                fontSize: 11, padding: '4px 14px',
                cursor: editing.indices.length === 4 ? 'pointer' : 'default',
              }}
            >
              Enregistrer
            </button>
            <button
              onClick={() => setEditing(null)}
              style={{
                background: 'transparent', border: '1px solid #2a2a3e',
                borderRadius: 5, color: '#555', fontSize: 11,
                padding: '4px 14px', cursor: 'pointer',
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Preset list */}
      {presets.length === 0 && !editing && (
        <div style={{ fontSize: 11, color: '#333', fontStyle: 'italic' }}>
          Aucun preset — clique sur "+ Nouveau" pour commencer.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {presets.map((preset, i) => {
          const isActive = activeIndex === i
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: isActive ? '#1a1a2e' : '#141422',
              border: `1px solid ${isActive ? '#3a3a6e' : '#1e1e2e'}`,
              borderRadius: 7, padding: '6px 10px',
            }}>
              {/* Activate button */}
              <button
                onClick={() => handleActivate(i)}
                title="Appliquer à toutes les sections"
                style={{
                  background: isActive ? '#3a3a6e' : '#1a1a2e',
                  border: `1px solid ${isActive ? '#5a5aae' : '#2a2a3e'}`,
                  borderRadius: 5, color: isActive ? '#aaaaff' : '#444',
                  fontSize: 11, width: 26, height: 26, cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ▶
              </button>

              {/* Name */}
              <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#ccc' : '#555', minWidth: 72, flexShrink: 0 }}>
                {preset.name}
              </span>

              {/* 4 Pokémon chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lead</span>
                {preset.indices.slice(0, 2).map((pi, si) => (
                  <PokemonChip key={si} pokemon={team[pi]} color={POKEMON_COLORS[pi]} active={isActive} lang={lang} />
                ))}
                <span style={{ color: '#1e1e2e', fontSize: 14, margin: '0 1px' }}>·</span>
                {preset.indices.slice(2, 4).map((pi, si) => (
                  <PokemonChip key={si} pokemon={team[pi]} color={POKEMON_COLORS[pi]} active={isActive} lang={lang} />
                ))}
                <span style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Backup</span>
              </div>

              {/* Edit / Delete */}
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <button
                  onClick={() => startEdit(i)}
                  style={{ background: 'none', border: 'none', color: '#444', fontSize: 12, cursor: 'pointer', padding: '0 5px' }}
                >✏</button>
                <button
                  onClick={() => deletePreset(i)}
                  style={{ background: 'none', border: 'none', color: '#444', fontSize: 15, cursor: 'pointer', padding: '0 5px' }}
                >×</button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

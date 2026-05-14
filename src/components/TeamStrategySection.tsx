import { useState, useMemo } from 'react'
import type { ParsedPokemon } from '../lib/parseShowdown'
import type { TeamPreset } from './TeamBanner'
import { PokemonSprite } from './PokemonSprite'
import { useLang } from '../contexts/LangContext'
import { pokemonName, moveName } from '../lib/i18n'
import { getSpriteUrl } from '../lib/sprites'
import { TypeBadge } from './TypeBadge'
import { typeChart } from '../data/typeChart'
import type { PokemonType } from '../data/typeChart'
import movesData from '../data/moves.json'
import vgcStatsData from '../data/vgc-stats.json'

// ─── Threat analysis ─────────────────────────────────────────────────────────

type MoveEntry = { type: string; power: number | null; category?: string }
const MOVES_DB = movesData as Record<string, MoveEntry>

interface VGCPokemonStats { usage: number; moves: { key: string; pct: number }[] }
const VGC_STATS = (vgcStatsData as unknown as { pokemon: Record<string, VGCPokemonStats> }).pokemon

interface ThreatMove {
  moveKey: string
  moveType: PokemonType
  hitIndices: number[]
}

interface GroupedThreat {
  pokemonKey: string
  moves: ThreatMove[]
  hasCritical: boolean
  uniqueHitCount: number
  totalHitCount: number
}

const META_POOL_SIZE = 35

function analyzePresetThreats(preset: TeamPreset, team: ParsedPokemon[]): GroupedThreat[] {
  const members = preset.indices.map(i => team[i])

  const metaPool = Object.entries(VGC_STATS)
    .sort((a, b) => b[1].usage - a[1].usage)
    .slice(0, META_POOL_SIZE)

  const result: GroupedThreat[] = []

  for (const [pokemonKey, stats] of metaPool) {
    const offensiveMoves = stats.moves
      .slice(0, 8)
      .filter(m => {
        const e = MOVES_DB[m.key]
        return e?.power && e.power > 0 && e.category !== 'status'
      })

    const qualifyingMoves: ThreatMove[] = []

    for (const moveData of offensiveMoves) {
      const entry = MOVES_DB[moveData.key]
      if (!entry?.type) continue

      const hitIndices = members
        .map((p, mi) => {
          if (!p) return null
          const mult = p.types.reduce(
            (acc, t) => acc * (typeChart[entry.type as PokemonType]?.[t as PokemonType] ?? 1),
            1,
          )
          return mult >= 2 ? mi : null
        })
        .filter((x): x is number => x !== null)

      if (hitIndices.length >= 2)
        qualifyingMoves.push({ moveKey: moveData.key, moveType: entry.type as PokemonType, hitIndices })
    }

    if (qualifyingMoves.length === 0) continue

    const uniqueHitCount = new Set(qualifyingMoves.flatMap(m => m.hitIndices)).size
    const totalHitCount = qualifyingMoves.reduce((acc, m) => acc + m.hitIndices.length, 0)
    const hasCritical = qualifyingMoves.some(m => m.hitIndices.includes(0) && m.hitIndices.includes(1))

    result.push({ pokemonKey, moves: qualifyingMoves, hasCritical, uniqueHitCount, totalHitCount })
  }

  return result.sort((a, b) => {
    if (a.hasCritical !== b.hasCritical) return a.hasCritical ? -1 : 1
    if (a.uniqueHitCount !== b.uniqueHitCount) return b.uniqueHitCount - a.uniqueHitCount
    return b.totalHitCount - a.totalHitCount
  })
}

function GroupedThreatRow({ threat, members, lang }: { threat: GroupedThreat; members: (ParsedPokemon | undefined)[]; lang: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, background: '#111120', borderRadius: 6, padding: '8px 10px', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 44, flexShrink: 0 }}>
        <PokemonSprite src={getSpriteUrl(threat.pokemonKey)} name={pokemonName(threat.pokemonKey, lang)} size={36} />
        <span style={{ fontSize: 9, color: '#888', whiteSpace: 'nowrap', textAlign: 'center', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {pokemonName(threat.pokemonKey, lang)}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
        {threat.moves.map((move, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TypeBadge type={move.moveType} size="sm" />
            <span style={{ fontSize: 11, color: '#aaa', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {moveName(move.moveKey, lang)}
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
              {move.hitIndices.map(idx => {
                const p = members[idx]
                if (!p) return null
                const mult = p.types.reduce((acc, t) => acc * (typeChart[move.moveType]?.[t as PokemonType] ?? 1), 1)
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <PokemonSprite src={getSpriteUrl(p.normalizedName)} name={pokemonName(p.normalizedName, lang)} size={24} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: mult >= 4 ? '#f55' : '#c8a040' }}>×{mult}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ThreatSection({ title, subtitle, color, threats, members, lang }: {
  title: string; subtitle: string; color: string
  threats: GroupedThreat[]; members: (ParsedPokemon | undefined)[]; lang: string
}) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title}
      </div>
      <div style={{ fontSize: 10, color: '#555', marginBottom: 8 }}>{subtitle}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {threats.map((t, i) => <GroupedThreatRow key={i} threat={t} members={members} lang={lang} />)}
      </div>
    </div>
  )
}

function ThreatAnalysisModal({ preset, team, onClose }: {
  preset: TeamPreset; team: ParsedPokemon[]; onClose: () => void
}) {
  const { lang } = useLang()
  const threats = useMemo(() => analyzePresetThreats(preset, team), [preset, team])
  const members = preset.indices.map(i => team[i])
  const critical = threats.filter(t => t.hasCritical)
  const notable = threats.filter(t => !t.hasCritical)

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#16162a', border: '1px solid #2a2a4e', borderRadius: 10, padding: '1.25rem 1.5rem', width: 660, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.8)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#eee' }}>
            Analyse — {preset.name || 'Team de 4'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Team of 4 */}
        <div style={{ display: 'flex', gap: 24, marginBottom: '1.5rem', background: '#111120', borderRadius: 8, padding: '10px 16px' }}>
          {[{ label: 'Leads', slice: [0, 2] as [number, number] }, { label: 'Back', slice: [2, 4] as [number, number] }].map(({ label, slice }, si) => (
            <div key={label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {si > 0 && <div style={{ width: 1, background: '#2a2a3e', alignSelf: 'stretch' }} />}
              <div>
                <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {members.slice(slice[0], slice[1]).map((p, i) => p ? (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <PokemonSprite src={getSpriteUrl(p.normalizedName)} name={pokemonName(p.normalizedName, lang)} size={44} />
                      <div style={{ fontSize: 9, color: '#666', marginTop: 3 }}>{pokemonName(p.normalizedName, lang)}</div>
                    </div>
                  ) : null)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Results */}
        {threats.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#4caf50', fontSize: 13, padding: '2rem 0' }}>
            Aucune menace significative détectée dans le top méta.
          </div>
        ) : (
          <>
            {critical.length > 0 && (
              <ThreatSection
                title="Menaces critiques"
                subtitle={`Une attaque touche les 2 leads en ×2 ou plus (top ${META_POOL_SIZE} méta)`}
                color="#c06060"
                threats={critical}
                members={members}
                lang={lang}
              />
            )}
            {notable.length > 0 && (
              <ThreatSection
                title="Menaces notables"
                subtitle={`Une attaque touche 2+ membres en ×2 ou plus (top ${META_POOL_SIZE} méta)`}
                color="#c09040"
                threats={notable}
                members={members}
                lang={lang}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Section components ───────────────────────────────────────────────────────

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
  onAnalyze,
}: {
  preset: TeamPreset
  index: number
  team: ParsedPokemon[]
  isActive: boolean
  onSave: (updated: TeamPreset) => void
  onActivate: () => void
  onDelete: () => void
  onAnalyze: () => void
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
                onClick={onAnalyze}
                title="Analyser les menaces"
                style={{
                  background: 'transparent',
                  border: '1px solid #2a2a3e',
                  borderRadius: 4,
                  color: '#555',
                  fontSize: 12,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ⚑
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
  const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null)

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
            onAnalyze={() => setAnalyzingIndex(i)}
          />
        ))}
      </div>

      {analyzingIndex !== null && presets[analyzingIndex] && (
        <ThreatAnalysisModal
          preset={presets[analyzingIndex]}
          team={team}
          onClose={() => setAnalyzingIndex(null)}
        />
      )}
    </section>
  )
}

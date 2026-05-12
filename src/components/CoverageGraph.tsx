import type { ParsedPokemon } from '../lib/parseShowdown'
import { ALL_TYPES, typeChart } from '../data/typeChart'
import type { PokemonType } from '../data/typeChart'
import { useLang } from '../contexts/LangContext'
import { pokemonName } from '../lib/i18n'

interface Props {
  team: ParsedPokemon[]
  visible: Set<number>
  onToggle: (i: number) => void
}

const POKEMON_COLORS = ['#4fc3f7', '#81c784', '#ffb74d', '#f06292', '#ba68c8', '#4db6ac']

const TYPE_BG: Record<PokemonType, string> = {
  normal:   '#A8A878', fire:     '#F08030', water:    '#6890F0',
  electric: '#F8D030', grass:    '#78C850', ice:      '#98D8D8',
  fighting: '#C03028', poison:   '#A040A0', ground:   '#E0C068',
  flying:   '#A890F0', psychic:  '#F85888', bug:      '#A8B820',
  rock:     '#B8A038', ghost:    '#705898', dragon:   '#7038F8',
  dark:     '#705848', steel:    '#B8B8D0', fairy:    '#EE99AC',
}

// SVG viewport
const W = 1000
const H = 280
const POKE_Y = 44
const TYPE_Y = 230
const NODE_R = 18

function pokeX(i: number, total: number): number {
  const margin = 80
  return margin + (i * (W - margin * 2)) / Math.max(total - 1, 1)
}

function typeX(i: number): number {
  const margin = 28
  return margin + (i * (W - margin * 2)) / 17
}

function curve(x1: number, y1: number, x2: number, y2: number): string {
  const cy = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`
}

interface Hit {
  typeIndex: number
  multiplier: number
}

function getHits(pokemon: ParsedPokemon): Hit[] {
  const seen = new Map<number, number>()
  for (const move of pokemon.moves) {
    if (!move.type || !move.power || move.power <= 0) continue
    ALL_TYPES.forEach((t, ti) => {
      const mult = typeChart[move.type!][t]
      if (mult >= 2) {
        const prev = seen.get(ti) ?? 0
        if (mult > prev) seen.set(ti, mult)
      }
    })
  }
  return [...seen.entries()].map(([typeIndex, multiplier]) => ({ typeIndex, multiplier }))
}

export function CoverageGraph({ team, visible, onToggle }: Props) {
  const { lang } = useLang()

  if (team.length === 0) return null

  const allHits = team.map(getHits)

  return (
    <div>
      <div style={{ fontSize: 11, color: '#555', marginBottom: '0.75rem' }}>
        Trait épais = ×4 · Trait fin = ×2 · Clique sur un nœud Pokémon pour masquer ses flèches
      </div>

      {/* SVG graph */}
      <div style={{ background: '#1a1a2e', borderRadius: 8, border: '1px solid #2a2a3e', padding: '8px 0' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', display: 'block' }}
          aria-hidden="true"
        >
          {/* Curves */}
          {team.map((_, pi) => {
            if (!visible.has(pi)) return null
            const color = POKEMON_COLORS[pi]
            const px = pokeX(pi, team.length)
            return allHits[pi].map(({ typeIndex, multiplier }) => (
              <path
                key={`${pi}-${typeIndex}`}
                d={curve(px, POKE_Y + NODE_R, typeX(typeIndex), TYPE_Y - NODE_R)}
                fill="none"
                stroke={color}
                strokeWidth={multiplier >= 4 ? 2.5 : 1}
                strokeOpacity={multiplier >= 4 ? 0.9 : 0.45}
              />
            ))
          })}

          {/* Type nodes (bottom row) */}
          {ALL_TYPES.map((type, ti) => {
            const x = typeX(ti)
            const bg = TYPE_BG[type]
            return (
              <g key={type}>
                <rect
                  x={x - 22} y={TYPE_Y - NODE_R}
                  width={44} height={NODE_R * 2}
                  rx={4} fill={bg}
                />
                <text
                  x={x} y={TYPE_Y + 5}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={600}
                  fill="#fff"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}
                >
                  {type}
                </text>
              </g>
            )
          })}

          {/* Pokémon nodes (top row) */}
          {team.map((p, pi) => {
            const x = pokeX(pi, team.length)
            const color = POKEMON_COLORS[pi]
            const on = visible.has(pi)
            const name = pokemonName(p.normalizedName, lang)
            const label = name.length > 11 ? name.slice(0, 10) + '…' : name
            return (
              <g key={pi} style={{ cursor: 'pointer' }} onClick={() => onToggle(pi)}>
                <rect
                  x={x - 44} y={POKE_Y - NODE_R}
                  width={88} height={NODE_R * 2}
                  rx={5}
                  fill={on ? color + '33' : '#1e1e2e'}
                  stroke={on ? color : '#444'}
                  strokeWidth={on ? 2 : 1}
                />
                <text
                  x={x} y={POKE_Y + 5}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill={on ? color : '#555'}
                >
                  {label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export type StatKey = 'atk' | 'def' | 'spa' | 'spd' | 'spe'

const NATURES: Record<string, { up: StatKey | null; down: StatKey | null }> = {
  hardy:   { up: null,   down: null },
  lonely:  { up: 'atk', down: 'def' },
  brave:   { up: 'atk', down: 'spe' },
  adamant: { up: 'atk', down: 'spa' },
  naughty: { up: 'atk', down: 'spd' },
  bold:    { up: 'def', down: 'atk' },
  docile:  { up: null,   down: null },
  relaxed: { up: 'def', down: 'spe' },
  impish:  { up: 'def', down: 'spa' },
  lax:     { up: 'def', down: 'spd' },
  timid:   { up: 'spe', down: 'atk' },
  hasty:   { up: 'spe', down: 'def' },
  serious: { up: null,   down: null },
  jolly:   { up: 'spe', down: 'spa' },
  naive:   { up: 'spe', down: 'spd' },
  modest:  { up: 'spa', down: 'atk' },
  mild:    { up: 'spa', down: 'def' },
  quiet:   { up: 'spa', down: 'spe' },
  bashful: { up: null,   down: null },
  rash:    { up: 'spa', down: 'spd' },
  calm:    { up: 'spd', down: 'atk' },
  gentle:  { up: 'spd', down: 'def' },
  sassy:   { up: 'spd', down: 'spe' },
  careful: { up: 'spd', down: 'spa' },
  quirky:  { up: null,   down: null },
}

export function calcHP(base: number, ev: number, level = 50, iv = 31): number {
  return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10
}

export function calcStat(
  base: number,
  ev: number,
  nature: string | null,
  stat: StatKey,
  level = 50,
  iv = 31,
): number {
  const natEntry = nature ? (NATURES[nature] ?? null) : null
  let natMult = 1
  if (natEntry?.up === stat) natMult = 1.1
  if (natEntry?.down === stat) natMult = 0.9
  return Math.floor((Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5) * natMult)
}

// Gen 9 VGC damage formula at level 50, returns {min, max} as % of defender HP
export function calcDamage(params: {
  bp: number
  attackerStat: number
  defenderStat: number
  defenderHP: number
  stab: boolean
  effectiveness: number
}): { min: number; max: number } {
  const { bp, attackerStat, defenderStat, defenderHP, stab, effectiveness } = params
  const base = Math.floor(Math.floor(22 * bp * attackerStat / defenderStat) / 50 + 2)
  const minRoll = Math.floor(base * 85 / 100)
  const applyStab = (d: number) => stab ? Math.floor(d * 3 / 2) : d
  const minDmg = Math.floor(applyStab(minRoll) * effectiveness)
  const maxDmg = Math.floor(applyStab(base) * effectiveness)
  return {
    min: Math.round(minDmg / defenderHP * 1000) / 10,
    max: Math.round(maxDmg / defenderHP * 1000) / 10,
  }
}

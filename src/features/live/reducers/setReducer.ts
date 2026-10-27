import type { LiveSet, MatchFormat, Side } from '../types'

/** Points needed to win a set: 15 in the deciding set, 25 otherwise. */
export function setTarget(setNumber: number, format: MatchFormat): number {
  return setNumber === format ? 15 : 25
}

/** Winner of a set once a side reaches the target with a two-point lead (deuce rule). */
export function setWinner(home: number, opponent: number, target: number): Side | null {
  if (home >= target && home - opponent >= 2) return 'home'
  if (opponent >= target && opponent - home >= 2) return 'opponent'
  return null
}

export function setsToWin(format: MatchFormat): number {
  return Math.ceil(format / 2)
}

export function setsWon(sets: LiveSet[]): Record<Side, number> {
  return {
    home: sets.filter(s => s.winner === 'home').length,
    opponent: sets.filter(s => s.winner === 'opponent').length,
  }
}

export function matchWinner(sets: LiveSet[], format: MatchFormat): Side | null {
  const won = setsWon(sets)
  const need = setsToWin(format)
  if (won.home >= need) return 'home'
  if (won.opponent >= need) return 'opponent'
  return null
}

/** Whether `side` wins the set by taking the next point. */
export function isSetPoint(set: LiveSet, format: MatchFormat, side: Side): boolean {
  if (set.winner) return false
  const home = set.home + (side === 'home' ? 1 : 0)
  const opponent = set.opponent + (side === 'opponent' ? 1 : 0)
  return setWinner(home, opponent, setTarget(set.number, format)) === side
}

/** Whether `side` wins the match by taking the next point. */
export function isMatchPoint(sets: LiveSet[], format: MatchFormat, side: Side): boolean {
  const current = sets[sets.length - 1]
  if (!current || !isSetPoint(current, format, side)) return false
  return setsWon(sets)[side] + 1 >= setsToWin(format)
}

export function otherSide(side: Side): Side {
  return side === 'home' ? 'opponent' : 'home'
}

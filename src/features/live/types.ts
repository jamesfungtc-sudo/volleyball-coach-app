export type Side = 'home' | 'opponent'

export type MatchFormat = 3 | 5

export type LiveMatchStatus = 'in_progress' | 'set_break' | 'completed'

/** A team as entered at setup. `id` is the Google Sheets team id, or null for a name-only team. */
export interface TeamRef {
  id: string | null
  name: string
}

export interface LiveSet {
  number: number
  home: number
  opponent: number
  firstServe: Side
  winner: Side | null
}

/** One rally outcome. Carries enough "before" state to be reversed by undo. */
export interface LivePoint {
  id: string
  set: number
  /** 1-based point number within the set */
  number: number
  winner: Side
  /** Set score after this point */
  home: number
  opponent: number
  servingBefore: Side
  rotationBefore: number
  at: number
}

export interface LiveMatch {
  id: string
  createdAt: number
  updatedAt: number
  date: string
  venue: string
  home: TeamRef
  opponent: TeamRef
  format: MatchFormat
  sets: LiveSet[]
  points: LivePoint[]
  serving: Side
  /** Home team rotation, 1–6 */
  rotation: number
  status: LiveMatchStatus
}

export interface NewMatchInput {
  date: string
  venue: string
  home: TeamRef
  opponent: TeamRef
  format: MatchFormat
  firstServe: Side
  rotation: number
}

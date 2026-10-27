import type { LiveMatch, LivePoint, NewMatchInput, Side } from '../types'
import { matchWinner, otherSide, setTarget, setWinner } from './setReducer'

export type MatchAction =
  | { type: 'SCORE'; winner: Side; at?: number }
  | { type: 'UNDO' }
  | { type: 'START_NEXT_SET'; firstServe: Side; rotation: number }
  | { type: 'SET_SERVE'; side: Side }
  | { type: 'SET_ROTATION'; rotation: number }

export function nextRotation(rotation: number): number {
  return (rotation % 6) + 1
}

export function prevRotation(rotation: number): number {
  return rotation === 1 ? 6 : rotation - 1
}

export function createMatch(input: NewMatchInput, id: string, now = Date.now()): LiveMatch {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    date: input.date,
    venue: input.venue,
    home: input.home,
    opponent: input.opponent,
    format: input.format,
    sets: [{ number: 1, home: 0, opponent: 0, firstServe: input.firstServe, winner: null }],
    points: [],
    serving: input.firstServe,
    rotation: input.rotation,
    status: 'in_progress',
  }
}

export function currentSet(match: LiveMatch) {
  return match.sets[match.sets.length - 1]
}

/** Default first server for the next set: alternates from the previous set. */
export function nextSetFirstServe(match: LiveMatch): Side {
  return otherSide(currentSet(match).firstServe)
}

export function matchReducer(state: LiveMatch, action: MatchAction): LiveMatch {
  switch (action.type) {
    case 'SCORE': {
      if (state.status !== 'in_progress') return state
      const set = currentSet(state)
      const home = set.home + (action.winner === 'home' ? 1 : 0)
      const opponent = set.opponent + (action.winner === 'opponent' ? 1 : 0)
      const at = action.at ?? Date.now()

      const point: LivePoint = {
        id: `${set.number}-${home + opponent}-${at}`,
        set: set.number,
        number: home + opponent,
        winner: action.winner,
        home,
        opponent,
        servingBefore: state.serving,
        rotationBefore: state.rotation,
        at,
      }

      // Side-out: home rotates when it wins the serve back
      const rotation =
        action.winner === 'home' && state.serving === 'opponent'
          ? nextRotation(state.rotation)
          : state.rotation

      const winner = setWinner(home, opponent, setTarget(set.number, state.format))
      const sets = [...state.sets.slice(0, -1), { ...set, home, opponent, winner }]
      const status = winner
        ? matchWinner(sets, state.format) ? 'completed' : 'set_break'
        : 'in_progress'

      return {
        ...state,
        updatedAt: at,
        sets,
        points: [...state.points, point],
        serving: action.winner,
        rotation,
        status,
      }
    }

    case 'UNDO': {
      const last = state.points[state.points.length - 1]
      if (!last) return state
      // Drop any set started after the undone point, then restore that set's score
      const sets = state.sets
        .filter(s => s.number <= last.set)
        .map(s =>
          s.number === last.set
            ? {
                ...s,
                home: last.home - (last.winner === 'home' ? 1 : 0),
                opponent: last.opponent - (last.winner === 'opponent' ? 1 : 0),
                winner: null,
              }
            : s
        )
      return {
        ...state,
        updatedAt: Date.now(),
        sets,
        points: state.points.slice(0, -1),
        serving: last.servingBefore,
        rotation: last.rotationBefore,
        status: 'in_progress',
      }
    }

    case 'START_NEXT_SET': {
      if (state.status !== 'set_break') return state
      return {
        ...state,
        updatedAt: Date.now(),
        sets: [
          ...state.sets,
          { number: state.sets.length + 1, home: 0, opponent: 0, firstServe: action.firstServe, winner: null },
        ],
        serving: action.firstServe,
        rotation: action.rotation,
        status: 'in_progress',
      }
    }

    case 'SET_SERVE': {
      // Only before the first rally of a set
      const set = currentSet(state)
      if (state.status !== 'in_progress' || set.home + set.opponent > 0) return state
      return {
        ...state,
        updatedAt: Date.now(),
        sets: [...state.sets.slice(0, -1), { ...set, firstServe: action.side }],
        serving: action.side,
      }
    }

    case 'SET_ROTATION': {
      if (action.rotation < 1 || action.rotation > 6) return state
      return { ...state, updatedAt: Date.now(), rotation: action.rotation }
    }
  }
}

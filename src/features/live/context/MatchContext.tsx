import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import type { LiveMatch } from '../types'
import { matchReducer, type MatchAction } from '../reducers/matchReducer'
import { saveMatch } from '../storage/liveMatchStore'
import { queueMatchChange } from '../services/liveSyncEngine'

interface MatchContextValue {
  match: LiveMatch
  dispatch: (action: MatchAction) => void
}

const MatchContext = createContext<MatchContextValue | null>(null)

/**
 * Holds one live match. All changes go through `matchReducer`; each resulting
 * state is persisted locally and diffed into Sheets writes before rendering,
 * so rapid taps can never be lost between renders.
 */
export function MatchProvider({ initialMatch, children }: { initialMatch: LiveMatch; children: ReactNode }) {
  const [match, setMatch] = useState(initialMatch)
  const matchRef = useRef(initialMatch)

  const dispatch = useCallback((action: MatchAction) => {
    const prev = matchRef.current
    const next = matchReducer(prev, action)
    if (next === prev) return
    matchRef.current = next
    saveMatch(next)
    queueMatchChange(prev, next)
    setMatch(next)
  }, [])

  return <MatchContext.Provider value={{ match, dispatch }}>{children}</MatchContext.Provider>
}

export function useMatch(): MatchContextValue {
  const ctx = useContext(MatchContext)
  if (!ctx) throw new Error('useMatch must be used inside MatchProvider')
  return ctx
}

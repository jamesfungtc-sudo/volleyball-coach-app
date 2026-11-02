import { describe, expect, it } from 'vitest'
import { boardReducer, initialBoardState, suggestedDefence, type BoardState } from './boardState'

const pos = (state: BoardState, id: string) => {
  const icon = state.icons.find(i => i.id === id)!
  return { x: icon.x, y: icon.y }
}

describe('auto defence', () => {
  it('starts with every defender on their suggested spot', () => {
    for (const [id, target] of suggestedDefence(initialBoardState)) {
      expect(pos(initialBoardState, id)).toEqual(target.point)
    }
  })

  it('re-places defenders when a blocker moves', () => {
    const split = boardReducer(initialBoardState, { type: 'move', id: 'h3', to: { x: 6.2, y: 9.4 } })
    const kinds = [...suggestedDefence(split).values()].map(t => t.kind)
    expect(kinds).toContain('seam')
    for (const [id, target] of suggestedDefence(split)) {
      expect(pos(split, id)).toEqual(target.point)
    }
  })

  it('leaves a hand-placed defender alone until defenders are reset', () => {
    let state = boardReducer(initialBoardState, { type: 'move', id: 'h6', to: { x: 2, y: 17 } })
    state = boardReducer(state, { type: 'move', id: 'h3', to: { x: 6.2, y: 9.4 } })
    expect(pos(state, 'h6')).toEqual({ x: 2, y: 17 })

    state = boardReducer(state, { type: 'resetDefenders' })
    expect(pos(state, 'h6')).toEqual(suggestedDefence(state).get('h6')!.point)
  })

  it('stops moving players when switched off', () => {
    let state = boardReducer(initialBoardState, { type: 'toggleAutoDefence' })
    const before = pos(state, 'h1')
    state = boardReducer(state, { type: 'move', id: 'h3', to: { x: 6.2, y: 9.4 } })
    expect(pos(state, 'h1')).toEqual(before)
  })
})

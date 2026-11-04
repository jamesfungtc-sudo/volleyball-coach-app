import { describe, expect, it } from 'vitest'
import { boardReducer, initialBoardState, blockersOf, isBlocker, suggestedDefence, type BoardState } from './boardState'

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
    expect([...suggestedDefence(split).values()].some(t => t.inSeam)).toBe(true)
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
    let state = boardReducer(initialBoardState, { type: 'setAutoDefence', autoDefence: 'off' })
    const before = pos(state, 'h1')
    state = boardReducer(state, { type: 'move', id: 'h3', to: { x: 6.2, y: 9.4 } })
    expect(pos(state, 'h1')).toEqual(before)
  })
})

describe('tapping a hitter', () => {
  const blockers = (state: typeof initialBoardState) =>
    state.icons.filter(isBlocker).map(i => i.label).sort()

  it('lines up our default block: their 2 → our 4 + 3, their 3 → our 3, their 4 → our 2 + 3', () => {
    expect(blockers(boardReducer(initialBoardState, { type: 'setHitter', id: 'o2' }))).toEqual(['3', '4'])
    expect(blockers(boardReducer(initialBoardState, { type: 'setHitter', id: 'o3' }))).toEqual(['3'])
    expect(blockers(boardReducer(initialBoardState, { type: 'setHitter', id: 'o4' }))).toEqual(['2', '3'])
  })

  it('gives the same picture whichever way you got there', () => {
    let state = boardReducer(initialBoardState, { type: 'setHitter', id: 'o2' })
    state = boardReducer(state, { type: 'setHitter', id: 'o3' })
    state = boardReducer(state, { type: 'setHitter', id: 'o4' })
    expect(state.icons).toEqual(initialBoardState.icons)
  })

  it('puts 6 in the deep middle and 1 on the line against their 4 (perimeter)', () => {
    const jobs = Object.fromEntries([...suggestedDefence(initialBoardState)].map(([id, t]) => [id, t.kind]))
    expect(jobs).toEqual({ h1: 'line', h6: 'deepMiddle', h5: 'deepCross', h4: 'sharpCross' })
  })
})

describe('block size', () => {
  it('is kept per player and squeezes a small double block closed', () => {
    let state = boardReducer(initialBoardState, { type: 'setBlockSize', id: 'h3', size: 'small' })
    state = boardReducer(state, { type: 'setBlockSize', id: 'h2', size: 'small' })
    state = boardReducer(state, { type: 'setHitter', id: 'o2' })
    state = boardReducer(state, { type: 'setHitter', id: 'o4' })
    expect(state.icons.find(i => i.id === 'h3')!.blockSize).toBe('small')
    const [a, b] = state.icons.filter(isBlocker).map(i => i.x).sort()
    expect(b - a).toBeLessThan(0.68)
    expect(blockersOf(state.icons).every(bl => bl.size === 'small')).toBe(true)
  })

  it('only applies to our players', () => {
    const state = boardReducer(initialBoardState, { type: 'setBlockSize', id: 'o4', size: 'large' })
    expect(state.icons.find(i => i.id === 'o4')!.blockSize).toBeUndefined()
  })
})

describe('holding a defender', () => {
  it('keeps them still while held and hands them back to Auto D on release', () => {
    let state = boardReducer(initialBoardState, { type: 'setManual', id: 'h6', manual: true })
    const held = pos(state, 'h6')
    state = boardReducer(state, { type: 'move', id: 'h3', to: { x: 6.2, y: 9.4 } })
    expect(pos(state, 'h6')).toEqual(held)
    state = boardReducer(state, { type: 'setManual', id: 'h6', manual: false })
    expect(pos(state, 'h6')).toEqual(suggestedDefence(state).get('h6')!.point)
  })
})

describe('hitter contact height', () => {
  it('steps within its range without drift', () => {
    let state = initialBoardState
    for (let i = 0; i < 3; i++) state = boardReducer(state, { type: 'setContact', aboveNet: state.contactAboveNet + 0.05 })
    expect(state.contactAboveNet).toBe(1.05)
    expect(boardReducer(state, { type: 'setContact', aboveNet: 9 }).contactAboveNet).toBe(1.3)
    expect(boardReducer(state, { type: 'setContact', aboveNet: 0 }).contactAboveNet).toBe(0.5)
  })
})

describe('drawings', () => {
  const arrow = { id: 'a', kind: 'arrow' as const, points: [{ x: 1, y: 10 }, { x: 4, y: 14 }] }
  const pen = { id: 'p', kind: 'pen' as const, points: [{ x: 2, y: 12 }, { x: 3, y: 12 }] }

  it('adds, undoes and clears', () => {
    let state = boardReducer(initialBoardState, { type: 'addDrawing', drawing: arrow })
    state = boardReducer(state, { type: 'addDrawing', drawing: pen })
    expect(state.drawings.map(d => d.id)).toEqual(['a', 'p'])
    state = boardReducer(state, { type: 'undoDrawing' })
    expect(state.drawings.map(d => d.id)).toEqual(['a'])
    state = boardReducer(state, { type: 'clearDrawings' })
    expect(state.drawings).toEqual([])
  })

  it('board reset wipes drawings but keeps the chosen tool', () => {
    let state = boardReducer(initialBoardState, { type: 'setTool', tool: 'pen' })
    state = boardReducer(state, { type: 'addDrawing', drawing: pen })
    state = boardReducer(state, { type: 'reset' })
    expect(state.drawings).toEqual([])
    expect(state.tool).toBe('pen')
  })
})

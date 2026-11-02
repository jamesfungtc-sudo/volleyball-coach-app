import { describe, expect, it } from 'vitest'
import { COURT_LENGTH, COURT_WIDTH, NET_Y } from './court'
import { analyseDefence, BLOCK_ZONE_DEPTH } from './defence'
import { assignDefenders, defenderTargets, suggestDefence } from './defenders'

const hitter = { x: 8, y: NET_Y - 1 }
const backRow = [
  { id: 'h4', x: 1.5, y: 12 },
  { id: 'h5', x: 1.3, y: 15.5 },
  { id: 'h6', x: 4.5, y: 16.8 },
  { id: 'h1', x: 8.2, y: 15.5 },
]

describe('defenderTargets', () => {
  it('covers line and cross first behind a closed double block, then tip and roll', () => {
    const kinds = defenderTargets(analyseDefence({ hitter, blockerXs: [7.22, 7.9] })).map(t => t.kind)
    expect(kinds.slice(0, 2).sort()).toEqual(['cross', 'line'])
    expect(kinds.slice(2)).toEqual(['tip', 'roll', 'base'])
  })

  it('puts a digger in the seam when the block splits', () => {
    const targets = defenderTargets(analyseDefence({ hitter, blockerXs: [6.2, 7.9] }))
    expect(targets.slice(0, 3).map(t => t.kind)).toContain('seam')
  })

  it('keeps every spot inside our court', () => {
    for (const blockerXs of [[], [8.6], [0.4], [6, 7.9], [6.2, 7.9], [3, 4.5, 6]]) {
      for (const { point } of defenderTargets(analyseDefence({ hitter, blockerXs }))) {
        expect(point.x).toBeGreaterThan(0)
        expect(point.x).toBeLessThan(COURT_WIDTH)
        // Clear of the block zone, otherwise the defender would turn into a blocker.
        expect(point.y).toBeGreaterThan(NET_Y + BLOCK_ZONE_DEPTH)
        expect(point.y).toBeLessThan(COURT_LENGTH)
      }
    }
  })
})

describe('assignDefenders', () => {
  it('matches defenders to the nearest spots overall', () => {
    const targets = [
      { kind: 'line' as const, point: { x: 8, y: 15 } },
      { kind: 'cross' as const, point: { x: 1, y: 15 } },
    ]
    const result = assignDefenders(
      [
        { id: 'left', x: 1.5, y: 14 },
        { id: 'right', x: 7.5, y: 14 },
      ],
      targets,
    )
    expect(result.get('left')?.kind).toBe('cross')
    expect(result.get('right')?.kind).toBe('line')
  })

  it('places every back-row defender against a double block', () => {
    const result = suggestDefence(analyseDefence({ hitter, blockerXs: [7.22, 7.9] }), backRow)
    expect(result.size).toBe(4)
    const spots = new Set([...result.values()].map(t => `${t.point.x},${t.point.y}`))
    expect(spots.size).toBe(4)
  })

  it('leaves extra defenders unassigned when spots run out', () => {
    const result = assignDefenders(backRow, [{ kind: 'base', point: { x: 4.5, y: 16.5 } }])
    expect(result.size).toBe(1)
    expect(result.get('h6')?.kind).toBe('base')
  })
})

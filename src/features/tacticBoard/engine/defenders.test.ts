import { describe, expect, it } from 'vitest'
import { COURT_LENGTH, COURT_WIDTH, NET_Y } from './court'
import { analyseDefence, BLOCK_ZONE_DEPTH, rayPointAt } from './defence'
import { assignDefenders, MAX_SHADOW_NUDGE, suggestDefence, SYSTEM_ROLES, systemTargets, type DefenceSystem } from './defenders'

// Opponent outside hitter attacking from our right into our closed 2 + 3 double block.
const hitter = { x: 8, y: NET_Y - 1 }
const closedBlock = [7.22, 7.9]
const backRow = [
  { id: 'h4', x: 1.5, y: 12 },
  { id: 'h5', x: 1.3, y: 15.5 },
  { id: 'h6', x: 4.5, y: 16.8 },
  { id: 'h1', x: 8.2, y: 15.5 },
]
const SYSTEMS: DefenceSystem[] = ['perimeter', 'rotational']
const targetOf = (system: DefenceSystem, blockerXs: number[], kind: string, h = hitter) =>
  systemTargets(analyseDefence({ hitter: h, blockerXs }), system).find(t => t.kind === kind)!

describe('systemTargets', () => {
  it('gives each system its jobs in priority order', () => {
    const kinds = (s: DefenceSystem) => systemTargets(analyseDefence({ hitter, blockerXs: closedBlock }), s).map(t => t.kind)
    expect(kinds('perimeter')).toEqual(['line', 'deepCross', 'deepMiddle', 'sharpCross', 'tip'])
    expect(kinds('rotational')).toEqual(['tip', 'deepLine', 'deepCross', 'sharpCross', 'deepMiddle'])
  })

  it('perimeter keeps the deep middle deep and leaves tips to the fifth player only', () => {
    const deepMiddle = targetOf('perimeter', closedBlock, 'deepMiddle')
    expect(deepMiddle.point.y).toBeGreaterThan(NET_Y + 8)
  })

  it('rotational brings the tip player up right behind the block', () => {
    const tip = targetOf('rotational', closedBlock, 'tip')
    expect(tip.point.y).toBeLessThan(NET_Y + 3)
    // Hands cover net x 6.97–8.15; the tip player stands just inside the middle of that.
    expect(tip.point.x).toBeCloseTo((6.97 + 8.15) / 2 - 0.6)
  })

  it('follows the block along the net', () => {
    const near = targetOf('rotational', closedBlock, 'tip').point.x
    const moved = targetOf('rotational', [5.5, 6.18], 'tip').point.x
    expect(moved).toBeLessThan(near - 1)
  })

  it('mirrors for an attack from our left', () => {
    const left = { x: 1, y: NET_Y - 1 }
    const right = targetOf('perimeter', [], 'line').point
    const mirrored = targetOf('perimeter', [], 'line', left).point
    expect(mirrored.x).toBeCloseTo(COURT_WIDTH - right.x)
    expect(mirrored.y).toBeCloseTo(right.y)
  })

  it('sends the seam player into the seam when the block splits', () => {
    for (const [system, kind] of [['perimeter', 'deepMiddle'], ['rotational', 'deepCross']] as const) {
      const target = targetOf(system, [6.2, 7.9], kind)
      expect(target.inSeam).toBe(true)
      // The seam runs between the hands' inner edges (6.45 and 7.65 at the net).
      const y = target.point.y
      expect(target.point.x).toBeGreaterThan(rayPointAt(hitter, 6.45, y).x)
      expect(target.point.x).toBeLessThan(rayPointAt(hitter, 7.65, y).x)
    }
  })

  it('moves a digger out of the shadow, but by no more than the nudge limit', () => {
    // Middle hitter with a single block whose shadow lands right on the textbook sharp-cross spot.
    const middle = { x: 4.5, y: NET_Y - 1 }
    const textbook = SYSTEM_ROLES.perimeter.find(r => r.kind === 'sharpCross')!.spot
    const nudged = targetOf('perimeter', [3.74], 'sharpCross', middle).point
    expect(nudged.x).toBeLessThan(textbook.x)
    expect(textbook.x - nudged.x).toBeLessThanOrEqual(MAX_SHADOW_NUDGE + 1e-9)
  })

  it('keeps every spot inside our court and clear of the block zone', () => {
    for (const system of SYSTEMS) {
      for (const blockerXs of [[], [8.6], [0.4], [6, 7.9], [6.2, 7.9], [3, 4.5, 6]]) {
        for (const h of [hitter, { x: 1, y: NET_Y - 1 }, { x: 4.5, y: NET_Y - 3 }]) {
          for (const { point } of systemTargets(analyseDefence({ hitter: h, blockerXs }), system)) {
            expect(point.x).toBeGreaterThan(0)
            expect(point.x).toBeLessThan(COURT_WIDTH)
            expect(point.y).toBeGreaterThan(NET_Y + BLOCK_ZONE_DEPTH)
            expect(point.y).toBeLessThan(COURT_LENGTH)
          }
        }
      }
    }
  })
})

describe('assignDefenders', () => {
  it('falls back to the nearest spots overall for players without a court position', () => {
    const targets = [
      { kind: 'line' as const, point: { x: 8, y: 15 }, zones: [1] },
      { kind: 'deepCross' as const, point: { x: 1, y: 15 }, zones: [5] },
    ]
    const result = assignDefenders(
      [
        { id: 'left', x: 1.5, y: 14 },
        { id: 'right', x: 7.5, y: 14 },
      ],
      targets,
    )
    expect(result.get('left')?.kind).toBe('deepCross')
    expect(result.get('right')?.kind).toBe('line')
  })

  it('places all four back-row defenders against a double block in both systems', () => {
    for (const system of SYSTEMS) {
      const result = suggestDefence(analyseDefence({ hitter, blockerXs: closedBlock }), backRow, system)
      expect(result.size).toBe(4)
      // Four jobs, no duplicates; the fifth (single-block) job is not used.
      expect(new Set([...result.values()].map(t => t.kind)).size).toBe(4)
      expect([...result.values()].map(t => t.kind)).not.toContain(SYSTEM_ROLES[system][4].kind)
    }
  })

  // Players stand anywhere (even on each other's spots): jobs still follow court positions.
  const shuffled = [
    { id: 'h1', zone: 1, x: 1, y: 16 },
    { id: 'h6', zone: 6, x: 8, y: 15 },
    { id: 'h5', zone: 5, x: 4.5, y: 17 },
    { id: 'h4', zone: 4, x: 7, y: 13 },
    { id: 'h2', zone: 2, x: 2, y: 12 },
  ]
  const jobs = (system: DefenceSystem, h: { x: number; y: number }, blockerXs: number[], ids: string[]) => {
    const result = suggestDefence(analyseDefence({ hitter: h, blockerXs }), shuffled.filter(d => ids.includes(d.id)), system)
    return Object.fromEntries([...result].map(([id, t]) => [id, t.kind]))
  }

  it('gives jobs by court position against an attack from our right', () => {
    const ids = ['h1', 'h6', 'h5', 'h4']
    expect(jobs('perimeter', hitter, closedBlock, ids)).toEqual({ h1: 'line', h6: 'deepMiddle', h5: 'deepCross', h4: 'sharpCross' })
    expect(jobs('rotational', hitter, closedBlock, ids)).toEqual({ h1: 'tip', h6: 'deepLine', h5: 'deepCross', h4: 'sharpCross' })
  })

  it('mirrors the positions against an attack from our left', () => {
    const left = { x: 1, y: NET_Y - 1 }
    const ids = ['h1', 'h6', 'h5', 'h2']
    expect(jobs('perimeter', left, [1.1, 1.78], ids)).toEqual({ h5: 'line', h6: 'deepMiddle', h1: 'deepCross', h2: 'sharpCross' })
    expect(jobs('rotational', left, [1.1, 1.78], ids)).toEqual({ h5: 'tip', h6: 'deepLine', h1: 'deepCross', h2: 'sharpCross' })
  })

  it('drops the lowest-priority job against a triple block', () => {
    const three = backRow.slice(1)
    const result = suggestDefence(analyseDefence({ hitter, blockerXs: [6.5, 7.2, 7.9] }), three, 'rotational')
    expect([...result.values()].map(t => t.kind).sort()).toEqual(['deepCross', 'deepLine', 'tip'])
  })
})

import { describe, expect, it } from 'vitest'
import { COURT_WIDTH, NET_Y } from './court'
import { analyseDefence, BALL_DIAMETER, BLOCK_WIDTH, rayPointAt } from './defence'
import { clipPolygonToRect, polygonArea } from './geometry'

const OUR_HALF_AREA = 9 * 9
// Opponent outside hitter attacking from our right side, 1 m off the net.
const hitter = { x: 8, y: NET_Y - 1 }

function widthAtDepth(polygon: { x: number; y: number }[], y: number) {
  const slice = clipPolygonToRect(polygon, { x: -100, y: y - 0.01, width: 200, height: 0.02 })
  const xs = slice.map(p => p.x)
  return Math.max(...xs) - Math.min(...xs)
}

describe('analyseDefence', () => {
  it('leaves the whole court open with no blockers', () => {
    const { shadows, lanes } = analyseDefence({ hitter, blockerXs: [] })
    expect(shadows).toHaveLength(0)
    expect(lanes).toHaveLength(1)
    expect(lanes[0].kind).toBe('open')
    expect(polygonArea(lanes[0].polygon)).toBeCloseTo(OUR_HALF_AREA, 6)
  })

  it('merges touching blockers into one shadow with no seam', () => {
    const { shadows, lanes } = analyseDefence({ hitter, blockerXs: [7.5, 7.5 + BLOCK_WIDTH] })
    expect(shadows).toHaveLength(1)
    expect(shadows[0].from).toBeCloseTo(7.25)
    expect(shadows[0].to).toBeCloseTo(8.25)
    expect(lanes.map(l => l.kind).sort()).toEqual(['cross', 'line'])
  })

  it('closes a gap the ball cannot fit through', () => {
    const gap = BALL_DIAMETER * 0.9
    const { shadows, lanes } = analyseDefence({ hitter, blockerXs: [7.5, 7.5 + BLOCK_WIDTH + gap] })
    expect(shadows).toHaveLength(1)
    expect(lanes.some(l => l.kind === 'seam')).toBe(false)
  })

  it('opens a seam between split blockers that widens with depth', () => {
    const { shadows, lanes } = analyseDefence({ hitter, blockerXs: [7, 8] })
    expect(shadows).toHaveLength(2)
    const seam = lanes.find(l => l.kind === 'seam')!
    expect(seam.from).toBeCloseTo(7.25)
    expect(seam.to).toBeCloseTo(7.75)
    expect(widthAtDepth(seam.polygon, 17)).toBeGreaterThan(widthAtDepth(seam.polygon, 10))
  })

  it('names the lane along the hitter sideline "line" and the other "cross"', () => {
    const right = analyseDefence({ hitter, blockerXs: [7.8] })
    expect(right.lanes.find(l => l.to === COURT_WIDTH)?.kind).toBe('line')
    expect(right.lanes.find(l => l.from === 0)?.kind).toBe('cross')

    const left = analyseDefence({ hitter: { x: 1, y: NET_Y - 1 }, blockerXs: [1.2] })
    expect(left.lanes.find(l => l.from === 0)?.kind).toBe('line')
    expect(left.lanes.find(l => l.to === COURT_WIDTH)?.kind).toBe('cross')
  })

  it('splits our court exactly into shadows and lanes', () => {
    const { shadows, lanes } = analyseDefence({ hitter, blockerXs: [6, 7.2, 8] })
    const total = [...shadows, ...lanes].reduce((sum, r) => sum + polygonArea(r.polygon), 0)
    expect(total).toBeCloseTo(OUR_HALF_AREA, 6)
  })

  it('closes the line when the block sits on the antenna', () => {
    const { lanes } = analyseDefence({ hitter, blockerXs: [COURT_WIDTH - BLOCK_WIDTH / 2] })
    expect(lanes.map(l => l.kind)).toEqual(['cross'])
  })

  it('ignores blockers outside the antennae', () => {
    const { shadows } = analyseDefence({ hitter, blockerXs: [-2, 11] })
    expect(shadows).toHaveLength(0)
  })

  it('still works when the hitter is on top of the net', () => {
    const { shadows, lanes } = analyseDefence({ hitter: { x: 8, y: NET_Y }, blockerXs: [7] })
    expect(shadows).toHaveLength(1)
    const total = [...shadows, ...lanes].reduce((sum, r) => sum + polygonArea(r.polygon), 0)
    expect(total).toBeCloseTo(OUR_HALF_AREA, 6)
  })
})

describe('rayPointAt', () => {
  it('passes through the net point and extends in a straight line', () => {
    expect(rayPointAt(hitter, 7, NET_Y)).toEqual({ x: 7, y: NET_Y })
    // 1 m to the net, 1 m sideways → another 1 m sideways per metre beyond the net.
    expect(rayPointAt(hitter, 7, NET_Y + 3).x).toBeCloseTo(4)
  })
})

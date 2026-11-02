import { describe, expect, it } from 'vitest'
import { COURT_WIDTH, NET_Y } from './court'
import { analyseDefence } from './defence'
import { polygonArea } from './geometry'
import { ROLL_DEPTH, rollZones, TIP_DEPTH, TIP_SPREAD, tipZone } from './hitZones'

const hitter = { x: 8, y: NET_Y - 1 }

describe('rollZones', () => {
  it('is empty without a block', () => {
    expect(rollZones(analyseDefence({ hitter, blockerXs: [] }))).toEqual([])
  })

  it('stays inside the shadow and the roll depth band', () => {
    const analysis = analyseDefence({ hitter, blockerXs: [7.2, 7.9] })
    const zones = rollZones(analysis)
    expect(zones).toHaveLength(1)
    for (const p of zones[0]) {
      expect(p.y).toBeGreaterThanOrEqual(NET_Y + ROLL_DEPTH.from - 1e-9)
      expect(p.y).toBeLessThanOrEqual(NET_Y + ROLL_DEPTH.to + 1e-9)
    }
    expect(polygonArea(zones[0])).toBeLessThan(polygonArea(analysis.shadows[0].polygon))
    expect(polygonArea(zones[0])).toBeGreaterThan(0)
  })

  it('gives one zone per separate shadow', () => {
    expect(rollZones(analyseDefence({ hitter, blockerXs: [6.8, 8] }))).toHaveLength(2)
  })

  it('drops shadows that leave the court before roll depth', () => {
    // From x = 8, a block at x = 5 angles its shadow out over the sideline within 2 m.
    expect(rollZones(analyseDefence({ hitter, blockerXs: [5] }))).toEqual([])
  })
})

describe('tipZone', () => {
  it('covers the whole short area without a block', () => {
    const zone = tipZone(analyseDefence({ hitter, blockerXs: [] }))
    expect(polygonArea(zone)).toBeCloseTo(COURT_WIDTH * TIP_DEPTH)
  })

  it('spreads either side of the block, clipped to the court', () => {
    const zone = tipZone(analyseDefence({ hitter, blockerXs: [5] }))
    const xs = zone.map(p => p.x)
    expect(Math.min(...xs)).toBeCloseTo(5 - 0.25 - TIP_SPREAD)
    expect(Math.max(...xs)).toBeCloseTo(5 + 0.25 + TIP_SPREAD)

    const nearAntenna = tipZone(analyseDefence({ hitter, blockerXs: [8.5] }))
    expect(Math.max(...nearAntenna.map(p => p.x))).toBe(COURT_WIDTH)
  })
})

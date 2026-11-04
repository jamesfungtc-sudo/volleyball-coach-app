import { describe, expect, it } from 'vitest'
import { blockersOf, initialBoardState, type BoardState } from '../state/boardState'
import { availableChoices, ballAt, planAttack, type AttackContext } from './attack'
import { NET_Y } from './court'
import { analyseDefence } from './defence'
import { blockHandHeight, NET_HEIGHT } from './view3d'

/** Small seeded generator so random attacks are repeatable. */
function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

function contextFor(state: BoardState, viewerId: string, seed = 1): AttackContext {
  const hitter = state.icons.find(i => i.id === state.hitterId)!
  const blockers = blockersOf(state.icons)
  const viewer = state.icons.find(i => i.id === viewerId)!
  return {
    analysis: analyseDefence({ hitter, blockers }),
    blockers,
    net: state.net,
    contactAboveNet: state.contactAboveNet,
    viewer,
    rng: seeded(seed),
  }
}

/** Height of the ball where it crosses the net (first time), or undefined if it never does. */
function heightAtNet(plan: ReturnType<typeof planAttack>) {
  for (let t = 0; t < plan.landedAt; t += 0.002) {
    const b = ballAt(plan, t)
    if (b.y >= NET_Y) return b
  }
}

describe('attack animation', () => {
  it('starts at the contact point and lands where it says', () => {
    const ctx = contextFor(initialBoardState, 'h5')
    const plan = planAttack('cross', ctx)
    expect(plan.outcome).toBe('hard')
    const start = ballAt(plan, 0)
    expect(start.x).toBeCloseTo(ctx.analysis.contact.x)
    const landed = ballAt(plan, plan.landedAt)
    expect(landed.x).toBeCloseTo(plan.landing.x)
    expect(landed.y).toBeCloseTo(plan.landing.y)
    expect(heightAtNet(plan)!.h).toBeGreaterThan(NET_HEIGHT.men)
    // A spike is fast: well under a second to the back court.
    expect(plan.landedAt).toBeLessThan(0.8)
  })

  it('turns a hard hit at a defender hidden behind the block into a block touch', () => {
    // Our 6 starts deep behind the block: the board says the hitter can't reach them hard.
    const ctx = contextFor(initialBoardState, 'h6')
    expect(ctx.analysis.shadows.some(s => s.polygon.length)).toBe(true)
    const inShadow = { ...ctx, viewer: { x: 7.2, y: 12 } }
    expect(planAttack('hardMe', inShadow).outcome).not.toBe('hard')
  })

  it('floats tips and rolls over the hands', () => {
    const ctx = contextFor(initialBoardState, 'h6')
    for (const choice of ['tip', 'roll'] as const) {
      const plan = planAttack(choice, ctx)
      expect(heightAtNet(plan)!.h).toBeGreaterThan(blockHandHeight('medium', 'men'))
    }
  })

  it('mixes every kind of outcome on random', () => {
    const ctx = contextFor(initialBoardState, 'h6', 7)
    const outcomes = new Set(Array.from({ length: 300 }, () => planAttack('random', ctx).outcome))
    expect(outcomes).toEqual(new Set(['hard', 'tip', 'roll', 'touchUp', 'touchOut', 'touchDrop', 'stuff']))
  })

  it('offers the seam only when the block is split', () => {
    expect(availableChoices(contextFor(initialBoardState, 'h6').analysis).has('seam')).toBe(false)
    const split = {
      ...initialBoardState,
      icons: initialBoardState.icons.map(i => (i.id === 'h3' ? { ...i, x: 5.5 } : i)),
    }
    expect(availableChoices(contextFor(split, 'h6').analysis).has('seam')).toBe(true)
  })
})

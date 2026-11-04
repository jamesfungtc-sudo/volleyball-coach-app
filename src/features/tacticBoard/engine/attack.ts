import { COURT_LENGTH, COURT_WIDTH, NET_Y, type Point } from './court'
import { BALL_DIAMETER, BLOCK_SIZES, DEFAULT_BLOCK_SIZE, type Blocker, type DefenceAnalysis } from './defence'
import { pointInPolygon, polygonArea, polygonCentroid } from './geometry'
import { rollZones, tipZone } from './hitZones'
import { blockHandHeight, contactHeight, HAND_PENETRATION, NET_HEIGHT, type NetKind } from './view3d'

// Ball flights for the 3D attack animation. Pure: the 3D view only samples `ballAt`.
//
// Whether a hard hit gets blocked follows the 2D board (a landing spot inside a block shadow is
// blocked), so the two views never disagree. The flight itself is real projectile motion.

export type AttackChoice = 'tip' | 'roll' | 'hardMe' | 'hardLeft' | 'hardRight' | 'line' | 'cross' | 'seam' | 'touch'

/** What actually happened, which can differ from what was asked (a hard hit into the block). */
export type AttackOutcome = 'tip' | 'roll' | 'hard' | 'touchUp' | 'touchOut' | 'touchDrop' | 'stuff'

/** A ball position: board metres plus height off the floor. */
export interface Ball3 {
  x: number
  y: number
  h: number
}

interface Segment {
  from: Ball3
  v: Ball3
  duration: number
}

export interface AttackPlan {
  choice: AttackChoice
  outcome: AttackOutcome
  /** A hard hit that cleared the hands into an OVER zone. */
  overBlock: boolean
  segments: Segment[]
  /** Where the ball first hits the floor, and when (seconds after contact). */
  landing: Point
  landedAt: number
  /** Ball comes to rest (after one bounce). */
  duration: number
}

export interface AttackContext {
  analysis: DefenceAnalysis
  blockers: Blocker[]
  net: NetKind
  contactAboveNet: number
  /** The defender we're looking through: "at me", "my left" and the result line are relative to them. */
  viewer: Point
  rng?: () => number
}

const G = 9.81
const BALL_R = BALL_DIAMETER / 2
/** A strong spike leaves the hand at about 25–30 m/s (men), a little less for women. First guess. */
const HARD_SPEED: Record<NetKind, number> = { men: 24, women: 20 }
/** Hard hits don't land closer than this to the net (they'd go into it). */
const MIN_HARD_DEPTH = 3
/** "My left / right": this far to the side of you. */
const SIDE_STEP = 1.2
/** Soft shots start at these hang times and get loopier until they clear the block. */
const TIP_TIME = 0.9
const ROLL_TIME = 1.1
const MAX_SOFT_TIME = 2.5
/** Bounce: share of vertical speed kept, and of speed along the floor. */
const RESTITUTION = 0.45
const FLOOR_GRIP = 0.6
/** Spots chosen inside the court keep this far off the lines. */
const COURT_MARGIN = 0.3

/** How the random button splits its attacks. Hard hits go mostly where the board is open. */
const RANDOM_WEIGHTS = { hardOpen: 0.56, hardBlocked: 0.12, tip: 0.12, roll: 0.1, touch: 0.1 }

export function ballAt(plan: AttackPlan, t: number): Ball3 {
  let rest = Math.max(0, t)
  for (const seg of plan.segments) {
    if (rest <= seg.duration) return position(seg, rest)
    rest -= seg.duration
  }
  const last = plan.segments[plan.segments.length - 1]
  return position(last, last.duration)
}

/** Which choices make sense on this board (no seam to hit into without a split block). */
export function availableChoices(analysis: DefenceAnalysis): Set<AttackChoice> {
  const all: AttackChoice[] = ['tip', 'roll', 'hardMe', 'hardLeft', 'hardRight', 'line', 'cross', 'seam', 'touch']
  return new Set(all.filter(c => c !== 'seam' || laneRegions(analysis, 'seam').length > 0))
}

export function planAttack(choice: AttackChoice | 'random', ctx: AttackContext): AttackPlan {
  const rng = ctx.rng ?? Math.random
  if (choice !== 'random') return planChoice(choice, ctx, rng)

  const r = rng()
  let acc = 0
  const pick = (weight: number) => (acc += weight) > r
  if (pick(RANDOM_WEIGHTS.tip)) return planChoice('tip', ctx, rng)
  if (pick(RANDOM_WEIGHTS.roll)) return planChoice('roll', ctx, rng)
  if (pick(RANDOM_WEIGHTS.touch)) return planChoice('touch', ctx, rng)
  if (pick(RANDOM_WEIGHTS.hardBlocked) && ctx.analysis.shadows.length) {
    const shadow = weightedPick(ctx.analysis.shadows, s => polygonArea(s.polygon), rng)
    return hard('line', samplePoint(shadow.polygon, rng, deepEnough), ctx, rng)
  }
  const open = [...ctx.analysis.lanes, ...ctx.analysis.over].filter(z => polygonArea(z.polygon) > 0.5)
  if (!open.length) return planChoice('touch', ctx, rng)
  const zone = weightedPick(open, z => polygonArea(z.polygon), rng)
  const kind = 'kind' in zone && (zone.kind === 'line' || zone.kind === 'cross' || zone.kind === 'seam') ? zone.kind : 'cross'
  return hard(kind, samplePoint(zone.polygon, rng, deepEnough), ctx, rng)
}

function planChoice(choice: AttackChoice, ctx: AttackContext, rng: () => number): AttackPlan {
  const { analysis, viewer } = ctx
  switch (choice) {
    case 'tip':
      return soft('tip', 'tip', samplePoint(tipZone(analysis), rng, p => p.y > NET_Y + 0.5), TIP_TIME, ctx)
    case 'roll': {
      const zones = rollZones(analysis)
      const target = zones.length
        ? samplePoint(weightedPick(zones, polygonArea, rng), rng)
        : { x: analysis.contact.x, y: NET_Y + 4 }
      return soft('roll', 'roll', target, ROLL_TIME, ctx)
    }
    case 'hardMe':
      return hard(choice, viewer, ctx, rng)
    case 'hardLeft':
    case 'hardRight': {
      const side = choice === 'hardLeft' ? -1 : 1
      return hard(choice, inCourt({ x: viewer.x + side * SIDE_STEP, y: viewer.y }), ctx, rng)
    }
    case 'line':
    case 'cross':
    case 'seam': {
      const regions = laneRegions(analysis, choice)
      const zone = regions.length ? weightedPick(regions, polygonArea, rng) : undefined
      return hard(choice, zone ? samplePoint(zone, rng, deepEnough) : viewer, ctx, rng)
    }
    case 'touch':
      return wipe(ctx, rng)
  }
}

// ---- shots

function soft(choice: AttackChoice, outcome: AttackOutcome, target: Point, startTime: number, ctx: AttackContext): AttackPlan {
  const from = contactBall(ctx)
  const to = { ...target, h: BALL_R }
  let seg = arc(from, to, startTime)
  for (let t = startTime; !clears(seg, ctx) && t < MAX_SOFT_TIME; t += 0.1) seg = arc(from, to, t)
  return finish(choice, outcome, [seg])
}

function hard(choice: AttackChoice, target: Point, ctx: AttackContext, rng: () => number): AttackPlan {
  const from = contactBall(ctx)
  const to = { ...target, h: BALL_R }
  if (ctx.analysis.shadows.some(s => pointInPolygon(target, s.polygon))) return offTheBlock(choice, target, ctx, rng, false)

  let time = Math.hypot(to.x - from.x, to.y - from.y) / HARD_SPEED[ctx.net]
  let seg = arc(from, to, time)
  // Over the hands into an OVER zone: hit it a touch higher if the straight line would clip them.
  for (let i = 0; !clears(seg, ctx) && i < 8; i++) seg = arc(from, to, (time *= 1.12))
  if (!clears(seg, ctx)) return offTheBlock(choice, target, ctx, rng, false)
  const overBlock = ctx.analysis.over.some(o => pointInPolygon(target, o.polygon))
  return { ...finish(choice, 'hard', [seg]), overBlock }
}

/** A deliberate wipe off the outside hand. */
function wipe(ctx: AttackContext, rng: () => number): AttackPlan {
  const hands = handIntervals(ctx)
  if (!hands.length) return planChoice('tip', ctx, rng)
  const outside = hands.reduce((a, b) => (Math.abs(b.mid - COURT_WIDTH / 2) > Math.abs(a.mid - COURT_WIDTH / 2) ? b : a))
  const edgeX = outside.mid < COURT_WIDTH / 2 ? outside.from : outside.to
  return offTheBlock('touch', { x: edgeX, y: NET_Y + 6 }, ctx, rng, true)
}

/** The ball hits the hands on its way to `aim`, then deflects. */
function offTheBlock(choice: AttackChoice, aim: Point, ctx: AttackContext, rng: () => number, wiped: boolean): AttackPlan {
  const from = contactBall(ctx)
  const hands = handIntervals(ctx)
  const crossX = from.x + (aim.x - from.x) * ((NET_Y - from.y) / Math.max(1e-6, aim.y - from.y))
  const hand = hands.length
    ? hands.reduce((a, b) => (distanceTo(b, crossX) < distanceTo(a, crossX) ? b : a))
    : { from: crossX, to: crossX, mid: crossX, height: NET_HEIGHT[ctx.net] + 0.3, depth: 0.1 }
  const hit: Ball3 = {
    x: Math.min(hand.to, Math.max(hand.from, crossX)),
    y: NET_Y - hand.depth,
    h: hand.height - 0.05,
  }
  const toHands = arc(from, hit, Math.hypot(hit.x - from.x, hit.y - from.y, hit.h - from.h) / HARD_SPEED[ctx.net])

  const outward = Math.sign(hit.x - COURT_WIDTH / 2) || 1
  const r = rng()
  // A wipe goes off the hands to our side; a hit into the block can also come straight back down.
  const kind: AttackOutcome = wiped
    ? r < 0.45 ? 'touchUp' : r < 0.8 ? 'touchOut' : 'touchDrop'
    : r < 0.3 ? 'stuff' : r < 0.5 ? 'touchDrop' : r < 0.85 ? 'touchUp' : 'touchOut'
  const spread = (rng() - 0.5) * 2
  const deflect: Record<Exclude<AttackOutcome, 'tip' | 'roll' | 'hard'>, { to: Point; time: number }> = {
    stuff: { to: { x: hit.x + spread * 0.8, y: NET_Y - 1 - rng() * 2 }, time: 0.45 },
    touchDrop: { to: { x: hit.x + spread * 0.6, y: NET_Y + 0.5 + rng() }, time: 0.55 },
    touchUp: { to: { x: hit.x + spread * 2, y: NET_Y + 5 + rng() * 5 }, time: 1.6 + rng() * 0.4 },
    touchOut: { to: { x: hit.x + outward * (2 + rng() * 2), y: NET_Y + 4 + rng() * 6 }, time: 1 },
  }
  const { to, time } = deflect[kind as keyof typeof deflect]
  return finish(choice, kind, [toHands, arc(hit, { ...to, h: BALL_R }, time)])
}

// ---- flight maths

function contactBall(ctx: AttackContext): Ball3 {
  return { ...ctx.analysis.contact, h: contactHeight(ctx.net, ctx.contactAboveNet) }
}

/** The projectile from `from` that reaches `to` in `time` seconds. */
function arc(from: Ball3, to: Ball3, time: number): Segment {
  return {
    from,
    v: { x: (to.x - from.x) / time, y: (to.y - from.y) / time, h: (to.h - from.h + (G * time * time) / 2) / time },
    duration: time,
  }
}

function position({ from, v }: Segment, t: number): Ball3 {
  return { x: from.x + v.x * t, y: from.y + v.y * t, h: from.h + v.h * t - (G * t * t) / 2 }
}

/** Crosses the net between the antennae, over the tape and over any hands in the way. */
function clears(seg: Segment, ctx: AttackContext): boolean {
  if (seg.v.y <= 0) return true
  const t = (NET_Y - seg.from.y) / seg.v.y
  if (t < 0 || t > seg.duration) return true
  const at = position(seg, t)
  if (at.x < BALL_R || at.x > COURT_WIDTH - BALL_R) return false
  if (at.h < NET_HEIGHT[ctx.net] + BALL_R) return false
  return handIntervals(ctx).every(hand => at.x < hand.from - BALL_R || at.x > hand.to + BALL_R || at.h > hand.height + BALL_R)
}

/** Add the bounce and the timings. */
function finish(choice: AttackChoice, outcome: AttackOutcome, segments: Segment[]): AttackPlan {
  const last = segments[segments.length - 1]
  const landedAt = segments.reduce((sum, s) => sum + s.duration, 0)
  const landing = position(last, last.duration)
  const fallSpeed = G * last.duration - last.v.h
  const up = fallSpeed * RESTITUTION
  const bounce: Segment = {
    from: { ...landing, h: BALL_R },
    v: { x: last.v.x * FLOOR_GRIP, y: last.v.y * FLOOR_GRIP, h: up },
    duration: (2 * up) / G,
  }
  return {
    choice,
    outcome,
    overBlock: false,
    segments: [...segments, bounce],
    landing: { x: landing.x, y: landing.y },
    landedAt,
    duration: landedAt + bounce.duration,
  }
}

// ---- block and court helpers

interface HandInterval {
  from: number
  to: number
  mid: number
  height: number
  /** How far the hands reach over to the hitter's side. */
  depth: number
}

function handIntervals(ctx: AttackContext): HandInterval[] {
  return ctx.blockers.map(b => {
    const size = b.size ?? DEFAULT_BLOCK_SIZE
    const half = BLOCK_SIZES[size].width / 2
    return { from: b.x - half, to: b.x + half, mid: b.x, height: blockHandHeight(size, ctx.net), depth: HAND_PENETRATION[size] }
  })
}

function distanceTo(hand: HandInterval, x: number): number {
  return x < hand.from ? hand.from - x : x > hand.to ? x - hand.to : 0
}

/** Open areas for a lane choice. Without a block, line and cross fall back to any open lane. */
function laneRegions(analysis: DefenceAnalysis, kind: 'line' | 'cross' | 'seam'): Point[][] {
  const exact = analysis.lanes.filter(l => l.kind === kind).map(l => l.polygon)
  if (exact.length || kind === 'seam') return exact.filter(p => polygonArea(p) > 0.3)
  return analysis.lanes.filter(l => l.kind === 'open').map(l => l.polygon)
}

function deepEnough(p: Point): boolean {
  return p.y >= NET_Y + MIN_HARD_DEPTH
}

function inCourt(p: Point): Point {
  return {
    x: Math.min(COURT_WIDTH - COURT_MARGIN, Math.max(COURT_MARGIN, p.x)),
    y: Math.min(COURT_LENGTH - COURT_MARGIN, Math.max(NET_Y + MIN_HARD_DEPTH, p.y)),
  }
}

/** A random point inside the polygon (and passing `ok`), or its centre if none turns up. */
function samplePoint(polygon: Point[], rng: () => number, ok: (p: Point) => boolean = () => true): Point {
  const xs = polygon.map(p => p.x)
  const ys = polygon.map(p => p.y)
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  for (let i = 0; i < 200; i++) {
    const p = { x: minX + rng() * (maxX - minX), y: minY + rng() * (maxY - minY) }
    if (pointInPolygon(p, polygon) && ok(p)) return p
  }
  return polygonCentroid(polygon)
}

function weightedPick<T>(items: T[], weight: (item: T) => number, rng: () => number): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0)
  let r = rng() * total
  for (const item of items) if ((r -= weight(item)) <= 0) return item
  return items[items.length - 1]
}

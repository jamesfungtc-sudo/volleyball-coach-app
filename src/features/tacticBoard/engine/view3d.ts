import { COURT_WIDTH, NET_Y, type Point } from './court'
import type { BlockSize } from './defence'

// Numbers for the 3D view. The board stays the single source of truth: these only say how tall
// things are, since the 2D board has no heights.
//
// World axes (three.js, metres): X across the court (0 = centre), Y up, Z along the court with the
// net at Z = 0 and our side at positive Z.

export type NetKind = 'men' | 'women'

export const NET_HEIGHT: Record<NetKind, number> = { men: 2.43, women: 2.24 }
/** Depth of the net mesh below the top tape. */
export const NET_DEPTH = 1
/** Antennae stick up this far above the net. */
export const ANTENNA_ABOVE_NET = 0.8

/** Standing height by block size: the same L / M / S sets how tall a player is drawn. */
export const PLAYER_HEIGHT: Record<BlockSize, number> = { large: 1.9, medium: 1.8, small: 1.6 }
/** How far above the net tape a blocker gets their hands (sets how much hitting window they take). */
export const HAND_ABOVE_NET: Record<BlockSize, number> = { large: 0.45, medium: 0.3, small: 0.15 }
/** How far a blocker's hands reach over the net into the opponent's side. */
export const HAND_PENETRATION: Record<BlockSize, number> = { large: 0.25, medium: 0.15, small: 0.08 }

/** Hitter's contact point above the net tape: the default (3.00 m on a men's net), and how far the coach can set it. */
export const CONTACT_ABOVE_NET = 0.57
export const CONTACT_ABOVE_NET_RANGE = { min: 0.15, max: 1.3 }

/** Body proportions as a share of standing height. */
export const SHOULDER_RATIO = 0.82
export const HEAD_RATIO = 0.93
export const ARM_LENGTH = 0.75

/** Eye height as a share of standing height: a defender's ready crouch, or standing tall. */
export const EYE_RATIO = { crouch: 0.63, stand: 0.93 }
export type Stance = keyof typeof EYE_RATIO

export function toWorld(p: Point, height = 0): [number, number, number] {
  return [p.x - COURT_WIDTH / 2, height, p.y - NET_Y]
}

/** Hands at the top of the reach, in metres off the floor. */
export function blockHandHeight(size: BlockSize, net: NetKind): number {
  return NET_HEIGHT[net] + HAND_ABOVE_NET[size]
}

export function contactHeight(net: NetKind, aboveNet = CONTACT_ABOVE_NET): number {
  return NET_HEIGHT[net] + aboveNet
}

/** How far a player has to jump for straight arms to reach `handHeight`. */
export function jumpFor(size: BlockSize, handHeight: number): number {
  return Math.max(0, handHeight - (PLAYER_HEIGHT[size] * SHOULDER_RATIO + ARM_LENGTH))
}

export function eyeHeight(size: BlockSize, stance: Stance): number {
  return PLAYER_HEIGHT[size] * EYE_RATIO[stance]
}

/**
 * Turn a board colour token ("H S% L%" or "H S% L% / A", as in tacticBoard.css) into a CSS colour
 * three.js understands, plus its opacity.
 */
export function parseHslToken(token: string): { color: string; opacity: number } {
  const [hsl, alpha] = token.trim().split('/')
  const [h, s, l] = hsl.trim().split(/\s+/)
  return { color: `hsl(${h}, ${s}, ${l})`, opacity: alpha === undefined ? 1 : Number(alpha.trim()) }
}

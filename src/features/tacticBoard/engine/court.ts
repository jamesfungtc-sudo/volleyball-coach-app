// Court geometry in metres. Portrait orientation:
//   x: 0 (left sideline) → 9 (right sideline)
//   y: 0 (opponent end line, top) → 18 (our end line, bottom)
// The net sits on the centre line at y = 9. Our court is y 9–18.

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const COURT_WIDTH = 9
export const COURT_LENGTH = 18
export const NET_Y = COURT_LENGTH / 2
export const ATTACK_LINE_DISTANCE = 3
export const LINE_WIDTH = 0.05
/** Attack-line extension beyond each sideline: 5 dashes of 15 cm with 20 cm gaps. */
export const ATTACK_LINE_EXTENSION = { dash: 0.15, gap: 0.2, count: 5 }
/** Antennae stand on the outer edge of each sideline. */
export const ANTENNA_X = [0, COURT_WIDTH] as const

/** Free zone shown around the court (rules require >= 3 m; trimmed to save screen space). */
export const FREE_ZONE = { side: 2, end: 2.5 }

export const FULL_VIEW: Rect = {
  x: -FREE_ZONE.side,
  y: -FREE_ZONE.end,
  width: COURT_WIDTH + FREE_ZONE.side * 2,
  height: COURT_LENGTH + FREE_ZONE.end * 2,
}

// Portrait phones are width-limited in this view, so keep the side margin tight.
const DEFENCE_VIEW_PADDING = { side: 0.6, end: 1.2 }

/** Tight view that keeps the hitter and our entire half (plus a margin) on screen. */
export function defenceView(hitter: Point): Rect {
  const { side, end } = DEFENCE_VIEW_PADDING
  const minX = Math.min(-side, hitter.x - side)
  const maxX = Math.max(COURT_WIDTH + side, hitter.x + side)
  const minY = Math.min(NET_Y - end, hitter.y - end)
  const maxY = COURT_LENGTH + end
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/**
 * Grow `view` so it matches the screen's aspect ratio (width / height) instead of letterboxing.
 * Extra width is split evenly; extra height is added above when anchored to the bottom
 * (keeps our end line in place and reveals more of the opponent's side).
 */
export function fitViewToAspect(view: Rect, aspect: number, anchor: 'center' | 'bottom'): Rect {
  if (!(aspect > 0)) return view
  if (view.width / view.height > aspect) {
    const height = view.width / aspect
    const extra = height - view.height
    return { ...view, y: view.y - (anchor === 'bottom' ? extra : extra / 2), height }
  }
  const width = view.height * aspect
  return { ...view, x: view.x - (width - view.width) / 2, width }
}

export function clampToRect(p: Point, r: Rect): Point {
  return {
    x: Math.min(r.x + r.width, Math.max(r.x, p.x)),
    y: Math.min(r.y + r.height, Math.max(r.y, p.y)),
  }
}

import { describe, expect, it } from 'vitest'
import { appendPenPoint, isMeaningfulStroke, pathLength, PEN_MIN_STEP, smoothPath } from './drawing'

describe('pen strokes', () => {
  it('drops samples that are too close together', () => {
    let points = appendPenPoint([], { x: 0, y: 0 })
    points = appendPenPoint(points, { x: PEN_MIN_STEP / 2, y: 0 })
    points = appendPenPoint(points, { x: PEN_MIN_STEP * 2, y: 0 })
    expect(points).toEqual([{ x: 0, y: 0 }, { x: PEN_MIN_STEP * 2, y: 0 }])
  })

  it('measures the path and ignores tap-sized strokes', () => {
    expect(pathLength([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 5 }])).toBe(6)
    expect(isMeaningfulStroke([{ x: 0, y: 0 }])).toBe(false)
    expect(isMeaningfulStroke([{ x: 0, y: 0 }, { x: 0.1, y: 0 }])).toBe(false)
    expect(isMeaningfulStroke([{ x: 0, y: 0 }, { x: 1, y: 0 }])).toBe(true)
  })

  it('builds a path that starts and ends on the stroke ends', () => {
    const d = smoothPath([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }, { x: 3, y: 1 }])
    expect(d.startsWith('M 0 0')).toBe(true)
    expect(d.endsWith('L 3 1')).toBe(true)
    expect(smoothPath([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe('M 0 0 L 1 1')
  })
})

import { useEffect, useRef, useState } from 'react'
import type { Rect } from '../engine/court'

const DURATION_MS = 280

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

function lerpRect(a: Rect, b: Rect, t: number): Rect {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    width: a.width + (b.width - a.width) * t,
    height: a.height + (b.height - a.height) * t,
  }
}

/** Tweens smoothly to a new view box whenever the target changes. */
export function useAnimatedViewBox(target: Rect): Rect {
  const [view, setView] = useState(target)
  const viewRef = useRef(view)
  viewRef.current = view

  const { x, y, width, height } = target
  useEffect(() => {
    const to = { x, y, width, height }
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      setView(to)
      return
    }

    const from = viewRef.current
    const start = performance.now()
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / DURATION_MS)
      setView(lerpRect(from, to, easeOutCubic(t)))
      if (t < 1) frame = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(frame)
  }, [x, y, width, height])

  return view
}

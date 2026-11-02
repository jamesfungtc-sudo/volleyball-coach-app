import { useEffect, useState, type RefObject } from 'react'

/** Width / height of an element, kept up to date as it resizes (0 until measured). */
export function useElementAspect(ref: RefObject<Element | null>): number {
  const [aspect, setAspect] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setAspect(width / height)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return aspect
}

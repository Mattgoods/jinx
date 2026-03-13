import { useEffect, useRef, useState } from 'react'

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Animates a number from its previous value to the new target.
 * Returns the current display value (rounded to nearest integer).
 * On first render, returns the target immediately (no animation from 0).
 */
export function useAnimatedNumber(target: number, duration = 500): number {
  const [display, setDisplay] = useState(target)
  const prevTarget = useRef(target)
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    const from = prevTarget.current
    prevTarget.current = target

    if (from === target) return

    if (duration === 0) {
      Promise.resolve().then(() => setDisplay(target))
      return
    }

    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)
      const current = Math.round(from + (target - from) * easedProgress)
      setDisplay(current)

      if (progress < 1) {
        rafId.current = requestAnimationFrame(tick)
      }
    }

    rafId.current = requestAnimationFrame(tick)

    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, [target, duration])

  return display
}

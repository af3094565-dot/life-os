import { useEffect, useState } from 'react'

/**
 * Detects soft keyboard via visualViewport shrink.
 * Used to hide fixed chrome (bottom nav) while typing — not for layout math.
 */
export function useKeyboardOpen(thresholdPx = 120): boolean {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const inset = window.innerHeight - vv.height - vv.offsetTop
      setOpen(inset > thresholdPx)
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [thresholdPx])

  return open
}

/** Blur active field so the soft keyboard closes after submit. */
export function blurActiveInput() {
  const el = document.activeElement
  if (el instanceof HTMLElement) el.blur()
}

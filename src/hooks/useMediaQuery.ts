import { useEffect, useState } from 'react'

/** SSR-safe matchMedia. Defaults to `false` until mounted. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Tailwind `md` breakpoint (~768px) — desktop shell */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)')
}

/** Below `md` — mobile presentation layer */
export function useIsMobile(): boolean {
  return !useIsDesktop()
}

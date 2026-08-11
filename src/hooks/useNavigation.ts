import { useCallback, useState } from 'react'
import type { PageId } from '../data/seed'
import {
  pageLabel,
  type NavContext,
  type NavigateOptions,
} from '../lib/navigation'

const MAX_HISTORY = 40

export function useNavigation(initial: PageId = 'dashboard') {
  const [ctx, setCtx] = useState<NavContext>({ page: initial })
  const [history, setHistory] = useState<NavContext[]>([])

  const navigate = useCallback((page: PageId, options: NavigateOptions = {}) => {
    const { replace, ...rest } = options
    setCtx((prev) => {
      if (!replace) {
        setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), prev])
      }
      return { page, ...rest }
    })
  }, [])

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) {
        setCtx({ page: 'dashboard' })
        return h
      }
      const prev = h[h.length - 1]
      setCtx(prev)
      return h.slice(0, -1)
    })
  }, [])

  const canGoBack = history.length > 0
  const backLabel =
    ctx.backLabel ??
    (ctx.returnTo ? pageLabel(ctx.returnTo) : canGoBack ? 'Назад' : null)

  const clearEntity = useCallback(() => {
    setCtx((prev) => ({
      page: prev.page,
      view: prev.view,
      filter: prev.filter,
      selectedDate: prev.selectedDate,
    }))
  }, [])

  return {
    page: ctx.page,
    ctx,
    history,
    canGoBack,
    backLabel,
    navigate,
    goBack,
    clearEntity,
    setPage: (page: PageId) => navigate(page),
  }
}

export type AppNavigation = ReturnType<typeof useNavigation>

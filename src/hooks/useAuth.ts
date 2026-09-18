import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getSessionUser,
  linkTelegramAccount,
  loginUser,
  loginWithTelegram,
  logoutUser,
  purchaseSubscription,
  registerUser,
  restoreCloudSession,
  setLifeMapOfferStatus,
  setTrainingPhase,
  type AuthResult,
  type LifeMapOfferStatus,
  type PublicUser,
  type TrainingPhase,
} from '../lib/auth'
import { isCloudEnabled } from '../lib/supabase'
import { bootTelegramShell, isTelegramMiniApp } from '../lib/telegram'

export type AuthState = {
  user: PublicUser | null
  isAuthenticated: boolean
  hasSubscription: boolean
  cloudEnabled: boolean
  authReady: boolean
  register: (input: {
    name: string
    email: string
    password: string
  }) => Promise<AuthResult>
  login: (input: { email: string; password: string }) => Promise<AuthResult>
  loginTelegram: () => Promise<AuthResult>
  linkTelegram: () => Promise<AuthResult>
  logout: () => void
  buySubscription: () => void
  setLifeMapOffer: (status: LifeMapOfferStatus) => void
  setTraining: (phase: TrainingPhase) => void
  refresh: () => void
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<PublicUser | null>(() => getSessionUser())
  const [authReady, setAuthReady] = useState(!isCloudEnabled())

  useEffect(() => {
    bootTelegramShell()
  }, [])

  useEffect(() => {
    if (!isCloudEnabled()) {
      setAuthReady(true)
      return
    }

    let cancelled = false
    ;(async () => {
      // 1) Восстановить сессию сайта
      let current = await restoreCloudSession()

      // 2) Если в Mini App и нет сессии — тихий вход через Telegram
      if (!current && isTelegramMiniApp()) {
        const tg = await loginWithTelegram()
        if (tg.ok) current = tg.user
      }

      if (!cancelled) {
        setUser(current)
        setAuthReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(() => {
    if (isCloudEnabled()) {
      void restoreCloudSession().then((u) => setUser(u))
      return
    }
    setUser(getSessionUser())
  }, [])

  const register = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      const result = await registerUser(input)
      if (result.ok) setUser(result.user)
      return result
    },
    [],
  )

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const result = await loginUser(input)
      if (result.ok) setUser(result.user)
      return result
    },
    [],
  )

  const loginTelegram = useCallback(async () => {
    const result = await loginWithTelegram()
    if (result.ok) setUser(result.user)
    return result
  }, [])

  const linkTelegram = useCallback(async () => {
    const result = await linkTelegramAccount()
    if (result.ok) setUser(result.user)
    return result
  }, [])

  const logout = useCallback(() => {
    void logoutUser().then(() => setUser(null))
  }, [])

  const buySubscription = useCallback(() => {
    void (async () => {
      const current = user
      if (!current) return
      const next = await purchaseSubscription(current.id)
      if (next) setUser(next)
    })()
  }, [user])

  const setLifeMapOffer = useCallback(
    (status: LifeMapOfferStatus) => {
      void (async () => {
        const current = user
        if (!current) return
        const next = await setLifeMapOfferStatus(current.id, status)
        if (next) setUser(next)
      })()
    },
    [user],
  )

  const setTraining = useCallback(
    (phase: TrainingPhase) => {
      void (async () => {
        const current = user
        if (!current) return
        const next = await setTrainingPhase(current.id, phase)
        if (next) setUser(next)
      })()
    },
    [user],
  )

  return useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      hasSubscription: !!user?.hasSubscription,
      cloudEnabled: isCloudEnabled(),
      authReady,
      register,
      login,
      loginTelegram,
      linkTelegram,
      logout,
      buySubscription,
      setLifeMapOffer,
      setTraining,
      refresh,
    }),
    [
      user,
      authReady,
      register,
      login,
      loginTelegram,
      linkTelegram,
      logout,
      buySubscription,
      setLifeMapOffer,
      setTraining,
      refresh,
    ],
  )
}

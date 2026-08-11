import { useCallback, useMemo, useState } from 'react'
import {
  getSessionUser,
  loginUser,
  logoutUser,
  purchaseSubscription,
  registerUser,
  setLifeMapOfferStatus,
  setTrainingPhase,
  type AuthResult,
  type LifeMapOfferStatus,
  type PublicUser,
  type TrainingPhase,
} from '../lib/auth'

export type AuthState = {
  user: PublicUser | null
  isAuthenticated: boolean
  hasSubscription: boolean
  register: (input: {
    name: string
    email: string
    password: string
  }) => Promise<AuthResult>
  login: (input: { email: string; password: string }) => Promise<AuthResult>
  logout: () => void
  buySubscription: () => void
  setLifeMapOffer: (status: LifeMapOfferStatus) => void
  setTraining: (phase: TrainingPhase) => void
  refresh: () => void
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<PublicUser | null>(() => getSessionUser())

  const refresh = useCallback(() => {
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

  const logout = useCallback(() => {
    logoutUser()
    setUser(null)
  }, [])

  const buySubscription = useCallback(() => {
    setUser((current) => {
      if (!current) return current
      return purchaseSubscription(current.id) ?? current
    })
  }, [])

  const setLifeMapOffer = useCallback((status: LifeMapOfferStatus) => {
    setUser((current) => {
      if (!current) return current
      return setLifeMapOfferStatus(current.id, status) ?? current
    })
  }, [])

  const setTraining = useCallback((phase: TrainingPhase) => {
    setUser((current) => {
      if (!current) return current
      return setTrainingPhase(current.id, phase) ?? current
    })
  }, [])

  return useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      hasSubscription: Boolean(user?.hasSubscription),
      register,
      login,
      logout,
      buySubscription,
      setLifeMapOffer,
      setTraining,
      refresh,
    }),
    [
      user,
      register,
      login,
      logout,
      buySubscription,
      setLifeMapOffer,
      setTraining,
      refresh,
    ],
  )
}

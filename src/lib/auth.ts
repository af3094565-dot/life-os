import {
  fetchCloudProfile,
  updateCloudProfile,
} from './cloudStore'
import { getSupabase, isCloudEnabled, type CloudProfile } from './supabase'
import { getTelegramInitData } from './telegram'

export type LifeMapOfferStatus = 'pending' | 'accepted' | 'deferred' | 'done'

/** Этап обучения: оффер → бесплатный тур → колесо → Pro-тур */
export type TrainingPhase =
  | 'offer'
  | 'free_tour'
  | 'wheel_offer'
  | 'pro_offer'
  | 'pro_tour'
  | 'completed'
  | 'skipped'

export type AuthUser = {
  id: string
  name: string
  email: string
  /** Простой хеш для локального теста (не для продакшена) */
  passwordHash: string
  createdAt: string
  hasSubscription: boolean
  lifeMapOfferStatus: LifeMapOfferStatus
  /** undefined у старых аккаунтов = обучение уже не показываем */
  trainingPhase?: TrainingPhase
}

export type PublicUser = Omit<AuthUser, 'passwordHash'> & {
  telegramId?: number | null
  telegramUsername?: string | null
  /** true = данные в Supabase */
  cloud?: boolean
}

const USERS_KEY = 'life-os-auth-users'
const SESSION_KEY = 'life-os-auth-session'

/** Готовый аккаунт для входа (локальная авторизация) */
export const OWNER_ACCOUNT = {
  name: 'Артём',
  email: 'artem@lifeos.app',
  password: 'artem123',
} as const

export const TESTER_USER_ID = 'u-owner-artem'

function toPublic(user: AuthUser): PublicUser {
  const { passwordHash: _, ...rest } = user
  return { ...rest, cloud: false }
}

function profileToPublic(p: CloudProfile): PublicUser {
  return {
    id: p.id,
    name: p.name,
    email: p.email ?? '',
    createdAt: p.created_at,
    hasSubscription: p.has_subscription,
    lifeMapOfferStatus: p.life_map_offer_status,
    trainingPhase: p.training_phase,
    telegramId: p.telegram_id,
    telegramUsername: p.telegram_username,
    cloud: true,
  }
}

function readUsers(): AuthUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AuthUser[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeUsers(users: AuthUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function readSessionUserId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function writeSession(userId: string | null) {
  if (userId) localStorage.setItem(SESSION_KEY, userId)
  else localStorage.removeItem(SESSION_KEY)
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`life-os:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Создаёт владелецский аккаунт, если его ещё нет (только local-режим) */
export async function ensureOwnerAccount(): Promise<PublicUser | null> {
  if (isCloudEnabled()) return null

  const email = OWNER_ACCOUNT.email
  const users = readUsers()
  const existing = users.find((u) => u.email === email)
  if (existing) return toPublic(existing)

  const user: AuthUser = {
    id: 'u-owner-artem',
    name: OWNER_ACCOUNT.name,
    email,
    passwordHash: await hashPassword(OWNER_ACCOUNT.password),
    createdAt: new Date().toISOString(),
    hasSubscription: false,
    lifeMapOfferStatus: 'pending',
    trainingPhase: 'completed',
  }
  writeUsers([...users, user])
  return toPublic(user)
}

export function getSessionUser(): PublicUser | null {
  // Синхронный снимок для первого рендера (local). Cloud подтянется в useAuth.
  if (isCloudEnabled()) {
    try {
      const cached = localStorage.getItem('life-os-cloud-user')
      if (cached) return JSON.parse(cached) as PublicUser
    } catch {
      /* ignore */
    }
    return null
  }
  const id = readSessionUserId()
  if (!id) return null
  const user = readUsers().find((u) => u.id === id)
  return user ? toPublic(user) : null
}

function cacheCloudUser(user: PublicUser | null) {
  if (user) localStorage.setItem('life-os-cloud-user', JSON.stringify(user))
  else localStorage.removeItem('life-os-cloud-user')
}

export async function restoreCloudSession(): Promise<PublicUser | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  if (!data.session?.user) {
    cacheCloudUser(null)
    return null
  }
  const profile = await fetchCloudProfile(data.session.user.id)
  if (!profile) {
    cacheCloudUser(null)
    return null
  }
  const user = profileToPublic(profile)
  cacheCloudUser(user)
  return user
}

export function getCurrentUserName(fallback = 'Гость'): string {
  return getSessionUser()?.name ?? fallback
}

export function isTesterUser(user: PublicUser | null | undefined): boolean {
  return user?.id === TESTER_USER_ID
}

export function avatarLetter(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed[0]!.toUpperCase() : '?'
}

export type AuthResult =
  | { ok: true; user: PublicUser }
  | { ok: false; reason: string }

export async function registerUser(input: {
  name: string
  email: string
  password: string
}): Promise<AuthResult> {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const password = input.password

  if (name.length < 2) return { ok: false, reason: 'Укажи имя (минимум 2 символа)' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: 'Укажи корректный email' }
  }
  if (password.length < 6) {
    return { ok: false, reason: 'Пароль минимум 6 символов' }
  }

  if (isCloudEnabled()) {
    const sb = getSupabase()!
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) return { ok: false, reason: error.message }
    if (!data.user) return { ok: false, reason: 'Не удалось создать аккаунт' }

    await new Promise((r) => setTimeout(r, 400))
    await updateCloudProfile(data.user.id, {
      name,
      training_phase: 'offer',
      life_map_offer_status: 'pending',
    })
    const profile = await fetchCloudProfile(data.user.id)
    if (!profile) {
      return {
        ok: false,
        reason:
          'Аккаунт создан, но профиль ещё не готов. Подтверди email (если включено) и войди снова.',
      }
    }
    const user = profileToPublic(profile)
    cacheCloudUser(user)
    return { ok: true, user }
  }

  await ensureOwnerAccount()
  const users = readUsers()
  if (users.some((u) => u.email === email)) {
    return { ok: false, reason: 'Этот email уже зарегистрирован' }
  }

  const user: AuthUser = {
    id: `u-${Date.now()}`,
    name,
    email,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
    hasSubscription: false,
    lifeMapOfferStatus: 'pending',
    trainingPhase: 'offer',
  }

  writeUsers([...users, user])
  writeSession(user.id)
  return { ok: true, user: toPublic(user) }
}

export async function loginUser(input: {
  email: string
  password: string
}): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase()

  if (isCloudEnabled()) {
    const sb = getSupabase()!
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password: input.password,
    })
    if (error) return { ok: false, reason: 'Неверный email или пароль' }
    const profile = await fetchCloudProfile(data.user.id)
    if (!profile) return { ok: false, reason: 'Профиль не найден' }
    const user = profileToPublic(profile)
    cacheCloudUser(user)
    return { ok: true, user }
  }

  await ensureOwnerAccount()
  const users = readUsers()
  const user = users.find((u) => u.email === email)
  if (!user) return { ok: false, reason: 'Неверный email или пароль' }

  const hash = await hashPassword(input.password)
  if (hash !== user.passwordHash) {
    return { ok: false, reason: 'Неверный email или пароль' }
  }

  writeSession(user.id)
  return { ok: true, user: toPublic(user) }
}

export async function loginWithTelegram(): Promise<AuthResult> {
  if (!isCloudEnabled()) {
    return {
      ok: false,
      reason: 'Облако не настроено (VITE_SUPABASE_URL / ANON_KEY)',
    }
  }
  const initData = getTelegramInitData()
  if (!initData) {
    return { ok: false, reason: 'Открой приложение из Telegram' }
  }

  const sb = getSupabase()!
  const base = import.meta.env.VITE_SUPABASE_URL as string
  const res = await fetch(`${base}/functions/v1/telegram-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ initData }),
  })
  const payload = (await res.json()) as {
    ok?: boolean
    error?: string
    session?: {
      access_token: string
      refresh_token: string
    }
    profile?: CloudProfile
  }
  if (!res.ok || !payload.session) {
    return { ok: false, reason: payload.error ?? 'Telegram auth failed' }
  }

  const { error } = await sb.auth.setSession({
    access_token: payload.session.access_token,
    refresh_token: payload.session.refresh_token,
  })
  if (error) return { ok: false, reason: error.message }

  const profile =
    payload.profile ??
    (await fetchCloudProfile((await sb.auth.getUser()).data.user!.id))
  if (!profile) return { ok: false, reason: 'Профиль не найден' }
  const user = profileToPublic(profile)
  cacheCloudUser(user)
  return { ok: true, user }
}

export async function linkTelegramAccount(): Promise<AuthResult> {
  if (!isCloudEnabled()) {
    return { ok: false, reason: 'Облако не настроено' }
  }
  const initData = getTelegramInitData()
  if (!initData) {
    return {
      ok: false,
      reason: 'Привязку нужно делать из Telegram Mini App',
    }
  }
  const sb = getSupabase()!
  const { data: sess } = await sb.auth.getSession()
  if (!sess.session) return { ok: false, reason: 'Сначала войди на сайте' }

  const base = import.meta.env.VITE_SUPABASE_URL as string
  const res = await fetch(`${base}/functions/v1/telegram-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sess.session.access_token}`,
    },
    body: JSON.stringify({ initData, linkOnly: true }),
  })
  const payload = (await res.json()) as {
    ok?: boolean
    error?: string
    profile?: CloudProfile
  }
  if (!res.ok || !payload.profile) {
    return { ok: false, reason: payload.error ?? 'Не удалось привязать' }
  }
  const user = profileToPublic(payload.profile)
  cacheCloudUser(user)
  return { ok: true, user }
}

export async function logoutUser() {
  if (isCloudEnabled()) {
    const sb = getSupabase()
    await sb?.auth.signOut()
    cacheCloudUser(null)
  }
  writeSession(null)
}

function updateUser(
  userId: string,
  patch: Partial<Omit<AuthUser, 'id' | 'passwordHash' | 'email'>>,
): PublicUser | null {
  const users = readUsers()
  const idx = users.findIndex((u) => u.id === userId)
  if (idx < 0) return null
  const next = { ...users[idx]!, ...patch }
  users[idx] = next
  writeUsers(users)
  return toPublic(next)
}

export async function purchaseSubscription(userId: string): Promise<PublicUser | null> {
  if (isCloudEnabled()) {
    const profile = await updateCloudProfile(userId, { has_subscription: true })
    if (!profile) return null
    const user = profileToPublic(profile)
    cacheCloudUser(user)
    return user
  }
  return updateUser(userId, { hasSubscription: true })
}

export async function setLifeMapOfferStatus(
  userId: string,
  status: LifeMapOfferStatus,
): Promise<PublicUser | null> {
  if (isCloudEnabled()) {
    const profile = await updateCloudProfile(userId, {
      life_map_offer_status: status,
    })
    if (!profile) return null
    const user = profileToPublic(profile)
    cacheCloudUser(user)
    return user
  }
  return updateUser(userId, { lifeMapOfferStatus: status })
}

export async function setTrainingPhase(
  userId: string,
  trainingPhase: TrainingPhase,
): Promise<PublicUser | null> {
  if (isCloudEnabled()) {
    const profile = await updateCloudProfile(userId, {
      training_phase: trainingPhase,
    })
    if (!profile) return null
    const user = profileToPublic(profile)
    cacheCloudUser(user)
    return user
  }
  return updateUser(userId, { trainingPhase })
}

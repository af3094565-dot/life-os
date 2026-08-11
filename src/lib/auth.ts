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

export type PublicUser = Omit<AuthUser, 'passwordHash'>

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
  return rest
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

/** Создаёт владелецский аккаунт, если его ещё нет */
export async function ensureOwnerAccount(): Promise<PublicUser> {
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
  const id = readSessionUserId()
  if (!id) return null
  const user = readUsers().find((u) => u.id === id)
  return user ? toPublic(user) : null
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
  await ensureOwnerAccount()

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
  await ensureOwnerAccount()

  const email = input.email.trim().toLowerCase()
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

export function logoutUser() {
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

export function purchaseSubscription(userId: string): PublicUser | null {
  return updateUser(userId, { hasSubscription: true })
}

export function setLifeMapOfferStatus(
  userId: string,
  status: LifeMapOfferStatus,
): PublicUser | null {
  return updateUser(userId, { lifeMapOfferStatus: status })
}

export function setTrainingPhase(
  userId: string,
  trainingPhase: TrainingPhase,
): PublicUser | null {
  return updateUser(userId, { trainingPhase })
}

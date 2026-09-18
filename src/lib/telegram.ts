/** Telegram Mini App helpers */

export type TelegramWebAppUser = {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

type TelegramWebApp = {
  initData: string
  initDataUnsafe: {
    user?: TelegramWebAppUser
    start_param?: string
  }
  ready: () => void
  expand: () => void
  close: () => void
  themeParams?: Record<string, string>
  colorScheme?: 'light' | 'dark'
  MainButton: {
    text: string
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null
}

export function isTelegramMiniApp(): boolean {
  const wa = getTelegramWebApp()
  return Boolean(wa?.initData)
}

export function bootTelegramShell() {
  const wa = getTelegramWebApp()
  if (!wa) return
  try {
    wa.ready()
    wa.expand()
  } catch {
    /* ignore */
  }
}

export function getTelegramInitData(): string | null {
  const raw = getTelegramWebApp()?.initData
  return raw ? raw : null
}

export function getTelegramUser(): TelegramWebAppUser | null {
  return getTelegramWebApp()?.initDataUnsafe?.user ?? null
}

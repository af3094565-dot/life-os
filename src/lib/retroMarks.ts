import { addDays, todayKey } from './habitLogic'

export const RETRO_MAX_PER_MONTH = 5
export const RETRO_BLOCK_DAYS = 30

export type RetroMarksState = {
  /** YYYY-MM */
  monthKey: string
  used: number
  /** YYYY-MM-DD — блокировка после 5 использований */
  blockedUntil?: string
}

function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function normalizeRetroMarks(
  raw: RetroMarksState | undefined,
  today = todayKey(),
): RetroMarksState {
  const monthKey = currentMonthKey(parseDateFromKey(today))
  if (!raw) return { monthKey, used: 0 }
  let used = raw.monthKey === monthKey ? raw.used : 0
  let blockedUntil = raw.blockedUntil
  if (blockedUntil && compareDateKeys(today, blockedUntil) > 0) {
    blockedUntil = undefined
    used = raw.monthKey === monthKey ? raw.used : 0
  }
  return { monthKey, used, blockedUntil }
}

function parseDateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function compareDateKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export type RetrofillInfo = {
  canUse: boolean
  remaining: number
  used: number
  blockedUntil?: string
  reason?: string
}

export function retrofillInfo(
  raw: RetroMarksState | undefined,
  today = todayKey(),
): RetrofillInfo {
  const state = normalizeRetroMarks(raw, today)
  if (state.blockedUntil && compareDateKeys(today, state.blockedUntil) <= 0) {
    return {
      canUse: false,
      remaining: 0,
      used: state.used,
      blockedUntil: state.blockedUntil,
      reason: `Отметки за прошлые дни недоступны до ${formatRuShort(state.blockedUntil)} (лимит ${RETRO_MAX_PER_MONTH} раз в месяц).`,
    }
  }
  const remaining = Math.max(0, RETRO_MAX_PER_MONTH - state.used)
  if (remaining <= 0) {
    return {
      canUse: false,
      remaining: 0,
      used: state.used,
      reason: `Лимит ${RETRO_MAX_PER_MONTH} отметок за прошлое в этом месяце исчерпан.`,
    }
  }
  return { canUse: true, remaining, used: state.used, blockedUntil: state.blockedUntil }
}

export function consumeRetrofill(
  raw: RetroMarksState | undefined,
  today = todayKey(),
): RetroMarksState {
  const state = normalizeRetroMarks(raw, today)
  const used = state.used + 1
  let blockedUntil = state.blockedUntil
  if (used >= RETRO_MAX_PER_MONTH) {
    blockedUntil = addDays(today, RETRO_BLOCK_DAYS)
  }
  return {
    monthKey: currentMonthKey(parseDateFromKey(today)),
    used,
    blockedUntil,
  }
}

function formatRuShort(key: string): string {
  const d = parseDateFromKey(key)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function retroConfirmMessage(remaining: number, count = 1): string {
  const after = Math.max(0, remaining - count)
  return (
    `Отметить прошлый день? Это использует лимит: ${count} из ${remaining} оставшихся ` +
    `(${RETRO_MAX_PER_MONTH} в месяц). После ${RETRO_MAX_PER_MONTH} раз — пауза ${RETRO_BLOCK_DAYS} суток. ` +
    `После этой отметки останется ${after}.`
  )
}

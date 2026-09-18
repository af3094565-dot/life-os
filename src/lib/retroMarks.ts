import { todayKey } from './habitLogic'

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
  _today = todayKey(),
): RetrofillInfo {
  return {canUse:true, remaining:Number.MAX_SAFE_INTEGER, used:raw?.used??0}
}

export function consumeRetrofill(
  raw: RetroMarksState | undefined,
  today = todayKey(),
): RetroMarksState {
  return normalizeRetroMarks(raw,today)
}

export function retroConfirmMessage(_remaining: number, _count = 1): string { return 'Восстановить прошлое выполнение? Игровая энергия за прошлые дни не начисляется.' }

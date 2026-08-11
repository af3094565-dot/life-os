import type { Habit, HabitDuration } from '../data/seed'

/** YYYY-MM-DD в локальном времени */
export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Сколько календарных дней нужно минимум под N выполнений при F раз/нед */
export function baseCalendarSpan(targetDays: number, timesPerWeek: number): number {
  const f = Math.min(7, Math.max(1, timesPerWeek))
  return Math.max(1, Math.ceil((targetDays * 7) / f))
}

export function baseEndDate(startDate: string, targetDays: number, timesPerWeek: number): string {
  return addDays(startDate, baseCalendarSpan(targetDays, timesPerWeek) - 1)
}

function eachDay(from: string, to: string): string[] {
  if (compareKeys(from, to) > 0) return []
  const out: string[] = []
  let cur = from
  while (compareKeys(cur, to) <= 0) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

function weekStartMonday(key: string): string {
  const d = parseDateKey(key)
  const js = d.getDay()
  const offset = js === 0 ? 6 : js - 1
  d.setDate(d.getDate() - offset)
  return toDateKey(d)
}

/**
 * Пропуски: сколько ожидаемых выполнений не сделано до вчера.
 * Для 7/нед — каждый день без отметки = пропуск.
 * Для N/нед — недобор квоты за завершённые недели + текущую (до вчера).
 */
export function countMisses(habit: Pick<Habit, 'startDate' | 'timesPerWeek' | 'completions' | 'targetDays'>, asOf: string = todayKey()): number {
  const start = habit.startDate
  const yesterday = addDays(asOf, -1)
  if (compareKeys(yesterday, start) < 0) return 0

  const until = yesterday
  const freq = Math.min(7, Math.max(1, habit.timesPerWeek))

  if (freq >= 7) {
    let misses = 0
    for (const day of eachDay(start, until)) {
      if (!habit.completions[day]) misses += 1
    }
    return misses
  }

  // По неделям: ожидаем freq выполнений за неделю (или меньше на частичной первой/последней)
  let misses = 0
  let cursor = weekStartMonday(start)
  const lastWeek = weekStartMonday(until)

  while (compareKeys(cursor, lastWeek) <= 0) {
    const wEnd = addDays(cursor, 6)
    const rangeStart = compareKeys(start, cursor) > 0 ? start : cursor
    const rangeEnd = compareKeys(until, wEnd) < 0 ? until : wEnd
    const daysInRange = eachDay(rangeStart, rangeEnd)
    if (daysInRange.length === 0) {
      cursor = addDays(cursor, 7)
      continue
    }
    const expected = Math.min(freq, daysInRange.length, habit.targetDays)
    const done = daysInRange.filter((d) => habit.completions[d]).length
    misses += Math.max(0, expected - done)
    cursor = addDays(cursor, 7)
  }
  return misses
}

export function effectiveEndDate(habit: Pick<Habit, 'startDate' | 'timesPerWeek' | 'completions' | 'targetDays'>): string {
  const base = baseEndDate(habit.startDate, habit.targetDays, habit.timesPerWeek)
  const misses = countMisses(habit)
  return addDays(base, misses)
}

export function completedCount(habit: Pick<Habit, 'completions'>): number {
  return Object.values(habit.completions).filter(Boolean).length
}

export function isFormed(habit: Pick<Habit, 'completions' | 'targetDays'>): boolean {
  return completedCount(habit) >= habit.targetDays
}

/** Привычка ещё «живая» для отображения в месяце */
export function isVisibleInMonth(
  habit: Habit,
  year: number,
  month: number,
): boolean {
  const end = effectiveEndDate(habit)
  const monthStart = toDateKey(new Date(year, month, 1))
  const monthEnd = toDateKey(new Date(year, month + 1, 0))
  // Скрываем, если срок уже прошёл (с учётом продлений) и цель не достигнута —
  // или если сформирована и месяц после конца.
  // Показываем, если месяц пересекается с [start, end].
  if (compareKeys(monthEnd, habit.startDate) < 0) return false
  if (compareKeys(monthStart, end) > 0) return false
  return true
}

/** Активна сегодня (можно/нужно выполнять) */
export function isActiveToday(habit: Habit, today: string = todayKey()): boolean {
  if (compareKeys(today, habit.startDate) < 0) return false
  if (isFormed(habit)) return false
  const end = effectiveEndDate(habit)
  return compareKeys(today, end) <= 0
}

export function isDueToday(habit: Habit, today: string = todayKey()): boolean {
  return isDueOnDate(habit, today)
}

/** Нужно ли было выполнить в конкретный день (для вчера / ретро-отметок) */
export function isDueOnDate(habit: Habit, date: string): boolean {
  if (compareKeys(date, habit.startDate) < 0) return false
  if (habit.completions[date]) return false
  if (completedCount(habit) >= habit.targetDays) return false
  const end = effectiveEndDate(habit)
  if (compareKeys(date, end) > 0) return false

  const freq = Math.min(7, Math.max(1, habit.timesPerWeek))
  if (freq >= 7) return true

  const ws = weekStartMonday(date)
  const rangeStart = compareKeys(habit.startDate, ws) > 0 ? habit.startDate : ws
  const days = eachDay(rangeStart, date)
  const doneThisWeek = days.filter((d) => habit.completions[d]).length
  return doneThisWeek < freq
}

export function currentStreak(habit: Habit, today: string = todayKey()): number {
  let streak = 0
  let cur = today
  if (compareKeys(cur, habit.startDate) < 0) return 0

  // Если сегодня ещё не отмечено — считаем с вчера
  if (!habit.completions[cur]) {
    cur = addDays(cur, -1)
  }

  while (compareKeys(cur, habit.startDate) >= 0) {
    if (!habit.completions[cur]) break
    streak += 1
    cur = addDays(cur, -1)
  }
  return streak
}

export function monthDaysArray(
  habit: Habit,
  year: number,
  month: number,
): boolean[] {
  const n = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: n }, (_, i) => {
    const key = toDateKey(new Date(year, month, i + 1))
    return !!habit.completions[key]
  })
}

export function dayStatus(
  habit: Habit,
  year: number,
  month: number,
  dayIndex: number,
): 'before' | 'after' | 'active' | 'done' | 'missed' | 'future' {
  const key = toDateKey(new Date(year, month, dayIndex + 1))
  const end = effectiveEndDate(habit)
  const today = todayKey()

  if (compareKeys(key, habit.startDate) < 0) return 'before'
  if (compareKeys(key, end) > 0) return 'after'
  if (compareKeys(key, today) > 0) return 'future'
  if (habit.completions[key]) return 'done'
  if (compareKeys(key, today) < 0) return 'missed'
  return 'active'
}

export function formatRuDate(key: string): string {
  const d = parseDateKey(key)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export type HabitWarning = {
  habitId: string
  name: string
  emoji: string
  kind: 'today' | 'missed_yesterday'
  message: string
}

export function buildWarnings(habits: Habit[], today: string = todayKey()): HabitWarning[] {
  const warnings: HabitWarning[] = []
  for (const h of habits) {
    if (!isActiveToday(h, today)) continue

    const yesterday = addDays(today, -1)
    const missedYesterday =
      compareKeys(yesterday, h.startDate) >= 0 &&
      !h.completions[yesterday] &&
      (h.timesPerWeek >= 7 || isDueToday({ ...h, completions: { ...h.completions, [today]: false } }, yesterday))

    if (isDueToday(h, today)) {
      warnings.push({
        habitId: h.id,
        name: h.name,
        emoji: h.emoji,
        kind: 'today',
        message: missedYesterday
          ? `Вчера пропуск, сегодня ещё не отмечено. Срок продлён — не рви цепочку, иначе нейроны не «срастутся».`
          : `Ещё не отмечено сегодня. Пропуск ослабляет привычку — лучше сделать сейчас.`,
      })
    } else if (missedYesterday && h.completions[today]) {
      warnings.push({
        habitId: h.id,
        name: h.name,
        emoji: h.emoji,
        kind: 'missed_yesterday',
        message: `Вчера был пропуск — дни пересчитаны, срок продлён. Держи ритм дальше.`,
      })
    }
  }
  return warnings
}

export function plannedEndPreview(
  startDate: string,
  targetDays: HabitDuration,
  timesPerWeek: number,
): string {
  return baseEndDate(startDate, targetDays, timesPerWeek)
}

/**
 * Выполнение плана привычки за последние N календарных дней (включая сегодня).
 */
export function weekPlanStats(
  habit: Pick<Habit, 'startDate' | 'timesPerWeek' | 'completions' | 'targetDays'>,
  today: string = todayKey(),
  days = 7,
): { expected: number; done: number; pct: number } {
  const from = addDays(today, -(days - 1))
  const rangeStart = compareKeys(habit.startDate, from) > 0 ? habit.startDate : from
  if (compareKeys(rangeStart, today) > 0) {
    return { expected: 0, done: 0, pct: 100 }
  }

  const end = effectiveEndDate(habit)
  const until = compareKeys(today, end) < 0 ? today : end
  if (compareKeys(rangeStart, until) > 0) {
    return { expected: 0, done: 0, pct: 100 }
  }

  const freq = Math.min(7, Math.max(1, habit.timesPerWeek))
  const daysInRange = eachDay(rangeStart, until)

  if (freq >= 7) {
    const expected = daysInRange.length
    const done = daysInRange.filter((d) => habit.completions[d]).length
    return {
      expected,
      done,
      pct: expected ? Math.round((done / expected) * 100) : 100,
    }
  }

  // N×/нед: квота пропорционально дням окна, но не больше freq за неделю
  let expected = 0
  let done = 0
  let cursor = weekStartMonday(rangeStart)
  const lastWeek = weekStartMonday(until)

  while (compareKeys(cursor, lastWeek) <= 0) {
    const wEnd = addDays(cursor, 6)
    const rs = compareKeys(rangeStart, cursor) > 0 ? rangeStart : cursor
    const re = compareKeys(until, wEnd) < 0 ? until : wEnd
    const inWeek = eachDay(rs, re)
    if (inWeek.length === 0) {
      cursor = addDays(cursor, 7)
      continue
    }
    const weekExpected = Math.min(freq, inWeek.length)
    const weekDone = inWeek.filter((d) => habit.completions[d]).length
    expected += weekExpected
    done += Math.min(weekDone, weekExpected)
    cursor = addDays(cursor, 7)
  }

  return {
    expected,
    done,
    pct: expected ? Math.round((done / expected) * 100) : 100,
  }
}

/**
 * Статистика только по уже наступившим дням: от старта до сегодня (включительно),
 * без будущих дат. Нужна для блока «Внимание».
 */
export function elapsedStats(
  habit: Pick<Habit, 'startDate' | 'timesPerWeek' | 'completions' | 'targetDays'>,
  today: string = todayKey(),
): { expected: number; done: number; misses: number; pct: number } {
  if (compareKeys(today, habit.startDate) < 0) {
    return { expected: 0, done: 0, misses: 0, pct: 100 }
  }

  const end = effectiveEndDate(habit)
  const until = compareKeys(today, end) < 0 ? today : end
  const freq = Math.min(7, Math.max(1, habit.timesPerWeek))

  if (freq >= 7) {
    const days = eachDay(habit.startDate, until)
    const expected = days.length
    const done = days.filter((d) => habit.completions[d]).length
    const misses = Math.max(0, expected - done)
    const pct = expected ? Math.round((done / expected) * 100) : 100
    return { expected, done, misses, pct }
  }

  // N раз в неделю: ожидаемое к сегодня = сумма квот по неделям до today
  let expected = 0
  let done = 0
  let cursor = weekStartMonday(habit.startDate)
  const lastWeek = weekStartMonday(until)

  while (compareKeys(cursor, lastWeek) <= 0) {
    const wEnd = addDays(cursor, 6)
    const rangeStart = compareKeys(habit.startDate, cursor) > 0 ? habit.startDate : cursor
    const rangeEnd = compareKeys(until, wEnd) < 0 ? until : wEnd
    const daysInRange = eachDay(rangeStart, rangeEnd)
    if (daysInRange.length === 0) {
      cursor = addDays(cursor, 7)
      continue
    }
    const weekExpected = Math.min(freq, daysInRange.length)
    const weekDone = daysInRange.filter((d) => habit.completions[d]).length
    expected += weekExpected
    done += Math.min(weekDone, weekExpected)
    cursor = addDays(cursor, 7)
  }

  expected = Math.min(expected, habit.targetDays)
  const misses = Math.max(0, expected - done)
  const pct = expected ? Math.round((done / expected) * 100) : 100
  return { expected, done, misses, pct }
}


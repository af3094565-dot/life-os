import type { Goal, GoalCadence, GoalCheckIn, GoalStage } from '../data/seed'
import { todayKey } from './habitLogic'

/** Прогресс по результату цели (0–100) или null, если измерение не задано */
export function goalResultProgress(g: Goal): number | null {
  if (g.measureKind === 'number') {
    const start = g.startValue
    const target = g.targetValue
    const current = g.currentValue
    if (start == null || target == null || current == null) return null
    const span = target - start
    if (span === 0) return current === target ? 100 : 0
    const raw = ((current - start) / span) * 100
    return Math.round(Math.min(100, Math.max(0, raw)))
  }

  if (g.measureKind === 'stages' && g.stages?.length) {
    const done = g.stages.filter((s) => s.done).length
    return Math.round((done / g.stages.length) * 100)
  }

  if (g.measureKind === 'matrix' && g.matrix) {
    const slots = g.matrix.habits.flat().filter((t) => t.trim()).length
    if (!slots) return g.matrix.core.trim() ? 5 : 0
    // Прогресс заполнения таблицы (не отметок) — детальный прогресс из привычек на карточке цели
    const pillars = g.matrix.pillars.filter((p) => p.trim()).length
    return Math.min(
      100,
      Math.round((g.matrix.core.trim() ? 10 : 0) + pillars * 5 + Math.min(slots, 40) * 1.5),
    )
  }

  return null
}

export function formatGoalMetric(g: Goal): string | null {
  if (g.measureKind === 'number' && g.unit) {
    const cur = g.currentValue
    const tgt = g.targetValue
    if (cur == null || tgt == null) return g.unit
    return `${formatNum(cur)} → ${formatNum(tgt)} ${g.unit}`
  }
  if (g.measureKind === 'stages' && g.stages?.length) {
    const done = g.stages.filter((s) => s.done).length
    return `${done} из ${g.stages.length} этапов`
  }
  if (g.measureKind === 'matrix' && g.matrix) {
    const n = g.matrix.habits.flat().filter((t) => t.trim()).length
    return `карта · ${n} привычек`
  }
  return null
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
}

export function cadenceLabel(c?: GoalCadence): string {
  if (c === 'daily') return 'ежедневно'
  if (c === 'weekly') return 'еженедельно'
  return 'когда удобно'
}

/** Нужен ли чек-ин по каденции */
export function needsCheckIn(g: Goal, today: string = todayKey()): boolean {
  if (g.status !== 'active') return false
  if (g.measureKind === 'none' || !g.measureKind) return false
  if (g.measureKind === 'matrix') return false
  if (goalResultProgress(g) === 100) return false

  const last = g.lastCheckInAt
  if (!last) return true

  if (g.cadence === 'daily') return last < today
  if (g.cadence === 'weekly') {
    const lastD = new Date(last + 'T12:00:00')
    const now = new Date(today + 'T12:00:00')
    const diff = (now.getTime() - lastD.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 7
  }
  return false
}

export function nextOpenStage(stages: GoalStage[] = []): GoalStage | undefined {
  return stages.find((s) => !s.done)
}

export function makeStage(title: string): GoalStage {
  return {
    id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: title.trim(),
    done: false,
  }
}

export function makeCheckIn(
  partial: Omit<GoalCheckIn, 'id' | 'at'> & { at?: string },
): GoalCheckIn {
  return {
    id: `ci-${Date.now()}`,
    at: partial.at ?? todayKey(),
    value: partial.value,
    note: partial.note,
    stageId: partial.stageId,
  }
}

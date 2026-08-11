import type { AchievementEvent, AchievementState } from '../../data/achievements/types'
import {
  backfillAchievements,
  createEmptyAchievementState,
  normalizeAchievementState,
  processAchievementEvents,
  type AchievementWorldSnapshot,
} from './index'
import type { Habit, Goal, QuestContract } from '../../data/seed'
import { makeDiamondTx, pushDiamondTx, type DiamondTx } from '../economy'

/** Минимальный срез стора для ачивок */
export type AchievementStoreSlice = {
  habits: Habit[]
  goals: Goal[]
  contracts: QuestContract[]
  plannerTasks?: Array<{
    id: string
    scheduledFor?: string
    completedAt?: string
  }>
  diamonds: number
  diamondHistory: DiamondTx[]
  visitStreak: number
  lastVisitDate?: string
  streak: number
  achievements?: AchievementState
}

export function buildWorldSnapshot(s: AchievementStoreSlice): AchievementWorldSnapshot {
  const habits = s.habits ?? []
  const goals = s.goals ?? []
  const contracts = s.contracts ?? []
  const tasks = s.plannerTasks ?? []
  const habitCompletionsTotal = habits.reduce(
    (acc, h) => acc + Object.values(h.completions ?? {}).filter(Boolean).length,
    0,
  )
  const uniqueScheduledDays = new Set(
    tasks.map((t) => t.scheduledFor).filter(Boolean) as string[],
  ).size

  return {
    habitCount: habits.length,
    activeHabitCount: habits.length,
    habitCompletionsTotal,
    habitStreak: s.streak ?? 0,
    goalCount: goals.filter((g) => !g.fromLifeMap || g.id.startsWith('life-')).length,
    activeGoalCount: goals.filter((g) => g.status === 'active').length,
    goalsCompleted: goals.filter((g) => g.status === 'done').length,
    questsAccepted: contracts.length,
    questsWon: contracts.filter((c) => c.status === 'won').length,
    taskCount: tasks.length,
    activeTaskCount: tasks.filter((t) => !t.completedAt).length,
    tasksCompleted: tasks.filter((t) => !!t.completedAt).length,
    diamonds: s.diamonds,
    visitStreak: s.visitStreak,
    hasLifeMap: goals.some((g) => g.fromLifeMap),
    uniqueScheduledDays,
    habitLinkedToGoal: habits.some((h) => !!h.goalId),
  }
}

export function applyAchievementEventsToStore<T extends AchievementStoreSlice>(
  store: T,
  events: AchievementEvent[],
): T {
  if (!events.length) return store
  const prev = normalizeAchievementState(store.achievements)
  const snap = buildWorldSnapshot(store)
  const result = processAchievementEvents(prev, events, snap)

  let diamonds = store.diamonds
  let diamondHistory = store.diamondHistory ?? []
  if (result.diamondsDelta > 0) {
    diamonds += result.diamondsDelta
    diamondHistory = pushDiamondTx(
      diamondHistory,
      makeDiamondTx({
        amount: result.diamondsDelta,
        reason: 'achievement',
        label:
          result.newlyUnlocked.length === 1
            ? `Достижение · ${result.newlyUnlocked[0]}`
            : `Достижения · ${result.newlyUnlocked.length} шт.`,
        balanceAfter: diamonds,
      }),
    )
  }

  return {
    ...store,
    diamonds,
    diamondHistory,
    achievements: result.state,
  }
}

export function ensureAchievementsBackfilled<T extends AchievementStoreSlice>(store: T): T {
  const prev = normalizeAchievementState(store.achievements)
  if (prev.meta.backfilled) {
    return { ...store, achievements: prev }
  }
  const snap = buildWorldSnapshot(store)
  const result = backfillAchievements(prev, snap)
  let diamonds = store.diamonds
  let diamondHistory = store.diamondHistory ?? []
  if (result.diamondsDelta > 0) {
    diamonds += result.diamondsDelta
    diamondHistory = pushDiamondTx(
      diamondHistory,
      makeDiamondTx({
        amount: result.diamondsDelta,
        reason: 'achievement',
        label: 'Достижения за прошлый прогресс',
        balanceAfter: diamonds,
      }),
    )
  }
  return {
    ...store,
    diamonds,
    diamondHistory,
    achievements: result.state,
  }
}

export function emptyAchievements(): AchievementState {
  return createEmptyAchievementState()
}

import type {
  AchievementDailyStats,
  AchievementEvent,
  AchievementEventType,
  AchievementSessionStats,
  AchievementState,
} from '../../data/achievements/types'
import { MAIN_EXPLORATION_PAGES } from '../../data/achievements/types'

function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function emptyDaily(date = todayKey()): AchievementDailyStats {
  return {
    date,
    actions: 0,
    habitsCreated: 0,
    habitsDeleted: 0,
    tasksCreated: 0,
    tasksCompleted: 0,
    tasksDeleted: 0,
    tasksRescheduled: 0,
    goalsCreated: 0,
    goalsCompleted: 0,
    questsWon: 0,
    focusSessions: 0,
    focusMinutes: 0,
    diamondsEarned: 0,
    diamondsSpent: 0,
    pagesVisited: [],
    unlocks: [],
    habitIdsCreated: [],
    habitIdsDeleted: [],
    taskRescheduleCounts: {},
    goalEditCounts: {},
    habitEditCounts: {},
  }
}

function emptySession(now = Date.now()): AchievementSessionStats {
  return {
    startedAt: new Date(now).toISOString(),
    pagesVisited: [],
    pageOpenCounts: {},
    quietMode: true,
    mutated: false,
    recentFlags: [],
  }
}

export function createEmptyAchievementState(): AchievementState {
  return {
    unlocked: {},
    progress: {},
    metrics: {},
    history: [],
    notifications: [],
    pinnedIds: [],
    unlockedTitleIds: ['novice'],
    activeTitleId: 'novice',
    achievementXp: 0,
    diamondsFromAchievements: 0,
    soundEnabled: true,
    pendingUnlocks: [],
    pendingBatch: [],
    daily: emptyDaily(),
    session: emptySession(),
    meta: {
      unlockStreakDays: 0,
      secretUnlockCount: 0,
      longestAbsenceDays: 0,
      backfilled: false,
    },
  }
}

export function normalizeAchievementState(
  raw?: Partial<AchievementState> | null,
): AchievementState {
  const base = createEmptyAchievementState()
  if (!raw || typeof raw !== 'object') return base
  const daily =
    raw.daily && raw.daily.date === todayKey()
      ? {
          ...emptyDaily(raw.daily.date),
          ...raw.daily,
          habitIdsCreated: raw.daily.habitIdsCreated ?? [],
          habitIdsDeleted: raw.daily.habitIdsDeleted ?? [],
          taskRescheduleCounts: raw.daily.taskRescheduleCounts ?? {},
          goalEditCounts: raw.daily.goalEditCounts ?? {},
          habitEditCounts: raw.daily.habitEditCounts ?? {},
          pagesVisited: raw.daily.pagesVisited ?? [],
          unlocks: raw.daily.unlocks ?? [],
        }
      : emptyDaily()

  return {
    ...base,
    ...raw,
    unlocked: raw.unlocked ?? {},
    progress: raw.progress ?? {},
    metrics: raw.metrics ?? {},
    history: Array.isArray(raw.history) ? raw.history : [],
    notifications: Array.isArray(raw.notifications) ? raw.notifications : [],
    pinnedIds: Array.isArray(raw.pinnedIds) ? raw.pinnedIds.slice(0, 5) : [],
    unlockedTitleIds: Array.isArray(raw.unlockedTitleIds)
      ? Array.from(new Set(['novice', ...raw.unlockedTitleIds]))
      : ['novice'],
    activeTitleId: raw.activeTitleId ?? 'novice',
    achievementXp: Number(raw.achievementXp) || 0,
    diamondsFromAchievements: Number(raw.diamondsFromAchievements) || 0,
    soundEnabled: raw.soundEnabled !== false,
    pendingUnlocks: Array.isArray(raw.pendingUnlocks) ? raw.pendingUnlocks : [],
    pendingBatch: Array.isArray(raw.pendingBatch) ? raw.pendingBatch : [],
    daily,
    session: {
      ...emptySession(),
      ...(raw.session ?? {}),
      pagesVisited: raw.session?.pagesVisited ?? [],
      pageOpenCounts: raw.session?.pageOpenCounts ?? {},
      recentFlags: raw.session?.recentFlags ?? [],
    },
    meta: {
      ...base.meta,
      ...(raw.meta ?? {}),
    },
  }
}

/** Снимок мира для расчёта метрик */
export type AchievementWorldSnapshot = {
  habitCount: number
  activeHabitCount: number
  habitCompletionsTotal: number
  habitStreak: number
  goalCount: number
  activeGoalCount: number
  goalsCompleted: number
  questsAccepted: number
  questsWon: number
  taskCount: number
  activeTaskCount: number
  tasksCompleted: number
  diamonds: number
  visitStreak: number
  hasLifeMap: boolean
  uniqueScheduledDays: number
  daysSinceLastVisit?: number
  habitLinkedToGoal: boolean
}

export function ensureDaily(state: AchievementState, date = todayKey()): AchievementState {
  if (state.daily.date === date) return state
  return { ...state, daily: emptyDaily(date) }
}

export function bumpMetric(
  state: AchievementState,
  key: string,
  by = 1,
): AchievementState {
  const metrics = {
    ...state.metrics,
    [key]: (state.metrics[key] ?? 0) + by,
  }
  return { ...state, metrics }
}

export function setMetric(
  state: AchievementState,
  key: string,
  value: number,
): AchievementState {
  if (state.metrics[key] === value) return state
  return { ...state, metrics: { ...state.metrics, [key]: value } }
}

export function maxMetric(
  state: AchievementState,
  key: string,
  value: number,
): AchievementState {
  const prev = state.metrics[key] ?? 0
  if (value <= prev) return state
  return setMetric(state, key, value)
}

export function pushFlag(
  state: AchievementState,
  flag: string,
  at = Date.now(),
  keepMs = 30 * 24 * 60 * 60 * 1000,
): AchievementState {
  const recentFlags = [
    ...state.session.recentFlags.filter((f) => at - f.at < keepMs),
    { flag, at },
  ].slice(-80)
  return {
    ...state,
    session: { ...state.session, recentFlags },
  }
}

export function hasRecentFlags(
  state: AchievementState,
  flags: string[],
  windowMs: number,
  now = Date.now(),
): boolean {
  const recent = state.session.recentFlags.filter((f) => now - f.at <= windowMs)
  return flags.every((flag) => recent.some((f) => f.flag === flag))
}

export const ACTION_EVENTS: AchievementEventType[] = [
  'habit_completed',
  'task_completed',
  'focus_completed',
  'habit_created',
  'goal_created',
  'quest_accepted',
  'quest_won',
]

export function syncSnapshotMetrics(
  state: AchievementState,
  snap: AchievementWorldSnapshot,
): AchievementState {
  let next = state
  next = setMetric(next, 'habits_created', Math.max(next.metrics.habits_created ?? 0, snap.habitCount))
  // habits_created is cumulative creations; for backfill use count as floor
  next = setMetric(next, 'active_habits', snap.activeHabitCount)
  next = setMetric(
    next,
    'habits_completed',
    Math.max(next.metrics.habits_completed ?? 0, snap.habitCompletionsTotal),
  )
  next = setMetric(next, 'habit_streak', snap.habitStreak)
  next = setMetric(next, 'goals_created', Math.max(next.metrics.goals_created ?? 0, snap.goalCount))
  next = setMetric(next, 'active_goals', snap.activeGoalCount)
  next = setMetric(
    next,
    'goals_completed',
    Math.max(next.metrics.goals_completed ?? 0, snap.goalsCompleted),
  )
  next = setMetric(
    next,
    'quests_accepted',
    Math.max(next.metrics.quests_accepted ?? 0, snap.questsAccepted),
  )
  next = setMetric(
    next,
    'quests_won',
    Math.max(next.metrics.quests_won ?? 0, snap.questsWon),
  )
  next = setMetric(next, 'tasks_created', Math.max(next.metrics.tasks_created ?? 0, snap.taskCount))
  next = setMetric(next, 'active_tasks', snap.activeTaskCount)
  next = setMetric(
    next,
    'tasks_completed',
    Math.max(next.metrics.tasks_completed ?? 0, snap.tasksCompleted),
  )
  next = setMetric(next, 'diamonds_balance', snap.diamonds)
  next = setMetric(next, 'visit_streak', snap.visitStreak)
  next = setMetric(next, 'unique_scheduled_days', snap.uniqueScheduledDays)
  if (snap.hasLifeMap) next = setMetric(next, 'life_map_created', 1)
  if (snap.habitLinkedToGoal) next = setMetric(next, 'habit_linked_to_goal', 1)
  if (snap.daysSinceLastVisit != null) {
    next = {
      ...next,
      meta: {
        ...next.meta,
        lastAbsenceDays: snap.daysSinceLastVisit,
        longestAbsenceDays: Math.max(
          next.meta.longestAbsenceDays,
          snap.daysSinceLastVisit,
        ),
      },
    }
  }
  const explored = MAIN_EXPLORATION_PAGES.filter(
    (p) => (next.metrics[`page_${p}`] ?? 0) > 0,
  ).length
  next = setMetric(next, 'pages_explored', explored)
  next = setMetric(next, 'achievements_unlocked', Object.keys(next.unlocked).length)
  next = setMetric(next, 'secret_unlock_count', next.meta.secretUnlockCount)
  next = setMetric(next, 'unlock_streak_days', next.meta.unlockStreakDays)
  next = setMetric(next, 'daily_unlocks', next.daily.unlocks.length)
  next = setMetric(next, 'daily_habits_created', next.daily.habitsCreated)
  next = setMetric(next, 'daily_tasks_deleted', next.daily.tasksDeleted)
  next = setMetric(next, 'daily_tasks_rescheduled', next.daily.tasksRescheduled)
  next = setMetric(next, 'daily_focus_sessions', next.daily.focusSessions)
  next = setMetric(next, 'daily_focus_minutes', next.daily.focusMinutes)
  next = setMetric(next, 'daily_diamonds_spent', next.daily.diamondsSpent)
  next = setMetric(next, 'daily_quests_won', next.daily.questsWon)
  next = setMetric(next, 'daily_actions', next.daily.actions)
  return next
}

export function markMutated(state: AchievementState): AchievementState {
  if (state.session.mutated) return state
  return {
    ...state,
    session: { ...state.session, mutated: true, quietMode: false },
  }
}

export function parseEventTime(event: AchievementEvent): Date {
  return event.at ? new Date(event.at) : new Date()
}

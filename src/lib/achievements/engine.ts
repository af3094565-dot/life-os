import {
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENTS_BY_EVENT,
  getAchievementDefinition,
} from '../../data/achievements/definitions'
import type {
  AchievementCondition,
  AchievementDefinition,
  AchievementEvent,
  AchievementState,
  AchievementView,
} from '../../data/achievements/types'
import { MAIN_EXPLORATION_PAGES } from '../../data/achievements/types'
import {
  type AchievementWorldSnapshot,
  ACTION_EVENTS,
  bumpMetric,
  ensureDaily,
  hasRecentFlags,
  markMutated,
  maxMetric,
  parseEventTime,
  pushFlag,
  setMetric,
  syncSnapshotMetrics,
} from './state'

export type ProcessResult = {
  state: AchievementState
  newlyUnlocked: string[]
  diamondsDelta: number
  xpDelta: number
  newTitles: string[]
}

function metricOf(state: AchievementState, key: string): number {
  return state.metrics[key] ?? 0
}

function evalCondition(
  state: AchievementState,
  condition: AchievementCondition,
  event: AchievementEvent | null,
  now: number,
): { ok: boolean; progress?: number; target?: number } {
  switch (condition.type) {
    case 'threshold': {
      const current = metricOf(state, condition.metric)
      return {
        ok: current >= condition.target,
        progress: current,
        target: condition.target,
      }
    }
    case 'exact': {
      const current = metricOf(state, condition.metric)
      return {
        ok: current === condition.value,
        progress: current,
        target: condition.value,
      }
    }
    case 'flag': {
      const current = metricOf(state, condition.metric)
      return { ok: current > 0, progress: current > 0 ? 1 : 0, target: 1 }
    }
    case 'time_window': {
      const key = condition.metric ?? `tw_${condition.onEvent}_${condition.hourFrom}_${condition.hourTo}`
      const current = metricOf(state, key)
      const need = condition.count ?? 1
      return { ok: current >= need, progress: current, target: need }
    }
    case 'weekday': {
      const key = condition.metric ?? `wd_${condition.onEvent}_${condition.weekday}`
      const current = metricOf(state, key)
      return {
        ok: current >= condition.target,
        progress: current,
        target: condition.target,
      }
    }
    case 'combination': {
      const ok = hasRecentFlags(state, condition.flags, condition.windowMs, now)
      return { ok, progress: ok ? 1 : 0, target: 1 }
    }
    case 'comeback': {
      const days = state.meta.lastAbsenceDays ?? 0
      return {
        ok: days >= condition.minDaysAway,
        progress: days,
        target: condition.minDaysAway,
      }
    }
    case 'and': {
      let progress = 0
      let target = 0
      for (const c of condition.conditions) {
        const r = evalCondition(state, c, event, now)
        if (!r.ok) return { ok: false, progress: r.progress, target: r.target }
        progress += r.progress ?? 0
        target += r.target ?? 0
      }
      return { ok: true, progress, target }
    }
    case 'custom':
      return evalCustom(state, condition.id, event, now)
    default:
      return { ok: false }
  }
}

function evalCustom(
  state: AchievementState,
  id: string,
  _event: AchievementEvent | null,
  now: number,
): { ok: boolean; progress?: number; target?: number } {
  switch (id) {
    case 'quest_win_no_spend':
      return {
        ok:
          metricOf(state, 'quest_won_today_flag') > 0 &&
          state.daily.diamondsSpent === 0,
      }
    case 'no_reschedule_7':
      return {
        ok: metricOf(state, 'days_without_reschedule') >= 7,
        progress: metricOf(state, 'days_without_reschedule'),
        target: 7,
      }
    case 'session_all_pages': {
      const pages = MAIN_EXPLORATION_PAGES.filter((p) => p !== 'achievements')
      const ok = pages.every((p) => state.session.pagesVisited.includes(p))
      return {
        ok,
        progress: pages.filter((p) => state.session.pagesVisited.includes(p)).length,
        target: pages.length,
      }
    }
    case 'architect_systems': {
      const ok =
        metricOf(state, 'habits_created') >= 1 &&
        metricOf(state, 'goals_created') >= 1 &&
        metricOf(state, 'quests_accepted') >= 1 &&
        metricOf(state, 'tasks_created') >= 1 &&
        metricOf(state, 'life_map_created') >= 1
      return { ok, progress: ok ? 5 : 0, target: 5 }
    }
    case 'longest_absence_7':
      return {
        ok: (state.meta.lastAbsenceDays ?? 0) >= 7,
        progress: state.meta.lastAbsenceDays ?? 0,
        target: 7,
      }
    case 'create_delete_habit_3': {
      const n = Math.min(state.daily.habitsCreated, state.daily.habitsDeleted)
      return { ok: n >= 3, progress: n, target: 3 }
    }
    case 'almost_perfect_day': {
      return { ok: metricOf(state, 'almost_perfect_day') > 0 }
    }
    case 'one_task_left':
      return {
        ok: metricOf(state, 'active_tasks') === 1 && metricOf(state, 'tasks_deleted') >= 1,
      }
    case 'perfect_day':
      return { ok: metricOf(state, 'perfect_day') > 0 }
    case 'quiet_session': {
      const mins = (now - new Date(state.session.startedAt).getTime()) / 60_000
      return {
        ok: !state.session.mutated && mins >= 2 && state.session.pagesVisited.length >= 1,
      }
    }
    case 'create_at_midnight': {
      return { ok: metricOf(state, 'created_at_midnight') > 0 }
    }
    case 'frugal_3':
      return {
        ok: metricOf(state, 'frugal_visit_days') >= 3,
        progress: metricOf(state, 'frugal_visit_days'),
        target: 3,
      }
    case 'save_1000_no_spend':
      return {
        ok:
          metricOf(state, 'diamonds_balance') >= 1000 &&
          state.daily.diamondsSpent === 0,
      }
    case 'unlock_after_midnight': {
      const h = new Date(now).getHours()
      return { ok: metricOf(state, 'unlock_after_midnight') > 0 || (h >= 0 && h < 5 && state.daily.unlocks.length > 0) }
    }
    case 'new_new_life':
      return {
        ok: state.daily.habitsCreated >= 5 && state.daily.habitsDeleted >= 5,
      }
    case 'skip_after_streak':
      return { ok: metricOf(state, 'skip_after_streak') > 0 }
    default:
      return { ok: false }
  }
}

function applyEventMetrics(
  state: AchievementState,
  event: AchievementEvent,
  snap: AchievementWorldSnapshot,
): AchievementState {
  let next = ensureDaily(state)
  const when = parseEventTime(event)
  const hour = when.getHours()
  const weekday = when.getDay()
  const type = event.type

  if (ACTION_EVENTS.includes(type)) {
    next = {
      ...next,
      daily: { ...next.daily, actions: next.daily.actions + 1 },
    }
    next = markMutated(next)
  }

  switch (type) {
    case 'app_visit': {
      const daysAway = Number(event.payload?.daysAway ?? snap.daysSinceLastVisit ?? 0)
      next = {
        ...next,
        meta: {
          ...next.meta,
          lastAbsenceDays: daysAway,
          longestAbsenceDays: Math.max(next.meta.longestAbsenceDays, daysAway),
          previousVisitDate: String(event.payload?.previousVisitDate ?? next.meta.previousVisitDate ?? ''),
        },
      }
      next = setMetric(next, 'visit_streak', snap.visitStreak)
      if (next.daily.diamondsSpent === 0) {
        const last = metricOf(next, 'frugal_last_date')
        const todayNum = Number(next.daily.date.replace(/-/g, ''))
        if (last !== todayNum) {
          const prev = metricOf(next, 'frugal_visit_days')
          next = setMetric(next, 'frugal_visit_days', prev + 1)
          next = setMetric(next, 'frugal_last_date', todayNum)
        }
      } else {
        next = setMetric(next, 'frugal_visit_days', 0)
      }
      if (hour >= 3 && hour < 4) {
        next = bumpMetric(next, 'visit_at_3')
      }
      break
    }
    case 'page_opened': {
      const page = String(event.payload?.page ?? '')
      if (!page) break
      next = bumpMetric(next, `page_${page}`)
      const pagesVisited = next.session.pagesVisited.includes(page)
        ? next.session.pagesVisited
        : [...next.session.pagesVisited, page]
      const pageOpenCounts = {
        ...next.session.pageOpenCounts,
        [page]: (next.session.pageOpenCounts[page] ?? 0) + 1,
      }
      const maxSame = Math.max(0, ...Object.values(pageOpenCounts))
      next = {
        ...next,
        session: {
          ...next.session,
          pagesVisited,
          pageOpenCounts,
          lastPage: page,
          lastPageOpenAt: when.getTime(),
        },
        daily: {
          ...next.daily,
          pagesVisited: next.daily.pagesVisited.includes(page)
            ? next.daily.pagesVisited
            : [...next.daily.pagesVisited, page],
        },
      }
      next = setMetric(next, 'session_same_page_max', maxSame)
      const explored = MAIN_EXPLORATION_PAGES.filter(
        (p) => (next.metrics[`page_${p}`] ?? 0) > 0,
      ).length
      next = setMetric(next, 'pages_explored', explored)
      if (page === 'progress') next = pushFlag(next, 'page_progress', when.getTime())
      break
    }
    case 'habit_created': {
      next = bumpMetric(next, 'habits_created')
      next = {
        ...next,
        daily: {
          ...next.daily,
          habitsCreated: next.daily.habitsCreated + 1,
          habitIdsCreated: [
            ...next.daily.habitIdsCreated,
            String(event.payload?.habitId ?? ''),
          ],
        },
      }
      if (event.payload?.goalId) next = setMetric(next, 'habit_linked_to_goal', 1)
      next = setMetric(next, 'active_habits', snap.activeHabitCount)
      break
    }
    case 'habit_completed': {
      next = bumpMetric(next, 'habits_completed')
      next = setMetric(next, 'habit_streak', snap.habitStreak)
      if (hour < 8 && hour >= 5) {
        next = bumpMetric(next, 'habit_before_8')
        next = pushFlag(next, 'habit_morning', when.getTime())
      }
      if (hour < 6 && hour >= 4) next = bumpMetric(next, 'habit_before_6')
      if (hour >= 0 && hour < 4) next = bumpMetric(next, 'task_after_midnight')
      if (weekday === 1) next = bumpMetric(next, 'monday_actions')
      if (snap.habitStreak >= 7 && event.payload?.brokeStreak) {
        next = setMetric(next, 'skip_after_streak', 1)
      }
      break
    }
    case 'habit_uncompleted': {
      if ((Number(event.payload?.previousStreak) || 0) >= 7) {
        next = setMetric(next, 'skip_after_streak', 1)
      }
      break
    }
    case 'habit_deleted': {
      next = bumpMetric(next, 'habits_deleted')
      next = {
        ...next,
        daily: {
          ...next.daily,
          habitsDeleted: next.daily.habitsDeleted + 1,
          habitIdsDeleted: [
            ...next.daily.habitIdsDeleted,
            String(event.payload?.habitId ?? ''),
          ],
        },
      }
      next = setMetric(next, 'active_habits', snap.activeHabitCount)
      next = markMutated(next)
      break
    }
    case 'habit_updated': {
      const hid = String(event.payload?.habitId ?? 'x')
      const counts = {
        ...next.daily.habitEditCounts,
        [hid]: (next.daily.habitEditCounts[hid] ?? 0) + 1,
      }
      next = {
        ...next,
        daily: { ...next.daily, habitEditCounts: counts },
      }
      next = maxMetric(next, 'habit_edits_max', Math.max(...Object.values(counts)))
      next = markMutated(next)
      break
    }
    case 'goal_created': {
      next = bumpMetric(next, 'goals_created')
      next = {
        ...next,
        daily: { ...next.daily, goalsCreated: next.daily.goalsCreated + 1 },
      }
      next = setMetric(next, 'active_goals', snap.activeGoalCount)
      next = pushFlag(next, 'goal_made', when.getTime())
      break
    }
    case 'goal_completed': {
      next = bumpMetric(next, 'goals_completed')
      next = {
        ...next,
        daily: { ...next.daily, goalsCompleted: next.daily.goalsCompleted + 1 },
      }
      next = setMetric(next, 'active_goals', snap.activeGoalCount)
      next = pushFlag(next, 'goal_done', when.getTime())
      const ageDays = Number(event.payload?.ageDays ?? 0)
      if (ageDays >= 30) next = setMetric(next, 'goal_completed_after_30', 1)
      if (ageDays >= 100) next = setMetric(next, 'goal_completed_after_100', 1)
      if (ageDays === 0 || event.payload?.sameDay) {
        next = setMetric(next, 'goal_completed_same_day', 1)
      }
      break
    }
    case 'goal_updated': {
      const gid = String(event.payload?.goalId ?? 'x')
      const counts = {
        ...next.daily.goalEditCounts,
        [gid]: (next.daily.goalEditCounts[gid] ?? 0) + 1,
      }
      next = {
        ...next,
        daily: { ...next.daily, goalEditCounts: counts },
      }
      next = maxMetric(next, 'goal_edits_max', Math.max(0, ...Object.values(counts)))
      next = markMutated(next)
      break
    }
    case 'goal_stage_completed': {
      next = bumpMetric(next, 'goal_stages_completed')
      break
    }
    case 'goal_deleted': {
      next = setMetric(next, 'active_goals', snap.activeGoalCount)
      next = markMutated(next)
      break
    }
    case 'quest_accepted': {
      next = bumpMetric(next, 'quests_accepted')
      next = pushFlag(next, 'quest_taken', when.getTime())
      if (Number(event.payload?.cost) >= 50) next = setMetric(next, 'quest_cost_50', 1)
      break
    }
    case 'quest_won': {
      next = bumpMetric(next, 'quests_won')
      next = {
        ...next,
        daily: { ...next.daily, questsWon: next.daily.questsWon + 1 },
      }
      next = pushFlag(next, 'quest_won', when.getTime())
      next = setMetric(next, 'quest_won_today_flag', 1)
      break
    }
    case 'task_created': {
      next = bumpMetric(next, 'tasks_created')
      next = {
        ...next,
        daily: { ...next.daily, tasksCreated: next.daily.tasksCreated + 1 },
      }
      next = setMetric(next, 'active_tasks', snap.activeTaskCount)
      next = setMetric(next, 'unique_scheduled_days', snap.uniqueScheduledDays)
      if (hour === 0 && when.getMinutes() <= 5) {
        next = setMetric(next, 'created_at_midnight', 1)
      }
      if (hour >= 0 && hour < 4) {
        next = pushFlag(next, 'task_created_night', when.getTime())
      }
      break
    }
    case 'task_completed': {
      next = bumpMetric(next, 'tasks_completed')
      next = {
        ...next,
        daily: { ...next.daily, tasksCompleted: next.daily.tasksCompleted + 1 },
      }
      next = setMetric(next, 'active_tasks', snap.activeTaskCount)
      next = pushFlag(next, 'task_just_done', when.getTime())
      if (hour >= 0 && hour < 4) {
        next = bumpMetric(next, 'task_after_midnight')
        next = pushFlag(next, 'task_done_night', when.getTime())
      }
      if (weekday === 0) next = bumpMetric(next, 'sunday_tasks')
      if (weekday === 1) next = bumpMetric(next, 'monday_actions')
      break
    }
    case 'task_deleted': {
      next = bumpMetric(next, 'tasks_deleted')
      next = {
        ...next,
        daily: { ...next.daily, tasksDeleted: next.daily.tasksDeleted + 1 },
      }
      next = setMetric(next, 'active_tasks', snap.activeTaskCount)
      next = markMutated(next)
      break
    }
    case 'task_rescheduled': {
      const tid = String(event.payload?.taskId ?? 'x')
      const counts = {
        ...next.daily.taskRescheduleCounts,
        [tid]: (next.daily.taskRescheduleCounts[tid] ?? 0) + 1,
      }
      next = {
        ...next,
        daily: {
          ...next.daily,
          tasksRescheduled: next.daily.tasksRescheduled + 1,
          taskRescheduleCounts: counts,
        },
      }
      next = maxMetric(next, 'task_reschedule_max', Math.max(0, ...Object.values(counts)))
      next = setMetric(next, 'days_without_reschedule', 0)
      next = setMetric(next, 'unique_scheduled_days', snap.uniqueScheduledDays)
      next = markMutated(next)
      break
    }
    case 'diamonds_earned': {
      const amount = Math.max(0, Number(event.payload?.amount) || 0)
      next = bumpMetric(next, 'diamonds_earned_total', amount)
      next = {
        ...next,
        daily: {
          ...next.daily,
          diamondsEarned: next.daily.diamondsEarned + amount,
        },
      }
      next = setMetric(next, 'diamonds_balance', snap.diamonds)
      next = pushFlag(next, 'diamonds_just_earned', when.getTime())
      break
    }
    case 'diamonds_spent': {
      const amount = Math.max(0, Number(event.payload?.amount) || 0)
      next = bumpMetric(next, 'diamonds_spent_total', amount)
      next = {
        ...next,
        daily: {
          ...next.daily,
          diamondsSpent: next.daily.diamondsSpent + amount,
        },
      }
      next = setMetric(next, 'diamonds_balance', snap.diamonds)
      next = setMetric(next, 'frugal_visit_days', 0)
      next = pushFlag(next, 'diamonds_just_spent', when.getTime())
      next = markMutated(next)
      break
    }
    case 'focus_completed': {
      const minutes = Math.max(1, Number(event.payload?.minutes) || 25)
      next = bumpMetric(next, 'focus_sessions')
      next = bumpMetric(next, 'focus_minutes', minutes)
      next = {
        ...next,
        daily: {
          ...next.daily,
          focusSessions: next.daily.focusSessions + 1,
          focusMinutes: next.daily.focusMinutes + minutes,
        },
      }
      next = pushFlag(next, 'focus_done', when.getTime())
      if (event.payload?.uninterrupted !== false) {
        next = setMetric(next, 'focus_uninterrupted', 1)
      }
      break
    }
    case 'desktop_widget_added':
      next = bumpMetric(next, 'widgets_added')
      next = markMutated(next)
      break
    case 'moodboard_sticker_added':
      next = bumpMetric(next, 'moodboard_stickers')
      next = markMutated(next)
      break
    case 'life_map_created':
      next = setMetric(next, 'life_map_created', 1)
      next = markMutated(next)
      break
    default:
      break
  }

  // Day without reschedule tracking on visits
  if (type === 'app_visit' && next.daily.tasksRescheduled === 0) {
    // only bump once per day via metric date marker
    const stamp = Number(next.daily.date.replace(/-/g, ''))
    if (metricOf(next, 'no_reschedule_last') !== stamp) {
      next = bumpMetric(next, 'days_without_reschedule')
      next = setMetric(next, 'no_reschedule_last', stamp)
    }
  }

  return syncSnapshotMetrics(next, snap)
}

function unlockAchievement(
  state: AchievementState,
  def: AchievementDefinition,
  at: string,
): { state: AchievementState; diamonds: number; xp: number; title?: string } {
  if (state.unlocked[def.id]) {
    return { state, diamonds: 0, xp: 0 }
  }
  const diamonds = def.diamondReward ?? 0
  const xp = def.xpReward
  const isSecret = def.hidden || def.rarity === 'secret' || def.category === 'secret'
  const unlockDate = at.slice(0, 10)
  let unlockStreakDays = 1
  if (state.meta.lastUnlockDate) {
    const prev = new Date(state.meta.lastUnlockDate + 'T12:00:00')
    const cur = new Date(unlockDate + 'T12:00:00')
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86_400_000)
    if (diff === 0) unlockStreakDays = state.meta.unlockStreakDays || 1
    else if (diff === 1) unlockStreakDays = (state.meta.unlockStreakDays || 0) + 1
  }

  let next: AchievementState = {
    ...state,
    unlocked: { ...state.unlocked, [def.id]: at },
    history: [
      { id: `ah-${def.id}-${Date.now()}`, achievementId: def.id, unlockedAt: at },
      ...state.history,
    ].slice(0, 500),
    notifications: [
      {
        id: `an-${def.id}-${Date.now()}`,
        achievementId: def.id,
        at,
        read: false,
      },
      ...state.notifications,
    ].slice(0, 100),
    pendingUnlocks: [...state.pendingUnlocks, def.id],
    achievementXp: state.achievementXp + xp,
    diamondsFromAchievements: state.diamondsFromAchievements + diamonds,
    daily: {
      ...state.daily,
      unlocks: [...state.daily.unlocks, def.id],
    },
    meta: {
      ...state.meta,
      firstUnlockAt: state.meta.firstUnlockAt ?? at,
      lastUnlockAt: at,
      lastUnlockDate: unlockDate,
      unlockStreakDays,
      secretUnlockCount: state.meta.secretUnlockCount + (isSecret ? 1 : 0),
    },
  }

  let title: string | undefined
  if (def.titleId && !next.unlockedTitleIds.includes(def.titleId)) {
    next = {
      ...next,
      unlockedTitleIds: [...next.unlockedTitleIds, def.titleId],
    }
    title = def.titleId
  }

  next = setMetric(next, 'achievements_unlocked', Object.keys(next.unlocked).length)
  next = setMetric(next, 'secret_unlock_count', next.meta.secretUnlockCount)
  next = setMetric(next, 'unlock_streak_days', next.meta.unlockStreakDays)
  next = setMetric(next, 'daily_unlocks', next.daily.unlocks.length)

  const hour = new Date(at).getHours()
  if (hour >= 0 && hour < 5) next = setMetric(next, 'unlock_after_midnight', 1)

  return { state: next, diamonds, xp, title }
}

function candidatesFor(events: AchievementEvent[]): AchievementDefinition[] {
  const set = new Map<string, AchievementDefinition>()
  for (const ev of events) {
    for (const def of ACHIEVEMENTS_BY_EVENT[ev.type] ?? []) {
      set.set(def.id, def)
    }
  }
  // Always include meta achievements that listen to unlocks when we unlock something
  return [...set.values()]
}

/**
 * Главный движок: события → метрики → проверка подписанных ачивок → unlock.
 * Не сканирует все 300+ — только triggerEvents.
 */
export function processAchievementEvents(
  state: AchievementState,
  events: AchievementEvent[],
  snap: AchievementWorldSnapshot,
): ProcessResult {
  if (!events.length) {
    return {
      state: syncSnapshotMetrics(state, snap),
      newlyUnlocked: [],
      diamondsDelta: 0,
      xpDelta: 0,
      newTitles: [],
    }
  }

  let next = syncSnapshotMetrics(ensureDaily(state), snap)
  const newlyUnlocked: string[] = []
  let diamondsDelta = 0
  let xpDelta = 0
  const newTitles: string[] = []
  const now = Date.now()

  const queue = [...events]
  let guard = 0
  while (queue.length && guard < 40) {
    guard += 1
    const batch = queue.splice(0, queue.length)
    for (const event of batch) {
      next = applyEventMetrics(next, event, snap)
    }

    const defs = candidatesFor(batch).filter((d) => !next.unlocked[d.id])
    // Also re-check custom/global that might depend on updated metrics from same batch
    const extra = ACHIEVEMENT_DEFINITIONS.filter(
      (d) =>
        !next.unlocked[d.id] &&
        !defs.includes(d) &&
        (d.condition.type === 'custom' ||
          d.triggerEvents.some((t) => batch.some((b) => b.type === t))),
    )
    const toCheck = [...defs, ...extra]

    for (const def of toCheck) {
      const result = evalCondition(next, def.condition, batch[batch.length - 1] ?? null, now)
      if (
        def.condition.type === 'threshold' &&
        def.condition.showProgress &&
        result.target != null
      ) {
        next = {
          ...next,
          progress: {
            ...next.progress,
            [def.id]: Math.min(result.target, result.progress ?? 0),
          },
        }
      } else if (result.target != null && result.progress != null && !def.hidden) {
        next = {
          ...next,
          progress: {
            ...next.progress,
            [def.id]: Math.min(result.target, result.progress),
          },
        }
      }

      if (!result.ok) continue

      const unlockedAt = new Date().toISOString()
      const u = unlockAchievement(next, def, unlockedAt)
      next = u.state
      diamondsDelta += u.diamonds
      xpDelta += u.xp
      if (u.title) newTitles.push(u.title)
      newlyUnlocked.push(def.id)
      // Meta-event so achievements like first_egg / collect_N can fire
      queue.push({ type: 'achievement_unlocked', payload: { achievementId: def.id } })
    }
  }

  // Batch pending if many at once
  if (newlyUnlocked.length >= 4) {
    next = {
      ...next,
      pendingBatch: [...next.pendingBatch, ...newlyUnlocked],
      pendingUnlocks: next.pendingUnlocks.filter((id) => !newlyUnlocked.includes(id)),
    }
  }

  return {
    state: syncSnapshotMetrics(next, snap),
    newlyUnlocked,
    diamondsDelta,
    xpDelta,
    newTitles,
  }
}

/** Разовый backfill по уже существующим данным пользователя */
export function backfillAchievements(
  state: AchievementState,
  snap: AchievementWorldSnapshot,
): ProcessResult {
  if (state.meta.backfilled) {
    return {
      state: syncSnapshotMetrics(state, snap),
      newlyUnlocked: [],
      diamondsDelta: 0,
      xpDelta: 0,
      newTitles: [],
    }
  }

  const synthetic: AchievementEvent[] = [{ type: 'app_visit', payload: { daysAway: 0 } }]
  if (snap.habitCount > 0) synthetic.push({ type: 'habit_created' })
  if (snap.habitCompletionsTotal > 0) synthetic.push({ type: 'habit_completed' })
  if (snap.goalCount > 0) synthetic.push({ type: 'goal_created' })
  if (snap.goalsCompleted > 0) synthetic.push({ type: 'goal_completed' })
  if (snap.questsAccepted > 0) synthetic.push({ type: 'quest_accepted' })
  if (snap.questsWon > 0) synthetic.push({ type: 'quest_won' })
  if (snap.taskCount > 0) synthetic.push({ type: 'task_created' })
  if (snap.tasksCompleted > 0) synthetic.push({ type: 'task_completed' })
  if (snap.hasLifeMap) synthetic.push({ type: 'life_map_created' })
  if (snap.diamonds > 0) {
    synthetic.push({
      type: 'diamonds_earned',
      payload: { amount: Math.min(snap.diamonds, 20) },
    })
  }

  const result = processAchievementEvents(state, synthetic, snap)
  return {
    ...result,
    state: {
      ...result.state,
      meta: { ...result.state.meta, backfilled: true },
      // Backfill не должен спамить popup
      pendingUnlocks: [],
      pendingBatch: [],
    },
  }
}

export function buildAchievementViews(state: AchievementState): AchievementView[] {
  return ACHIEVEMENT_DEFINITIONS.map((def) => {
    const unlockedAt = state.unlocked[def.id]
    const isUnlocked = !!unlockedAt
    const isSecretLocked = def.hidden && !isUnlocked
    const target =
      def.condition.type === 'threshold'
        ? def.condition.target
        : def.condition.type === 'exact'
          ? def.condition.value
          : def.condition.type === 'weekday'
            ? def.condition.target
            : undefined
    const current = state.progress[def.id]
    const showProgress =
      !isSecretLocked &&
      !isUnlocked &&
      target != null &&
      current != null &&
      (def.condition.type !== 'threshold' || def.condition.showProgress !== false)

    return {
      id: def.id,
      title: isSecretLocked ? '???' : def.title,
      description: isSecretLocked
        ? def.hint
          ? `Секретное достижение. Подсказка: ${def.hint}`
          : 'Секретное достижение. Продолжай пользоваться Life OS.'
        : def.description,
      category: def.category,
      icon: isSecretLocked ? '🔒' : def.icon,
      rarity: def.rarity,
      hidden: def.hidden,
      hint: def.hint,
      xpReward: def.xpReward,
      diamondReward: def.diamondReward,
      titleId: def.titleId,
      seasonal: def.seasonal,
      isUnlocked,
      unlockedAt,
      isSecretLocked,
      progress: showProgress ? { current, target: target! } : undefined,
    }
  })
}

export function acknowledgeUnlocks(
  state: AchievementState,
  ids: string[],
): AchievementState {
  const set = new Set(ids)
  return {
    ...state,
    pendingUnlocks: state.pendingUnlocks.filter((id) => !set.has(id)),
    pendingBatch: state.pendingBatch.filter((id) => !set.has(id)),
  }
}

export function pinAchievement(
  state: AchievementState,
  id: string,
): AchievementState {
  if (!state.unlocked[id]) return state
  if (state.pinnedIds.includes(id)) {
    return { ...state, pinnedIds: state.pinnedIds.filter((x) => x !== id) }
  }
  if (state.pinnedIds.length >= 5) return state
  return { ...state, pinnedIds: [...state.pinnedIds, id] }
}

export function setActiveTitle(
  state: AchievementState,
  titleId: string,
): AchievementState {
  if (!state.unlockedTitleIds.includes(titleId)) return state
  return { ...state, activeTitleId: titleId }
}

export function setAchievementSound(
  state: AchievementState,
  enabled: boolean,
): AchievementState {
  return { ...state, soundEnabled: enabled }
}

export function markNotificationsRead(state: AchievementState): AchievementState {
  return {
    ...state,
    notifications: state.notifications.map((n) => ({ ...n, read: true })),
  }
}

export function getNearestAchievements(
  state: AchievementState,
  limit = 3,
): AchievementView[] {
  return buildAchievementViews(state)
    .filter((a) => !a.isUnlocked && !a.isSecretLocked && a.progress)
    .sort((a, b) => {
      const ra = (a.progress!.current / a.progress!.target)
      const rb = (b.progress!.current / b.progress!.target)
      return rb - ra
    })
    .slice(0, limit)
}

export function rarityFlavor(rarity: AchievementDefinition['rarity']): string {
  switch (rarity) {
    case 'common':
      return 'Обычное достижение'
    case 'uncommon':
      return 'Нужно немного постараться'
    case 'rare':
      return 'Редкое достижение'
    case 'epic':
      return 'Эпическое достижение'
    case 'legendary':
      return 'Очень редкое достижение'
    case 'secret':
      return 'Секретное достижение'
  }
}

export { getAchievementDefinition }

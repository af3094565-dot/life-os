/** Типы системы достижений Life OS (Steam-style) */

export type AchievementCategory =
  | 'getting_started'
  | 'habits'
  | 'goals'
  | 'quests'
  | 'focus'
  | 'planner'
  | 'calendar'
  | 'progress'
  | 'streaks'
  | 'diamonds'
  | 'exploration'
  | 'consistency'
  | 'comeback'
  | 'experiments'
  | 'secret'
  | 'funny'
  | 'rare'
  | 'mastery'
  | 'social'
  | 'special'

export type AchievementRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'secret'

export type AchievementTrigger =
  | 'event'
  | 'counter'
  | 'streak'
  | 'sequence'
  | 'combination'
  | 'time'
  | 'date'
  | 'pattern'
  | 'secret'

/** События домена, на которые подписаны ачивки */
export type AchievementEventType =
  | 'app_visit'
  | 'page_opened'
  | 'habit_created'
  | 'habit_completed'
  | 'habit_uncompleted'
  | 'habit_deleted'
  | 'habit_updated'
  | 'goal_created'
  | 'goal_completed'
  | 'goal_updated'
  | 'goal_stage_completed'
  | 'goal_deleted'
  | 'quest_accepted'
  | 'quest_won'
  | 'quest_abandoned'
  | 'task_created'
  | 'task_completed'
  | 'task_deleted'
  | 'task_rescheduled'
  | 'diamonds_earned'
  | 'diamonds_spent'
  | 'focus_completed'
  | 'desktop_widget_added'
  | 'moodboard_sticker_added'
  | 'life_map_created'
  | 'achievement_unlocked'

export type AchievementEvent = {
  type: AchievementEventType
  at?: string
  /** Произвольный payload */
  payload?: Record<string, unknown>
}

/** Условие в definition — декларативно, без UI-логики */
export type AchievementCondition =
  | {
      type: 'threshold'
      metric: string
      target: number
      showProgress?: boolean
    }
  | {
      type: 'exact'
      metric: string
      value: number
    }
  | {
      type: 'flag'
      metric: string
    }
  | {
      type: 'time_window'
      /** Событие, которое должно произойти в окне часов */
      onEvent: AchievementEventType
      hourFrom: number
      hourTo: number
      /** Сколько раз нужно (по умолчанию 1) */
      count?: number
      metric?: string
    }
  | {
      type: 'weekday'
      onEvent: AchievementEventType
      /** 0=вс … 6=сб */
      weekday: number
      target: number
      metric?: string
    }
  | {
      type: 'combination'
      /** Метрики-флаги, которые должны быть true в окне */
      flags: string[]
      windowMs: number
    }
  | {
      type: 'comeback'
      minDaysAway: number
    }
  | {
      type: 'and'
      conditions: AchievementCondition[]
    }
  | {
      type: 'custom'
      id: string
    }

export type AchievementDefinition = {
  id: string
  title: string
  description: string
  category: AchievementCategory
  icon: string
  rarity: AchievementRarity
  hidden: boolean
  /** Подсказка для скрытых (не раскрывает условие) */
  hint?: string
  xpReward: number
  diamondReward?: number
  /** Титул, который открывается */
  titleId?: string
  /** Сезон / событие: halloween, new_year, spring, summer */
  seasonal?: string
  triggerEvents: AchievementEventType[]
  condition: AchievementCondition
}

export type AchievementHistoryEntry = {
  id: string
  achievementId: string
  unlockedAt: string
}

export type AchievementNotification = {
  id: string
  achievementId: string
  at: string
  read: boolean
}

export type AchievementDailyStats = {
  date: string
  actions: number
  habitsCreated: number
  habitsDeleted: number
  tasksCreated: number
  tasksCompleted: number
  tasksDeleted: number
  tasksRescheduled: number
  goalsCreated: number
  goalsCompleted: number
  questsWon: number
  focusSessions: number
  focusMinutes: number
  diamondsEarned: number
  diamondsSpent: number
  pagesVisited: string[]
  unlocks: string[]
  /** id привычек, созданных сегодня (для funny) */
  habitIdsCreated: string[]
  habitIdsDeleted: string[]
  /** Переносы задач по id */
  taskRescheduleCounts: Record<string, number>
  /** Изменения целей по id */
  goalEditCounts: Record<string, number>
  habitEditCounts: Record<string, number>
}

export type AchievementSessionStats = {
  startedAt: string
  pagesVisited: string[]
  pageOpenCounts: Record<string, number>
  lastPage?: string
  lastPageOpenAt?: number
  /** Недавние события для combination */
  recentFlags: Array<{ flag: string; at: number }>
  quietMode: boolean
  mutated: boolean
}

export type AchievementState = {
  unlocked: Record<string, string>
  /** Текущий прогресс по id ачивки */
  progress: Record<string, number>
  /** Произвольные метрики/счётчики */
  metrics: Record<string, number>
  history: AchievementHistoryEntry[]
  notifications: AchievementNotification[]
  pinnedIds: string[]
  unlockedTitleIds: string[]
  activeTitleId?: string
  achievementXp: number
  diamondsFromAchievements: number
  soundEnabled: boolean
  pendingUnlocks: string[]
  /** Очередь для батч-суммари */
  pendingBatch: string[]
  daily: AchievementDailyStats
  session: AchievementSessionStats
  meta: {
    firstUnlockAt?: string
    lastUnlockAt?: string
    lastUnlockDate?: string
    unlockStreakDays: number
    secretUnlockCount: number
    longestAbsenceDays: number
    lastAbsenceDays?: number
    /** Дата последнего визита до текущего (для comeback) */
    previousVisitDate?: string
    backfilled?: boolean
  }
}

/** Runtime view для UI */
export type AchievementView = {
  id: string
  title: string
  description: string
  category: AchievementCategory
  icon: string
  rarity: AchievementRarity
  hidden: boolean
  hint?: string
  xpReward: number
  diamondReward?: number
  titleId?: string
  seasonal?: string
  isUnlocked: boolean
  unlockedAt?: string
  isSecretLocked: boolean
  progress?: {
    current: number
    target: number
  }
}

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  getting_started: 'Первые шаги',
  habits: 'Привычки',
  goals: 'Цели',
  quests: 'Квесты',
  focus: 'Фокус',
  planner: 'Планировщик',
  calendar: 'Календарь',
  progress: 'Прогресс',
  streaks: 'Серии',
  diamonds: 'Алмазы',
  exploration: 'Исследование',
  consistency: 'Стабильность',
  comeback: 'Возвращение',
  experiments: 'Эксперименты',
  secret: 'Секреты',
  funny: 'Весёлые',
  rare: 'Редкие',
  mastery: 'Мастерство',
  social: 'Социальные',
  special: 'Особые',
}

export const ACHIEVEMENT_RARITY_LABELS: Record<AchievementRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  secret: 'Secret',
}

export const ACHIEVEMENT_RARITY_XP: Record<AchievementRarity, number> = {
  common: 10,
  uncommon: 25,
  rare: 50,
  epic: 100,
  legendary: 500,
  secret: 100,
}

export const MAIN_EXPLORATION_PAGES = [
  'dashboard',
  'habits',
  'goals',
  'planner',
  'planner-calendar',
  'quests',
  'life-map',
  'progress',
  'desktop',
  'achievements',
] as const

import type { LifeAreaId } from './lifeMap'

export type PageId =
  | 'dashboard'
  | 'desktop'
  | 'planner'
  | 'planner-calendar'
  | 'habits'
  | 'goals'
  | 'quests'
  | 'life-map'
  | 'progress'
  | 'achievements'

export type HabitPriority = 'important' | 'urgent' | 'low'

export type HabitDuration = 7 | 21 | 30 | 66 | 90 | 100 | 365

export type Habit = {
  id: string
  name: string
  emoji: string
  /** @deprecated — совместимость; источник правды — completions */
  days?: boolean[]
  /** Отметки по датам YYYY-MM-DD */
  completions: Record<string, boolean>
  priority: HabitPriority
  /** Сколько успешных дней нужно для закрепления */
  targetDays: HabitDuration
  /** Дата старта YYYY-MM-DD */
  startDate: string
  /** Сколько раз в неделю */
  timesPerWeek: number
  createdAt: string
  /** Привязка к цели (опционально) */
  goalId?: string
  /** Привязка к квест-контракту */
  questContractId?: string
  /** Напоминание HH:mm (квесты с вечерним ритуалом) */
  reminderTime?: string
  /** Привычка из матрицы целей — бесплатная */
  fromMatrix?: boolean
  matrixGoalId?: string
  /** Слот в матрице: h-{pillar}-{habit} */
  matrixSlot?: string
  /** Аспект карты жизни */
  lifeArea?: LifeAreaId
  /** Связана с задачей планировщика */
  plannerTaskId?: string
  /** Привычка создана из планировщика */
  fromPlanner?: boolean
}

export const PRIORITY_OPTIONS: {
  value: HabitPriority
  label: string
  hint: string
  color: string
  bg: string
}[] = [
  {
    value: 'urgent',
    label: 'Срочно',
    hint: 'Нужно начать прямо сейчас',
    color: '#dc2626',
    bg: '#fef2f2',
  },
  {
    value: 'important',
    label: 'Важно',
    hint: 'Ключевая привычка для цели',
    color: '#7b3fe4',
    bg: '#f3ecff',
  },
  {
    value: 'low',
    label: 'Не срочно',
    hint: 'Можно наращивать спокойно',
    color: '#6b7280',
    bg: '#f3f4f6',
  },
]

export const DURATION_OPTIONS: {
  value: HabitDuration
  label: string
  hint: string
}[] = [
  { value: 7, label: 'Неделя', hint: '7 дней — быстрый старт' },
  {
    value: 21,
    label: '21 день',
    hint: 'Привычка формируется, если делать каждый день 21 день',
  },
  { value: 30, label: 'Месяц', hint: '30 дней — устойчивый ритм' },
  { value: 66, label: '66 дней', hint: 'Классика закрепления привычки' },
  { value: 90, label: '3 месяца', hint: '90 дней — новая норма жизни' },
  { value: 100, label: '100 дней', hint: 'Длинный челлендж' },
  { value: 365, label: 'Год', hint: '365 дней — годовой контракт' },
]

export function priorityMeta(p: HabitPriority) {
  return PRIORITY_OPTIONS.find((o) => o.value === p) ?? PRIORITY_OPTIONS[1]
}

export function durationMeta(d: HabitDuration) {
  return DURATION_OPTIONS.find((o) => o.value === d) ?? DURATION_OPTIONS[1]
}

export type GoalStatus = 'active' | 'done' | 'paused'

/** Как измеряем результат цели */
export type GoalMeasureKind = 'none' | 'number' | 'stages' | 'matrix'

/** Как часто обновлять результат */
export type GoalCadence = 'daily' | 'weekly' | 'anytime'

export type GoalStage = {
  id: string
  title: string
  done: boolean
}

export type GoalCheckIn = {
  id: string
  /** YYYY-MM-DD */
  at: string
  value?: number
  note?: string
  stageId?: string
}

/** Матрица 9×9: большая цель → 8 направлений → привычки */
export type GoalMatrixData = {
  core: string
  pillars: string[]
  habits: string[][]
}

export type Goal = {
  id: string
  title: string
  note?: string
  status: GoalStatus
  createdAt: string
  scheduledFor?: string
  scheduledTime?: string
  /** Способ измерения результата */
  measureKind: GoalMeasureKind
  /** Единица: кг, ₽, клиентов, страниц… */
  unit?: string
  startValue?: number
  targetValue?: number
  currentValue?: number
  /** Этапы пути (для проектов / бизнеса) */
  stages?: GoalStage[]
  cadence?: GoalCadence
  checkIns?: GoalCheckIn[]
  lastCheckInAt?: string
  /** Данные мандалы, если measureKind === 'matrix' */
  matrix?: GoalMatrixData
  /** Аспект карты жизни — системная цель колеса баланса */
  lifeArea?: LifeAreaId
  /** Цель из таблицы карты жизни (не удаляется, бесплатна) */
  fromLifeMap?: boolean
}

/** Ежедневные миссии (из привычек) — для дашборда */
export type Quest = {
  id: string
  title: string
  minutes: number
  habitId?: string
  done: boolean
  xp: number
}

export type QuestContractStatus = 'active' | 'won' | 'lost' | 'abandoned'

export type QuestListItem = {
  id: string
  title: string
  done: boolean
}

/** Купленный квест-контракт */
export type QuestContract = {
  id: string
  templateId: string
  title: string
  description: string
  emoji: string
  category: string
  cost: number
  reward: number
  kind: 'streak' | 'list'
  status: QuestContractStatus
  acceptedAt: string
  startDate: string
  deadline: string
  habitId: string
  target: number
  timesPerWeek: number
  durationDays: number
  listLabel?: string
  listItems: QuestListItem[]
  completedAt?: string
  color: string
  habitTitle?: string
  habitTagline?: string
  reminderTime?: string
  /** Пользовательский квест (не из каталога) */
  fromUserListing?: boolean
  listingId?: string
}

/** Пользовательский квест в каталоге / для шаринга */
export type UserQuestListing = {
  id: string
  shareCode: string
  title: string
  description: string
  emoji: string
  category: string
  /** Цена покупки для друга */
  price: number
  /** Награда покупателю за выполнение */
  reward: number
  kind: 'streak' | 'list'
  durationDays: number
  timesPerWeek: number
  target: number
  listLabel?: string
  color: string
  createdAt: string
  /** Создан текущим пользователем */
  isMine: boolean
  authorName: string
  salesCount: number
  /** Сумма полученных алмазов с продаж (50%) */
  earnedDiamonds: number
  needsReminder?: boolean
  reminderDefault?: string
  /** Опубликован из каталога для шаринга */
  sourceCatalogId?: string
}

export type CircleActivity = {
  id: string
  name: string
  initials: string
  color: string
  text: string
  time: string
}

/** Стартовый месяц — всегда текущий */
export function currentYearMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

export const seedHabits: Habit[] = []
export const seedGoals: Goal[] = []
export const seedQuests: Quest[] = []
export const seedCircle: CircleActivity[] = []

export const USER = {
  name: 'Артём',
  level: 1,
  rank: 'Новичок',
  xp: 0,
  avatar: 'А',
}

export const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

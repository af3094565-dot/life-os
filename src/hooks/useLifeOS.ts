import { useEffect, useMemo, useState } from 'react'
import {
  currentYearMonth,
  seedGoals,
  seedHabits,
  seedQuests,
  type Goal,
  type GoalCadence,
  type GoalMatrixData,
  type GoalMeasureKind,
  type GoalStatus,
  type Habit,
  type HabitDuration,
  type HabitPriority,
  type Quest,
  type QuestContract,
  type QuestListItem,
  type UserQuestListing,
  USER,
} from '../data/seed'
import { getCurrentUserName } from '../lib/auth'
import {
  findQuestTemplate,
  habitDisplayCopy,
  questReward,
  type QuestCategory,
  type QuestTemplateKind,
} from '../data/questCatalog'
import { findLifeArea, isLifeAreaId, LIFE_AREAS, LIFE_AREA_MAX_HABITS, LIFE_GOALS_MAP_ID, lifeAreaPillarIndex, lifeMapGoalId, parseLifeMapGoalArea, type LifeAreaId } from '../data/lifeMap'
import {
  formatGoalMetric,
  goalResultProgress,
  makeCheckIn,
  makeStage,
  needsCheckIn,
} from '../lib/goalLogic'
import {
  ECONOMY,
  canAfford,
  formatDiamonds,
  makeDiamondTx,
  pushDiamondTx,
  type DiamondTx,
} from '../lib/economy'
import {
  makeSaleClaim,
  makeShareCode,
  sharedPayloadToListing,
  type SaleClaimPayload,
  type SharedQuestPayload,
} from '../lib/userQuestShare'
import {
  addDays,
  buildWarnings,
  completedCount,
  currentStreak,
  dayStatus,
  effectiveEndDate,
  elapsedStats,
  isActiveToday,
  isDueOnDate,
  isDueToday,
  isFormed,
  isVisibleInMonth,
  monthDaysArray,
  todayKey,
  toDateKey,
  weekPlanStats,
} from '../lib/habitLogic'
import { isReminderDue } from '../lib/reminders'
import {
  consumeRetrofill,
  normalizeRetroMarks,
  retrofillInfo,
  type RetroMarksState,
} from '../lib/retroMarks'
import {
  createContractFromTemplate,
  createContractFromUserListing,
  resolveContractStatus,
  toHabitDuration,
  userListingHabitCopy,
} from '../lib/questLogic'
import { filledHabitTitles, habitSlotKey, MATRIX_EMOJIS, normalizeMatrix } from '../lib/mandala'
import type { AchievementEvent, AchievementState } from '../data/achievements/types'
import {
  acknowledgeUnlocks,
  buildAchievementViews,
  getNearestAchievements,
  markNotificationsRead,
  pinAchievement,
  setAchievementSound,
  setActiveTitle,
  TOTAL_ACHIEVEMENTS,
} from '../lib/achievements'
import {
  applyAchievementEventsToStore,
  emptyAchievements,
  ensureAchievementsBackfilled,
} from '../lib/achievements/storeBridge'
import { normalizeAchievementState } from '../lib/achievements'

const STORAGE_BASE = 'life-os-habits-v12'
const LEGACY_STORAGE_KEY = 'life-os-habits-v12'
const GRANT_KEYS = ['life-os-grant-200', 'life-os-grant-1m'] as const
const OLD_KEYS = [
  'life-os-habits-v1',
  'life-os-habits-v2',
  'life-os-habits-v3',
  'life-os-habits-v4',
  'life-os-habits-v5',
  'life-os-habits-v6',
  'life-os-habits-v7',
  'life-os-habits-v8',
  'life-os-habits-v9',
  'life-os-habits-v10',
  'life-os-habits-v11',
  LEGACY_STORAGE_KEY,
]

function storageKey(userId: string): string {
  return `${STORAGE_BASE}:${userId}`
}

export type NewHabitInput = {
  name: string
  emoji: string
  priority: HabitPriority
  targetDays: HabitDuration
  startDate: string
  timesPerWeek: number
  goalId?: string
  /** Аспект карты жизни */
  lifeArea?: LifeAreaId
  /** Создано с карты жизни — цена LIFE_MAP_HABIT_COST */
  fromLifeMap?: boolean
  /** Бесплатная привычка из карты цели */
  fromMatrix?: boolean
  matrixSlot?: string
  matrixGoalId?: string
  reminderTime?: string
}

export type UpdateHabitInput = {
  name: string
  emoji: string
  priority: HabitPriority
  targetDays: HabitDuration
  startDate: string
  timesPerWeek: number
  reminderTime?: string
}

export type NewUserQuestInput = {
  title: string
  description: string
  emoji: string
  category: QuestCategory
  price: number
  reward: number
  kind: QuestTemplateKind
  durationDays: number
  timesPerWeek: number
  target: number
  listLabel?: string
  color: string
  needsReminder?: boolean
  reminderDefault?: string
}

export type NewGoalInput = {
  title: string
  note?: string
  measureKind: GoalMeasureKind
  unit?: string
  startValue?: number
  targetValue?: number
  currentValue?: number
  stages?: { title: string }[]
  cadence?: GoalCadence
  scheduledTime?: string
}

export type FocusProfileId = 'gentle' | 'balanced' | 'deep'

export type FocusSettings = {
  profile: FocusProfileId
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsBeforeLongBreak: number
  dailyFocusCap: number
}

export type PlannerSection = {
  id: string
  title: string
  color: string
  createdAt: string
}

export type PlannerTaskEnergy = 'light' | 'medium' | 'deep'

export type PlannerTask = {
  id: string
  title: string
  note?: string
  sectionId: string
  scheduledFor: string
  scheduledTime?: string
  priority: HabitPriority
  energy: PlannerTaskEnergy
  focusBlocks: number
  timesPerWeek: number
  targetDays: HabitDuration
  habitId: string
  createdAt: string
  completedAt?: string
}

export type NewPlannerTaskInput = {
  title: string
  note?: string
  sectionId: string
  scheduledFor: string
  scheduledTime?: string
  priority: HabitPriority
  energy: PlannerTaskEnergy
  focusBlocks: number
  timesPerWeek: number
  targetDays: HabitDuration
  emoji?: string
}

export type DesktopWidgetSize = 'minimal' | 'medium' | 'large'
export type DesktopWidgetType =
  | 'habits'
  | 'goals'
  | 'planner'
  | 'moodboard'
  | 'dashboard'
  | 'quests'
  | 'life-map'
  | 'progress'
  | 'achievements'

export type DesktopWidgetInstance = {
  id: string
  type: DesktopWidgetType
  size: DesktopWidgetSize
  settings?: Record<string, unknown>
}

export type DesktopLayoutState = {
  widgets: DesktopWidgetInstance[]
}

export type DesktopMoodboardStickerKind = 'note' | 'goal' | 'habit'

export type DesktopMoodboardSticker = {
  id: string
  /** Координата X на бесконечной доске (px) */
  x: number
  /** Координата Y на бесконечной доске (px) */
  y: number
  width: number
  height: number
  text: string
  color: string
  textColor: string
  rotation?: number
  /** Тип стикера на мудборде */
  kind?: DesktopMoodboardStickerKind
  /** Связанная привычка в трекере */
  habitId?: string
  /** Связанная цель */
  goalId?: string
  /** Эмодзи привычки (для отображения на стикере) */
  emoji?: string
}

export type DesktopMoodboardArrow = {
  id: string
  fromStickerId: string
  toStickerId: string
  color: string
  width: number
}

export type DesktopMoodboardView = {
  panX: number
  panY: number
  zoom: number
}

export type DesktopMoodboardState = {
  stickers: DesktopMoodboardSticker[]
  arrows: DesktopMoodboardArrow[]
  view?: DesktopMoodboardView
}

export type DesktopState = {
  layout: DesktopLayoutState
  moodboard: DesktopMoodboardState
}

export type GoalStat = Goal & {
  habitCount: number
  todayDone: number
  todayTotal: number
  todayPct: number
  weekPct: number
  formPct: number
  /** Итоговый прогресс: результат цели, иначе привычки */
  progress: number
  /** Прогресс только по привычкам */
  habitProgress: number
  /** Прогресс по результату (число/этапы), если задан */
  resultProgress: number | null
  metricLabel: string | null
  needsCheckIn: boolean
  habits: Habit[]
}

type Store = {
  year: number
  month: number
  habits: Habit[]
  goals: Goal[]
  quests: Quest[]
  /** Купленные квест-контракты */
  contracts: QuestContract[]
  /** Пользовательские квесты (свои + импортированные от друзей) */
  userListings: UserQuestListing[]
  /** Уже полученные чеки продаж (чтобы не зачислить дважды) */
  claimedSaleIds: string[]
  streak: number
  /** Алмазы */
  diamonds: number
  /** История начислений и списаний */
  diamondHistory: DiamondTx[]
  /** Серия заходов в приложение подряд */
  visitStreak: number
  lastVisitDate?: string
  retroMarks?: RetroMarksState
  /** Скрытые аспекты карты жизни */
  hiddenLifeAreas?: LifeAreaId[]
  focusSettings?: FocusSettings
  plannerSections?: PlannerSection[]
  plannerTasks?: PlannerTask[]
  desktop?: DesktopState
  /** Steam-style достижения */
  achievements?: AchievementState
}

const FOCUS_PRESETS: Record<FocusProfileId, Omit<FocusSettings, 'profile'>> = {
  gentle: {
    focusMinutes: 15,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLongBreak: 3,
    dailyFocusCap: 6,
  },
  balanced: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 20,
    sessionsBeforeLongBreak: 4,
    dailyFocusCap: 8,
  },
  deep: {
    focusMinutes: 45,
    shortBreakMinutes: 10,
    longBreakMinutes: 25,
    sessionsBeforeLongBreak: 3,
    dailyFocusCap: 10,
  },
}

const DEFAULT_PLANNER_SECTIONS: Array<Pick<PlannerSection, 'title' | 'color'>> = [
  { title: 'Идеи', color: '#94a3b8' },
  { title: 'В работе', color: '#7c3aed' },
  { title: 'Готово', color: '#16a34a' },
]

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function normalizeHabit(h: Habit): Habit {
  const completions = { ...(h.completions ?? {}) }
  // Миграция со старого days[] если вдруг есть
  if (h.days?.length && Object.keys(completions).length === 0) {
    const now = new Date()
    h.days.forEach((done, i) => {
      if (done) {
        completions[toDateKey(new Date(now.getFullYear(), now.getMonth(), i + 1))] = true
      }
    })
  }
  return {
    ...h,
    priority: h.priority ?? 'important',
    targetDays: h.targetDays ?? 21,
    startDate: h.startDate ?? todayKey(),
    timesPerWeek: h.timesPerWeek ?? 7,
    createdAt: h.createdAt ?? new Date().toISOString(),
    emoji: h.emoji || '⭐',
    completions,
    days: undefined,
    goalId: h.goalId || undefined,
    questContractId: h.questContractId || undefined,
    reminderTime: h.reminderTime || undefined,
    fromMatrix: h.fromMatrix || undefined,
    matrixGoalId: h.matrixGoalId || undefined,
    matrixSlot: h.matrixSlot || undefined,
    lifeArea: h.lifeArea || undefined,
    plannerTaskId: h.plannerTaskId || undefined,
    fromPlanner: h.fromPlanner || undefined,
  }
}

function defaultFocusSettings(profile: FocusProfileId = 'balanced'): FocusSettings {
  return { profile, ...FOCUS_PRESETS[profile] }
}

function normalizeFocusSettings(settings?: FocusSettings): FocusSettings {
  const profile = settings?.profile ?? 'balanced'
  return {
    ...defaultFocusSettings(profile),
    ...settings,
    profile,
  }
}

function defaultPlannerSections(): PlannerSection[] {
  const now = new Date().toISOString()
  return DEFAULT_PLANNER_SECTIONS.map((section, index) => ({
    id: `planner-section-${index + 1}`,
    title: section.title,
    color: section.color,
    createdAt: now,
  }))
}

function normalizePlannerSection(section: PlannerSection): PlannerSection {
  return {
    id: section.id,
    title: section.title?.trim() || 'Раздел',
    color: section.color || '#7c3aed',
    createdAt: section.createdAt ?? new Date().toISOString(),
  }
}

function normalizePlannerTask(task: PlannerTask): PlannerTask {
  return {
    id: task.id,
    title: task.title?.trim() || 'Новая задача',
    note: task.note?.trim() || undefined,
    sectionId: task.sectionId,
    scheduledFor: task.scheduledFor || todayKey(),
    scheduledTime: task.scheduledTime || undefined,
    priority: task.priority ?? 'important',
    energy: task.energy ?? 'medium',
    focusBlocks: Math.min(8, Math.max(1, Math.round(task.focusBlocks || 1))),
    timesPerWeek: Math.min(7, Math.max(1, Math.round(task.timesPerWeek || 5))),
    targetDays: task.targetDays ?? 21,
    habitId: task.habitId,
    createdAt: task.createdAt ?? new Date().toISOString(),
    completedAt: task.completedAt || undefined,
  }
}

function desktopId(prefix: string): string {
  // Делаем предсказуемый уникальный id без зависимостей
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}`
}

function defaultDesktopState(): DesktopState {
  return {
    layout: {
      widgets: [
        {
          id: desktopId('w-habits'),
          type: 'habits',
          size: 'medium',
        },
        {
          id: desktopId('w-goals'),
          type: 'goals',
          size: 'medium',
        },
        {
          id: desktopId('w-moodboard'),
          type: 'moodboard',
          size: 'large',
        },
      ],
    },
    moodboard: {
      stickers: [],
      arrows: [],
    },
  }
}

function clampNum(n: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function isLegacyNormalizedSticker(s: Partial<DesktopMoodboardSticker>) {
  const x = Number(s.x)
  const y = Number(s.y)
  const width = Number(s.width)
  const hasSize = Number.isFinite(width) && width > 1
  return !hasSize && x >= 0 && x <= 1 && y >= 0 && y <= 1
}

function normalizeDesktopWidgetInstance(input: DesktopWidgetInstance): DesktopWidgetInstance {
  const type = input?.type
  const size = input?.size
  const allowedTypes: DesktopWidgetType[] = ['habits', 'goals', 'planner', 'moodboard', 'dashboard', 'quests', 'life-map', 'progress', 'achievements']
  const allowedSizes: DesktopWidgetSize[] = ['minimal', 'medium', 'large']
  return {
    id: String(input?.id ?? desktopId('w')),
    type: (allowedTypes.includes(type) ? type : 'habits') as DesktopWidgetType,
    size: (allowedSizes.includes(size) ? size : 'medium') as DesktopWidgetSize,
    settings: input?.settings && typeof input.settings === 'object' ? input.settings : undefined,
  }
}

function normalizeDesktopSticker(s: Partial<DesktopMoodboardSticker>): DesktopMoodboardSticker {
  let x = Number(s.x)
  let y = Number(s.y)
  if (isLegacyNormalizedSticker(s)) {
    x = x * 3000 + 100
    y = y * 3000 + 100
  }
  const habitId = s.habitId ? String(s.habitId) : undefined
  const goalId = s.goalId ? String(s.goalId) : undefined
  const kindRaw = s.kind
  const kind: DesktopMoodboardStickerKind =
    kindRaw === 'goal' || kindRaw === 'habit' || kindRaw === 'note'
      ? kindRaw
      : goalId
        ? 'goal'
        : habitId
          ? 'habit'
          : 'note'
  return {
    id: String(s.id ?? desktopId('st')),
    x: Number.isFinite(x) ? x : 400,
    y: Number.isFinite(y) ? y : 400,
    width: clampNum(Number(s.width), 80, 480, 160),
    height: clampNum(Number(s.height), 60, 360, 100),
    text: String(s.text ?? ''),
    color: typeof s.color === 'string' ? s.color : '#fde68a',
    textColor: typeof s.textColor === 'string' ? s.textColor : '#1a1a2e',
    rotation: Number.isFinite(Number(s.rotation)) ? Number(s.rotation) : undefined,
    kind,
    habitId,
    goalId,
    emoji: typeof s.emoji === 'string' ? s.emoji : undefined,
  }
}

function normalizeDesktopArrow(a: Partial<DesktopMoodboardArrow & { from?: { x: number; y: number }; to?: { x: number; y: number } }>): DesktopMoodboardArrow | null {
  const fromStickerId = a.fromStickerId ? String(a.fromStickerId) : undefined
  const toStickerId = a.toStickerId ? String(a.toStickerId) : undefined
  if (!fromStickerId || !toStickerId) return null
  return {
    id: String(a.id ?? desktopId('ar')),
    fromStickerId,
    toStickerId,
    color: typeof a.color === 'string' ? a.color : '#7b3fe4',
    width: clampNum(Number(a.width), 1, 10, 2),
  }
}

function resolveGoalIdAlongArrows(
  stickerId: string,
  stickers: DesktopMoodboardSticker[],
  arrows: DesktopMoodboardArrow[],
  habitGoalById: Map<string, string | undefined>,
  visited: Set<string> = new Set(),
): string | undefined {
  if (visited.has(stickerId)) return undefined
  visited.add(stickerId)

  const stickerMap = new Map(stickers.map((s) => [s.id, s]))
  const st = stickerMap.get(stickerId)
  if (!st) return undefined

  if (st.kind === 'goal' && st.goalId) return st.goalId

  if (st.kind === 'habit' && st.habitId) {
    const fromHabit = habitGoalById.get(st.habitId)
    if (fromHabit) return fromHabit
  }

  for (const ar of arrows) {
    if (ar.toStickerId !== stickerId) continue
    const found = resolveGoalIdAlongArrows(ar.fromStickerId, stickers, arrows, habitGoalById, visited)
    if (found) return found
  }
  return undefined
}

function resolveGoalIdForHabitSticker(
  stickerId: string,
  stickers: DesktopMoodboardSticker[],
  arrows: DesktopMoodboardArrow[],
  habits: Habit[],
  parentStickerId?: string,
): string | undefined {
  const habitGoalById = new Map(habits.map((h) => [h.id, h.goalId]))
  if (parentStickerId) {
    const fromParent = resolveGoalIdAlongArrows(parentStickerId, stickers, arrows, habitGoalById)
    if (fromParent) return fromParent
    const parent = stickers.find((s) => s.id === parentStickerId)
    if (parent?.goalId) return parent.goalId
  }
  return resolveGoalIdAlongArrows(stickerId, stickers, arrows, habitGoalById)
}

/** Связывает / отвязывает привычки с целью по стрелкам мудборда.
 *  Стрелка на обычный стикер ничего не конвертирует.
 *  Нет пути цель→…→привычка — goalId у привычки на доске сбрасывается. */
function syncHabitLinkFromGoalArrow(
  arrows: DesktopMoodboardArrow[],
  stickers: DesktopMoodboardSticker[],
  habits: Habit[],
): Habit[] {
  const stickerMap = new Map(stickers.map((s) => [s.id, s]))

  const resolveFromArrows = (
    stickerId: string,
    visited: Set<string> = new Set(),
  ): string | undefined => {
    if (visited.has(stickerId)) return undefined
    visited.add(stickerId)
    const st = stickerMap.get(stickerId)
    if (!st) return undefined
    if (st.kind === 'goal' && st.goalId) return st.goalId
    for (const ar of arrows) {
      if (ar.toStickerId !== stickerId) continue
      const found = resolveFromArrows(ar.fromStickerId, visited)
      if (found) return found
    }
    return undefined
  }

  const moodboardHabitIds = new Set(
    stickers.filter((s) => s.habitId).map((s) => s.habitId as string),
  )

  return habits.map(normalizeHabit).map((h) => {
    if (!moodboardHabitIds.has(h.id)) return h
    const sticker = stickers.find((s) => s.habitId === h.id)
    if (!sticker) return h
    const goalId = resolveFromArrows(sticker.id)
    return { ...h, goalId: goalId || undefined }
  })
}

function normalizeDesktopView(v?: Partial<DesktopMoodboardView>): DesktopMoodboardView {
  return {
    panX: Number.isFinite(Number(v?.panX)) ? Number(v!.panX) : 0,
    panY: Number.isFinite(Number(v?.panY)) ? Number(v!.panY) : 0,
    zoom: clampNum(Number(v?.zoom), 0.15, 3, 1),
  }
}

function normalizeDesktopState(input: unknown): DesktopState {
  const d = input as Partial<DesktopState> | null | undefined
  if (!d || typeof d !== 'object') return defaultDesktopState()

  const widgetsRaw = Array.isArray(d.layout?.widgets) ? d.layout!.widgets : []
  const widgets = widgetsRaw
    .map((w) => normalizeDesktopWidgetInstance(w as DesktopWidgetInstance))
    .slice(0, 12)

  const moodboardRaw = d.moodboard
  const stickersRaw = Array.isArray(moodboardRaw?.stickers) ? moodboardRaw!.stickers : []
  const arrowsRaw = Array.isArray(moodboardRaw?.arrows) ? moodboardRaw!.arrows : []

  return {
    layout: {
      widgets: widgets.length ? widgets : defaultDesktopState().layout.widgets,
    },
    moodboard: {
      stickers: stickersRaw.map((s) => normalizeDesktopSticker(s as Partial<DesktopMoodboardSticker>)).slice(0, 200),
      arrows: arrowsRaw
        .map((a) => normalizeDesktopArrow(a as Partial<DesktopMoodboardArrow>))
        .filter((a): a is DesktopMoodboardArrow => a != null)
        .slice(0, 200),
      view: normalizeDesktopView(moodboardRaw?.view),
    },
  }
}

function normalizeGoal(g: Goal & { progress?: number; questsDone?: number; questsTotal?: number }): Goal {
  const measureKind: GoalMeasureKind = g.measureKind ?? 'none'
  const lifeArea =
    g.lifeArea ?? parseLifeMapGoalArea(g.id) ?? undefined
  const scheduledFor =
    g.scheduledFor ||
    (g.createdAt ? toDateKey(new Date(g.createdAt)) : todayKey())
  return {
    id: g.id,
    title: g.title,
    note: g.note,
    status: g.status ?? 'active',
    createdAt: g.createdAt ?? new Date().toISOString(),
    scheduledFor,
    scheduledTime: g.scheduledTime || undefined,
    measureKind,
    unit: g.unit,
    startValue: g.startValue,
    targetValue: g.targetValue,
    currentValue: g.currentValue ?? g.startValue,
    stages: g.stages ?? [],
    cadence: g.cadence ?? 'anytime',
    checkIns: g.checkIns ?? [],
    lastCheckInAt: g.lastCheckInAt,
    matrix: g.matrix
      ? {
          core: g.matrix.core ?? '',
          pillars: Array.from({ length: 8 }, (_, i) => g.matrix?.pillars?.[i] ?? ''),
          habits: Array.from({ length: 8 }, (_, pi) =>
            Array.from({ length: 8 }, (_, hi) => g.matrix?.habits?.[pi]?.[hi] ?? ''),
          ),
        }
      : undefined,
    lifeArea,
    fromLifeMap: g.fromLifeMap || !!lifeArea || undefined,
  }
}

function hasLifeMapGoals(goals: Goal[]): boolean {
  return goals.some(
    (g) => g.id === LIFE_GOALS_MAP_ID || !!parseLifeMapGoalArea(g.id),
  )
}

/** Одна системная цель на каждый аспект карты жизни */
function ensureLifeMapGoals(goals: Goal[]): Goal[] {
  const normalized = goals.map(normalizeGoal)
  const byId = new Map(normalized.map((g) => [g.id, g]))
  const next = [...normalized]

  for (const area of LIFE_AREAS) {
    const id = lifeMapGoalId(area.id)
    const existing = byId.get(id)
    if (existing) {
      const idx = next.findIndex((g) => g.id === id)
      next[idx] = {
        ...existing,
        lifeArea: area.id,
        fromLifeMap: true,
        title: existing.title?.trim() ? existing.title : area.title,
        note: existing.note ?? area.hint,
        status: existing.status === 'paused' ? 'paused' : existing.status === 'done' ? 'done' : 'active',
      }
    } else {
      next.push({
        id,
        title: area.title,
        note: area.hint,
        status: 'active',
        createdAt: new Date().toISOString(),
        measureKind: 'none',
        stages: [],
        cadence: 'anytime',
        checkIns: [],
        lifeArea: area.id,
        fromLifeMap: true,
      })
    }
  }

  return ensureLifeGoalsMap(next)
}

/** Чинит карту только если она уже создана — иначе не трогает goals */
function syncLifeMapGoalsIfPresent(goals: Goal[]): Goal[] {
  const normalized = goals.map(normalizeGoal)
  if (!hasLifeMapGoals(normalized)) return normalized
  return ensureLifeMapGoals(normalized)
}

/** Карта целей 9×9: аспекты уже в квадратах, пользователь заполняет привычки */
function ensureLifeGoalsMap(goals: Goal[]): Goal[] {
  const pillars = LIFE_AREAS.map((a) => a.short)
  const idx = goals.findIndex((g) => g.id === LIFE_GOALS_MAP_ID)
  const matrixBase = normalizeMatrix(
    idx >= 0
      ? goals[idx].matrix
      : { core: 'Колесо баланса', pillars, habits: undefined },
  )
  matrixBase.core = matrixBase.core.trim() || 'Колесо баланса'
  matrixBase.pillars = pillars

  const goal: Goal = {
    id: LIFE_GOALS_MAP_ID,
    title: 'Колесо баланса',
    note: 'Карта целей · аспекты уже в квадратах — заполни привычки',
    status: 'active',
    createdAt: idx >= 0 ? goals[idx].createdAt : new Date().toISOString(),
    measureKind: 'matrix',
    stages: [],
    cadence: 'anytime',
    checkIns: [],
    matrix: matrixBase,
    fromLifeMap: true,
  }

  if (idx >= 0) {
    const next = [...goals]
    next[idx] = { ...goals[idx], ...goal, matrix: matrixBase }
    return next
  }
  return [...goals, goal]
}

/** Записать названия привычек аспектов в ячейки карты целей */
function syncLifeGoalsMapHabits(goals: Goal[], habits: Habit[]): Goal[] {
  return goals.map((g) => {
    if (g.id !== LIFE_GOALS_MAP_ID) return g
    const matrix = normalizeMatrix(g.matrix)
    matrix.core = matrix.core.trim() || 'Колесо баланса'
    matrix.pillars = LIFE_AREAS.map((a) => a.short)
    for (let pi = 0; pi < 8; pi++) {
      const area = LIFE_AREAS[pi]
      const list = habits.filter((h) => h.lifeArea === area.id)
      for (let hi = 0; hi < 8; hi++) {
        const bySlot = list.find((h) => h.matrixSlot === habitSlotKey(pi, hi))
        matrix.habits[pi][hi] = bySlot?.name ?? list[hi]?.name ?? ''
      }
    }
    return { ...g, matrix, measureKind: 'matrix', fromLifeMap: true }
  })
}

/** Привычки с аспектом без цели — крепим к цели карты жизни */
function syncLifeMapHabitLinks(habits: Habit[]): Habit[] {
  return habits.map((h) => {
    const n = normalizeHabit(h)
    if (!n.lifeArea) {
      const fromGoal = n.goalId ? parseLifeMapGoalArea(n.goalId) : undefined
      if (fromGoal) return { ...n, lifeArea: fromGoal }
      return n
    }
    const expected = lifeMapGoalId(n.lifeArea)
    if (!n.goalId) return { ...n, goalId: expected }
    return n
  })
}

function normalizeContract(c: QuestContract): QuestContract {
  let habitTitle = c.habitTitle
  let habitTagline = c.habitTagline
  if (c.templateId && (!habitTitle || !habitTagline)) {
    const t = findQuestTemplate(c.templateId)
    if (t) {
      const copy = habitDisplayCopy(t)
      habitTitle = habitTitle ?? copy.habitTitle
      habitTagline = habitTagline ?? copy.habitTagline
    }
  }
  return {
    ...c,
    listItems: c.listItems ?? [],
    status: c.status ?? 'active',
    reward: c.reward ?? c.cost * 2,
    habitTitle,
    habitTagline,
    reminderTime: c.reminderTime,
  }
}

function syncHabitWithContract(h: Habit, contracts: QuestContract[]): Habit {
  const n = normalizeHabit(h)
  if (!n.questContractId) return n
  const c = contracts.find((x) => x.id === n.questContractId)
  if (!c) return n
  const nc = normalizeContract(c)
  return {
    ...n,
    name: nc.habitTitle ?? n.name,
    reminderTime: n.reminderTime ?? nc.reminderTime,
  }
}

function normalizeUserListing(l: UserQuestListing): UserQuestListing {
  return {
    ...l,
    salesCount: l.salesCount ?? 0,
    earnedDiamonds: l.earnedDiamonds ?? 0,
    isMine: l.isMine ?? false,
    authorName: l.authorName || getCurrentUserName(USER.name),
    emoji: l.emoji || '⭐',
    color: l.color || '#e0e7ff',
  }
}

function freshStore(): Store {
  const { year, month } = currentYearMonth()
  const diamonds = ECONOMY.START_DIAMONDS
  return {
    year,
    month,
    habits: seedHabits,
    goals: seedGoals.map(normalizeGoal),
    quests: seedQuests,
    contracts: [],
    userListings: [],
    claimedSaleIds: [],
    streak: 0,
    diamonds,
    diamondHistory: [
      makeDiamondTx({
        amount: diamonds,
        reason: 'start',
        label: 'Приветственные алмазы за регистрацию',
        balanceAfter: diamonds,
      }),
    ],
    visitStreak: 0,
    hiddenLifeAreas: [],
    focusSettings: defaultFocusSettings('balanced'),
    plannerSections: defaultPlannerSections(),
    plannerTasks: [],
    desktop: defaultDesktopState(),
    achievements: emptyAchievements(),
  }
}

function wipeOldStorage() {
  try {
    for (const key of OLD_KEYS) localStorage.removeItem(key)
    for (const key of GRANT_KEYS) localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

function parseStore(raw: string): Store | null {
  try {
    const parsed = JSON.parse(raw) as Store & { xp?: number }
    const now = currentYearMonth()
    const contracts = (parsed.contracts ?? []).map(normalizeContract)
    const habits = syncLifeMapHabitLinks(
      (parsed.habits ?? []).map((h) => syncHabitWithContract(h, contracts)),
    )
    const goals = syncLifeGoalsMapHabits(
      syncLifeMapGoalsIfPresent((parsed.goals ?? []).map(normalizeGoal)),
      habits,
    )
    return {
      ...parsed,
      year: now.year,
      month: now.month,
      habits,
      goals,
      quests: parsed.quests ?? [],
      contracts,
      userListings: (parsed.userListings ?? []).map(normalizeUserListing),
      claimedSaleIds: Array.isArray(parsed.claimedSaleIds) ? parsed.claimedSaleIds : [],
      streak: parsed.streak ?? 0,
      diamonds:
        parsed.diamonds ??
        parsed.xp ??
        ECONOMY.START_DIAMONDS,
      diamondHistory: Array.isArray(parsed.diamondHistory)
        ? parsed.diamondHistory
        : [],
      visitStreak: parsed.visitStreak ?? 0,
      lastVisitDate: parsed.lastVisitDate,
      retroMarks: normalizeRetroMarks(parsed.retroMarks),
      hiddenLifeAreas: Array.isArray(parsed.hiddenLifeAreas)
        ? parsed.hiddenLifeAreas.filter(isLifeAreaId)
        : [],
      focusSettings: normalizeFocusSettings(parsed.focusSettings),
      plannerSections: Array.isArray(parsed.plannerSections) && parsed.plannerSections.length > 0
        ? parsed.plannerSections.map(normalizePlannerSection)
        : defaultPlannerSections(),
      plannerTasks: Array.isArray(parsed.plannerTasks)
        ? parsed.plannerTasks.map(normalizePlannerTask)
        : [],
      desktop: normalizeDesktopState(parsed.desktop),
      achievements: normalizeAchievementState(parsed.achievements),
    }
  } catch {
    return null
  }
}

/** Проверить контракты: победа / проигрыш + награда */
function settleContracts(
  habits: Habit[],
  contracts: QuestContract[],
  diamonds: number,
  history: DiamondTx[] = [],
): { contracts: QuestContract[]; diamonds: number; diamondHistory: DiamondTx[] } {
  const byId = new Map(habits.map((h) => [h.id, h]))
  let nextDiamonds = diamonds
  const wonTxs: DiamondTx[] = []
  const next = contracts.map((c) => {
    const prev = c.status
    const settled = resolveContractStatus(c, byId.get(c.habitId))
    if (prev === 'active' && settled.status === 'won') {
      nextDiamonds += settled.reward
      wonTxs.push(
        makeDiamondTx({
          amount: settled.reward,
          reason: 'quest_win',
          label: `Квест выполнен · ${settled.title}`,
          balanceAfter: nextDiamonds,
        }),
      )
    }
    return settled
  })
  return {
    contracts: next,
    diamonds: nextDiamonds,
    diamondHistory: pushDiamondTx(history, ...wonTxs),
  }
}

/** Ежедневный заход: серия дней + бонус каждые 7 дней подряд */
function applyVisitReward(store: Store): Store {
  const today = todayKey()
  if (store.lastVisitDate === today) return store

  let visitStreak = 1
  if (store.lastVisitDate && store.lastVisitDate === addDays(today, -1)) {
    visitStreak = (store.visitStreak || 0) + 1
  }

  let diamonds = store.diamonds
  let diamondHistory = store.diamondHistory ?? []
  // Бонус раз в VISIT_STREAK_DAYS дней подряд (7, 14, 21…) — один раз в день благодаря lastVisitDate
  if (visitStreak > 0 && visitStreak % ECONOMY.VISIT_STREAK_DAYS === 0) {
    diamonds += ECONOMY.VISIT_STREAK_BONUS
    diamondHistory = pushDiamondTx(
      diamondHistory,
      makeDiamondTx({
        amount: ECONOMY.VISIT_STREAK_BONUS,
        reason: 'visit_streak',
        label: `Бонус за ${visitStreak} ${visitStreak === 1 ? 'день' : 'дней'} захода`,
        balanceAfter: diamonds,
      }),
    )
  }

  const prevVisit = store.lastVisitDate
  let daysAway = 0
  if (prevVisit) {
    const a = new Date(prevVisit + 'T12:00:00')
    const b = new Date(today + 'T12:00:00')
    daysAway = Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000))
  }

  const withVisit = {
    ...store,
    diamonds,
    diamondHistory,
    visitStreak,
    lastVisitDate: today,
  }

  return applyAchievementEventsToStore(withVisit, [
    {
      type: 'app_visit',
      payload: { daysAway, previousVisitDate: prevVisit },
    },
    ...(visitStreak > 0 && visitStreak % ECONOMY.VISIT_STREAK_DAYS === 0
      ? [
          {
            type: 'diamonds_earned' as const,
            payload: { amount: ECONOMY.VISIT_STREAK_BONUS },
          },
        ]
      : []),
  ])
}

function loadStore(userId: string): Store {
  try {
    // Убираем разовые «подарочные» гранты со старых сессий
    for (const key of GRANT_KEYS) {
      try {
        localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    }

    const raw = localStorage.getItem(storageKey(userId))
    if (raw) {
      const store = parseStore(raw)
      if (store) {
        const withVisit = applyVisitReward(store)
        const settled = settleContracts(
          withVisit.habits.map(normalizeHabit),
          withVisit.contracts.map(normalizeContract),
          withVisit.diamonds,
          withVisit.diamondHistory,
        )
        return { ...withVisit, ...settled }
      }
    }
  } catch {
    /* ignore */
  }

  // Старое общее хранилище и гранты больше не переносим — чистый старт
  wipeOldStorage()
  return applyVisitReward(freshStore())
}

function syncQuests(habits: Habit[], existing: Quest[]): Quest[] {
  const today = todayKey()
  const due = habits.filter((h) => isDueToday(h, today) || (isActiveToday(h, today) && h.completions[today]))
  const byHabit = new Map(existing.map((q) => [q.habitId, q]))

  return due.map((h) => {
    const prev = byHabit.get(h.id)
    return {
      id: prev?.id ?? `q-${h.id}`,
      title: h.name,
      minutes: 10,
      habitId: h.id,
      done: !!h.completions[today],
      xp:
        prev?.xp ??
        (h.priority === 'urgent' ? 30 : h.priority === 'important' ? 25 : 15),
    }
  })
}

function globalStreak(habits: Habit[]): number {
  const active = habits.filter((h) => isActiveToday(h) || isFormed(h))
  if (!active.length) return 0
  return Math.min(...active.map((h) => currentStreak(h)))
}

function buildGoalStats(goals: Goal[], habits: Habit[]): GoalStat[] {
  const today = todayKey()
  return goals.map((g) => {
    const linked = habits.filter((h) => {
      if (h.goalId === g.id) return true
      if (g.id === LIFE_GOALS_MAP_ID && h.lifeArea) return true
      if (g.fromLifeMap && g.lifeArea && h.lifeArea === g.lifeArea) return true
      return false
    })
    // уникальные по id
    const seen = new Set<string>()
    const unique = linked.filter((h) => {
      if (seen.has(h.id)) return false
      seen.add(h.id)
      return true
    })
    const todayActive = unique.filter((h) => isActiveToday(h, today))
    const todayDue = todayActive.filter(
      (h) => isDueToday(h, today) || h.completions[today],
    )
    const todayDone = todayDue.filter((h) => h.completions[today]).length
    const todayTotal = todayDue.length
    const todayPct = todayTotal ? Math.round((todayDone / todayTotal) * 100) : 0

    const formPcts = unique.map((h) =>
      Math.min(100, Math.round((completedCount(h) / h.targetDays) * 100)),
    )
    const formPct = formPcts.length
      ? Math.round(formPcts.reduce((a, b) => a + b, 0) / formPcts.length)
      : 0

    const weekPcts = unique.map((h) => weekPlanStats(h, today).pct)
    const weekPct = weekPcts.length
      ? Math.round(weekPcts.reduce((a, b) => a + b, 0) / weekPcts.length)
      : 0

    const attentionPcts = unique
      .filter((h) => compareKeysSafe(h.startDate, today) <= 0)
      .map((h) => elapsedStats(h, today).pct)
    const habitProgress = attentionPcts.length
      ? Math.round(attentionPcts.reduce((a, b) => a + b, 0) / attentionPcts.length)
      : 0

    const resultProgress = goalResultProgress(g)
    const progress = resultProgress ?? habitProgress

    return {
      ...g,
      habitCount: unique.length,
      todayDone,
      todayTotal,
      todayPct,
      weekPct,
      formPct,
      progress,
      habitProgress,
      resultProgress,
      metricLabel: formatGoalMetric(g),
      needsCheckIn: needsCheckIn(g, today),
      habits: unique,
    }
  })
}

export function useLifeOS(userId: string | null) {
  const [activeUserId, setActiveUserId] = useState(userId)
  const [store, setStore] = useState<Store>(() =>
    userId ? loadStore(userId) : freshStore(),
  )

  // Смена аккаунта → своё чистое (или сохранённое) хранилище
  useEffect(() => {
    if (userId === activeUserId) return
    setActiveUserId(userId)
    setStore(userId ? loadStore(userId) : freshStore())
  }, [userId, activeUserId])

  useEffect(() => {
    const sync = () => {
      const { year, month } = currentYearMonth()
      setStore((s) => {
        if (s.year === year && s.month === month) return s
        return { ...s, year, month }
      })
    }
    sync()
    const id = window.setInterval(sync, 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    // Не пишем чужой стор в ключ нового пользователя при смене аккаунта
    if (!userId || userId !== activeUserId) return
    localStorage.setItem(storageKey(userId), JSON.stringify(store))
  }, [store, userId, activeUserId])

  // Чиним системные цели карты жизни только если карта уже создана
  useEffect(() => {
    setStore((s) => {
      if (!hasLifeMapGoals(s.goals)) return s
      const habits = syncLifeMapHabitLinks(s.habits.map(normalizeHabit))
      const goals = syncLifeGoalsMapHabits(
        syncLifeMapGoalsIfPresent(s.goals.map(normalizeGoal)),
        habits,
      )
      const missingLifeMap = LIFE_AREAS.some(
        (a) => !s.goals.some((g) => g.id === lifeMapGoalId(a.id)),
      )
      const missingGoalsMap = !s.goals.some((g) => g.id === LIFE_GOALS_MAP_ID)
      const habitNeedsLink = habits.some((h, i) => {
        const prev = normalizeHabit(s.habits[i] ?? h)
        return prev.goalId !== h.goalId || prev.lifeArea !== h.lifeArea
      })
      if (
        !missingLifeMap &&
        !missingGoalsMap &&
        !habitNeedsLink &&
        goals.length === s.goals.length
      ) {
        return s
      }
      return { ...s, goals, habits }
    })
  }, [])

  const dayCount = daysInMonth(store.year, store.month)
  const habitsAll = useMemo(
    () => syncLifeMapHabitLinks(store.habits.map(normalizeHabit)),
    [store.habits],
  )

  const goals = useMemo(
    () => syncLifeMapGoalsIfPresent(store.goals.map(normalizeGoal)),
    [store.goals],
  )

  const habits = useMemo(
    () =>
      habitsAll.filter((h) => isVisibleInMonth(h, store.year, store.month)),
    [habitsAll, store.year, store.month],
  )

  const setMonth = (year: number, month: number) => {
    setStore((s) => ({ ...s, year, month }))
  }

  const goToToday = () => {
    const { year, month } = currentYearMonth()
    setMonth(year, month)
  }

  const toggleHabitDay = (
    habitId: string,
    dayIndex: number,
  ): { ok: boolean; reason?: string } => {
    const key = toDateKey(new Date(store.year, store.month, dayIndex + 1))
    const today = todayKey()
    if (key > today) {
      return { ok: false, reason: 'Будущие дни отмечать нельзя' }
    }

    const h = habitsAll.find((x) => x.id === habitId)
    if (!h) return { ok: false, reason: 'Привычка не найдена' }
    const status = dayStatus(h, store.year, store.month, dayIndex)
    if (status === 'before' || status === 'after' || status === 'future') {
      return { ok: false, reason: 'Этот день недоступен' }
    }

    const wasMarked = !!h.completions[key]
    const willMark = !wasMarked

    if (willMark && key < today) {
      const info = retrofillInfo(store.retroMarks, today)
      if (!info.canUse) {
        return { ok: false, reason: info.reason ?? 'Лимит отметок за прошлое исчерпан' }
      }
    }

    setStore((s) => {
      const habits = s.habits.map(normalizeHabit).map((habit) => {
        if (habit.id !== habitId) return habit
        const st = dayStatus(habit, s.year, s.month, dayIndex)
        if (st === 'before' || st === 'after' || st === 'future') return habit
        const completions = { ...habit.completions }
        const next = !completions[key]
        if (next) completions[key] = true
        else delete completions[key]
        return { ...habit, completions }
      })
      const marked = !!habits.find((x) => x.id === habitId)?.completions[key]
      const was = !!s.habits.map(normalizeHabit).find((x) => x.id === habitId)?.completions[key]
      const habitName =
        habits.find((x) => x.id === habitId)?.name ??
        s.habits.find((x) => x.id === habitId)?.name ??
        'привычка'
      let diamonds = s.diamonds
      let diamondHistory = s.diamondHistory ?? []
      if (marked && !was) {
        diamonds += ECONOMY.DAY_REWARD
        diamondHistory = pushDiamondTx(
          diamondHistory,
          makeDiamondTx({
            amount: ECONOMY.DAY_REWARD,
            reason: 'day_mark',
            label: `Отметка дня · ${habitName}`,
            balanceAfter: diamonds,
          }),
        )
      }
      if (!marked && was) {
        const spent = Math.min(ECONOMY.DAY_REWARD, diamonds)
        diamonds = Math.max(0, diamonds - ECONOMY.DAY_REWARD)
        diamondHistory = pushDiamondTx(
          diamondHistory,
          makeDiamondTx({
            amount: -spent,
            reason: 'day_unmark',
            label: `Снята отметка · ${habitName}`,
            balanceAfter: diamonds,
          }),
        )
      }

      let retroMarks = normalizeRetroMarks(s.retroMarks, today)
      if (marked && !was && key < today) {
        retroMarks = consumeRetrofill(retroMarks, today)
      }

      const quests = syncQuests(habits, s.quests)
      const settled = settleContracts(
        habits,
        (s.contracts ?? []).map(normalizeContract),
        diamonds,
        diamondHistory,
      )
      const prevWon = (s.contracts ?? []).filter((c) => c.status === 'won').length
      const nextWon = settled.contracts.filter((c) => c.status === 'won').length
      const events: AchievementEvent[] = []
      if (marked && !was) {
        events.push({ type: 'habit_completed', payload: { habitId } })
        events.push({
          type: 'diamonds_earned',
          payload: { amount: ECONOMY.DAY_REWARD },
        })
      }
      if (!marked && was) {
        events.push({
          type: 'habit_uncompleted',
          payload: { habitId, previousStreak: s.streak },
        })
      }
      if (nextWon > prevWon) {
        for (let i = 0; i < nextWon - prevWon; i++) {
          events.push({ type: 'quest_won' })
        }
        const gained = settled.diamonds - diamonds
        if (gained > 0) {
          events.push({ type: 'diamonds_earned', payload: { amount: gained } })
        }
      }
      const base = {
        ...s,
        habits,
        quests,
        contracts: settled.contracts,
        streak: globalStreak(habits),
        diamonds: settled.diamonds,
        diamondHistory: settled.diamondHistory,
        retroMarks,
      }
      return applyAchievementEventsToStore(base, events)
    })
    return { ok: true }
  }

  const toggleQuest = (questId: string) => {
    const today = todayKey()
    setStore((s) => {
      const quest = s.quests.find((q) => q.id === questId)
      if (!quest?.habitId) return s
      const wasMarked = !!s.habits
        .map(normalizeHabit)
        .find((h) => h.id === quest.habitId)?.completions[today]
      const habits = s.habits.map(normalizeHabit).map((h) => {
        if (h.id !== quest.habitId) return h
        const completions = { ...h.completions }
        const next = !completions[today]
        if (next) completions[today] = true
        else delete completions[today]
        return { ...h, completions }
      })
      const quests = syncQuests(habits, s.quests)
      const nowDone = !!habits.find((h) => h.id === quest.habitId)?.completions[today]
      const habitName =
        habits.find((h) => h.id === quest.habitId)?.name ?? quest.title
      let diamonds = s.diamonds
      let diamondHistory = s.diamondHistory ?? []
      if (nowDone && !wasMarked) {
        diamonds += ECONOMY.DAY_REWARD
        diamondHistory = pushDiamondTx(
          diamondHistory,
          makeDiamondTx({
            amount: ECONOMY.DAY_REWARD,
            reason: 'day_mark',
            label: `Отметка дня · ${habitName}`,
            balanceAfter: diamonds,
          }),
        )
      }
      if (!nowDone && wasMarked) {
        const spent = Math.min(ECONOMY.DAY_REWARD, diamonds)
        diamonds = Math.max(0, diamonds - ECONOMY.DAY_REWARD)
        diamondHistory = pushDiamondTx(
          diamondHistory,
          makeDiamondTx({
            amount: -spent,
            reason: 'day_unmark',
            label: `Снята отметка · ${habitName}`,
            balanceAfter: diamonds,
          }),
        )
      }
      const settled = settleContracts(
        habits,
        (s.contracts ?? []).map(normalizeContract),
        diamonds,
        diamondHistory,
      )
      return {
        ...s,
        habits,
        quests,
        contracts: settled.contracts,
        streak: globalStreak(habits),
        diamonds: settled.diamonds,
        diamondHistory: settled.diamondHistory,
      }
    })
  }

  const addHabit = (input: NewHabitInput): { ok: boolean; reason?: string; habitId?: string } => {
    const free = !!input.fromMatrix
    const cost = free
      ? 0
      : input.fromLifeMap
        ? ECONOMY.LIFE_MAP_HABIT_COST
        : ECONOMY.HABIT_COST
    if (!free && !canAfford(store.diamonds, cost)) {
      return {
        ok: false,
        reason: `Нужно ${formatDiamonds(cost)}. Сейчас ${formatDiamonds(store.diamonds)}. Отмечай дни (+${formatDiamonds(ECONOMY.DAY_REWARD)}), войди в ритм — потом добавляй новые привычки.`,
      }
    }
    const areaIdPreview =
      input.lifeArea ||
      (input.goalId ? parseLifeMapGoalArea(input.goalId) : undefined) ||
      undefined
    if (areaIdPreview) {
      if (!hasLifeMapGoals(store.goals)) {
        return {
          ok: false,
          reason: 'Сначала создай карту жизни',
        }
      }
      const count = store.habits.filter(
        (h) => normalizeHabit(h).lifeArea === areaIdPreview,
      ).length
      if (count >= LIFE_AREA_MAX_HABITS) {
        const area = findLifeArea(areaIdPreview)
        return {
          ok: false,
          reason: `В аспекте «${area?.short ?? 'аспект'}» уже ${LIFE_AREA_MAX_HABITS} привычек — это максимум.`,
        }
      }
    }
    const id = `h-${Date.now()}-${Math.round(Math.random() * 1e6)}`
    setStore((s) => {
      if (!free && !canAfford(s.diamonds, cost)) return s
      const areaId =
        input.lifeArea ||
        (input.goalId ? parseLifeMapGoalArea(input.goalId) : undefined) ||
        undefined
      if (areaId) {
        const count = s.habits.filter((h) => normalizeHabit(h).lifeArea === areaId).length
        if (count >= LIFE_AREA_MAX_HABITS) return s
      }
      const lifeMapGoal = areaId ? lifeMapGoalId(areaId) : undefined
      const goalId =
        input.goalId || input.matrixGoalId || lifeMapGoal || undefined
      // Слот на карте целей жизни
      let matrixSlot = input.matrixSlot
      if (areaId && !matrixSlot) {
        const pi = lifeAreaPillarIndex(areaId)
        if (pi >= 0) {
          const used = new Set(
            s.habits
              .map(normalizeHabit)
              .filter((h) => h.lifeArea === areaId && h.matrixSlot)
              .map((h) => h.matrixSlot),
          )
          for (let hi = 0; hi < 8; hi++) {
            const key = habitSlotKey(pi, hi)
            if (!used.has(key)) {
              matrixSlot = key
              break
            }
          }
        }
      }
      const habit: Habit = {
        id,
        name: input.name.trim(),
        emoji: input.emoji || '⭐',
        completions: {},
        priority: input.priority,
        targetDays: input.targetDays,
        startDate: input.startDate,
        timesPerWeek: input.timesPerWeek,
        reminderTime: input.reminderTime || undefined,
        createdAt: new Date().toISOString(),
        goalId: lifeMapGoal || goalId,
        lifeArea: areaId,
        fromMatrix: free || undefined,
        matrixGoalId: free
          ? goalId
          : areaId
            ? LIFE_GOALS_MAP_ID
            : undefined,
        matrixSlot: matrixSlot || undefined,
      }
      let habits = syncLifeMapHabitLinks([...s.habits.map(normalizeHabit), habit])
      let goals = syncLifeMapGoalsIfPresent(s.goals.map(normalizeGoal))

      // Записать название в ячейку обычной карты цели
      if (free && goalId && input.matrixSlot?.startsWith('h-') && goalId !== LIFE_GOALS_MAP_ID) {
        const parts = input.matrixSlot.split('-')
        const pi = Number(parts[1])
        const hi = Number(parts[2])
        if (!Number.isNaN(pi) && !Number.isNaN(hi)) {
          goals = goals.map((g) => {
            if (g.id !== goalId || g.measureKind !== 'matrix') return g
            const matrix = normalizeMatrix(g.matrix)
            matrix.habits[pi][hi] = habit.name
            return { ...g, matrix }
          })
        }
      }

      goals = syncLifeGoalsMapHabits(goals, habits)

      const diamonds = s.diamonds - cost
      const area = findLifeArea(areaId)
      const events: AchievementEvent[] = [
        {
          type: 'habit_created',
          payload: { habitId: id, goalId: habit.goalId },
        },
      ]
      if (cost > 0) {
        events.push({ type: 'diamonds_spent', payload: { amount: cost } })
      }
      return applyAchievementEventsToStore(
        {
          ...s,
          habits,
          goals,
          quests: syncQuests(habits, s.quests),
          diamonds,
          diamondHistory:
            cost > 0
              ? pushDiamondTx(
                  s.diamondHistory,
                  makeDiamondTx({
                    amount: -cost,
                    reason: input.fromLifeMap || areaId ? 'life_map_habit' : 'habit_create',
                    label:
                      input.fromLifeMap || areaId
                        ? `Карта жизни · ${area?.short ?? 'аспект'} · ${habit.name}`
                        : `Новая привычка · ${habit.name}`,
                    balanceAfter: diamonds,
                  }),
                )
              : s.diamondHistory,
        },
        events,
      )
    })
    return { ok: true, habitId: id }
  }

  const updateHabit = (
    habitId: string,
    input: UpdateHabitInput,
  ): { ok: boolean; reason?: string } => {
    const exists = store.habits.some((h) => h.id === habitId)
    if (!exists) return { ok: false, reason: 'Привычка не найдена' }
    if (!input.name.trim()) return { ok: false, reason: 'Укажи название привычки' }
    setStore((s) => ({
      ...applyAchievementEventsToStore(
        {
          ...s,
          habits: s.habits.map(normalizeHabit).map((h) =>
            h.id === habitId
              ? {
                  ...h,
                  name: input.name.trim(),
                  emoji: input.emoji || h.emoji,
                  priority: input.priority,
                  targetDays: input.targetDays,
                  startDate: input.startDate,
                  timesPerWeek: input.timesPerWeek,
                  reminderTime: input.reminderTime || undefined,
                }
              : h,
          ),
        },
        [{ type: 'habit_updated', payload: { habitId } }],
      ),
    }))
    return { ok: true }
  }

  const deleteHabit = (habitId: string) => {
    setStore((s) => {
      const habits = syncLifeMapHabitLinks(
        s.habits.filter((h) => h.id !== habitId).map(normalizeHabit),
      )
      const contracts = (s.contracts ?? []).map(normalizeContract).map((c) =>
        c.habitId === habitId && c.status === 'active'
          ? { ...c, status: 'abandoned' as const, completedAt: todayKey() }
          : c,
      )
      const goals = syncLifeGoalsMapHabits(
        syncLifeMapGoalsIfPresent(s.goals.map(normalizeGoal)),
        habits,
      )
      return applyAchievementEventsToStore(
        {
          ...s,
          habits,
          goals,
          contracts,
          quests: syncQuests(habits, s.quests),
          streak: globalStreak(habits),
        },
        [{ type: 'habit_deleted', payload: { habitId } }],
      )
    })
  }

  const acceptQuest = (
    templateId: string,
    options?: { reminderTime?: string },
  ): { ok: boolean; reason?: string } => {
    const template = findQuestTemplate(templateId)
    if (!template) {
      return { ok: false, reason: 'Квест не найден' }
    }
    if (!canAfford(store.diamonds, template.cost)) {
      return {
        ok: false,
        reason: `Нужно ${formatDiamonds(template.cost)}. Сейчас ${formatDiamonds(store.diamonds)}.`,
      }
    }
    const already = (store.contracts ?? []).some(
      (c) => c.templateId === templateId && c.status === 'active',
    )
    if (already) {
      return { ok: false, reason: 'Этот контракт уже активен' }
    }

    const copy = habitDisplayCopy(template)

    setStore((s) => {
      if (!canAfford(s.diamonds, template.cost)) return s
      const habitId = `h-${Date.now()}`
      const startDate = todayKey()
      const contract = createContractFromTemplate(
        template,
        habitId,
        startDate,
        options?.reminderTime,
      )
      const habit: Habit = {
        id: habitId,
        name: copy.habitTitle,
        emoji: template.emoji,
        completions: {},
        priority: template.cost === 50 ? 'urgent' : template.cost === 30 ? 'important' : 'low',
        targetDays: toHabitDuration(
          template.kind === 'list' ? template.durationDays : template.target,
        ),
        startDate,
        timesPerWeek: template.timesPerWeek,
        createdAt: new Date().toISOString(),
        questContractId: contract.id,
        reminderTime: contract.reminderTime,
      }
      const habits = [...s.habits.map(normalizeHabit), habit]
      const diamonds = s.diamonds - template.cost
      return applyAchievementEventsToStore(
        {
          ...s,
          habits,
          quests: syncQuests(habits, s.quests),
          contracts: [...(s.contracts ?? []).map(normalizeContract), contract],
          diamonds,
          diamondHistory: pushDiamondTx(
            s.diamondHistory,
            makeDiamondTx({
              amount: -template.cost,
              reason: 'quest_accept',
              label: `Квест · ${template.title}`,
              balanceAfter: diamonds,
            }),
          ),
        },
        [
          { type: 'quest_accepted', payload: { cost: template.cost } },
          { type: 'diamonds_spent', payload: { amount: template.cost } },
          { type: 'habit_created', payload: { habitId } },
        ],
      )
    })
    return { ok: true }
  }

  const setQuestReminder = (habitId: string, reminderTime: string) => {
    setStore((s) => {
      const habits = s.habits.map((h) =>
        h.id === habitId ? { ...normalizeHabit(h), reminderTime } : normalizeHabit(h),
      )
      const contracts = (s.contracts ?? []).map(normalizeContract).map((c) =>
        c.habitId === habitId ? { ...c, reminderTime } : c,
      )
      return { ...s, habits, contracts }
    })
  }

  const markYesterdayMissed = (): { ok: boolean; reason?: string; marked?: number } => {
    const today = todayKey()
    const yesterday = addDays(today, -1)
    const missed = habitsAll.filter((h) => isDueOnDate(h, yesterday))
    if (missed.length === 0) {
      return { ok: false, reason: 'Вчера всё отмечено или нечего отмечать' }
    }
    const info = retrofillInfo(store.retroMarks, today)
    if (!info.canUse) {
      return { ok: false, reason: info.reason ?? 'Лимит отметок за прошлое исчерпан' }
    }
    if (missed.length > info.remaining) {
      return {
        ok: false,
        reason: `Нужно ${missed.length} отметок, в этом месяце осталось ${info.remaining} из 5`,
      }
    }

    setStore((s) => {
      let retroMarks = normalizeRetroMarks(s.retroMarks, today)
      let diamonds = s.diamonds
      let diamondHistory = s.diamondHistory ?? []
      const habits = s.habits.map(normalizeHabit).map((h) => {
        if (!missed.some((m) => m.id === h.id)) return h
        if (h.completions[yesterday]) return h
        retroMarks = consumeRetrofill(retroMarks, today)
        diamonds += ECONOMY.DAY_REWARD
        diamondHistory = pushDiamondTx(
          diamondHistory,
          makeDiamondTx({
            amount: ECONOMY.DAY_REWARD,
            reason: 'day_mark',
            label: `Отметка за вчера · ${h.name}`,
            balanceAfter: diamonds,
          }),
        )
        return {
          ...h,
          completions: { ...h.completions, [yesterday]: true },
        }
      })
      const quests = syncQuests(habits, s.quests)
      const settled = settleContracts(
        habits,
        (s.contracts ?? []).map(normalizeContract),
        diamonds,
        diamondHistory,
      )
      return {
        ...s,
        habits,
        quests,
        contracts: settled.contracts,
        diamonds: settled.diamonds,
        diamondHistory: settled.diamondHistory,
        streak: globalStreak(habits),
        retroMarks,
      }
    })
    return { ok: true, marked: missed.length }
  }

  const updateQuestListItem = (
    contractId: string,
    itemId: string,
    patch: Partial<Pick<QuestListItem, 'title' | 'done'>>,
  ) => {
    setStore((s) => {
      const contracts = (s.contracts ?? []).map(normalizeContract).map((c) => {
        if (c.id !== contractId || c.status !== 'active' || c.kind !== 'list') return c
        return {
          ...c,
          listItems: c.listItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  title: patch.title !== undefined ? patch.title : item.title,
                  done: patch.done !== undefined ? patch.done : item.done,
                }
              : item,
          ),
        }
      })
      const habits = s.habits.map(normalizeHabit)
      const settled = settleContracts(
        habits,
        contracts,
        s.diamonds,
        s.diamondHistory,
      )
      return {
        ...s,
        contracts: settled.contracts,
        diamonds: settled.diamonds,
        diamondHistory: settled.diamondHistory,
      }
    })
  }

  const abandonQuest = (contractId: string) => {
    setStore((s) => {
      const prev = (s.contracts ?? []).map(normalizeContract)
      const target = prev.find((c) => c.id === contractId && c.status === 'active')
      const contracts = prev.map((c) =>
        c.id === contractId && c.status === 'active'
          ? { ...c, status: 'abandoned' as const, completedAt: todayKey() }
          : c,
      )
      const habits = target
        ? s.habits.map(normalizeHabit).filter((h) => h.id !== target.habitId)
        : s.habits.map(normalizeHabit)
      return {
        ...s,
        contracts,
        habits,
        quests: syncQuests(habits, s.quests),
        streak: globalStreak(habits),
      }
    })
  }

  const createUserQuest = (
    input: NewUserQuestInput,
  ): { ok: boolean; reason?: string; listing?: UserQuestListing } => {
    const title = input.title.trim()
    const description = input.description.trim()
    if (!title) return { ok: false, reason: 'Укажи название квеста' }
    if (!description) return { ok: false, reason: 'Добавь короткое описание' }
    const price = Math.round(input.price)
    const reward = Math.round(input.reward)
    if (
      !Number.isFinite(price) ||
      price < ECONOMY.USER_QUEST_PRICE_MIN ||
      price > ECONOMY.USER_QUEST_PRICE_MAX
    ) {
      return {
        ok: false,
        reason: `Цена: от ${ECONOMY.USER_QUEST_PRICE_MIN} до ${ECONOMY.USER_QUEST_PRICE_MAX} алмазов`,
      }
    }
    if (!Number.isFinite(reward) || reward < price) {
      return { ok: false, reason: 'Вознаграждение не меньше цены' }
    }
    if (input.target < 1 || input.durationDays < 1) {
      return { ok: false, reason: 'Укажи срок и цель' }
    }

    const listing: UserQuestListing = {
      id: `ul-${Date.now()}`,
      shareCode: makeShareCode(),
      title,
      description,
      emoji: input.emoji || '⭐',
      category: input.category,
      price,
      reward,
      kind: input.kind,
      durationDays: input.durationDays,
      timesPerWeek: Math.min(7, Math.max(1, input.timesPerWeek)),
      target: input.target,
      listLabel: input.kind === 'list' ? input.listLabel?.trim() || 'пункт' : undefined,
      color: input.color,
      createdAt: new Date().toISOString(),
      isMine: true,
      authorName: getCurrentUserName(USER.name),
      salesCount: 0,
      earnedDiamonds: 0,
      needsReminder: input.needsReminder,
      reminderDefault: input.reminderDefault,
    }

    setStore((s) => ({
      ...s,
      userListings: [...(s.userListings ?? []).map(normalizeUserListing), listing],
    }))
    return { ok: true, listing }
  }

  const importSharedQuest = (
    payload: SharedQuestPayload,
  ): { ok: boolean; reason?: string; listing?: UserQuestListing } => {
    const incoming = sharedPayloadToListing(payload)
    const existing = (store.userListings ?? []).find(
      (l) => l.shareCode === incoming.shareCode,
    )
    if (existing) {
      return { ok: true, listing: existing }
    }
    setStore((s) => ({
      ...s,
      userListings: [
        ...(s.userListings ?? []).map(normalizeUserListing),
        normalizeUserListing(incoming),
      ],
    }))
    return { ok: true, listing: incoming }
  }

  const acceptUserQuest = (
    listingId: string,
    options?: { reminderTime?: string },
  ): {
    ok: boolean
    reason?: string
    saleClaim?: SaleClaimPayload
  } => {
    const listing = (store.userListings ?? [])
      .map(normalizeUserListing)
      .find((l) => l.id === listingId)
    if (!listing) return { ok: false, reason: 'Квест не найден' }
    if (!canAfford(store.diamonds, listing.price)) {
      return {
        ok: false,
        reason: `Нужно ${formatDiamonds(listing.price)}. Сейчас ${formatDiamonds(store.diamonds)}.`,
      }
    }
    const already = (store.contracts ?? []).some(
      (c) =>
        c.status === 'active' &&
        (c.listingId === listing.id || c.templateId === listing.id),
    )
    if (already) {
      return { ok: false, reason: 'Этот контракт уже активен' }
    }

    const saleClaim =
      !listing.isMine
        ? makeSaleClaim({
            shareCode: listing.shareCode,
            title: listing.title,
            price: listing.price,
            buyerName: getCurrentUserName(USER.name),
          })
        : undefined

    const copy = userListingHabitCopy(listing)

    setStore((s) => {
      if (!canAfford(s.diamonds, listing.price)) return s
      const habitId = `h-${Date.now()}`
      const startDate = todayKey()
      const contract = createContractFromUserListing(
        listing,
        habitId,
        startDate,
        options?.reminderTime,
      )
      const habit: Habit = {
        id: habitId,
        name: copy.habitTitle,
        emoji: listing.emoji,
        completions: {},
        priority:
          listing.price >= 50 ? 'urgent' : listing.price >= 30 ? 'important' : 'low',
        targetDays: toHabitDuration(
          listing.kind === 'list' ? listing.durationDays : listing.target,
        ),
        startDate,
        timesPerWeek: listing.timesPerWeek,
        createdAt: new Date().toISOString(),
        questContractId: contract.id,
        reminderTime: contract.reminderTime,
      }
      const habits = [...s.habits.map(normalizeHabit), habit]
      const diamonds = s.diamonds - listing.price
      const diamondHistory = pushDiamondTx(
        s.diamondHistory,
        makeDiamondTx({
          amount: -listing.price,
          reason: 'quest_accept',
          label: `Квест · ${listing.title}`,
          balanceAfter: diamonds,
        }),
      )

      return applyAchievementEventsToStore(
        {
          ...s,
          habits,
          quests: syncQuests(habits, s.quests),
          contracts: [...(s.contracts ?? []).map(normalizeContract), contract],
          diamonds,
          diamondHistory,
        },
        [
          { type: 'quest_accepted', payload: { cost: listing.price } },
          { type: 'diamonds_spent', payload: { amount: listing.price } },
          { type: 'habit_created' },
        ],
      )
    })

    return { ok: true, saleClaim }
  }

  const claimQuestSale = (
    payload: SaleClaimPayload,
  ): { ok: boolean; reason?: string; cut?: number } => {
    const cut = Math.max(0, Math.round(payload.cut))
    if (!cut) return { ok: false, reason: 'Пустой чек продажи' }
    if ((store.claimedSaleIds ?? []).includes(payload.claimId)) {
      return { ok: false, reason: 'Эта продажа уже зачислена' }
    }
    const mine = (store.userListings ?? []).some(
      (l) => l.isMine && l.shareCode === payload.shareCode,
    )
    if (!mine) {
      return {
        ok: false,
        reason: 'Чек не для твоих квестов. Открой ссылку на устройстве автора.',
      }
    }

    setStore((s) => {
      if ((s.claimedSaleIds ?? []).includes(payload.claimId)) return s
      const diamonds = s.diamonds + cut
      return {
        ...s,
        diamonds,
        claimedSaleIds: [...(s.claimedSaleIds ?? []), payload.claimId],
        userListings: (s.userListings ?? []).map(normalizeUserListing).map((l) =>
          l.isMine && l.shareCode === payload.shareCode
            ? {
                ...l,
                salesCount: l.salesCount + 1,
                earnedDiamonds: l.earnedDiamonds + cut,
              }
            : l,
        ),
        diamondHistory: pushDiamondTx(
          s.diamondHistory,
          makeDiamondTx({
            amount: cut,
            reason: 'quest_creator_sale',
            label: `Продажа · ${payload.title} (${payload.buyerName})`,
            balanceAfter: diamonds,
          }),
        ),
      }
    })
    return { ok: true, cut }
  }

  const deleteUserQuest = (listingId: string) => {
    setStore((s) => ({
      ...s,
      userListings: (s.userListings ?? [])
        .map(normalizeUserListing)
        .filter((l) => l.id !== listingId),
    }))
  }

  /** Сделать квест из каталога доступным для шаринга (и продаж) */
  const publishCatalogQuest = (
    templateId: string,
  ): { ok: boolean; reason?: string; listing?: UserQuestListing } => {
    const template = findQuestTemplate(templateId)
    if (!template) return { ok: false, reason: 'Квест не найден в каталоге' }

    const existing = (store.userListings ?? [])
      .map(normalizeUserListing)
      .find((l) => l.isMine && l.sourceCatalogId === template.id)
    if (existing) return { ok: true, listing: existing }

    const listing: UserQuestListing = {
      id: `ul-cat-${template.id}-${Date.now().toString(36)}`,
      shareCode: makeShareCode(),
      title: template.title,
      description: template.description,
      emoji: template.emoji,
      category: template.category,
      price: template.cost,
      reward: questReward(template.cost),
      kind: template.kind,
      durationDays: template.durationDays,
      timesPerWeek: template.timesPerWeek,
      target: template.target,
      listLabel: template.listLabel,
      color: template.color,
      createdAt: new Date().toISOString(),
      isMine: true,
      authorName: getCurrentUserName(USER.name),
      salesCount: 0,
      earnedDiamonds: 0,
      needsReminder: template.needsReminder,
      reminderDefault: template.reminderDefault,
      sourceCatalogId: template.id,
    }

    setStore((s) => ({
      ...s,
      userListings: [...(s.userListings ?? []).map(normalizeUserListing), listing],
    }))
    return { ok: true, listing }
  }

  const addGoal = (input: NewGoalInput): { ok: boolean; reason?: string; goalId?: string } => {
    if (!canAfford(store.diamonds, ECONOMY.GOAL_COST)) {
      return {
        ok: false,
        reason: `Нужно ${formatDiamonds(ECONOMY.GOAL_COST)}. Сейчас ${formatDiamonds(store.diamonds)}. Не ставь слишком много целей сразу — сначала ритм и алмазы.`,
      }
    }
    const goalId = `g-${Date.now()}`
    setStore((s) => {
      if (!canAfford(s.diamonds, ECONOMY.GOAL_COST)) return s
      const stages =
        input.measureKind === 'stages'
          ? (input.stages ?? [])
              .map((st) => st.title.trim())
              .filter(Boolean)
              .map((title) => makeStage(title))
          : []

      const startValue =
        input.measureKind === 'number' ? input.startValue : undefined
      const targetValue =
        input.measureKind === 'number' ? input.targetValue : undefined
      const currentValue =
        input.measureKind === 'number'
          ? (input.currentValue ?? input.startValue)
          : undefined

      const goal: Goal = {
        id: goalId,
        title: input.title.trim(),
        note: input.note?.trim() || undefined,
        status: 'active',
        createdAt: new Date().toISOString(),
        scheduledFor: todayKey(),
        scheduledTime: input.scheduledTime || undefined,
        measureKind: input.measureKind ?? 'none',
        unit: input.measureKind === 'number' ? input.unit?.trim() || undefined : undefined,
        startValue,
        targetValue,
        currentValue,
        stages,
        cadence: input.cadence ?? 'anytime',
        checkIns: [],
      }
      const diamonds = s.diamonds - ECONOMY.GOAL_COST
      return applyAchievementEventsToStore(
        {
          ...s,
          goals: [...s.goals.map(normalizeGoal), goal],
          diamonds,
          diamondHistory: pushDiamondTx(
            s.diamondHistory,
            makeDiamondTx({
              amount: -ECONOMY.GOAL_COST,
              reason: 'goal_create',
              label: `Новая цель · ${goal.title}`,
              balanceAfter: diamonds,
            }),
          ),
        },
        [
          { type: 'goal_created', payload: { goalId } },
          { type: 'diamonds_spent', payload: { amount: ECONOMY.GOAL_COST } },
        ],
      )
    })
    return { ok: true, goalId }
  }

  /** Синхронизация: каждая заполненная белая ячейка → своя бесплатная привычка */
  const syncMatrixHabits = (
    goalId: string,
    matrix: GoalMatrixData,
    existing: Habit[],
  ): Habit[] => {
    const filled = filledHabitTitles(matrix)
    const matrixHabits = existing.filter(
      (h) => h.matrixGoalId === goalId || (h.fromMatrix && h.goalId === goalId),
    )
    const others = existing.filter(
      (h) => !(h.matrixGoalId === goalId || (h.fromMatrix && h.goalId === goalId)),
    )

    const bySlot = new Map(
      matrixHabits.filter((h) => h.matrixSlot).map((h) => [h.matrixSlot!, h]),
    )
    const legacy = matrixHabits.filter((h) => !h.matrixSlot)
    const usedLegacy = new Set<string>()
    const synced: Habit[] = []
    const base = Date.now()

    filled.forEach((item, i) => {
      let habit = bySlot.get(item.slot)
      if (!habit) {
        const legacyMatch = legacy.find(
          (h) =>
            !usedLegacy.has(h.id) &&
            h.name.trim().toLowerCase() === item.title.toLowerCase(),
        )
        if (legacyMatch) {
          habit = legacyMatch
          usedLegacy.add(legacyMatch.id)
        }
      }
      if (habit) {
        synced.push({
          ...habit,
          name: item.title,
          emoji: habit.emoji || MATRIX_EMOJIS[item.pillarIndex % MATRIX_EMOJIS.length],
          goalId,
          fromMatrix: true,
          matrixGoalId: goalId,
          matrixSlot: item.slot,
        })
        return
      }
      synced.push({
        id: `h-mx-${base}-${item.pillarIndex}-${item.habitIndex}-${i}`,
        name: item.title,
        emoji: MATRIX_EMOJIS[item.pillarIndex % MATRIX_EMOJIS.length],
        completions: {},
        priority: 'important',
        targetDays: 21,
        startDate: todayKey(),
        timesPerWeek: 7,
        createdAt: new Date().toISOString(),
        goalId,
        fromMatrix: true,
        matrixGoalId: goalId,
        matrixSlot: item.slot,
      })
    })

    const activeSlots = new Set(filled.map((f) => f.slot))
    const orphaned = matrixHabits
      .filter((h) => h.matrixSlot && !activeSlots.has(h.matrixSlot) && !synced.some((s) => s.id === h.id))
      .map((h) => ({ ...h, matrixSlot: undefined as string | undefined }))

    const leftoverLegacy = legacy.filter((h) => !usedLegacy.has(h.id))

    return [...others, ...synced, ...orphaned, ...leftoverLegacy]
  }

  const createMatrixGoal = (input: {
    title: string
    note?: string
  }): { ok: boolean; reason?: string; goalId?: string } => {
    if (!input.title.trim()) {
      return { ok: false, reason: 'Укажи название большой цели' }
    }
    if (!canAfford(store.diamonds, ECONOMY.MATRIX_COST)) {
      return {
        ok: false,
        reason: `Нужно ${formatDiamonds(ECONOMY.MATRIX_COST)}. Сейчас ${formatDiamonds(store.diamonds)}.`,
      }
    }
    const goalId = `g-mx-${Date.now()}`
    setStore((s) => {
      if (!canAfford(s.diamonds, ECONOMY.MATRIX_COST)) return s
      const data: GoalMatrixData = {
        core: input.title.trim(),
        pillars: Array.from({ length: 8 }, () => ''),
        habits: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => '')),
      }
      const goal: Goal = {
        id: goalId,
        title: data.core,
        note: input.note?.trim() || 'Карта цели 9×9',
        status: 'active',
        createdAt: new Date().toISOString(),
        measureKind: 'matrix',
        cadence: 'anytime',
        checkIns: [],
        matrix: data,
      }
      const diamonds = s.diamonds - ECONOMY.MATRIX_COST
      return {
        ...s,
        goals: [...s.goals.map(normalizeGoal), goal],
        diamonds,
        diamondHistory: pushDiamondTx(
          s.diamondHistory,
          makeDiamondTx({
            amount: -ECONOMY.MATRIX_COST,
            reason: 'matrix_create',
            label: `Карта цели · ${goal.title}`,
            balanceAfter: diamonds,
          }),
        ),
      }
    })
    return { ok: true, goalId }
  }

  const setMatrixPillar = (goalId: string, pillarIndex: number, title: string) => {
    if (pillarIndex < 0 || pillarIndex > 7) return
    setStore((s) => ({
      ...s,
      goals: s.goals.map(normalizeGoal).map((g) => {
        if (g.id !== goalId || g.measureKind !== 'matrix') return g
        const pillars = Array.from({ length: 8 }, (_, i) => g.matrix?.pillars?.[i] ?? '')
        pillars[pillarIndex] = title.trim()
        return {
          ...g,
          matrix: {
            core: g.matrix?.core ?? g.title,
            pillars,
            habits: Array.from({ length: 8 }, (_, pi) =>
              Array.from({ length: 8 }, (_, hi) => g.matrix?.habits?.[pi]?.[hi] ?? ''),
            ),
          },
        }
      }),
    }))
  }

  const updateGoalMatrix = (goalId: string, matrix: GoalMatrixData) => {
    setStore((s) => {
      const data: GoalMatrixData = {
        core: matrix.core.trim(),
        pillars: Array.from({ length: 8 }, (_, i) => matrix.pillars[i]?.trim() ?? ''),
        habits: Array.from({ length: 8 }, (_, pi) =>
          Array.from({ length: 8 }, (_, hi) => matrix.habits[pi]?.[hi]?.trim() ?? ''),
        ),
      }
      const goals = s.goals.map(normalizeGoal).map((g) =>
        g.id === goalId
          ? {
              ...g,
              title: data.core || g.title,
              measureKind: 'matrix' as const,
              matrix: data,
            }
          : g,
      )
      const habits = syncMatrixHabits(goalId, data, s.habits.map(normalizeHabit))
      return {
        ...s,
        goals,
        habits,
        quests: syncQuests(habits, s.quests),
      }
    })
  }

  const updateGoal = (
    id: string,
    patch: Partial<Pick<Goal, 'title' | 'note' | 'scheduledFor' | 'scheduledTime' | 'measureKind' | 'unit' | 'startValue' | 'targetValue' | 'currentValue' | 'stages' | 'cadence'>>,
  ) => {
    setStore((s) => ({
      ...s,
      goals: s.goals.map(normalizeGoal).map((g) => {
        if (g.id !== id) return g
        return {
          ...g,
          title: patch.title !== undefined ? patch.title.trim() : g.title,
          note:
            patch.note !== undefined
              ? patch.note.trim() || undefined
              : g.note,
          scheduledFor: patch.scheduledFor ?? g.scheduledFor,
          scheduledTime:
            'scheduledTime' in patch ? patch.scheduledTime || undefined : g.scheduledTime,
          measureKind: patch.measureKind ?? g.measureKind,
          unit: patch.unit !== undefined ? patch.unit.trim() || undefined : g.unit,
          startValue: patch.startValue !== undefined ? patch.startValue : g.startValue,
          targetValue: patch.targetValue !== undefined ? patch.targetValue : g.targetValue,
          currentValue: patch.currentValue !== undefined ? patch.currentValue : g.currentValue,
          stages: patch.stages !== undefined ? patch.stages : g.stages,
          cadence: patch.cadence ?? g.cadence,
        }
      }),
    }))
  }

  const rescheduleGoal = (goalId: string, scheduledFor: string) => {
    if (!scheduledFor) return
    updateGoal(goalId, { scheduledFor })
  }

  const reschedulePlannerTask = (taskId: string, scheduledFor: string) => {
    if (!scheduledFor) return
    setStore((s) => {
      const tasks = (s.plannerTasks ?? []).map(normalizePlannerTask)
      const taskIndex = tasks.findIndex((task) => task.id === taskId)
      if (taskIndex < 0) return s
      const task = tasks[taskIndex]
      tasks[taskIndex] = { ...task, scheduledFor }
      const habits = s.habits.map(normalizeHabit).map((habit) =>
        habit.id === task.habitId ? { ...habit, startDate: scheduledFor } : habit,
      )
      return applyAchievementEventsToStore(
        {
          ...s,
          habits,
          quests: syncQuests(habits, s.quests),
          plannerTasks: tasks,
        },
        [{ type: 'task_rescheduled', payload: { taskId } }],
      )
    })
  }

  const rescheduleHabit = (habitId: string, startDate: string) => {
    if (!startDate) return
    setStore((s) => {
      const habits = s.habits.map(normalizeHabit)
      const habitIndex = habits.findIndex((habit) => habit.id === habitId)
      if (habitIndex < 0) return s
      const habit = habits[habitIndex]
      habits[habitIndex] = { ...habit, startDate }
      const plannerTasks = (s.plannerTasks ?? []).map(normalizePlannerTask).map((task) =>
        task.habitId === habitId || task.id === habit.plannerTaskId ? { ...task, scheduledFor: startDate } : task,
      )
      return {
        ...s,
        habits,
        quests: syncQuests(habits, s.quests),
        plannerTasks,
      }
    })
  }

  /** Чек-ин по числовой цели */
  const logGoalValue = (goalId: string, value: number, note?: string) => {
    setStore((s) => ({
      ...s,
      goals: s.goals.map(normalizeGoal).map((g) => {
        if (g.id !== goalId || g.measureKind !== 'number') return g
        const checkIn = makeCheckIn({ value, note: note?.trim() || undefined })
        const progress = goalResultProgress({
          ...g,
          currentValue: value,
        })
        return {
          ...g,
          currentValue: value,
          lastCheckInAt: checkIn.at,
          checkIns: [...(g.checkIns ?? []), checkIn].slice(-50),
          status: progress === 100 ? 'done' : g.status,
        }
      }),
    }))
  }

  /** Отметить этап выполненным */
  const completeGoalStage = (goalId: string, stageId: string, note?: string) => {
    setStore((s) => {
      let completedGoal = false
      const goals = s.goals.map(normalizeGoal).map((g) => {
        if (g.id !== goalId || g.measureKind !== 'stages') return g
        const stages = (g.stages ?? []).map((st) =>
          st.id === stageId ? { ...st, done: true } : st,
        )
        const checkIn = makeCheckIn({
          stageId,
          note: note?.trim() || undefined,
        })
        const progress = goalResultProgress({ ...g, stages })
        const status = progress === 100 ? 'done' : g.status
        if (status === 'done' && g.status !== 'done') completedGoal = true
        return {
          ...g,
          stages,
          lastCheckInAt: checkIn.at,
          checkIns: [...(g.checkIns ?? []), checkIn].slice(-50),
          status,
        }
      })
      const events: AchievementEvent[] = [
        { type: 'goal_stage_completed', payload: { goalId, stageId } },
      ]
      if (completedGoal) {
        const g = s.goals.map(normalizeGoal).find((x) => x.id === goalId)
        const ageDays = g
          ? Math.floor(
              (Date.now() - new Date(g.createdAt).getTime()) / 86_400_000,
            )
          : 0
        events.push({
          type: 'goal_completed',
          payload: { goalId, ageDays, sameDay: ageDays === 0 },
        })
      }
      return applyAchievementEventsToStore({ ...s, goals }, events)
    })
  }

  const toggleGoalStage = (goalId: string, stageId: string) => {
    setStore((s) => ({
      ...s,
      goals: s.goals.map(normalizeGoal).map((g) => {
        if (g.id !== goalId || g.measureKind !== 'stages') return g
        const stages = (g.stages ?? []).map((st) =>
          st.id === stageId ? { ...st, done: !st.done } : st,
        )
        const checkIn = makeCheckIn({ stageId })
        const progress = goalResultProgress({ ...g, stages })
        return {
          ...g,
          stages,
          lastCheckInAt: checkIn.at,
          checkIns: [...(g.checkIns ?? []), checkIn].slice(-50),
          status: progress === 100 && g.status === 'active' ? 'done' : g.status,
        }
      }),
    }))
  }

  const setGoalStatus = (id: string, status: GoalStatus) => {
    setStore((s) => {
      const prev = s.goals.map(normalizeGoal).find((g) => g.id === id)
      const goals = s.goals.map(normalizeGoal).map((g) =>
        g.id === id ? { ...g, status } : g,
      )
      const events: AchievementEvent[] = []
      if (status === 'done' && prev?.status !== 'done') {
        const ageDays = prev
          ? Math.floor(
              (Date.now() - new Date(prev.createdAt).getTime()) / 86_400_000,
            )
          : 0
        events.push({
          type: 'goal_completed',
          payload: { goalId: id, ageDays, sameDay: ageDays === 0 },
        })
      }
      if (status !== prev?.status) {
        events.push({ type: 'goal_updated', payload: { goalId: id } })
      }
      return applyAchievementEventsToStore({ ...s, goals }, events)
    })
  }

  const deleteGoal = (id: string) => {
    if (id === LIFE_GOALS_MAP_ID || parseLifeMapGoalArea(id)) return
    setStore((s) => {
      const goal = s.goals.map(normalizeGoal).find((g) => g.id === id)
      if (goal?.fromLifeMap) return s
      const prevHabits = s.habits.map(normalizeHabit)
      const removedIds = new Set(
        prevHabits
          .filter((h) => h.goalId === id || h.matrixGoalId === id)
          .map((h) => h.id),
      )
      const habits = prevHabits.filter((h) => !removedIds.has(h.id))
      const contracts = (s.contracts ?? []).map(normalizeContract).map((c) =>
        removedIds.has(c.habitId) && c.status === 'active'
          ? { ...c, status: 'abandoned' as const, completedAt: todayKey() }
          : c,
      )
      return applyAchievementEventsToStore(
        {
          ...s,
          goals: s.goals.map(normalizeGoal).filter((g) => g.id !== id),
          habits,
          contracts,
          quests: syncQuests(habits, s.quests),
          streak: globalStreak(habits),
        },
        [{ type: 'goal_deleted', payload: { goalId: id } }],
      )
    })
  }

  const toggleHideLifeArea = (areaId: LifeAreaId) => {
    setStore((s) => {
      const hidden = s.hiddenLifeAreas ?? []
      const next = hidden.includes(areaId)
        ? hidden.filter((id) => id !== areaId)
        : [...hidden, areaId]
      return { ...s, hiddenLifeAreas: next }
    })
  }

  const linkHabitToGoal = (habitId: string, goalId: string | null) => {
    setStore((s) => {
      const areaFromGoal = goalId ? parseLifeMapGoalArea(goalId) : undefined
      const habits = s.habits.map(normalizeHabit).map((h) => {
        if (h.id !== habitId) return h
        if (!goalId) {
          return { ...h, goalId: undefined }
        }
        if (areaFromGoal) {
          return { ...h, goalId, lifeArea: areaFromGoal }
        }
        return { ...h, goalId }
      })
      const base = {
        ...s,
        goals: syncLifeMapGoalsIfPresent(s.goals.map(normalizeGoal)),
        habits,
      }
      return goalId
        ? applyAchievementEventsToStore(base, [
            { type: 'habit_created', payload: { habitId, goalId } },
          ])
        : base
    })
  }

  const createLifeMap = (): { ok: boolean } => {
    setStore((s) => {
      if (hasLifeMapGoals(s.goals)) return s
      const habits = syncLifeMapHabitLinks(s.habits.map(normalizeHabit))
      const goals = syncLifeGoalsMapHabits(
        ensureLifeMapGoals(s.goals.map(normalizeGoal)),
        habits,
      )
      return applyAchievementEventsToStore(
        { ...s, goals, habits },
        [{ type: 'life_map_created' }],
      )
    })
    return { ok: true }
  }

  const todayIndex = useMemo(() => {
    const today = new Date()
    if (today.getFullYear() === store.year && today.getMonth() === store.month) {
      return Math.min(today.getDate() - 1, dayCount - 1)
    }
    return -1
  }, [store.year, store.month, dayCount])

  const isCurrentMonth = todayIndex >= 0

  const habitStats = habits.map((h) => {
    const days = monthDaysArray(h, store.year, store.month)
    const done = completedCount(h)
    const formed = done
    const formPct = Math.min(100, Math.round((done / h.targetDays) * 100))
    const streak = currentStreak(h)
    const endDate = effectiveEndDate(h)
    const monthDone = days.filter(Boolean).length
    const pct = dayCount ? Math.round((monthDone / dayCount) * 100) : 0
    const elapsed = elapsedStats(h)
    const pending = !isFormed(h) && isActiveToday(h)
    const planned = compareKeysSafe(h.startDate, todayKey()) > 0
    const goal = h.goalId ? goals.find((g) => g.id === h.goalId) : undefined
    const questContract = h.questContractId
      ? (store.contracts ?? []).find((c) => c.id === h.questContractId)
      : undefined
    return {
      ...h,
      days,
      done: monthDone,
      pct,
      streak,
      formed,
      formPct,
      endDate,
      pending,
      planned,
      totalDone: done,
      /** Надёжность только по сегодня + прошедшим дням */
      attentionPct: elapsed.pct,
      attentionMisses: elapsed.misses,
      attentionExpected: elapsed.expected,
      goalTitle: goal?.title,
      questTitle: questContract?.title,
      questTagline: questContract?.habitTagline,
      questStatus: questContract?.status,
      reminderTime: h.reminderTime ?? questContract?.reminderTime,
      lifeAreaLabel: findLifeArea(h.lifeArea)?.short,
      lifeAreaColor: findLifeArea(h.lifeArea)?.color,
    }
  })

  const goalStats = useMemo(
    () => buildGoalStats(goals, habitsAll),
    [goals, habitsAll],
  )

  const lifeMapGoalStats = useMemo(
    () =>
      LIFE_AREAS.map((area) => {
        const id = lifeMapGoalId(area.id)
        return (
          goalStats.find((g) => g.id === id) ??
          goalStats.find((g) => g.lifeArea === area.id && g.fromLifeMap)
        )
      }).filter((g): g is GoalStat => !!g),
    [goalStats],
  )

  const customGoalStats = useMemo(
    () =>
      goalStats.filter(
        (g) => !g.fromLifeMap && !g.lifeArea && g.id !== LIFE_GOALS_MAP_ID,
      ),
    [goalStats],
  )

  const lifeGoalsMapGoal = useMemo(
    () => goals.find((g) => g.id === LIFE_GOALS_MAP_ID) ?? null,
    [goals],
  )

  const hasLifeMap = Boolean(lifeGoalsMapGoal)

  const lifeGoalsMapStat = useMemo(
    () => goalStats.find((g) => g.id === LIFE_GOALS_MAP_ID) ?? null,
    [goalStats],
  )

  const hiddenLifeAreas = useMemo(
    () => (store.hiddenLifeAreas ?? []).filter(isLifeAreaId),
    [store.hiddenLifeAreas],
  )

  const visibleLifeAreas = useMemo(
    () => LIFE_AREAS.filter((a) => !hiddenLifeAreas.includes(a.id)),
    [hiddenLifeAreas],
  )

  const todayActive = habitsAll.filter((h) => isActiveToday(h))
  const todayDue = todayActive.filter((h) => isDueToday(h) || h.completions[todayKey()])
  const todayDone = todayDue.filter((h) => h.completions[todayKey()]).length
  const todayTotal = todayDue.length
  const todayPct = todayTotal ? Math.round((todayDone / todayTotal) * 100) : 0

  const monthDone = habitStats.reduce((a, h) => a + h.done, 0)
  const monthTotal = Math.max(habitStats.length * dayCount, 1)
  const monthPct = habitStats.length
    ? Math.round((monthDone / monthTotal) * 1000) / 10
    : 0

  // Больше всего пропусков среди уже наступивших дней (без будущего)
  const weakHabits = habitsAll
    .map((h) => {
      const elapsed = elapsedStats(h)
      return {
        ...h,
        attentionPct: elapsed.pct,
        attentionMisses: elapsed.misses,
        attentionExpected: elapsed.expected,
      }
    })
    .filter((h) => compareKeysSafe(h.startDate, todayKey()) <= 0 && h.attentionExpected > 0)
    .sort((a, b) => b.attentionMisses - a.attentionMisses || a.attentionPct - b.attentionPct)
    .filter((h) => h.attentionMisses > 0 || (isDueToday(h) && !h.completions[todayKey()]))
    .slice(0, 3)

  const dailyProgress = Array.from({ length: dayCount }, (_, i) => {
    const done = habitStats.filter((h) => h.days[i]).length
    return {
      day: i + 1,
      done,
      pct: Math.round((done / Math.max(habitStats.length, 1)) * 100),
    }
  })

  const quests = useMemo(
    () => syncQuests(habitsAll, store.quests),
    [habitsAll, store.quests],
  )

  const nextQuest = quests.find((q) => !q.done) ?? quests[0]
  const warnings = buildWarnings(habitsAll)
  const contracts = useMemo(
    () => (store.contracts ?? []).map(normalizeContract),
    [store.contracts],
  )
  const userListings = useMemo(
    () => (store.userListings ?? []).map(normalizeUserListing),
    [store.userListings],
  )
  const activeContracts = useMemo(
    () => contracts.filter((c) => c.status === 'active'),
    [contracts],
  )

  const retrofillStatus = useMemo(
    () => retrofillInfo(store.retroMarks, todayKey()),
    [store.retroMarks],
  )

  const yesterdayMissed = useMemo(() => {
    const yesterday = addDays(todayKey(), -1)
    return habitsAll.filter((h) => isDueOnDate(h, yesterday))
  }, [habitsAll])

  const habitReminders = useMemo(() => {
    const today = todayKey()
    return habitsAll
      .filter(
        (h) =>
          h.reminderTime &&
          isActiveToday(h, today) &&
          !h.completions[today] &&
          isReminderDue(h.reminderTime),
      )
      .map((h) => {
        const c = contracts.find((x) => x.id === h.questContractId)
        return {
          habitId: h.id,
          emoji: h.emoji,
          name: h.name,
          tagline: c?.habitTagline,
          reminderTime: h.reminderTime!,
        }
      })
  }, [habitsAll, contracts])

  const plannerSections = useMemo(
    () => {
      const rawSections = store.plannerSections ?? []
      return (rawSections.length > 0 ? rawSections : defaultPlannerSections()).map(
        normalizePlannerSection,
      )
    },
    [store.plannerSections],
  )

  const focusSettings = useMemo(
    () => normalizeFocusSettings(store.focusSettings),
    [store.focusSettings],
  )

  const plannerTasks = useMemo(
    () =>
      (store.plannerTasks ?? [])
        .map(normalizePlannerTask)
        .filter((task) => plannerSections.some((section) => section.id === task.sectionId)),
    [store.plannerTasks, plannerSections],
  )

  const plannerTasksDetailed = useMemo(
    () =>
      plannerTasks.map((task) => {
        const habit = habitsAll.find((item) => item.id === task.habitId)
        const section = plannerSections.find((item) => item.id === task.sectionId)
        const doneOnScheduledDay = habit?.completions[task.scheduledFor] ?? false
        const recommendedFocusMinutes =
          task.energy === 'deep'
            ? focusSettings.focusMinutes
            : task.energy === 'light'
              ? Math.max(10, focusSettings.focusMinutes - 5)
              : focusSettings.focusMinutes
        return {
          ...task,
          habit,
          sectionTitle: section?.title ?? 'Раздел',
          sectionColor: section?.color ?? '#7c3aed',
          doneOnScheduledDay,
          recommendedFocusMinutes,
        }
      }),
    [plannerTasks, habitsAll, plannerSections, focusSettings],
  )

  const todayPlannerTasks = useMemo(
    () =>
      plannerTasksDetailed
        .filter((task) => task.scheduledFor === todayKey())
        .sort((a, b) => Number(!!a.completedAt) - Number(!!b.completedAt)),
    [plannerTasksDetailed],
  )

  const todayFocusBlocks = useMemo(
    () =>
      todayPlannerTasks
        .filter((task) => !task.completedAt)
        .reduce((sum, task) => sum + task.focusBlocks, 0),
    [todayPlannerTasks],
  )

  const focusLoadPct = Math.min(
    100,
    Math.round((todayFocusBlocks / Math.max(1, focusSettings.dailyFocusCap)) * 100),
  )

  const setFocusProfile = (profile: FocusProfileId) => {
    setStore((s) => ({ ...s, focusSettings: defaultFocusSettings(profile) }))
  }

  const addPlannerSection = (title: string): { ok: boolean; reason?: string } => {
    const normalized = title.trim()
    if (!normalized) return { ok: false, reason: 'Укажи название раздела' }
    setStore((s) => ({
      ...s,
      plannerSections: [
        ...((s.plannerSections ?? []).map(normalizePlannerSection)),
        {
          id: `planner-section-${Date.now().toString(36)}`,
          title: normalized,
          color: '#7c3aed',
          createdAt: new Date().toISOString(),
        },
      ],
    }))
    return { ok: true }
  }

  const movePlannerSection = (sectionId: string, targetSectionId: string) => {
    if (!sectionId || !targetSectionId || sectionId === targetSectionId) return
    setStore((s) => {
      const sections = (s.plannerSections ?? []).map(normalizePlannerSection)
      const fromIndex = sections.findIndex((section) => section.id === sectionId)
      const toIndex = sections.findIndex((section) => section.id === targetSectionId)
      if (fromIndex < 0 || toIndex < 0) return s
      const next = [...sections]
      const [moved] = next.splice(fromIndex, 1)
      if (!moved) return s
      next.splice(toIndex, 0, moved)
      return { ...s, plannerSections: next }
    })
  }

  const addPlannerTask = (input: NewPlannerTaskInput): { ok: boolean; reason?: string } => {
    const title = input.title.trim()
    if (!title) return { ok: false, reason: 'Укажи название задачи' }
    if (!(store.plannerSections ?? []).some((section) => section.id === input.sectionId)) {
      return { ok: false, reason: 'Раздел планировщика не найден' }
    }
    setStore((s) => {
      const taskId = `planner-task-${Date.now().toString(36)}`
      const habitId = `planner-habit-${Date.now().toString(36)}`
      const habit: Habit = {
        id: habitId,
        name: title,
        emoji: input.emoji || '🗂️',
        completions: {},
        priority: input.priority,
        targetDays: input.targetDays,
        startDate: input.scheduledFor,
        timesPerWeek: input.timesPerWeek,
        createdAt: new Date().toISOString(),
        plannerTaskId: taskId,
        fromPlanner: true,
      }
      const task: PlannerTask = {
        id: taskId,
        title,
        note: input.note?.trim() || undefined,
        sectionId: input.sectionId,
        scheduledFor: input.scheduledFor,
        scheduledTime: input.scheduledTime || undefined,
        priority: input.priority,
        energy: input.energy,
        focusBlocks: Math.min(8, Math.max(1, Math.round(input.focusBlocks))),
        timesPerWeek: Math.min(7, Math.max(1, Math.round(input.timesPerWeek))),
        targetDays: input.targetDays,
        habitId,
        createdAt: new Date().toISOString(),
      }
      const habits = [...s.habits.map(normalizeHabit), habit]
      return applyAchievementEventsToStore(
        {
          ...s,
          habits,
          quests: syncQuests(habits, s.quests),
          plannerTasks: [...((s.plannerTasks ?? []).map(normalizePlannerTask)), task],
        },
        [{ type: 'task_created', payload: { taskId } }],
      )
    })
    return { ok: true }
  }

  const movePlannerTask = (taskId: string, direction: -1 | 1) => {
    setStore((s) => {
      const rawSections = s.plannerSections ?? []
      const sections = (rawSections.length > 0
        ? rawSections
        : defaultPlannerSections()
      ).map(normalizePlannerSection)
      const tasks = (s.plannerTasks ?? []).map(normalizePlannerTask)
      const index = tasks.findIndex((task) => task.id === taskId)
      if (index < 0) return s
      const current = tasks[index]
      if (!current) return s
      const sectionIndex = sections.findIndex((section) => section.id === current.sectionId)
      const nextSection = sections[sectionIndex + direction]
      if (!nextSection) return s
      tasks[index] = { ...current, sectionId: nextSection.id }
      return { ...s, plannerTasks: tasks }
    })
  }

  const togglePlannerTaskDone = (taskId: string) => {
    const today = todayKey()
    setStore((s) => {
      const tasks = (s.plannerTasks ?? []).map(normalizePlannerTask)
      const index = tasks.findIndex((task) => task.id === taskId)
      if (index < 0) return s
      const task = tasks[index]
      const complete = !task.completedAt
      tasks[index] = {
        ...task,
        completedAt: complete ? new Date().toISOString() : undefined,
      }
      let habits = s.habits.map(normalizeHabit)
      if (task.scheduledFor === today) {
        habits = habits.map((habit) => {
          if (habit.id !== task.habitId) return habit
          const completions = { ...habit.completions }
          if (complete) completions[today] = true
          else delete completions[today]
          return { ...habit, completions }
        })
      }
      const quests = syncQuests(habits, s.quests)
      const events: AchievementEvent[] = complete
        ? [{ type: 'task_completed', payload: { taskId } }]
        : []
      return applyAchievementEventsToStore(
        {
          ...s,
          habits,
          quests,
          plannerTasks: tasks,
          streak: globalStreak(habits),
        },
        events,
      )
    })
  }

  const deletePlannerTask = (taskId: string) => {
    setStore((s) => {
      const tasks = (s.plannerTasks ?? []).map(normalizePlannerTask)
      const target = tasks.find((task) => task.id === taskId)
      if (!target) return s
      const habits = s.habits
        .map(normalizeHabit)
        .filter((habit) => habit.id !== target.habitId && habit.plannerTaskId !== taskId)
      return applyAchievementEventsToStore(
        {
          ...s,
          habits,
          plannerTasks: tasks.filter((task) => task.id !== taskId),
          quests: syncQuests(habits, s.quests),
          streak: globalStreak(habits),
        },
        [{ type: 'task_deleted', payload: { taskId } }],
      )
    })
  }

  const addDesktopWidget = (
    type: DesktopWidgetType,
    size: DesktopWidgetSize = 'medium',
  ): { ok: boolean; widgetId?: string } => {
    setStore((s) => {
      const d = normalizeDesktopState(s.desktop)
      if (d.layout.widgets.length >= 12) return s

      const next: DesktopWidgetInstance = {
        id: desktopId('w'),
        type,
        size,
      }

      return applyAchievementEventsToStore(
        {
          ...s,
          desktop: {
            ...d,
            layout: {
              widgets: [...d.layout.widgets, next],
            },
          },
        },
        [{ type: 'desktop_widget_added', payload: { type } }],
      )
    })
    return { ok: true }
  }

  const removeDesktopWidget = (widgetId: string) => {
    setStore((s) => {
      const d = normalizeDesktopState(s.desktop)
      const widgets = d.layout.widgets.filter((w) => w.id !== widgetId)
      return {
        ...s,
        desktop: {
          ...d,
          layout: { widgets: widgets.length ? widgets : d.layout.widgets },
        },
      }
    })
  }

  const moveDesktopWidget = (widgetId: string, targetWidgetId: string) => {
    setStore((s) => {
      const d = normalizeDesktopState(s.desktop)
      const widgets = [...d.layout.widgets]
      const fromIndex = widgets.findIndex((w) => w.id === widgetId)
      const toIndex = widgets.findIndex((w) => w.id === targetWidgetId)
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return s

      const [moved] = widgets.splice(fromIndex, 1)
      const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex
      widgets.splice(insertIndex, 0, moved)

      return {
        ...s,
        desktop: {
          ...d,
          layout: { widgets },
        },
      }
    })
  }

  const setDesktopWidgetSize = (widgetId: string, size: DesktopWidgetSize) => {
    setStore((s) => {
      const d = normalizeDesktopState(s.desktop)
      const widgets = d.layout.widgets.map((w) =>
        w.id === widgetId ? { ...w, size } : w,
      )
      return {
        ...s,
        desktop: {
          ...d,
          layout: { widgets },
        },
      }
    })
  }

  const addDesktopSticker = (input?: {
    x?: number
    y?: number
    text?: string
    color?: string
    textColor?: string
    width?: number
    height?: number
    rotation?: number
    kind?: DesktopMoodboardStickerKind
    /** Привязать к уже созданной цели (без повторного списания) */
    goalId?: string
    /** Привязать к уже созданной привычке (без повторного списания) */
    habitId?: string
    emoji?: string
  }): { ok: boolean; stickerId?: string; reason?: string } => {
    const linkedGoalId = input?.goalId
    const linkedHabitId = input?.habitId
    const kind: DesktopMoodboardStickerKind =
      input?.kind ??
      (linkedGoalId ? 'goal' : linkedHabitId ? 'habit' : 'note')

    const createNewGoal = kind === 'goal' && !linkedGoalId
    const createNewHabit = kind === 'habit' && !linkedHabitId

    if (createNewGoal && !canAfford(store.diamonds, ECONOMY.GOAL_COST)) {
      return {
        ok: false,
        reason: `Нужно ${formatDiamonds(ECONOMY.GOAL_COST)}. Сейчас ${formatDiamonds(store.diamonds)}.`,
      }
    }
    if (createNewHabit && !canAfford(store.diamonds, ECONOMY.HABIT_COST)) {
      return {
        ok: false,
        reason: `Нужно ${formatDiamonds(ECONOMY.HABIT_COST)}. Сейчас ${formatDiamonds(store.diamonds)}.`,
      }
    }

    const stickerId = desktopId('st')
    const goalId = linkedGoalId ?? (createNewGoal ? `g-${Date.now()}` : undefined)
    const habitId = linkedHabitId ?? (createNewHabit ? `h-${Date.now()}` : undefined)
    const title =
      input?.text?.trim() ||
      (kind === 'goal' ? 'Новая цель' : kind === 'habit' ? 'Новая привычка' : '')

    setStore((s) => {
      if (createNewGoal && !canAfford(s.diamonds, ECONOMY.GOAL_COST)) return s
      if (createNewHabit && !canAfford(s.diamonds, ECONOMY.HABIT_COST)) return s

      const d = normalizeDesktopState(s.desktop)
      const color =
        input?.color ??
        (kind === 'goal' ? '#c7d2fe' : kind === 'habit' ? '#bbf7d0' : '#fde68a')

      const nextSticker = normalizeDesktopSticker({
        id: stickerId,
        x: input?.x ?? 400 + Math.random() * 200,
        y: input?.y ?? 400 + Math.random() * 200,
        width: input?.width,
        height: input?.height,
        text: title,
        color,
        textColor: input?.textColor,
        rotation: input?.rotation,
        kind,
        goalId,
        habitId,
        emoji: kind === 'habit' ? input?.emoji || '⭐' : input?.emoji,
      })

      let goals = s.goals.map(normalizeGoal)
      let habits = s.habits.map(normalizeHabit)
      let diamonds = s.diamonds
      let diamondHistory = s.diamondHistory

      if (createNewGoal && goalId) {
        const goal: Goal = {
          id: goalId,
          title,
          status: 'active',
          createdAt: new Date().toISOString(),
          scheduledFor: todayKey(),
          measureKind: 'none',
          stages: [],
          cadence: 'anytime',
          checkIns: [],
        }
        goals = [...goals, goal]
        diamonds -= ECONOMY.GOAL_COST
        diamondHistory = pushDiamondTx(
          diamondHistory,
          makeDiamondTx({
            amount: -ECONOMY.GOAL_COST,
            reason: 'goal_create',
            label: `Новая цель · ${title}`,
            balanceAfter: diamonds,
          }),
        )
      }

      if (createNewHabit && habitId) {
        const resolvedGoalId = resolveGoalIdForHabitSticker(
          stickerId,
          [...d.moodboard.stickers, nextSticker],
          d.moodboard.arrows,
          habits,
        )
        const habit: Habit = {
          id: habitId,
          name: title,
          emoji: input?.emoji || '⭐',
          completions: {},
          priority: 'important',
          targetDays: 21,
          startDate: todayKey(),
          timesPerWeek: 7,
          createdAt: new Date().toISOString(),
          goalId: resolvedGoalId,
        }
        habits = syncLifeMapHabitLinks([...habits, habit])
        habits = syncHabitLinkFromGoalArrow(
          d.moodboard.arrows,
          [...d.moodboard.stickers, nextSticker],
          habits,
        )
        diamonds -= ECONOMY.HABIT_COST
        diamondHistory = pushDiamondTx(
          diamondHistory,
          makeDiamondTx({
            amount: -ECONOMY.HABIT_COST,
            reason: 'habit_create',
            label: `Новая привычка · ${title}`,
            balanceAfter: diamonds,
          }),
        )
      }

      const events: AchievementEvent[] = [
        { type: 'moodboard_sticker_added' },
      ]
      if (createNewGoal) {
        events.push({ type: 'goal_created' })
        events.push({
          type: 'diamonds_spent',
          payload: { amount: ECONOMY.GOAL_COST },
        })
      }
      if (createNewHabit) {
        events.push({ type: 'habit_created' })
        events.push({
          type: 'diamonds_spent',
          payload: { amount: ECONOMY.HABIT_COST },
        })
      }

      return applyAchievementEventsToStore(
        {
          ...s,
          goals,
          habits,
          quests: createNewHabit ? syncQuests(habits, s.quests) : s.quests,
          streak: createNewHabit ? globalStreak(habits) : s.streak,
          diamonds,
          diamondHistory,
          desktop: {
            ...d,
            moodboard: {
              ...d.moodboard,
              stickers:
                d.moodboard.stickers.length > 200
                  ? d.moodboard.stickers
                  : [...d.moodboard.stickers, nextSticker],
            },
          },
        },
        events,
      )
    })
    return { ok: true, stickerId }
  }

  const updateDesktopSticker = (
    stickerId: string,
    patch: Partial<DesktopMoodboardSticker>,
  ) => {
    setStore((s) => {
      const d = normalizeDesktopState(s.desktop)
      const stickers = d.moodboard.stickers.map((st) =>
        st.id !== stickerId
          ? st
          : normalizeDesktopSticker({
              ...st,
              ...patch,
              x: patch.x != null ? patch.x : st.x,
              y: patch.y != null ? patch.y : st.y,
            }),
      )
      return {
        ...s,
        desktop: {
          ...d,
          moodboard: { ...d.moodboard, stickers },
        },
      }
    })
  }

  const convertDesktopStickerToGoal = (stickerId: string): { ok: boolean; reason?: string; goalId?: string } => {
    const d = normalizeDesktopState(store.desktop)
    const sticker = d.moodboard.stickers.find((st) => st.id === stickerId)
    if (!sticker) return { ok: false, reason: 'Стикер не найден' }
    if (sticker.goalId) return { ok: true, goalId: sticker.goalId }

    if (!canAfford(store.diamonds, ECONOMY.GOAL_COST)) {
      return {
        ok: false,
        reason: `Нужно ${formatDiamonds(ECONOMY.GOAL_COST)}. Сейчас ${formatDiamonds(store.diamonds)}.`,
      }
    }

    const title = sticker.text?.trim() || 'Новая цель'
    const goalId = `g-${Date.now()}`

    setStore((s) => {
      if (!canAfford(s.diamonds, ECONOMY.GOAL_COST)) return s
      const desk = normalizeDesktopState(s.desktop)
      const st = desk.moodboard.stickers.find((x) => x.id === stickerId)
      if (!st || st.goalId) return s

      const goal: Goal = {
        id: goalId,
        title,
        status: 'active',
        createdAt: new Date().toISOString(),
        scheduledFor: todayKey(),
        measureKind: 'none',
        stages: [],
        cadence: 'anytime',
        checkIns: [],
      }
      const diamonds = s.diamonds - ECONOMY.GOAL_COST
      const stickers = desk.moodboard.stickers.map((x) =>
        x.id === stickerId
          ? normalizeDesktopSticker({ ...x, kind: 'goal', goalId, text: title })
          : x,
      )
      return {
        ...s,
        goals: [...s.goals.map(normalizeGoal), goal],
        diamonds,
        diamondHistory: pushDiamondTx(
          s.diamondHistory,
          makeDiamondTx({
            amount: -ECONOMY.GOAL_COST,
            reason: 'goal_create',
            label: `Новая цель · ${goal.title}`,
            balanceAfter: diamonds,
          }),
        ),
        desktop: {
          ...desk,
          moodboard: { ...desk.moodboard, stickers },
        },
      }
    })
    return { ok: true, goalId }
  }

  const convertDesktopStickerToHabit = (
    stickerId: string,
    opts?: { parentStickerId?: string; emoji?: string },
  ): { ok: boolean; reason?: string; habitId?: string } => {
    const d = normalizeDesktopState(store.desktop)
    const sticker = d.moodboard.stickers.find((st) => st.id === stickerId)
    if (!sticker) return { ok: false, reason: 'Стикер не найден' }
    if (sticker.habitId) return { ok: true, habitId: sticker.habitId }

    if (!canAfford(store.diamonds, ECONOMY.HABIT_COST)) {
      return {
        ok: false,
        reason: `Нужно ${formatDiamonds(ECONOMY.HABIT_COST)}. Сейчас ${formatDiamonds(store.diamonds)}.`,
      }
    }

    const name = sticker.text?.trim() || 'Новая привычка'
    const habitId = `h-${Date.now()}`
    const emoji = opts?.emoji || sticker.emoji || '⭐'

    setStore((s) => {
      if (!canAfford(s.diamonds, ECONOMY.HABIT_COST)) return s
      const desk = normalizeDesktopState(s.desktop)
      const st = desk.moodboard.stickers.find((x) => x.id === stickerId)
      if (!st || st.habitId) return s

      const goalId = resolveGoalIdForHabitSticker(
        stickerId,
        desk.moodboard.stickers,
        desk.moodboard.arrows,
        s.habits.map(normalizeHabit),
        opts?.parentStickerId,
      )

      const habit: Habit = {
        id: habitId,
        name,
        emoji,
        completions: {},
        priority: 'important',
        targetDays: 21,
        startDate: todayKey(),
        timesPerWeek: 7,
        createdAt: new Date().toISOString(),
        goalId: goalId || undefined,
      }

      let habits = syncLifeMapHabitLinks([...s.habits.map(normalizeHabit), habit])
      habits = syncHabitLinkFromGoalArrow(desk.moodboard.arrows, desk.moodboard.stickers, habits)

      const diamonds = s.diamonds - ECONOMY.HABIT_COST
      const stickers = desk.moodboard.stickers.map((x) =>
        x.id === stickerId
          ? normalizeDesktopSticker({
              ...x,
              kind: 'habit',
              habitId,
              emoji,
              text: name,
            })
          : x,
      )

      return {
        ...s,
        habits,
        quests: syncQuests(habits, s.quests),
        streak: globalStreak(habits),
        diamonds,
        diamondHistory: pushDiamondTx(
          s.diamondHistory,
          makeDiamondTx({
            amount: -ECONOMY.HABIT_COST,
            reason: 'habit_create',
            label: `Новая привычка · ${name}`,
            balanceAfter: diamonds,
          }),
        ),
        desktop: {
          ...desk,
          moodboard: { ...desk.moodboard, stickers },
        },
      }
    })
    return { ok: true, habitId }
  }

  const convertMoodboardGoalChildrenToHabits = (
    goalStickerId: string,
  ): { ok: boolean; created: number; reason?: string } => {
    const d = normalizeDesktopState(store.desktop)
    const goalSticker = d.moodboard.stickers.find((st) => st.id === goalStickerId)
    if (!goalSticker?.goalId) {
      return { ok: false, created: 0, reason: 'Сначала сделай этот стикер целью' }
    }

    const childIds = d.moodboard.arrows
      .filter((ar) => ar.fromStickerId === goalStickerId)
      .map((ar) => ar.toStickerId)

    const toCreate = childIds.filter((id) => {
      const st = d.moodboard.stickers.find((s) => s.id === id)
      return st && !st.habitId
    })

    if (toCreate.length === 0) {
      return { ok: true, created: 0, reason: 'Нет связанных стикеров без привычки' }
    }

    const totalCost = toCreate.length * ECONOMY.HABIT_COST
    if (!canAfford(store.diamonds, totalCost)) {
      return {
        ok: false,
        created: 0,
        reason: `Нужно ${formatDiamonds(totalCost)} для ${toCreate.length} привычек. Сейчас ${formatDiamonds(store.diamonds)}.`,
      }
    }

    let created = 0
    setStore((s) => {
      if (!canAfford(s.diamonds, totalCost)) return s
      const desk = normalizeDesktopState(s.desktop)
      const goalSt = desk.moodboard.stickers.find((x) => x.id === goalStickerId)
      if (!goalSt?.goalId) return s

      let habits = s.habits.map(normalizeHabit)
      let diamonds = s.diamonds
      let diamondHistory = s.diamondHistory
      const stickerMap = new Map(desk.moodboard.stickers.map((st) => [st.id, st]))
      const stickers = [...desk.moodboard.stickers]

      for (const childId of toCreate) {
        const st = stickerMap.get(childId)
        if (!st || st.habitId) continue

        const name = st.text?.trim() || 'Новая привычка'
        const habitId = `h-${Date.now()}-${created}`
        const emoji = st.emoji || '⭐'

        const habit: Habit = {
          id: habitId,
          name,
          emoji,
          completions: {},
          priority: 'important',
          targetDays: 21,
          startDate: todayKey(),
          timesPerWeek: 7,
          createdAt: new Date().toISOString(),
          goalId: goalSt.goalId,
        }
        habits = [...habits, habit]
        diamonds -= ECONOMY.HABIT_COST
        diamondHistory = pushDiamondTx(
          diamondHistory,
          makeDiamondTx({
            amount: -ECONOMY.HABIT_COST,
            reason: 'habit_create',
            label: `Новая привычка · ${name}`,
            balanceAfter: diamonds,
          }),
        )

        const idx = stickers.findIndex((x) => x.id === childId)
        if (idx >= 0) {
          stickers[idx] = normalizeDesktopSticker({
            ...stickers[idx],
            kind: 'habit',
            habitId,
            emoji,
            text: name,
          })
        }
        created++
      }

      if (created === 0) return s

      habits = syncLifeMapHabitLinks(habits)
      habits = syncHabitLinkFromGoalArrow(desk.moodboard.arrows, stickers, habits)

      return {
        ...s,
        habits,
        quests: syncQuests(habits, s.quests),
        streak: globalStreak(habits),
        diamonds,
        diamondHistory,
        desktop: {
          ...desk,
          moodboard: { ...desk.moodboard, stickers },
        },
      }
    })

    return { ok: true, created }
  }

  const deleteDesktopSticker = (stickerId: string) => {
    setStore((s) => {
      const d = normalizeDesktopState(s.desktop)
      const stickers = d.moodboard.stickers.filter((st) => st.id !== stickerId)
      const arrows = d.moodboard.arrows.filter(
        (ar) => ar.fromStickerId !== stickerId && ar.toStickerId !== stickerId,
      )
      return {
        ...s,
        desktop: {
          ...d,
          moodboard: { ...d.moodboard, stickers, arrows },
        },
      }
    })
  }

  const addDesktopArrow = (input: {
    fromStickerId: string
    toStickerId: string
    color?: string
    width?: number
  }): { ok: boolean; arrowId?: string; reason?: string } => {
    if (!input.fromStickerId || !input.toStickerId) {
      return { ok: false, reason: 'Нужны оба стикера' }
    }
    if (input.fromStickerId === input.toStickerId) {
      return { ok: false, reason: 'Стрелка не может соединять стикер с самим собой' }
    }
    const arrowId = desktopId('ar')
    setStore((s) => {
      const d = normalizeDesktopState(s.desktop)
      const stickerIds = new Set(d.moodboard.stickers.map((st) => st.id))
      if (!stickerIds.has(input.fromStickerId) || !stickerIds.has(input.toStickerId)) {
        return s
      }
      const exists = d.moodboard.arrows.some(
        (ar) => ar.fromStickerId === input.fromStickerId && ar.toStickerId === input.toStickerId,
      )
      if (exists) return s
      const nextArrow = normalizeDesktopArrow({
        id: arrowId,
        fromStickerId: input.fromStickerId,
        toStickerId: input.toStickerId,
        color: input.color,
        width: input.width,
      })
      if (!nextArrow) return s
      const arrows =
        d.moodboard.arrows.length > 200 ? d.moodboard.arrows : [...d.moodboard.arrows, nextArrow]
      const habits = syncHabitLinkFromGoalArrow(arrows, d.moodboard.stickers, s.habits.map(normalizeHabit))
      return {
        ...s,
        habits,
        quests: syncQuests(habits, s.quests),
        desktop: {
          ...d,
          moodboard: {
            ...d.moodboard,
            arrows,
          },
        },
      }
    })
    return { ok: true, arrowId }
  }

  const updateDesktopArrow = (arrowId: string, patch: Partial<DesktopMoodboardArrow>) => {
    setStore((s) => {
      const d = normalizeDesktopState(s.desktop)
      const arrows = d.moodboard.arrows
        .map((ar) => {
          if (ar.id !== arrowId) return ar
          const merged = normalizeDesktopArrow({ ...ar, ...patch })
          return merged
        })
        .filter((ar): ar is DesktopMoodboardArrow => ar != null)
      return {
        ...s,
        desktop: {
          ...d,
          moodboard: { ...d.moodboard, arrows },
        },
      }
    })
  }

  const updateDesktopMoodboardView = (patch: Partial<DesktopMoodboardView>) => {
    setStore((s) => {
      const d = normalizeDesktopState(s.desktop)
      const view = normalizeDesktopView({ ...d.moodboard.view, ...patch })
      return {
        ...s,
        desktop: {
          ...d,
          moodboard: { ...d.moodboard, view },
        },
      }
    })
  }

  const deleteDesktopArrow = (arrowId: string) => {
    setStore((s) => {
      const d = normalizeDesktopState(s.desktop)
      const arrows = d.moodboard.arrows.filter((ar) => ar.id !== arrowId)
      const habits = syncHabitLinkFromGoalArrow(
        arrows,
        d.moodboard.stickers,
        s.habits.map(normalizeHabit),
      )
      return {
        ...s,
        habits,
        quests: syncQuests(habits, s.quests),
        desktop: {
          ...d,
          moodboard: { ...d.moodboard, arrows },
        },
      }
    })
  }

  const addTesterDiamonds = (amount: number): { ok: boolean; reason?: string } => {
    const normalized = Math.round(amount)
    if (activeUserId !== 'u-owner-artem') {
      return { ok: false, reason: 'Только тестировщик может использовать эту кнопку' }
    }
    if (!Number.isFinite(normalized) || normalized <= 0) {
      return { ok: false, reason: 'Укажи целое число больше нуля' }
    }

    setStore((s) => {
      const diamonds = s.diamonds + normalized
      return applyAchievementEventsToStore(
        {
          ...s,
          diamonds,
          diamondHistory: pushDiamondTx(
            s.diamondHistory,
            makeDiamondTx({
              amount: normalized,
              reason: 'tester_grant',
              label: `Тестер добавил себе ${formatDiamonds(normalized)}`,
              balanceAfter: diamonds,
            }),
          ),
        },
        [{ type: 'diamonds_earned', payload: { amount: normalized } }],
      )
    })

    return { ok: true }
  }

  // ——— Achievements API ———
  useEffect(() => {
    setStore((s) => {
      if (s.achievements?.meta?.backfilled) return s
      return ensureAchievementsBackfilled({
        ...s,
        achievements: s.achievements ?? emptyAchievements(),
      })
    })
  }, [activeUserId])

  const trackAchievementEvent = (events: AchievementEvent | AchievementEvent[]) => {
    const list = Array.isArray(events) ? events : [events]
    setStore((s) => applyAchievementEventsToStore(s, list))
  }

  const recordFocusSession = (input?: {
    minutes?: number
    uninterrupted?: boolean
  }) => {
    trackAchievementEvent({
      type: 'focus_completed',
      payload: {
        minutes: input?.minutes ?? store.focusSettings?.focusMinutes ?? 25,
        uninterrupted: input?.uninterrupted !== false,
      },
    })
  }

  const trackPageOpen = (page: string) => {
    trackAchievementEvent({ type: 'page_opened', payload: { page } })
  }

  const achievementsState = store.achievements ?? emptyAchievements()
  const achievementViews = useMemo(
    () => buildAchievementViews(achievementsState),
    [achievementsState],
  )
  const nearestAchievements = useMemo(
    () => getNearestAchievements(achievementsState, 3),
    [achievementsState],
  )

  const ackAchievementUnlocks = (ids: string[]) => {
    setStore((s) => ({
      ...s,
      achievements: acknowledgeUnlocks(
        s.achievements ?? emptyAchievements(),
        ids,
      ),
    }))
  }

  const togglePinAchievement = (id: string) => {
    setStore((s) => ({
      ...s,
      achievements: pinAchievement(s.achievements ?? emptyAchievements(), id),
    }))
  }

  const selectAchievementTitle = (titleId: string) => {
    setStore((s) => ({
      ...s,
      achievements: setActiveTitle(s.achievements ?? emptyAchievements(), titleId),
    }))
  }

  const toggleAchievementSound = (enabled: boolean) => {
    setStore((s) => ({
      ...s,
      achievements: setAchievementSound(
        s.achievements ?? emptyAchievements(),
        enabled,
      ),
    }))
  }

  const readAchievementNotifications = () => {
    setStore((s) => ({
      ...s,
      achievements: markNotificationsRead(s.achievements ?? emptyAchievements()),
    }))
  }

  return {
    ...store,
    goals,
    habits: habitStats,
    habitsAll,
    goalStats,
    lifeMapGoalStats,
    customGoalStats,
    lifeGoalsMapGoal,
    lifeGoalsMapStat,
    hasLifeMap,
    hiddenLifeAreas,
    visibleLifeAreas,
    quests,
    contracts,
    userListings,
    activeContracts,
    retrofillStatus,
    yesterdayMissed,
    habitReminders,
    plannerSections,
    plannerTasks,
    plannerTasksDetailed,
    todayPlannerTasks,
    focusSettings,
    todayFocusBlocks,
    focusLoadPct,
    dayCount,
    todayIndex,
    isCurrentMonth,
    todayDone,
    todayTotal,
    todayPct,
    monthDone,
    monthTotal,
    monthPct,
    habitStats,
    weakHabits,
    dailyProgress,
    nextQuest,
    warnings,
    setMonth,
    goToToday,
    toggleHabitDay,
    toggleQuest,
    addHabit,
    updateHabit,
    deleteHabit,
    acceptQuest,
    acceptUserQuest,
    createUserQuest,
    importSharedQuest,
    claimQuestSale,
    deleteUserQuest,
    publishCatalogQuest,
    setQuestReminder,
    markYesterdayMissed,
    updateQuestListItem,
    abandonQuest,
    addGoal,
    createMatrixGoal,
    setMatrixPillar,
    updateGoalMatrix,
    updateGoal,
    rescheduleGoal,
    logGoalValue,
    completeGoalStage,
    toggleGoalStage,
    setGoalStatus,
    deleteGoal,
    toggleHideLifeArea,
    linkHabitToGoal,
    createLifeMap,
    setFocusProfile,
    addPlannerSection,
    movePlannerSection,
    addPlannerTask,
    movePlannerTask,
    reschedulePlannerTask,
    rescheduleHabit,
    togglePlannerTaskDone,
    deletePlannerTask,
    addDesktopWidget,
    removeDesktopWidget,
    moveDesktopWidget,
    setDesktopWidgetSize,
    addDesktopSticker,
    updateDesktopSticker,
    deleteDesktopSticker,
    convertDesktopStickerToGoal,
    convertDesktopStickerToHabit,
    convertMoodboardGoalChildrenToHabits,
    addDesktopArrow,
    updateDesktopArrow,
    deleteDesktopArrow,
    updateDesktopMoodboardView,
    addTesterDiamonds,
    achievements: achievementsState,
    achievementViews,
    nearestAchievements,
    totalAchievements: TOTAL_ACHIEVEMENTS,
    unlockedAchievementCount: Object.keys(achievementsState.unlocked).length,
    trackAchievementEvent,
    trackPageOpen,
    recordFocusSession,
    ackAchievementUnlocks,
    togglePinAchievement,
    selectAchievementTitle,
    toggleAchievementSound,
    readAchievementNotifications,
    dayStatus: (habitId: string, dayIndex: number) => {
      const h = habitsAll.find((x) => x.id === habitId)
      if (!h) return 'after' as const
      return dayStatus(h, store.year, store.month, dayIndex)
    },
  }
}

function compareKeysSafe(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0
}

export type LifeOSState = ReturnType<typeof useLifeOS>

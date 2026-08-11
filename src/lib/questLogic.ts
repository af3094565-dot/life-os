import type {
  Habit,
  HabitDuration,
  QuestContract,
  QuestListItem,
  UserQuestListing,
} from '../data/seed'
import { questReward, habitDisplayCopy, type QuestTemplate } from '../data/questCatalog'
import { addDays, completedCount, todayKey } from './habitLogic'

export function toHabitDuration(days: number): HabitDuration {
  if (days <= 7) return 7
  if (days <= 21) return 21
  if (days <= 30) return 30
  if (days <= 66) return 66
  if (days <= 90) return 90
  if (days <= 100) return 100
  return 365
}

export function contractDeadline(startDate: string, durationDays: number): string {
  return addDays(startDate, durationDays - 1)
}

export function makeListSlots(target: number): QuestListItem[] {
  return Array.from({ length: target }, (_, i) => ({
    id: `li-${Date.now()}-${i}`,
    title: '',
    done: false,
  }))
}

export function createContractFromTemplate(
  template: QuestTemplate,
  habitId: string,
  startDate = todayKey(),
  reminderTime?: string,
): QuestContract {
  const copy = habitDisplayCopy(template)
  const time =
    template.needsReminder && reminderTime
      ? reminderTime
      : template.needsReminder
        ? template.reminderDefault
        : undefined
  return {
    id: `qc-${Date.now()}`,
    templateId: template.id,
    title: template.title,
    description: template.description,
    emoji: template.emoji,
    category: template.category,
    cost: template.cost,
    reward: questReward(template.cost),
    kind: template.kind,
    status: 'active',
    acceptedAt: new Date().toISOString(),
    startDate,
    deadline: contractDeadline(startDate, template.durationDays),
    habitId,
    target: template.target,
    timesPerWeek: template.timesPerWeek,
    durationDays: template.durationDays,
    listLabel: template.listLabel,
    listItems: template.kind === 'list' ? makeListSlots(template.target) : [],
    color: template.color,
    habitTitle: copy.habitTitle,
    habitTagline: copy.habitTagline,
    reminderTime: time,
  }
}

export function userListingHabitCopy(listing: UserQuestListing): {
  habitTitle: string
  habitTagline: string
} {
  const span =
    listing.kind === 'streak'
      ? `${listing.target} дней`
      : formatDurationLabel(listing.durationDays)
  return {
    habitTitle: `${listing.title} · ${span}`,
    habitTagline: listing.description,
  }
}

export function createContractFromUserListing(
  listing: UserQuestListing,
  habitId: string,
  startDate = todayKey(),
  reminderTime?: string,
): QuestContract {
  const copy = userListingHabitCopy(listing)
  const time =
    listing.needsReminder && reminderTime
      ? reminderTime
      : listing.needsReminder
        ? listing.reminderDefault
        : undefined
  return {
    id: `qc-${Date.now()}`,
    templateId: listing.id,
    title: listing.title,
    description: listing.description,
    emoji: listing.emoji,
    category: listing.category,
    cost: listing.price,
    reward: listing.reward,
    kind: listing.kind,
    status: 'active',
    acceptedAt: new Date().toISOString(),
    startDate,
    deadline: contractDeadline(startDate, listing.durationDays),
    habitId,
    target: listing.target,
    timesPerWeek: listing.timesPerWeek,
    durationDays: listing.durationDays,
    listLabel: listing.listLabel,
    listItems: listing.kind === 'list' ? makeListSlots(listing.target) : [],
    color: listing.color,
    habitTitle: copy.habitTitle,
    habitTagline: copy.habitTagline,
    reminderTime: time,
    fromUserListing: true,
    listingId: listing.id,
  }
}

export type ContractProgress = {
  current: number
  target: number
  pct: number
  isComplete: boolean
  daysLeft: number
  overdue: boolean
}

export function contractProgress(
  contract: QuestContract,
  habit?: Habit | null,
): ContractProgress {
  const today = todayKey()
  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(contract.deadline + 'T12:00:00').getTime() -
        new Date(today + 'T12:00:00').getTime()) /
        86_400_000,
    ),
  )
  const overdue = today > contract.deadline

  let current = 0
  if (contract.kind === 'list') {
    current = contract.listItems.filter((i) => i.done && i.title.trim()).length
  } else if (habit) {
    current = completedCount(habit)
  }

  const target = contract.target
  const pct = target ? Math.min(100, Math.round((current / target) * 100)) : 0
  const isComplete = current >= target

  return { current, target, pct, isComplete, daysLeft, overdue }
}

export function resolveContractStatus(
  contract: QuestContract,
  habit?: Habit | null,
): QuestContract {
  if (contract.status !== 'active') return contract
  const progress = contractProgress(contract, habit)
  if (progress.isComplete) {
    return {
      ...contract,
      status: 'won',
      completedAt: todayKey(),
    }
  }
  if (progress.overdue) {
    return {
      ...contract,
      status: 'lost',
      completedAt: todayKey(),
    }
  }
  return contract
}

export function listLabelWord(label: string | undefined, n: number): string {
  const base = label ?? 'пункт'
  if (base === 'книга') {
    const abs = Math.abs(n) % 100
    const last = abs % 10
    if (abs > 10 && abs < 20) return 'книг'
    if (last === 1) return 'книга'
    if (last >= 2 && last <= 4) return 'книги'
    return 'книг'
  }
  if (base === 'фильм') {
    const abs = Math.abs(n) % 100
    const last = abs % 10
    if (abs > 10 && abs < 20) return 'фильмов'
    if (last === 1) return 'фильм'
    if (last >= 2 && last <= 4) return 'фильма'
    return 'фильмов'
  }
  return n === 1 ? base : `${base}ов`
}

export function formatDurationLabel(days: number): string {
  if (days === 7) return '7 дней'
  if (days === 14) return '14 дней'
  if (days === 21) return '21 день'
  if (days === 30) return '30 дней'
  if (days === 90) return '90 дней'
  if (days === 100) return '100 дней'
  if (days === 180) return 'полгода'
  if (days === 365) return 'год'
  return `${days} дн.`
}

import type { PageId } from '../data/seed'

/** Контекст перехода между разделами без React Router */
export type NavContext = {
  page: PageId
  entityId?: string
  entityType?: 'goal' | 'habit' | 'quest' | 'task' | 'life-area'
  returnTo?: PageId
  selectedDate?: string
  filter?: string
  modal?: string
  /** Подвкладка внутри раздела (план: today/week/calendar) */
  view?: string
  /** Подпись для «← Назад» */
  backLabel?: string
}

export type NavigateOptions = Omit<NavContext, 'page'> & {
  /** Не писать в историю (замена текущего) */
  replace?: boolean
}

export function pageLabel(page: PageId): string {
  switch (page) {
    case 'dashboard':
      return 'Сегодня'
    case 'desktop':
      return 'Рабочий стол'
    case 'planner':
      return 'План'
    case 'planner-calendar':
      return 'Календарь'
    case 'habits':
      return 'Привычки'
    case 'goals':
      return 'Цели'
    case 'quests':
      return 'Квесты'
    case 'life-map':
      return 'Карта жизни'
    case 'progress':
      return 'Прогресс'
    case 'achievements':
      return 'Достижения'
    default:
      return 'Назад'
  }
}

/** Основные разделы для новичка */
export const PRIMARY_PAGES: PageId[] = [
  'dashboard',
  'goals',
  'planner',
  'habits',
  'progress',
]

/** Продвинутые — progressive disclosure */
export const ADVANCED_PAGES: PageId[] = ['quests', 'life-map', 'desktop', 'achievements']

export function isPlanPage(page: PageId): boolean {
  return page === 'planner' || page === 'planner-calendar'
}

import { CalendarDays, ChartNoAxesCombined, Home, Target } from 'lucide-react'
import type { PageId } from './seed'

export const WORKSPACE_SECTIONS = [
  { id: 'today', label: 'Сегодня', hint: 'Следующий шаг', page: 'dashboard', icon: Home, pages: ['dashboard'] },
  { id: 'plan', label: 'Мой план', hint: 'Что делать и когда', page: 'habits', icon: CalendarDays, pages: ['habits', 'planner', 'planner-calendar'] },
  { id: 'growth', label: 'Мои цели', hint: 'Ради чего я действую', page: 'goals', icon: Target, pages: ['goals', 'life-map', 'quests', 'desktop'] },
  { id: 'results', label: 'Результаты', hint: 'Что уже получается', page: 'progress', icon: ChartNoAxesCombined, pages: ['progress', 'achievements', 'neurons'] },
] satisfies { id: string; label: string; hint: string; page: PageId; icon: typeof Home; pages: PageId[] }[]

export const PAGE_GUIDE: Record<PageId, { label: string; tour: string; pro?: boolean; description: string; next: PageId; nextLabel: string }> = {
  dashboard: { label: 'Сегодня', tour: 'nav-dashboard', description: 'Все действия на сегодня из привычек и плана.', next: 'habits', nextLabel: 'Мои привычки' },
  habits: { label: 'Привычки', tour: 'nav-habits', description: 'Повторяй небольшие действия. Отметки появятся на главной, а связанные привычки продвинут цели.', next: 'goals', nextLabel: 'Связать с целью' },
  planner: { label: 'Задачи', tour: 'nav-planner', description: 'Разложи дела по срокам. Запланированные действия появятся в календаре и на экране «Сегодня».', next: 'planner-calendar', nextLabel: 'Посмотреть по дням' },
  'planner-calendar': { label: 'Календарь', tour: 'nav-calendar', description: 'Те же задачи и привычки, распределённые по дням. Выбери дату, чтобы оценить нагрузку.', next: 'dashboard', nextLabel: 'К делам на сегодня' },
  goals: { label: 'Цели', tour: 'nav-goals', pro: true, description: 'Выбери результат и прикрепи привычки. Их выполнение будет двигать прогресс цели.', next: 'habits', nextLabel: 'К ежедневным действиям' },
  'life-map': { label: 'Карта жизни', tour: 'nav-life-map', pro: true, description: 'Выбери сферу, которой хочешь уделить внимание, и добавь в неё привычки.', next: 'goals', nextLabel: 'Определить цель' },
  quests: { label: 'Квесты', tour: 'nav-quests', pro: true, description: 'Закрепи регулярность испытанием на срок. Связанную привычку можно выполнять прямо на главной.', next: 'dashboard', nextLabel: 'Выполнить шаг сегодня' },
  desktop: { label: 'Доска идей', tour: 'nav-desktop', description: 'Собери идеи, цели и заметки рядом. Превращай записи в цели и привычки, когда будешь готов.', next: 'goals', nextLabel: 'От идеи к цели' },
  progress: { label: 'Статистика', tour: 'nav-progress', description: 'Посмотри, какие действия дают результат. Скорректируй план и продолжай в удобном ритме.', next: 'habits', nextLabel: 'Скорректировать привычки' },
  neurons: { label: 'Нейроны', tour: 'nav-neurons', description: 'История направлений, которые ты развивал в себе. Активные и завершённые остаются частью карты.', next: 'progress', nextLabel: 'Посмотреть динамику' },
  achievements: { label: 'Достижения', tour: 'nav-achievements', description: 'Твои действия в привычках, целях и квестах складываются в достижения.', next: 'dashboard', nextLabel: 'Продолжить сегодня' },
}

export function workspaceSection(page: PageId) {
  return WORKSPACE_SECTIONS.find(section => (section.pages as PageId[]).includes(page))!
}

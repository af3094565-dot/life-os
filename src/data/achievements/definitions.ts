import type { AchievementDefinition, AchievementCategory } from './types'

function badge(id: string, title: string, description: string, icon: string, category: AchievementCategory, metric: string, target: number): AchievementDefinition {
  return { id: `v2_${id}`, title, description, icon, category, rarity: 'common', hidden: false, xpReward: 0, diamondReward: 0,
    triggerEvents: ['habit_completed', 'task_completed', 'goal_completed', 'quest_won', 'focus_completed'],
    condition: { type: 'threshold', metric, target, showProgress: true } }
}

/** A small collection of real milestones. No rewards for clicks, spending or self-deletion. */
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  badge('first', 'Я только посмотрю', 'Посмотрел. Взял и сделал. Первое выполненное дело.', '👀', 'getting_started', 'actions_done', 1),
  badge('three_days', 'Это уже не случайность', 'Действия в 3 разных дня. Кажется, ты что-то задумал.', '🌱', 'consistency', 'active_days', 3),
  badge('week', 'Понедельник не понадобился', '7 дней с выполненными делами. Начал, когда захотел.', '🗓️', 'consistency', 'active_days', 7),
  badge('month', 'Абонемент в свою жизнь', '30 дней с действиями. Без мелкого шрифта и автопродления.', '🎟️', 'consistency', 'active_days', 30),
  badge('twenty_five', 'Тихой сапой', '25 выполненных действий. Без фанфар, зато с результатом.', '🐢', 'habits', 'actions_done', 25),
  badge('hundred', 'Сотка, и это не кофе', '100 выполненных действий. Вот это накопительный эффект.', '💯', 'habits', 'actions_done', 100),
  badge('goal', 'Хотелось — сделалось', 'Первая завершённая цель. Можно немного собой гордиться.', '🎯', 'goals', 'goals_done', 1),
  badge('three_goals', 'У желаний появился менеджер', '3 завершённые цели. Менеджер — ты.', '🧑‍💼', 'goals', 'goals_done', 3),
  badge('quest', 'Босс повержен', 'Первый завершённый квест. Финальные титры можно пропустить.', '🐉', 'quests', 'quests_done', 1),
  badge('focus', 'Режим хлебушка: выкл.', '25 минут завершённых фокус-сессий. Вкладки подождали.', '🍞', 'focus', 'focus_minutes', 25),
  badge('deep_focus', 'Не трогать: думаю', '3 часа завершённых фокус-сессий суммарно. По кусочкам тоже считается.', '🧠', 'focus', 'focus_minutes', 180),
  badge('comeback', 'Ну здравствуй, я', 'Выполнил дело после перерыва от 7 дней. Продолжить важнее, чем не прерываться.', '🪃', 'comeback', 'comeback_done', 1),
]
export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENT_DEFINITIONS.map(a => [a.id, a])) as Record<string, AchievementDefinition>
export function getAchievementDefinition(id: string) { return ACHIEVEMENT_BY_ID[id] }
export const ACHIEVEMENTS_BY_EVENT: Record<string, AchievementDefinition[]> = Object.fromEntries(
  [...new Set(ACHIEVEMENT_DEFINITIONS.flatMap(a => a.triggerEvents))].map(event => [event, ACHIEVEMENT_DEFINITIONS.filter(a => a.triggerEvents.includes(event))]),
)
export const TOTAL_ACHIEVEMENTS = ACHIEVEMENT_DEFINITIONS.length

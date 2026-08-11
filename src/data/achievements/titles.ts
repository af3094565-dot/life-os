/** Титулы, открываемые достижениями */

export type AchievementTitle = {
  id: string
  label: string
  emoji: string
  description: string
}

export const ACHIEVEMENT_TITLES: AchievementTitle[] = [
  {
    id: 'novice',
    label: 'Новичок',
    emoji: '🌱',
    description: 'Только начал путь в Life OS',
  },
  {
    id: 'seeker',
    label: 'Искатель',
    emoji: '🧭',
    description: 'Исследует разделы приложения',
  },
  {
    id: 'builder',
    label: 'Строитель',
    emoji: '🧱',
    description: 'Собирает привычки и цели',
  },
  {
    id: 'focus_master',
    label: 'Фокусник',
    emoji: '🧘',
    description: 'Умеет сидеть и работать',
  },
  {
    id: 'marathoner',
    label: 'Марафонец',
    emoji: '🔥',
    description: 'Держит длинные серии',
  },
  {
    id: 'architect',
    label: 'Архитектор',
    emoji: '🏛',
    description: 'Строит систему жизни',
  },
  {
    id: 'explorer',
    label: 'Исследователь',
    emoji: '🗺',
    description: 'Открыл все основные разделы',
  },
  {
    id: 'strategist',
    label: 'Стратег',
    emoji: '♟',
    description: 'Думает наперёд',
  },
  {
    id: 'diamond_mogul',
    label: 'Алмазный магнат',
    emoji: '💎',
    description: 'Знает цену алмазам',
  },
  {
    id: 'habit_master',
    label: 'Мастер привычек',
    emoji: '📅',
    description: 'Привычки — его стихия',
  },
  {
    id: 'quest_lord',
    label: 'Повелитель квестов',
    emoji: '⚔',
    description: 'Контракты ему по плечу',
  },
  {
    id: 'achievement_hunter',
    label: 'Охотник за достижениями',
    emoji: '🏆',
    description: 'Собирает ачивки как коллекции',
  },
  {
    id: 'legend',
    label: 'Легенда',
    emoji: '👑',
    description: 'Почти всё собрано',
  },
  {
    id: 'secret_agent',
    label: 'Секретный агент',
    emoji: '🕵️',
    description: 'Находит то, что спрятано',
  },
  {
    id: 'comeback_king',
    label: 'Король камбэков',
    emoji: '👻',
    description: 'Всегда возвращается',
  },
]

export function findTitle(id: string): AchievementTitle | undefined {
  return ACHIEVEMENT_TITLES.find((t) => t.id === id)
}

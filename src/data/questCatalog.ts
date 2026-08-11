/** Каталог квестов — идеи трекеров и челленджей в духе 365done.ru */

export type QuestCost = 20 | 30 | 50

export type QuestTemplateKind = 'streak' | 'list'

export type QuestCategory =
  | 'sport'
  | 'mind'
  | 'books'
  | 'health'
  | 'home'
  | 'money'
  | 'growth'

export const QUEST_CATEGORY_LABELS: Record<QuestCategory, string> = {
  sport: 'Спорт',
  mind: 'Осознанность',
  books: 'Книги',
  health: 'Здоровье',
  home: 'Быт',
  money: 'Финансы',
  growth: 'Рост',
}

export type QuestTemplate = {
  id: string
  title: string
  description: string
  emoji: string
  category: QuestCategory
  cost: QuestCost
  /** Календарный срок контракта */
  durationDays: number
  kind: QuestTemplateKind
  timesPerWeek: number
  /** Стрик: успешные дни · список: число пунктов */
  target: number
  listLabel?: string
  /** Название привычки, если отличается от заголовка квеста */
  habitName?: string
  /** Заголовок в списке привычек */
  habitTitle?: string
  /** Подпись под названием в привычках */
  habitTagline?: string
  /** Напоминание на дашборде (вечерний ритуал) */
  needsReminder?: boolean
  /** HH:mm */
  reminderDefault?: string
  color: string
}

export const QUEST_CATALOG: QuestTemplate[] = [
  // ——— 20 ———
  {
    id: 'plank-30',
    title: 'Держи планку',
    description: '30 дней планки каждый день. Ничего редактировать не нужно — только отмечай.',
    emoji: '🧱',
    category: 'sport',
    cost: 20,
    durationDays: 30,
    kind: 'streak',
    timesPerWeek: 7,
    target: 30,
    habitName: 'Планка',
    color: '#fef3c7',
  },
  {
    id: 'water-30',
    title: '30 дней воды',
    description: 'Пить достаточно воды каждый день месяц подряд.',
    emoji: '💧',
    category: 'health',
    cost: 20,
    durationDays: 30,
    kind: 'streak',
    timesPerWeek: 7,
    target: 30,
    habitName: 'Вода',
    color: '#e0f2fe',
  },
  {
    id: 'gratitude-30',
    title: '30 дней благодарности',
    description: 'Каждый день — одна благодарность. Классика 365done.',
    emoji: '🙏',
    category: 'mind',
    cost: 20,
    durationDays: 30,
    kind: 'streak',
    timesPerWeek: 7,
    target: 30,
    habitName: 'Благодарность',
    color: '#fce7f3',
  },
  {
    id: 'order-20min',
    title: '20 минут порядка',
    description: '20 минут наведения порядка — каждый день в течение месяца.',
    emoji: '🧹',
    category: 'home',
    cost: 20,
    durationDays: 30,
    kind: 'streak',
    timesPerWeek: 7,
    target: 30,
    habitName: '20 минут порядка',
    color: '#ecfccb',
  },
  {
    id: 'selfcare-21',
    title: 'Self-care challenge',
    description: '21 день заботы о себе: маленькое ритуальное действие ежедневно.',
    emoji: '🫧',
    category: 'health',
    cost: 20,
    durationDays: 21,
    kind: 'streak',
    timesPerWeek: 7,
    target: 21,
    habitName: 'Забота о себе',
    color: '#f3e8ff',
  },
  {
    id: 'sleep-30',
    title: 'Трекер сна',
    description: 'Ложиться вовремя 30 дней. Сон — база всего остального.',
    emoji: '😴',
    category: 'health',
    cost: 20,
    durationDays: 30,
    kind: 'streak',
    timesPerWeek: 7,
    target: 30,
    habitTitle: 'Ложиться вовремя 30 дней',
    habitTagline: 'Сон — база всего остального.',
    needsReminder: true,
    reminderDefault: '23:00',
    color: '#e0e7ff',
  },
  {
    id: 'detox-14',
    title: 'Digital Detox',
    description: '14 дней без лишнего экрана вечером. Дисциплина внимания.',
    emoji: '📵',
    category: 'mind',
    cost: 20,
    durationDays: 14,
    kind: 'streak',
    timesPerWeek: 7,
    target: 14,
    habitTitle: 'Вечер без экрана 14 дней',
    habitTagline: 'Digital detox — вечером без лишнего экрана.',
    needsReminder: true,
    reminderDefault: '21:00',
    color: '#fee2e2',
  },
  {
    id: 'zozh-7',
    title: 'Неделя ЗОЖ',
    description: '7 дней здорового ритма — быстрый старт без перегруза.',
    emoji: '🥗',
    category: 'health',
    cost: 20,
    durationDays: 7,
    kind: 'streak',
    timesPerWeek: 7,
    target: 7,
    habitName: 'ЗОЖ-день',
    color: '#d1fae5',
  },

  // ——— 30 ———
  {
    id: 'meditation-100',
    title: '100 дней медитации',
    description: 'Сто дней практики. Коротких сессий достаточно.',
    emoji: '🧘',
    category: 'mind',
    cost: 30,
    durationDays: 100,
    kind: 'streak',
    timesPerWeek: 7,
    target: 100,
    habitName: 'Медитация',
    color: '#ede9fe',
  },
  {
    id: 'creativity-21',
    title: '21 день креативности',
    description: 'Каждый день — одно творческое действие.',
    emoji: '🎨',
    category: 'growth',
    cost: 30,
    durationDays: 21,
    kind: 'streak',
    timesPerWeek: 7,
    target: 21,
    habitName: 'Креатив',
    color: '#ffedd5',
  },
  {
    id: 'yoga-30',
    title: 'Йога дома',
    description: '30 дней йоги дома — тело и спокойствие.',
    emoji: '🪷',
    category: 'sport',
    cost: 30,
    durationDays: 30,
    kind: 'streak',
    timesPerWeek: 7,
    target: 30,
    habitName: 'Йога',
    color: '#fce7f3',
  },
  {
    id: 'run-30',
    title: 'Трекер бега',
    description: 'Бегать 4 раза в неделю целый месяц.',
    emoji: '🏃',
    category: 'sport',
    cost: 30,
    durationDays: 30,
    kind: 'streak',
    timesPerWeek: 4,
    target: 16,
    habitName: 'Бег',
    color: '#dbeafe',
  },
  {
    id: 'mindful-30',
    title: '30 дней осознанности',
    description: 'Ежедневная практика присутствия.',
    emoji: '🌿',
    category: 'mind',
    cost: 30,
    durationDays: 30,
    kind: 'streak',
    timesPerWeek: 7,
    target: 30,
    habitName: 'Осознанность',
    color: '#dcfce7',
  },
  {
    id: 'books-10',
    title: 'Book Challenge',
    description: 'Прочитай 10 книг. Внеси список внизу и отмечай прочитанное.',
    emoji: '📚',
    category: 'books',
    cost: 30,
    durationDays: 180,
    kind: 'list',
    timesPerWeek: 4,
    target: 10,
    listLabel: 'книга',
    habitName: 'Чтение',
    color: '#fef9c3',
  },
  {
    id: 'docs-10',
    title: '10 документалок',
    description: 'Посмотри 10 must-watch документальных фильмов.',
    emoji: '🎬',
    category: 'growth',
    cost: 30,
    durationDays: 90,
    kind: 'list',
    timesPerWeek: 2,
    target: 10,
    listLabel: 'фильм',
    habitName: 'Документалка',
    color: '#f3f4f6',
  },
  {
    id: 'investor-30',
    title: 'Челлендж инвестора',
    description: '30 дней финансовой осознанности: учёба или учёт каждый день.',
    emoji: '📈',
    category: 'money',
    cost: 30,
    durationDays: 30,
    kind: 'streak',
    timesPerWeek: 7,
    target: 30,
    habitName: 'Финансовая осознанность',
    color: '#d1fae5',
  },

  // ——— 50 ———
  {
    id: 'year-books-10',
    title: '10 книг за год',
    description: 'Годовой контракт: список из 10 книг и ритм чтения.',
    emoji: '📖',
    category: 'books',
    cost: 50,
    durationDays: 365,
    kind: 'list',
    timesPerWeek: 5,
    target: 10,
    listLabel: 'книга',
    habitName: 'Чтение книг',
    color: '#fef3c7',
  },
  {
    id: 'no-buy-100',
    title: '100 дней без покупок',
    description: 'Месяцы осознанного потребления. Покупай только необходимое.',
    emoji: '🛍️',
    category: 'money',
    cost: 50,
    durationDays: 100,
    kind: 'streak',
    timesPerWeek: 7,
    target: 100,
    habitName: 'Без лишних покупок',
    color: '#fce7f3',
  },
  {
    id: 'gratitude-100',
    title: '100 дней благодарности',
    description: 'Длинная серия благодарностей — перестройка взгляда на жизнь.',
    emoji: '✨',
    category: 'mind',
    cost: 50,
    durationDays: 100,
    kind: 'streak',
    timesPerWeek: 7,
    target: 100,
    habitName: 'Благодарность',
    color: '#fef9c3',
  },
  {
    id: 'sport-year',
    title: 'Мой спортивный год',
    description: 'Тренировка минимум 3 раза в неделю весь год.',
    emoji: '🏆',
    category: 'sport',
    cost: 50,
    durationDays: 365,
    kind: 'streak',
    timesPerWeek: 3,
    target: 150,
    habitName: 'Тренировка',
    color: '#fee2e2',
  },
  {
    id: 'lifelong-learn',
    title: 'Lifelong Learning',
    description: 'Учиться каждый день 90 дней подряд.',
    emoji: '🧠',
    category: 'growth',
    cost: 50,
    durationDays: 90,
    kind: 'streak',
    timesPerWeek: 7,
    target: 90,
    habitName: 'Обучение',
    color: '#e0e7ff',
  },
  {
    id: 'books-60',
    title: '60 важных книг',
    description: 'Амбициозный список: собери и прочитай 60 книг.',
    emoji: '📕',
    category: 'books',
    cost: 50,
    durationDays: 365,
    kind: 'list',
    timesPerWeek: 5,
    target: 60,
    listLabel: 'книга',
    habitName: 'Чтение',
    color: '#ffedd5',
  },
  {
    id: 'checklist-365',
    title: '365 дней ритма',
    description: 'Год ежедневной микропривычки. Самый длинный контракт.',
    emoji: '📅',
    category: 'growth',
    cost: 50,
    durationDays: 365,
    kind: 'streak',
    timesPerWeek: 7,
    target: 365,
    habitName: 'Ежедневный ритм',
    color: '#dbeafe',
  },
]

export function questReward(cost: QuestCost): number {
  return cost * 2
}

export function findQuestTemplate(id: string): QuestTemplate | undefined {
  return QUEST_CATALOG.find((q) => q.id === id)
}

export function habitDisplayCopy(template: QuestTemplate): {
  habitTitle: string
  habitTagline: string
} {
  if (template.habitTitle && template.habitTagline) {
    return { habitTitle: template.habitTitle, habitTagline: template.habitTagline }
  }
  const span =
    template.kind === 'streak'
      ? `${template.target} дней`
      : formatDurationLabel(template.durationDays)
  const habitTitle = `${template.habitName ?? template.title} · ${span}`
  const habitTagline = template.description
  return { habitTitle, habitTagline }
}

function formatDurationLabel(days: number): string {
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

/** Аспекты колеса баланса (Карта жизни) */

export type LifeAreaId =
  | 'health'
  | 'family'
  | 'friends'
  | 'career'
  | 'finance'
  | 'spirit'
  | 'growth'
  | 'joy'

export type LifeArea = {
  id: LifeAreaId
  /** Короткая подпись в списках */
  short: string
  /** Подпись на ободе колеса (как на классической карте) */
  rim: string
  /** Полное название */
  title: string
  color: string
  emoji: string
  hint: string
}

/** Максимум привычек на аспект (= число квадратов привычек на карте целей) */
export const LIFE_AREA_MAX_HABITS = 8

/** Системная карта целей под картой жизни (аспекты уже в квадратах) */
export const LIFE_GOALS_MAP_ID = 'g-life-goals-map'

/** По часовой стрелке, начиная сверху */
export const LIFE_AREAS: LifeArea[] = [
  {
    id: 'health',
    short: 'Здоровье',
    rim: 'ЗДОРОВЬЕ И СПОРТ',
    title: 'Здоровье и спорт',
    color: '#e53935',
    emoji: '💪',
    hint: 'Тело, сон, движение, питание',
  },
  {
    id: 'family',
    short: 'Семья',
    rim: 'ОТНОШЕНИЯ С СЕМЬЁЙ',
    title: 'Отношения с семьёй и близкими',
    color: '#ef6c00',
    emoji: '❤️',
    hint: 'Близкие, забота, время вместе',
  },
  {
    id: 'friends',
    short: 'Друзья',
    rim: 'ДРУЗЬЯ И ОКРУЖЕНИЕ',
    title: 'Друзья и окружение',
    color: '#f9a825',
    emoji: '👥',
    hint: 'Общение, поддержка, среда',
  },
  {
    id: 'career',
    short: 'Карьера',
    rim: 'КАРЬЕРА И БИЗНЕС',
    title: 'Карьера и бизнес',
    color: '#7cb342',
    emoji: '💼',
    hint: 'Работа, проекты, рост в деле',
  },
  {
    id: 'finance',
    short: 'Финансы',
    rim: 'ФИНАНСОВАЯ ГРАМОТНОСТЬ',
    title: 'Финансовая грамотность',
    color: '#26a69a',
    emoji: '💰',
    hint: 'Деньги, учёт, накопления',
  },
  {
    id: 'spirit',
    short: 'Дух и творчество',
    rim: 'ДУХОВНОСТЬ И ТВОРЧЕСТВО',
    title: 'Духовность и творчество',
    color: '#1e88e5',
    emoji: '🎨',
    hint: 'Смысл, творчество, практика',
  },
  {
    id: 'growth',
    short: 'Саморазвитие',
    rim: 'САМОРАЗВИТИЕ',
    title: 'Саморазвитие',
    color: '#8e24aa',
    emoji: '📚',
    hint: 'Учёба, навыки, привычки роста',
  },
  {
    id: 'joy',
    short: 'Яркость жизни',
    rim: 'ЯРКОСТЬ ЖИЗНИ',
    title: 'Яркость жизни',
    color: '#ec407a',
    emoji: '✨',
    hint: 'Радость, впечатления, отдых',
  },
]

export function findLifeArea(id: LifeAreaId | undefined): LifeArea | undefined {
  if (!id) return undefined
  return LIFE_AREAS.find((a) => a.id === id)
}

export function isLifeAreaId(v: unknown): v is LifeAreaId {
  return typeof v === 'string' && LIFE_AREAS.some((a) => a.id === v)
}

/** Оценка аспекта = число привычек (макс. LIFE_AREA_MAX_HABITS) */
export function lifeAreaHabitScore(habitCount: number): number {
  return Math.max(0, Math.min(LIFE_AREA_MAX_HABITS, habitCount))
}

export function lifeAreaPillarIndex(areaId: LifeAreaId): number {
  return LIFE_AREAS.findIndex((a) => a.id === areaId)
}

export function lifeAreaByPillarIndex(index: number): LifeArea | undefined {
  return LIFE_AREAS[index]
}

/** Стабильный id цели, всегда привязанной к аспекту карты жизни */
export function lifeMapGoalId(areaId: LifeAreaId): string {
  return `g-life-map-${areaId}`
}

export function parseLifeMapGoalArea(goalId: string): LifeAreaId | undefined {
  if (!goalId.startsWith('g-life-map-')) return undefined
  const area = goalId.slice('g-life-map-'.length)
  return isLifeAreaId(area) ? area : undefined
}

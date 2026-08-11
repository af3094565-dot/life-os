export type {
  AchievementCategory,
  AchievementCondition,
  AchievementDefinition,
  AchievementEvent,
  AchievementEventType,
  AchievementRarity,
  AchievementState,
  AchievementTrigger,
  AchievementView,
} from '../../data/achievements/types'

/** Runtime-карточка достижения (как в UI / Steam-витрине) */
export type { AchievementView as Achievement } from '../../data/achievements/types'

export {
  ACHIEVEMENT_CATEGORY_LABELS,
  ACHIEVEMENT_RARITY_LABELS,
  ACHIEVEMENT_RARITY_XP,
  MAIN_EXPLORATION_PAGES,
} from '../../data/achievements/types'

export {
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_BY_ID,
  ACHIEVEMENTS_BY_EVENT,
  TOTAL_ACHIEVEMENTS,
  getAchievementDefinition,
} from '../../data/achievements/definitions'

export { ACHIEVEMENT_TITLES, findTitle } from '../../data/achievements/titles'

export {
  createEmptyAchievementState,
  normalizeAchievementState,
  type AchievementWorldSnapshot,
} from './state'

export {
  acknowledgeUnlocks,
  backfillAchievements,
  buildAchievementViews,
  getNearestAchievements,
  markNotificationsRead,
  pinAchievement,
  processAchievementEvents,
  rarityFlavor,
  setAchievementSound,
  setActiveTitle,
} from './engine'

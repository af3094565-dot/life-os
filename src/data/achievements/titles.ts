export type AchievementTitle = { id: string; label: string; emoji: string; description: string }
export const ACHIEVEMENT_TITLES: AchievementTitle[] = [{ id: 'novice', label: 'В своём ритме', emoji: '🌱', description: 'Двигается вперёд без гонки' }]
export function findTitle(id?: string) { return ACHIEVEMENT_TITLES.find(t => t.id === id) ?? ACHIEVEMENT_TITLES[0] }

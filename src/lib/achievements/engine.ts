import type { AchievementDefinition, AchievementEvent, AchievementState, AchievementView } from '../../data/achievements/types'
import { ACHIEVEMENT_DEFINITIONS, getAchievementDefinition } from '../../data/achievements/definitions.ts'
import { normalizeAchievementState, type AchievementWorldSnapshot } from './state.ts'

export type ProcessResult = { state: AchievementState; newlyUnlocked: string[]; diamondsDelta: number; xpDelta: number; newTitles: string[] }
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }

export function processAchievementEvents(raw: AchievementState, events: AchievementEvent[], snap: AchievementWorldSnapshot, silent = false): ProcessResult {
  const previous = normalizeAchievementState(raw)
  const now = events.at(-1)?.at ?? new Date().toISOString()
  const today = dateKey(new Date(now))
  let focus = previous.metrics.focus_minutes ?? 0
  for (const event of events) if (event.type === 'focus_completed') {
    const minutes = Number(event.payload?.minutes)
    if (Number.isFinite(minutes) && minutes > 0) focus += Math.min(180, minutes)
  }
  // Domain snapshots, not click counters, keep re-marking from farming milestones.
  const metrics = { actions_done: snap.actionsDone ?? snap.habitCompletionsTotal, active_days: snap.activeDays ?? 0,
    goals_done: snap.goalsCompleted, quests_done: snap.questsWon, focus_minutes: focus, comeback_done: snap.comebackDone ? 1 : 0 }
  const state: AchievementState = { ...previous, metrics, progress: {}, unlocked: { ...previous.unlocked }, history: [...previous.history], notifications: [...previous.notifications] }
  const newlyUnlocked: string[] = []
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (def.condition.type !== 'threshold') continue
    const current = metrics[def.condition.metric as keyof typeof metrics] ?? 0
    state.progress[def.id] = Math.min(current, def.condition.target)
    if (!state.unlocked[def.id] && current >= def.condition.target) {
      state.unlocked[def.id] = now
      state.history.unshift({ id: `badge-${def.id}`, achievementId: def.id, unlockedAt: now })
      state.notifications.unshift({ id: `badge-${def.id}`, achievementId: def.id, at: now, read: silent })
      newlyUnlocked.push(def.id)
    }
  }
  // One quiet celebration per day; every earned badge still appears in the collection.
  const eligible = !silent && newlyUnlocked.length > 0 && previous.lastCelebratedDay !== today
  state.pendingUnlocks = eligible ? [newlyUnlocked[0]] : previous.pendingUnlocks.filter(id => !!getAchievementDefinition(id))
  state.pendingBatch = []
  if (eligible) state.lastCelebratedDay = today
  return { state, newlyUnlocked, diamondsDelta: 0, xpDelta: 0, newTitles: [] }
}

export function backfillAchievements(state: AchievementState, snap: AchievementWorldSnapshot): ProcessResult {
  const result = processAchievementEvents(state, [], snap, true)
  return { ...result, state: { ...result.state, meta: { ...result.state.meta, backfilled: true }, pendingUnlocks: [], pendingBatch: [] } }
}
export function buildAchievementViews(raw: AchievementState): AchievementView[] {
  const state = normalizeAchievementState(raw)
  return ACHIEVEMENT_DEFINITIONS.map(def => ({ ...def, isUnlocked: !!state.unlocked[def.id], unlockedAt: state.unlocked[def.id], isSecretLocked: false,
    progress: !state.unlocked[def.id] && def.condition.type === 'threshold' ? { current: state.progress[def.id] ?? 0, target: def.condition.target } : undefined }))
}
export function acknowledgeUnlocks(state: AchievementState, ids: string[]): AchievementState { return { ...state, pendingUnlocks: state.pendingUnlocks.filter(id => !ids.includes(id)), pendingBatch: [] } }
export function pinAchievement(state: AchievementState, id: string): AchievementState {
  if (!state.unlocked[id] || !getAchievementDefinition(id)) return state
  return { ...state, pinnedIds: state.pinnedIds.includes(id) ? state.pinnedIds.filter(x => x !== id) : state.pinnedIds.length < 3 ? [...state.pinnedIds, id] : state.pinnedIds }
}
export function setActiveTitle(state: AchievementState, titleId: string): AchievementState { return state.unlockedTitleIds.includes(titleId) ? { ...state, activeTitleId: titleId } : state }
export function setAchievementSound(state: AchievementState, enabled: boolean): AchievementState { return { ...state, soundEnabled: enabled } }
export function markNotificationsRead(state: AchievementState): AchievementState { return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) } }
export function getNearestAchievements(state: AchievementState, limit = 3): AchievementView[] {
  return buildAchievementViews(state).filter(a => !a.isUnlocked && a.progress && a.progress.current > 0).sort((a,b) => b.progress!.current / b.progress!.target - a.progress!.current / a.progress!.target).slice(0, limit)
}
export function rarityFlavor(_rarity: AchievementDefinition['rarity']) { return 'Маленькая история твоего прогресса' }
export { getAchievementDefinition }

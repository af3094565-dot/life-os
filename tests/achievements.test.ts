import test from 'node:test'
import assert from 'node:assert/strict'
import { ACHIEVEMENT_DEFINITIONS } from '../src/data/achievements/definitions.ts'
import { createEmptyAchievementState, normalizeAchievementState } from '../src/lib/achievements/state.ts'
import { processAchievementEvents, backfillAchievements, acknowledgeUnlocks } from '../src/lib/achievements/engine.ts'
const snap = {habitCount:0,activeHabitCount:0,habitCompletionsTotal:0,habitStreak:0,goalCount:0,activeGoalCount:0,goalsCompleted:0,questsAccepted:0,questsWon:0,taskCount:0,activeTaskCount:0,tasksCompleted:0,diamonds:0,visitStreak:0,hasLifeMap:false,uniqueScheduledDays:0,habitLinkedToGoal:false}
const event = {type:'habit_completed' as const,at:'2026-09-17T12:00:00'}
test('collection has twelve distinct badges and no currency payouts',()=>{
  assert.equal(ACHIEVEMENT_DEFINITIONS.length,12)
  assert.equal(new Set(ACHIEVEMENT_DEFINITIONS.map(d=>d.id)).size,12)
  const result=processAchievementEvents(createEmptyAchievementState(),[event],{...snap,actionsDone:100,activeDays:30})
  assert.equal(result.diamondsDelta,0); assert.equal(result.xpDelta,0)
  assert.equal(result.state.pendingUnlocks.length,1)
})
test('repeated events without factual progress do not unlock badges',()=>{
  assert.equal(processAchievementEvents(createEmptyAchievementState(),[event,event],snap).newlyUnlocked.length,0)
  const first=processAchievementEvents(createEmptyAchievementState(),[event],{...snap,actionsDone:1})
  assert.equal(first.newlyUnlocked.length,1)
  assert.equal(processAchievementEvents(first.state,[event],{...snap,actionsDone:1}).newlyUnlocked.length,0)
})
test('celebration is limited to once daily while earned badges still persist',()=>{
  const first=processAchievementEvents(createEmptyAchievementState(),[event],{...snap,actionsDone:1})
  const second=processAchievementEvents(acknowledgeUnlocks(first.state,first.newlyUnlocked),[event],{...snap,actionsDone:25})
  assert.ok(second.newlyUnlocked.length>0); assert.equal(second.state.pendingUnlocks.length,0)
  const next=processAchievementEvents(second.state,[{...event,at:'2026-09-18T12:00:00'}],{...snap,actionsDone:100})
  assert.equal(next.state.pendingUnlocks.length,1)
})
test('backfill is silent and legacy rewards are archived',()=>{
  const state=normalizeAchievementState({unlocked:{old:'2026-01-01'},metrics:{focus_minutes:25}})
  assert.deepEqual(state.archive?.unlocked,{old:'2026-01-01'})
  assert.equal(state.soundEnabled,false)
  const result=backfillAchievements(state,{...snap,actionsDone:25})
  assert.ok(result.newlyUnlocked.length>0); assert.equal(result.state.pendingUnlocks.length,0)
})

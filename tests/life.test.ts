import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyLife, normalizeLife, syncLifeHistory } from '../src/lib/life/model.ts'
const habit = {id:'h',name:'English',createdAt:'2024-01-01T12:00:00',completions:{'2024-01-01':true},priority:'important',targetDays:21,startDate:'2024-01-01',timesPerWeek:7,emoji:'⭐'} as const
test('tracking defaults are opt-in and normalize repeatedly without losing disabled data',()=>{
 const l=emptyLife();assert.ok(l.indicators.every(i=>!i.enabled));l.days['2024-01-01']={rating:8}
 assert.deepEqual(normalizeLife(normalizeLife(l)),l)
})
test('deleting habit archives actual history and preserves direction',()=>{
 const initial=syncLifeHistory({habits:[habit]},{habits:[habit]},new Date('2024-01-02'))
 const removed=syncLifeHistory(initial,{...initial,habits:[]},new Date('2024-01-03'))
 assert.equal(removed.life?.archivedHabits[0].completions['2024-01-01'],true)
 assert.equal(removed.life?.directions.length,1)
 assert.equal(removed.life?.directions[0].versions.at(-1)?.archived,true)
})

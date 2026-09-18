import test from 'node:test'
import assert from 'node:assert/strict'
import { WORKSPACE_SECTIONS, PAGE_GUIDE, workspaceSection } from '../src/data/workspace.ts'
import { todayOverview, syncTaskMarks } from '../src/lib/todayOverview.ts'

test('every page has exactly one home and all contextual links resolve', () => {
  const pages = WORKSPACE_SECTIONS.flatMap(section => section.pages)
  assert.equal(new Set(pages).size, pages.length)
  assert.deepEqual([...pages].sort(), Object.keys(PAGE_GUIDE).sort())
  for (const page of pages) {
    assert.ok(pages.includes(PAGE_GUIDE[page].next))
    assert.ok(workspaceSection(page).pages.includes(page as never))
  }
  assert.equal(workspaceSection('planner-calendar').id, workspaceSection('habits').id)
  assert.equal(workspaceSection('quests').id, workspaceSection('goals').id)
  assert.equal(workspaceSection('achievements').id, workspaceSection('progress').id)
})

test('a task with a generated habit counts once; independent habits remain visible', () => {
  const quests = [
    { id: 'q1', habitId: 'h1', title: 'Reading', done: true, minutes: 10, xp: 10 },
    { id: 'q2', habitId: 'h2', title: 'Task', done: true, minutes: 10, xp: 10 },
  ]
  const result = todayOverview(quests, [{ habitId: 'h2', completedAt: '2026-09-17T10:00:00Z' }])
  assert.equal(result.total, 2)
  assert.equal(result.done, 2)
  assert.deepEqual(result.habits.map(h => h.id), ['q1'])
  assert.equal(todayOverview(quests, []).total, 2)
  assert.equal(todayOverview([], []).total, 0)
})

test('habit marks synchronize tasks only on their scheduled date, including undo', () => {
  const now = '2026-09-17T10:00:00Z'
  const tasks = [{ habitId: 'h1', scheduledFor: '2026-09-17' }, { habitId: 'h1', scheduledFor: '2026-09-18' }]
  const marked = syncTaskMarks(tasks, [{ id: 'h1', completions: { '2026-09-17': true } }], '2026-09-17', now)
  assert.equal(marked[0].completedAt, now)
  assert.equal(marked[1], tasks[1])
  assert.equal(syncTaskMarks(marked, [{ id: 'h1', completions: {} }], '2026-09-17', now)[0].completedAt, undefined)
  assert.equal(syncTaskMarks(marked, [{ id: 'h1', completions: { '2026-09-17': true } }], '2026-09-17', 'later')[0].completedAt, now)
})

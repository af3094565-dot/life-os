import type { Quest } from '../data/seed'

/** A planner task and its generated habit represent one action on its scheduled day. */
export function todayOverview<T extends { habitId: string; completedAt?: string }>(quests: Quest[], tasks: T[]) {
  const taskHabits = new Set(tasks.map(task => task.habitId))
  const habits = quests.filter(quest => !quest.habitId || !taskHabits.has(quest.habitId))
  const done = habits.filter(habit => habit.done).length + tasks.filter(task => task.completedAt).length
  return { habits, tasks, done, total: habits.length + tasks.length }
}

/** Keep the task checkbox consistent when its habit is marked in another section. */
export function syncTaskMarks<T extends { habitId: string; scheduledFor: string; completedAt?: string }>(
  tasks: T[], habits: { id: string; completions: Record<string, boolean> }[], date: string, now: string,
): T[] {
  const byId = new Map(habits.map(habit => [habit.id, habit]))
  return tasks.map(task => {
    const habit = byId.get(task.habitId)
    if (task.scheduledFor !== date || !habit) return task
    const completedAt = habit.completions[date] ? task.completedAt ?? now : undefined
    return completedAt === task.completedAt ? task : { ...task, completedAt }
  })
}

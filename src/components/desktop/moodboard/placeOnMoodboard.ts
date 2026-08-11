import {
  LIFE_AREAS,
  LIFE_GOALS_MAP_ID,
  lifeMapGoalId,
} from '../../../data/lifeMap'
import type { NewGoalInput, NewHabitInput, LifeOSState } from '../../../hooks/useLifeOS'
import { todayKey } from '../../../lib/habitLogic'
import { findEmptyStickerSlot } from './moodboardUtils'

export function isGoalOnMoodboard(state: LifeOSState, goalId: string) {
  return (state.desktop?.moodboard.stickers ?? []).some(
    (s) => s.kind === 'goal' && s.goalId === goalId,
  )
}

export function isHabitOnMoodboard(state: LifeOSState, habitId: string) {
  return (state.desktop?.moodboard.stickers ?? []).some((s) => s.habitId === habitId)
}

function ensureArrow(state: LifeOSState, fromStickerId: string, toStickerId: string) {
  const arrows = state.desktop?.moodboard.arrows ?? []
  const exists = arrows.some(
    (a) => a.fromStickerId === fromStickerId && a.toStickerId === toStickerId,
  )
  if (!exists) {
    state.addDesktopArrow({ fromStickerId, toStickerId })
  }
}

/** Если цель уже на мудборде — ставит привычку и стрелку (или только стрелку). */
export function ensureHabitOnMoodboardForGoal(
  state: LifeOSState,
  habitId: string,
  goalId: string | null | undefined,
) {
  if (!goalId || !isGoalOnMoodboard(state, goalId)) return

  const habit = state.habitsAll.find((h) => h.id === habitId)
  if (!habit) return

  const stickers = state.desktop?.moodboard.stickers ?? []
  const goalSticker = stickers.find((s) => s.kind === 'goal' && s.goalId === goalId)
  if (!goalSticker) return

  const existingHabitSticker = stickers.find((s) => s.habitId === habitId)
  if (existingHabitSticker) {
    ensureArrow(state, goalSticker.id, existingHabitSticker.id)
    return
  }

  placeHabitOnMoodboard(state, {
    habitId,
    name: habit.name,
    emoji: habit.emoji,
    goalId,
  })
}

/** Размещает цель (и опционально привычки) на мудборде в свободном месте. */
export function placeGoalOnMoodboard(
  state: LifeOSState,
  input: {
    goalId: string
    title: string
    habits?: Array<{ habitId: string; name: string; emoji: string }>
  },
) {
  if (isGoalOnMoodboard(state, input.goalId)) {
    for (const h of input.habits ?? []) {
      ensureHabitOnMoodboardForGoal(state, h.habitId, input.goalId)
    }
    return { ok: true as const }
  }

  const stickers = state.desktop?.moodboard.stickers ?? []
  const occupied: Array<{ x: number; y: number; width: number; height: number }> = []
  const goalSize = { width: 180, height: 110 }
  const goalPos = findEmptyStickerSlot(stickers, goalSize.width, goalSize.height, undefined, occupied)
  occupied.push({ ...goalPos, ...goalSize })

  const goalSticker = state.addDesktopSticker({
    x: goalPos.x,
    y: goalPos.y,
    text: input.title,
    color: '#c7d2fe',
    textColor: '#1a1a2e',
    kind: 'goal',
    goalId: input.goalId,
    width: goalSize.width,
    height: goalSize.height,
  })

  if (!goalSticker.ok || !goalSticker.stickerId) return goalSticker

  for (const h of input.habits ?? []) {
    const habitSize = { width: 150, height: 96 }
    const habitPos = findEmptyStickerSlot(
      stickers,
      habitSize.width,
      habitSize.height,
      { x: goalPos.x + goalSize.width / 2, y: goalPos.y + goalSize.height / 2 },
      occupied,
    )
    occupied.push({ ...habitPos, ...habitSize })
    const habitSticker = state.addDesktopSticker({
      x: habitPos.x,
      y: habitPos.y,
      text: h.name,
      color: '#bbf7d0',
      textColor: '#1a1a2e',
      kind: 'habit',
      habitId: h.habitId,
      emoji: h.emoji,
      width: habitSize.width,
      height: habitSize.height,
    })
    if (habitSticker.ok && habitSticker.stickerId) {
      state.addDesktopArrow({
        fromStickerId: goalSticker.stickerId,
        toStickerId: habitSticker.stickerId,
      })
    }
  }

  return { ok: true as const, stickerId: goalSticker.stickerId }
}

export function placeHabitOnMoodboard(
  state: LifeOSState,
  input: {
    habitId: string
    name: string
    emoji?: string
    goalId?: string
  },
) {
  if (isHabitOnMoodboard(state, input.habitId)) {
    if (input.goalId) ensureHabitOnMoodboardForGoal(state, input.habitId, input.goalId)
    return { ok: true as const }
  }

  const stickers = state.desktop?.moodboard.stickers ?? []
  const size = { width: 150, height: 96 }
  const preferred =
    input.goalId != null
      ? (() => {
          const goalSt = stickers.find((s) => s.kind === 'goal' && s.goalId === input.goalId)
          return goalSt
            ? { x: goalSt.x + goalSt.width / 2, y: goalSt.y + goalSt.height / 2 }
            : undefined
        })()
      : undefined
  const pos = findEmptyStickerSlot(stickers, size.width, size.height, preferred)

  const sticker = state.addDesktopSticker({
    x: pos.x,
    y: pos.y,
    text: input.name,
    color: '#bbf7d0',
    textColor: '#1a1a2e',
    kind: 'habit',
    habitId: input.habitId,
    emoji: input.emoji || '⭐',
    width: size.width,
    height: size.height,
  })

  if (sticker.ok && sticker.stickerId && input.goalId) {
    const goalSticker = (state.desktop?.moodboard.stickers ?? stickers).find(
      (s) => s.kind === 'goal' && s.goalId === input.goalId,
    ) ?? stickers.find((s) => s.kind === 'goal' && s.goalId === input.goalId)
    if (goalSticker) {
      state.addDesktopArrow({
        fromStickerId: goalSticker.id,
        toStickerId: sticker.stickerId,
      })
    }
  }

  return sticker
}

/** Колесо баланса: центр + 8 аспектов по кругу со стрелками. */
export function placeLifeMapOnMoodboard(state: LifeOSState) {
  const stickers = state.desktop?.moodboard.stickers ?? []
  if (stickers.some((s) => s.goalId === LIFE_GOALS_MAP_ID)) return { ok: true as const }

  const centerSize = { width: 170, height: 110 }
  const leafSize = { width: 140, height: 88 }
  const occupied: Array<{ x: number; y: number; width: number; height: number }> = []
  const centerPos = findEmptyStickerSlot(
    stickers,
    centerSize.width + 520,
    centerSize.height + 520,
    undefined,
    occupied,
  )
  // Центр найденного «большого» слота
  const cx = centerPos.x + (centerSize.width + 520) / 2
  const cy = centerPos.y + (centerSize.height + 520) / 2
  const centerRect = {
    x: cx - centerSize.width / 2,
    y: cy - centerSize.height / 2,
    ...centerSize,
  }
  occupied.push(centerRect)

  const centerSticker = state.addDesktopSticker({
    x: centerRect.x,
    y: centerRect.y,
    text: 'Колесо баланса',
    color: '#e9d5ff',
    textColor: '#1a1a2e',
    kind: 'goal',
    goalId: LIFE_GOALS_MAP_ID,
    width: centerSize.width,
    height: centerSize.height,
  })
  if (!centerSticker.ok || !centerSticker.stickerId) return centerSticker

  const radius = 260
  LIFE_AREAS.forEach((area, index) => {
    const angle = (index / LIFE_AREAS.length) * Math.PI * 2 - Math.PI / 2
    const lx = cx + Math.cos(angle) * radius - leafSize.width / 2
    const ly = cy + Math.sin(angle) * radius - leafSize.height / 2
    occupied.push({ x: lx, y: ly, ...leafSize })

    const leaf = state.addDesktopSticker({
      x: lx,
      y: ly,
      text: `${area.emoji} ${area.short}`,
      color: `${area.color}33`,
      textColor: '#1a1a2e',
      kind: 'goal',
      goalId: lifeMapGoalId(area.id),
      width: leafSize.width,
      height: leafSize.height,
    })
    if (leaf.ok && leaf.stickerId) {
      state.addDesktopArrow({
        fromStickerId: centerSticker.stickerId!,
        toStickerId: leaf.stickerId,
      })
    }
  })

  return { ok: true as const, stickerId: centerSticker.stickerId }
}

export function submitGoalWithMoodboardOption(
  state: LifeOSState,
  input: NewGoalInput,
  attachedHabits: Array<{ name: string; emoji: string }> | undefined,
  addToMoodboard: boolean | undefined,
) {
  const goalResult = state.addGoal(input)
  if (!goalResult.ok || !goalResult.goalId) return goalResult

  const createdHabits: Array<{ habitId: string; name: string; emoji: string }> = []
  for (const h of attachedHabits ?? []) {
    const habitResult = state.addHabit({
      name: h.name,
      emoji: h.emoji || '⭐',
      priority: 'important',
      targetDays: 21,
      startDate: todayKey(),
      timesPerWeek: 7,
      goalId: goalResult.goalId,
    })
    if (habitResult.ok && habitResult.habitId) {
      createdHabits.push({
        habitId: habitResult.habitId,
        name: h.name,
        emoji: h.emoji || '⭐',
      })
    }
  }

  if (addToMoodboard) {
    placeGoalOnMoodboard(state, {
      goalId: goalResult.goalId,
      title: input.title.trim(),
      habits: createdHabits,
    })
  }

  return goalResult
}

export function submitHabitWithMoodboardOption(
  state: LifeOSState,
  input: NewHabitInput,
  addToMoodboard: boolean | undefined,
) {
  const habitResult = state.addHabit(input)
  if (!habitResult.ok || !habitResult.habitId) return habitResult

  const shouldPlace =
    !!addToMoodboard || (!!input.goalId && isGoalOnMoodboard(state, input.goalId))

  if (shouldPlace) {
    placeHabitOnMoodboard(state, {
      habitId: habitResult.habitId,
      name: input.name.trim(),
      emoji: input.emoji,
      goalId: input.goalId,
    })
  }

  return habitResult
}

export function linkHabitToGoalWithMoodboard(
  state: LifeOSState,
  habitId: string,
  goalId: string | null,
) {
  state.linkHabitToGoal(habitId, goalId)
  if (goalId) ensureHabitOnMoodboardForGoal(state, habitId, goalId)
}

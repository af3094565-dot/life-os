import { useMemo, useState } from 'react'
import {
  LIFE_AREAS,
  LIFE_AREA_MAX_HABITS,
  LIFE_GOALS_MAP_ID,
  lifeAreaByPillarIndex,
  type LifeAreaId,
} from '../data/lifeMap'
import type { Goal, Habit } from '../data/seed'
import type { NewHabitInput } from '../hooks/useLifeOS'
import { DIAMOND, ECONOMY, formatDiamonds } from '../lib/economy'
import { cellAt, habitSlotKey, normalizeMatrix } from '../lib/mandala'
import { HabitFormModal } from './HabitFormModal'
import { Card } from './ui'

type Props = {
  goal: Goal | null
  habits: Habit[]
  diamonds: number
  hiddenAreas: LifeAreaId[]
  onAddHabit: (input: NewHabitInput) => { ok: boolean; reason?: string } | void
}

export function LifeGoalsMap({
  goal,
  habits,
  diamonds,
  hiddenAreas,
  onAddHabit,
}: Props) {
  const [slot, setSlot] = useState<{
    pillarIndex: number
    habitIndex: number
  } | null>(null)
  const [error, setError] = useState('')

  const matrix = useMemo(() => {
    const base = normalizeMatrix(
      goal?.matrix ?? {
        core: 'Колесо баланса',
        pillars: LIFE_AREAS.map((a) => a.short),
      },
    )
    // Аспекты всегда из справочника
    base.core = base.core.trim() || 'Колесо баланса'
    base.pillars = LIFE_AREAS.map((a) => a.short)
    // Подтянуть названия из реальных привычек
    for (let pi = 0; pi < 8; pi++) {
      const area = LIFE_AREAS[pi]
      const areaHabits = habits.filter((h) => h.lifeArea === area.id).slice(0, 8)
      for (let hi = 0; hi < 8; hi++) {
        base.habits[pi][hi] = areaHabits[hi]?.name ?? base.habits[pi][hi] ?? ''
      }
    }
    return base
  }, [goal, habits])

  const area = slot ? lifeAreaByPillarIndex(slot.pillarIndex) : undefined
  const areaCount = area
    ? habits.filter((h) => h.lifeArea === area.id).length
    : 0

  const openHabit = (pillarIndex: number, habitIndex: number) => {
    setError('')
    const a = lifeAreaByPillarIndex(pillarIndex)
    if (!a) return
    if (hiddenAreas.includes(a.id)) {
      setError(`Аспект «${a.short}» скрыт — покажи его, чтобы добавить привычку`)
      return
    }
    const existing = matrix.habits[pillarIndex]?.[habitIndex]?.trim()
    if (existing) {
      setError(`Ячейка занята: «${existing}»`)
      return
    }
    const count = habits.filter((h) => h.lifeArea === a.id).length
    if (count >= LIFE_AREA_MAX_HABITS) {
      setError(`В «${a.short}» уже ${LIFE_AREA_MAX_HABITS} привычек — максимум`)
      return
    }
    setSlot({ pillarIndex, habitIndex })
  }

  const submit = (input: NewHabitInput) => {
    if (!slot || !area) return { ok: false, reason: 'Нет ячейки' }
    const result = onAddHabit({
      ...input,
      lifeArea: area.id,
      goalId: `g-life-map-${area.id}`,
      fromLifeMap: true,
      matrixGoalId: LIFE_GOALS_MAP_ID,
      matrixSlot: habitSlotKey(slot.pillarIndex, slot.habitIndex),
    })
    if (result && !result.ok) return result
    setSlot(null)
    return { ok: true }
  }

  return (
    <Card className="animate-fade-up">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-ink">Карта целей · Колесо баланса</h3>
          <p className="mt-1 max-w-xl text-sm font-medium text-muted">
            Аспекты уже стоят в цветных квадратах. Нажми пустую ячейку вокруг
            аспекта и добавь привычку (−{formatDiamonds(ECONOMY.LIFE_MAP_HABIT_COST)}
            ).
          </p>
        </div>
        <div className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-ink ring-1 ring-sky-100">
          до {LIFE_AREA_MAX_HABITS} привычек / аспект
        </div>
      </div>

      <div className="mx-auto w-full max-w-[560px]">
        <div
          className="grid gap-0.5 rounded-xl bg-line p-0.5"
          style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))' }}
        >
          {Array.from({ length: 9 }, (_, row) =>
            Array.from({ length: 9 }, (_, col) => {
              const cell = cellAt(row, col)
              if (cell.kind === 'core') {
                return (
                  <div
                    key={`${row}-${col}`}
                    className="flex aspect-square items-center justify-center overflow-hidden rounded-sm bg-sky-100 px-0.5 text-center font-extrabold text-sky-950 ring-1 ring-sky-300"
                    title="Колесо баланса"
                  >
                    <span className="line-clamp-3 break-words text-[7px] leading-tight sm:text-[9px]">
                      {matrix.core}
                    </span>
                  </div>
                )
              }
              if (cell.kind === 'pillar') {
                const a = LIFE_AREAS[cell.pillarIndex]
                const hidden = hiddenAreas.includes(a.id)
                return (
                  <div
                    key={`${row}-${col}`}
                    title={hidden ? `${a.title} (скрыт)` : a.title}
                    className={`flex aspect-square flex-col items-center justify-center overflow-hidden rounded-sm px-0.5 text-center font-bold text-white ring-1 ring-black/10 ${
                      hidden ? 'opacity-35' : ''
                    }`}
                    style={{ background: a.color }}
                  >
                    <span className="text-[10px] sm:text-sm">{a.emoji}</span>
                    <span className="line-clamp-2 break-words text-[6px] leading-tight sm:text-[8px]">
                      {a.short}
                    </span>
                  </div>
                )
              }
              const a = LIFE_AREAS[cell.pillarIndex]
              const text = matrix.habits[cell.pillarIndex]?.[cell.habitIndex] ?? ''
              const hidden = hiddenAreas.includes(a.id)
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  disabled={hidden}
                  onClick={() => openHabit(cell.pillarIndex, cell.habitIndex)}
                  title={
                    text
                      ? text
                      : hidden
                        ? 'Аспект скрыт'
                        : `Привычка · ${a.short}`
                  }
                  className={`aspect-square overflow-hidden rounded-sm px-0.5 py-0.5 text-center font-medium ring-1 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-35`}
                  style={{
                    background: text ? `${a.color}22` : '#fff',
                    color: a.color,
                    boxShadow: `inset 0 0 0 1px ${a.color}55`,
                  }}
                >
                  <span className="line-clamp-3 break-words text-[7px] leading-tight sm:text-[9px]">
                    {text || '·'}
                  </span>
                </button>
              )
            }),
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {LIFE_AREAS.map((a) => {
          const count = habits.filter((h) => h.lifeArea === a.id).length
          const hidden = hiddenAreas.includes(a.id)
          return (
            <span
              key={a.id}
              className={`rounded-full px-2 py-1 text-[10px] font-bold text-white ${
                hidden ? 'opacity-40 line-through' : ''
              }`}
              style={{ background: a.color }}
            >
              {a.emoji} {a.short} · {count}/{LIFE_AREA_MAX_HABITS}
            </span>
          )
        })}
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}

      <HabitFormModal
        open={!!slot}
        onClose={() => setSlot(null)}
        onSubmit={submit}
        diamonds={diamonds}
        cost={ECONOMY.LIFE_MAP_HABIT_COST}
        lifeArea={area?.id}
        fromLifeMap
        lockGoal
        title={area ? `Привычка · ${area.short}` : 'Привычка'}
        defaultEmoji={area?.emoji ?? '⭐'}
      />

      {slot && area && areaCount >= LIFE_AREA_MAX_HABITS - 1 && (
        <p className="mt-2 text-center text-[11px] font-medium text-muted">
          В аспекте почти лимит ({areaCount}/{LIFE_AREA_MAX_HABITS}) · {DIAMOND}{' '}
          {ECONOMY.LIFE_MAP_HABIT_COST}
        </p>
      )}
    </Card>
  )
}

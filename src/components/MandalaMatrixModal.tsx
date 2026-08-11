import { useEffect, useId, useMemo, useState } from 'react'
import { Grid3x3, X } from 'lucide-react'
import type { Goal, Habit } from '../data/seed'
import type { NewHabitInput, NewGoalInput } from '../hooks/useLifeOS'
import {
  ECONOMY,
  canAfford,
  formatDiamonds,
  matrixCostHint,
} from '../lib/economy'
import {
  cellAt,
  filledHabitTitles,
  habitSlotKey,
  normalizeMatrix,
  pillarColor,
} from '../lib/mandala'
import { GoalFormModal } from './GoalFormModal'
import { HabitFormModal } from './HabitFormModal'

type Props = {
  open: boolean
  onClose: () => void
  diamonds: number
  /** Текущая карта (если уже создана) */
  goal: Goal | null
  habits: Habit[]
  onCreateGoal: (input: {
    title: string
    note?: string
  }) => { ok: boolean; reason?: string; goalId?: string }
  onSetPillar: (goalId: string, pillarIndex: number, title: string) => void
  onAddHabit: (input: NewHabitInput) => { ok: boolean; reason?: string } | void
  /** После создания цели — сообщить родителю id, чтобы подтянуть goal */
  onGoalCreated?: (goalId: string) => void
}

export function MandalaMatrixModal({
  open,
  onClose,
  diamonds,
  goal,
  habits: _habits,
  onCreateGoal,
  onSetPillar,
  onAddHabit,
  onGoalCreated,
}: Props) {
  const titleId = useId()
  const [goalFormOpen, setGoalFormOpen] = useState(false)
  const [habitSlot, setHabitSlot] = useState<{
    pillarIndex: number
    habitIndex: number
  } | null>(null)
  const [pillarEdit, setPillarEdit] = useState<number | null>(null)
  const [pillarDraft, setPillarDraft] = useState('')
  const [error, setError] = useState('')

  const matrix = useMemo(
    () => normalizeMatrix(goal?.matrix ?? { core: goal?.title ?? '' }),
    [goal],
  )
  const affordable = canAfford(diamonds, ECONOMY.MATRIX_COST)
  const filled = useMemo(() => filledHabitTitles(matrix), [matrix])

  useEffect(() => {
    if (!open) return
    setGoalFormOpen(false)
    setHabitSlot(null)
    setPillarEdit(null)
    setError('')
  }, [open, goal?.id])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pillarEdit != null) setPillarEdit(null)
        else if (habitSlot) setHabitSlot(null)
        else if (goalFormOpen) setGoalFormOpen(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, pillarEdit, habitSlot, goalFormOpen])

  if (!open) return null

  const cellText = (row: number, col: number): string => {
    const cell = cellAt(row, col)
    if (cell.kind === 'core') return matrix.core || goal?.title || ''
    if (cell.kind === 'pillar') return matrix.pillars[cell.pillarIndex] ?? ''
    return matrix.habits[cell.pillarIndex]?.[cell.habitIndex] ?? ''
  }

  const openCell = (row: number, col: number) => {
    setError('')
    const cell = cellAt(row, col)
    if (cell.kind === 'core') {
      if (!goal) {
        if (!affordable) {
          setError(matrixCostHint(diamonds))
          return
        }
        setGoalFormOpen(true)
        return
      }
      setError('Большая цель уже создана. Заполняй направления и привычки.')
      return
    }
    if (cell.kind === 'pillar') {
      if (!goal) {
        setError('Сначала нажми на центр и создай большую цель')
        return
      }
      setPillarDraft(matrix.pillars[cell.pillarIndex] ?? '')
      setPillarEdit(cell.pillarIndex)
      return
    }
    if (!goal) {
      setError('Сначала создай большую цель в центре')
      return
    }
    setHabitSlot({ pillarIndex: cell.pillarIndex, habitIndex: cell.habitIndex })
  }

  const submitMatrixGoal = (input: NewGoalInput) => {
    const result = onCreateGoal({ title: input.title, note: input.note })
    if (!result.ok) {
      setError(result.reason ?? 'Не удалось создать цель')
      return result
    }
    if (result.goalId) onGoalCreated?.(result.goalId)
    setGoalFormOpen(false)
    return { ok: true }
  }

  const submitMatrixHabit = (input: NewHabitInput) => {
    if (!goal || !habitSlot) return { ok: false, reason: 'Нет цели' }
    const slot = habitSlotKey(habitSlot.pillarIndex, habitSlot.habitIndex)
    const result = onAddHabit({
      ...input,
      goalId: goal.id,
      fromMatrix: true,
      matrixGoalId: goal.id,
      matrixSlot: slot,
    })
    if (result && !result.ok) return result
    setHabitSlot(null)
    return { ok: true }
  }

  const savePillar = () => {
    if (pillarEdit == null || !goal) return
    onSetPillar(goal.id, pillarEdit, pillarDraft)
    setPillarEdit(null)
  }

  const habitFormEmoji =
    habitSlot != null
      ? ['🎯', '💪', '🧠', '🏠', '📚', '💰', '❤️', '⚡'][habitSlot.pillarIndex]
      : '⭐'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[94dvh] w-full max-w-3xl flex-col rounded-t-2xl bg-surface shadow-xl ring-1 ring-line sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Карта цели</p>
            <h2 id={titleId} className="mt-0.5 text-lg font-extrabold text-ink">
              {goal?.title || 'Построй карту 9×9'}
            </h2>
            <p className="mt-1 text-sm font-medium text-muted">
              Центр — цель (−{ECONOMY.MATRIX_COST} алмазов). Цветные блоки — аспекты. Белые ячейки
              внутри цвета — привычки (бесплатно).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-canvas"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-5">
          {!goal && (
            <button
              type="button"
              onClick={() => {
                if (!affordable) setError(matrixCostHint(diamonds))
                else setGoalFormOpen(true)
              }}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-50 px-3 py-3 text-sm font-bold text-sky-950 ring-1 ring-sky-100 hover:bg-sky-100"
            >
              <Grid3x3 size={16} /> Нажми центр или сюда — создать цель · −
              {formatDiamonds(ECONOMY.MATRIX_COST)}
            </button>
          )}

          <div className="mx-auto w-full max-w-[560px]">
            <div
              className="grid gap-0.5 rounded-xl bg-line p-0.5"
              style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))' }}
            >
              {Array.from({ length: 9 }, (_, row) =>
                Array.from({ length: 9 }, (_, col) => {
                  const cell = cellAt(row, col)
                  const text = cellText(row, col)
                  let style =
                    'bg-white font-medium text-ink ring-line'
                  if (cell.kind === 'core') {
                    style =
                      'bg-sky-100 font-extrabold text-sky-950 ring-sky-300'
                  } else if (cell.kind === 'pillar') {
                    const c = pillarColor(cell.pillarIndex)
                    style = 'font-bold'
                    return (
                      <button
                        key={`${row}-${col}`}
                        type="button"
                        onClick={() => openCell(row, col)}
                        title={text || 'Направление / аспект'}
                        className={`aspect-square overflow-hidden rounded-sm px-0.5 py-0.5 text-center ring-1 transition hover:brightness-95 ${style}`}
                        style={{
                          background: c.bg,
                          color: c.text,
                          boxShadow: `inset 0 0 0 1px ${c.ring}`,
                        }}
                      >
                        <span className="line-clamp-3 break-words text-[7px] leading-tight sm:text-[9px]">
                          {text || '·'}
                        </span>
                      </button>
                    )
                  } else if (cell.kind === 'habit') {
                    const c = pillarColor(cell.pillarIndex)
                    return (
                      <button
                        key={`${row}-${col}`}
                        type="button"
                        onClick={() => openCell(row, col)}
                        title={text || 'Привычка этого аспекта'}
                        className="aspect-square overflow-hidden rounded-sm px-0.5 py-0.5 text-center font-medium ring-1 transition hover:brightness-95"
                        style={{
                          background: text ? c.soft : '#ffffff',
                          color: c.text,
                          boxShadow: `inset 0 0 0 1px ${c.ring}`,
                        }}
                      >
                        <span className="line-clamp-3 break-words text-[7px] leading-tight sm:text-[9px]">
                          {text || '·'}
                        </span>
                      </button>
                    )
                  }
                  return (
                    <button
                      key={`${row}-${col}`}
                      type="button"
                      onClick={() => openCell(row, col)}
                      title={text || 'Большая цель'}
                      className={`aspect-square overflow-hidden rounded-sm px-0.5 py-0.5 text-center ring-1 transition hover:ring-brand/50 ${style}`}
                    >
                      <span className="line-clamp-3 break-words text-[7px] leading-tight sm:text-[9px] md:text-[10px]">
                        {text || '·'}
                      </span>
                    </button>
                  )
                }),
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {Array.from({ length: 8 }, (_, i) => {
              const c = pillarColor(i)
              const name = matrix.pillars[i]?.trim() || `Аспект ${i + 1}`
              return (
                <span
                  key={i}
                  className="rounded-full px-2 py-1 text-[10px] font-bold"
                  style={{ background: c.bg, color: c.text }}
                >
                  {name}
                </span>
              )
            })}
          </div>

          <p className="mt-3 text-sm font-medium text-muted">
            Привычек на карте: {filled.length}
            {goal ? ` · привязаны к «${goal.title}»` : ''}
          </p>

          {error && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-deep"
          >
            Готово
          </button>
        </div>
      </div>

      <GoalFormModal
        open={goalFormOpen}
        onClose={() => setGoalFormOpen(false)}
        onSubmit={submitMatrixGoal}
        diamonds={diamonds}
        matrixMode
      />

      <HabitFormModal
        open={!!habitSlot}
        onClose={() => setHabitSlot(null)}
        onSubmit={submitMatrixHabit}
        diamonds={diamonds}
        cost={0}
        goals={goal ? [goal] : []}
        defaultGoalId={goal?.id}
        defaultEmoji={habitFormEmoji}
        title="Привычка карты цели"
        fromMatrix
        lockGoal
      />

      {pillarEdit != null && (
        <div
          className="absolute inset-0 z-20 flex items-end justify-center bg-ink/50 sm:items-center"
          onClick={savePillar}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              borderTop: `4px solid ${pillarColor(pillarEdit).ring}`,
            }}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Аспект {pillarEdit + 1}
            </p>
            <input
              value={pillarDraft}
              onChange={(e) => setPillarDraft(e.target.value)}
              placeholder="Например: физическая форма"
              inputMode="text"
              enterKeyHint="done"
              autoComplete="off"
              className="mt-2 w-full min-h-[48px] rounded-xl border border-line bg-canvas px-4 py-3.5 text-base font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button
              type="button"
              onClick={savePillar}
              className="mt-3 w-full min-h-[48px] rounded-xl bg-brand px-3 py-3 text-base font-bold text-white active:scale-[0.99]"
            >
              Сохранить аспект
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

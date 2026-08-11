import { useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'
import type { GoalStat } from '../hooks/useLifeOS'
import { nextOpenStage } from '../lib/goalLogic'

type Props = {
  open: boolean
  goal: GoalStat | null
  onClose: () => void
  onLogValue: (goalId: string, value: number, note?: string) => void
  onCompleteStage: (goalId: string, stageId: string, note?: string) => void
}

export function GoalCheckInModal({
  open,
  goal,
  onClose,
  onLogValue,
  onCompleteStage,
}: Props) {
  const titleId = useId()
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open || !goal) return
    setValue(goal.currentValue != null ? String(goal.currentValue) : '')
    setNote('')
  }, [open, goal?.id, goal?.currentValue])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !goal) return null

  const nextStage = nextOpenStage(goal.stages)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (goal.measureKind === 'number') {
      const n = Number(value)
      if (Number.isNaN(n)) return
      onLogValue(goal.id, n, note.trim() || undefined)
      onClose()
      return
    }
    if (goal.measureKind === 'stages' && nextStage) {
      onCompleteStage(goal.id, nextStage.id, note.trim() || undefined)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="animate-fade-up w-full max-w-md rounded-2xl bg-surface shadow-xl ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-extrabold text-ink">
              Отметить результат
            </h2>
            <p className="mt-0.5 text-sm font-medium text-muted">{goal.title}</p>
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

        <form onSubmit={submit} className="space-y-4 p-5">
          {goal.measureKind === 'number' && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                Текущее значение{goal.unit ? ` · ${goal.unit}` : ''}
              </label>
              <input
                autoFocus
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
              />
              {goal.targetValue != null && (
                <p className="mt-1 text-[11px] font-medium text-muted">
                  Цель: {goal.targetValue}
                  {goal.unit ? ` ${goal.unit}` : ''}
                </p>
              )}
            </div>
          )}

          {goal.measureKind === 'stages' && (
            <div className="rounded-xl bg-brand-soft/50 px-3 py-3 ring-1 ring-brand/15">
              {nextStage ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">
                    Следующий этап
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-ink">{nextStage.title}</p>
                  <p className="mt-1 text-[11px] font-medium text-muted">
                    Нажми «Готово» — этап засчитается, шкала сдвинется
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-ink">Все этапы уже отмечены</p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
              Комментарий
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Что изменилось — по желанию"
              className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted hover:bg-canvas"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={
                goal.measureKind === 'number'
                  ? value === '' || Number.isNaN(Number(value))
                  : !nextStage
              }
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-deep disabled:opacity-40"
            >
              {goal.measureKind === 'stages' ? 'Этап готов' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

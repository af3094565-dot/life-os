import { useEffect, useId, useState } from 'react'
import { Clock, X } from 'lucide-react'
import { habitDisplayCopy, questReward, type QuestTemplate } from '../data/questCatalog'
import { DIAMOND, formatDiamonds } from '../lib/economy'
import { formatReminderTime } from '../lib/reminders'

type Props = {
  template: QuestTemplate | null
  open: boolean
  onClose: () => void
  onConfirm: (reminderTime?: string) => void
}

export function AcceptQuestModal({ template, open, onClose, onConfirm }: Props) {
  const titleId = useId()
  const [time, setTime] = useState('23:00')

  useEffect(() => {
    if (!open || !template) return
    setTime(template.reminderDefault ?? '23:00')
  }, [open, template])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !template) return null

  const copy = habitDisplayCopy(template)

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
        className="w-full max-w-md rounded-t-2xl bg-surface p-5 shadow-xl ring-1 ring-line sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Настройка контракта</p>
            <h2 id={titleId} className="mt-1 text-lg font-extrabold text-ink">
              {template.emoji} {template.title}
            </h2>
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

        <div className="rounded-xl bg-canvas px-3 py-3 ring-1 ring-line">
          <p className="text-sm font-extrabold text-ink">В привычках: {copy.habitTitle}</p>
          <p className="mt-1 text-sm font-medium text-muted">{copy.habitTagline}</p>
        </div>

        {template.needsReminder && (
          <div className="mt-4">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              <Clock size={14} /> С какого времени напоминать на дашборде
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-base font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
            />
            <p className="mt-1.5 text-[12px] font-medium text-muted">
              После {formatReminderTime(time)} на дашборде появится напоминание, если день ещё не
              отмечен.
            </p>
          </div>
        )}

        <p className="mt-4 text-sm font-medium text-muted">
          Ставка {formatDiamonds(template.cost)} · награда {DIAMOND} {questReward(template.cost)}
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-muted hover:bg-canvas"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() =>
              onConfirm(template.needsReminder ? formatReminderTime(time) : undefined)
            }
            className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-deep"
          >
            Принять контракт
          </button>
        </div>
      </div>
    </div>
  )
}

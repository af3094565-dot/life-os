import { useEffect, useId } from 'react'
import { X } from 'lucide-react'
import type { Habit } from '../data/seed'

type Props = {
  open: boolean
  onClose: () => void
  habits: Habit[]
  onPick: (habitId: string) => void
  title?: string
}

export function AttachHabitModal({
  open,
  onClose,
  habits,
  onPick,
  title = 'Закрепить привычку',
}: Props) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

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
        className="animate-fade-up max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface shadow-xl ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-4">
          <h2 id={titleId} className="text-lg font-extrabold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {habits.length === 0 ? (
            <p className="py-6 text-center text-sm font-medium text-muted">
              Нет привычек, которые можно закрепить. Сначала создай привычку.
            </p>
          ) : (
            <ul className="space-y-1">
              {habits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(h.id)
                      onClose()
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-canvas"
                  >
                    <span className="text-lg">{h.emoji}</span>
                    <span className="flex-1 text-sm font-semibold text-ink">{h.name}</span>
                    <span className="text-xs font-bold text-muted">
                      {h.timesPerWeek}×/нед
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

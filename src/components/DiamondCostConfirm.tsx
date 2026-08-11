import { useEffect, useId } from 'react'
import { X } from 'lucide-react'
import { DIAMOND, formatDiamonds } from '../lib/economy'

type Props = {
  open: boolean
  title: string
  cost: number
  balance: number
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/** Прозрачное списание алмазов перед созданием */
export function DiamondCostConfirm({
  open,
  title,
  cost,
  balance,
  confirmLabel = 'Создать',
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId()
  const after = balance - cost
  const ok = after >= 0

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-t-2xl bg-surface p-5 shadow-xl ring-1 ring-line sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 id={titleId} className="text-lg font-extrabold text-ink">
            {DIAMOND} {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-muted hover:bg-canvas"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <ul className="space-y-2 text-sm font-medium text-ink">
          <li className="flex justify-between rounded-xl bg-canvas px-3 py-2.5">
            <span className="text-muted">Стоимость</span>
            <span className="font-extrabold">
              {formatDiamonds(cost)} {DIAMOND}
            </span>
          </li>
          <li className="flex justify-between rounded-xl bg-canvas px-3 py-2.5">
            <span className="text-muted">У тебя</span>
            <span className="font-extrabold">
              {formatDiamonds(balance)} {DIAMOND}
            </span>
          </li>
          <li className="flex justify-between rounded-xl bg-brand-soft px-3 py-2.5">
            <span className="font-bold text-brand">После останется</span>
            <span className={`font-extrabold ${ok ? 'text-ink' : 'text-danger'}`}>
              {formatDiamonds(Math.max(0, after))} {DIAMOND}
            </span>
          </li>
        </ul>

        {!ok && (
          <p className="mt-3 text-sm font-semibold text-danger">
            Не хватает алмазов. Выполни привычки или зайди несколько дней подряд.
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-muted hover:bg-canvas"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!ok}
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-deep disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

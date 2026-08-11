import { useEffect, useId } from 'react'
import { History, X } from 'lucide-react'
import {
  DIAMOND,
  formatDiamonds,
  formatTxAmount,
  formatTxTime,
  type DiamondTx,
} from '../lib/economy'

type Props = {
  open: boolean
  onClose: () => void
  diamonds: number
  history: DiamondTx[]
}

export function DiamondHistoryModal({ open, onClose, diamonds, history }: Props) {
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-2xl bg-surface shadow-xl ring-1 ring-line sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-lg ring-1 ring-sky-100">
              <History size={18} className="text-sky-700" />
            </div>
            <div>
              <h2 id={titleId} className="text-base font-extrabold text-ink">
                История алмазов
              </h2>
              <p className="mt-0.5 text-sm font-medium text-muted">
                Баланс: {DIAMOND} {formatDiamonds(diamonds)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-canvas hover:text-ink"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-muted">
              Пока пусто. Отмечай дни, покупай привычки и квесты — здесь появится история.
            </p>
          ) : (
            <ul className="space-y-1">
              {history.map((tx) => {
                const earn = tx.amount > 0
                return (
                  <li
                    key={tx.id}
                    className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-canvas"
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                        earn
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                          : 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
                      }`}
                    >
                      {earn ? '+' : '−'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{tx.label}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-muted">
                        {formatTxTime(tx.at)}
                        <span className="mx-1 text-line">·</span>
                        баланс {tx.balanceAfter}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-extrabold tabular-nums ${
                        earn ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatTxAmount(tx.amount)} {DIAMOND}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

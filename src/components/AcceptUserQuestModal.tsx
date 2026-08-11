import { useEffect, useId } from 'react'
import { X } from 'lucide-react'
import type { UserQuestListing } from '../data/seed'
import { DIAMOND, formatDiamonds, questCreatorCut } from '../lib/economy'
import { formatDurationLabel } from '../lib/questLogic'

type Props = {
  listing: UserQuestListing | null
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function AcceptUserQuestModal({ listing, open, onClose, onConfirm }: Props) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !listing) return null

  const cut = questCreatorCut(listing.price)

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
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              {listing.isMine ? 'Свой квест' : `От ${listing.authorName}`}
            </p>
            <h2 id={titleId} className="mt-1 text-lg font-extrabold text-ink">
              {listing.emoji} {listing.title}
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

        <p className="text-sm font-medium leading-relaxed text-muted">
          {listing.description}
        </p>

        <div className="mt-4 rounded-xl bg-canvas px-3 py-3 ring-1 ring-line">
          <p className="text-sm font-extrabold text-ink">
            Ставка {formatDiamonds(listing.price)} · награда {DIAMOND} {listing.reward}
          </p>
          <p className="mt-1 text-xs font-medium text-muted">
            {formatDurationLabel(listing.durationDays)} · цель {listing.target}
            {listing.kind === 'list' ? ` ${listing.listLabel ?? 'пункт'}` : ' дн.'}
          </p>
          {!listing.isMine && (
            <p className="mt-2 text-xs font-semibold text-ink/70">
              Автор получит {formatDiamonds(cut)} — отправь ему ссылку после покупки
            </p>
          )}
        </div>

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
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-deep"
          >
            Принять за {DIAMOND} {listing.price}
          </button>
        </div>
      </div>
    </div>
  )
}

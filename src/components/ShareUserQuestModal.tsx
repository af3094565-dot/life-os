import { useEffect, useId, useState } from 'react'
import { Check, Copy, Share2, X } from 'lucide-react'
import type { UserQuestListing } from '../data/seed'
import { DIAMOND, formatDiamonds, questCreatorCut } from '../lib/economy'
import { buildShareUrl } from '../lib/userQuestShare'

type Props = {
  listing: UserQuestListing | null
  open: boolean
  onClose: () => void
}

export function ShareUserQuestModal({ listing, open, onClose }: Props) {
  const titleId = useId()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setCopied(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !listing) return null

  const url = buildShareUrl(listing)
  const cut = questCreatorCut(listing.price)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const share = async () => {
    const text = `${listing.emoji} ${listing.title}\nЦена ${formatDiamonds(listing.price)} · награда ${formatDiamonds(listing.reward)}`
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, text, url })
        return
      }
    } catch {
      /* fall through */
    }
    await copy()
  }

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
              Поделиться квестом
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
          {listing.isMine ? (
            <>
              Отправь ссылку друзьям. Когда они купят квест, ты получишь{' '}
              <span className="font-extrabold text-ink">
                {DIAMOND} {formatDiamonds(cut)}
              </span>{' '}
              с каждой продажи (50%).
            </>
          ) : (
            <>
              Отправь ссылку — друг сможет принять этот квест. Автор «{listing.authorName}»
              получит {DIAMOND} {formatDiamonds(cut)} с продажи.
            </>
          )}
        </p>

        <div className="mt-4 break-all rounded-xl bg-canvas px-3 py-3 text-xs font-medium text-muted ring-1 ring-line">
          {url}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-canvas px-4 py-3 text-sm font-bold text-ink ring-1 ring-line"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Скопировано' : 'Копировать'}
          </button>
          <button
            type="button"
            onClick={share}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white"
          >
            <Share2 size={16} /> Поделиться
          </button>
        </div>
      </div>
    </div>
  )
}

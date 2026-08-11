import { useEffect } from 'react'
import { Trash2, X } from 'lucide-react'
import type { DesktopMoodboardSticker } from '../../../hooks/useLifeOS'

type Props = {
  open: boolean
  sticker: DesktopMoodboardSticker | null
  label: string
  /** Системную цель (колесо баланса) нельзя удалить из трекера */
  canDeleteEntity: boolean
  onClose: () => void
  onDeleteStickerOnly: () => void
  onDeleteFully: () => void
}

export function DeleteLinkedStickerModal({
  open,
  sticker,
  label,
  canDeleteEntity,
  onClose,
  onDeleteStickerOnly,
  onDeleteFully,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !sticker) return null

  const kindLabel = sticker.kind === 'goal' ? 'цель' : 'привычку'
  const kindTitle = sticker.kind === 'goal' ? 'цель' : 'привычка'

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-sticker-title"
        className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl ring-1 ring-line animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-danger">
            <Trash2 size={18} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <h2 id="delete-sticker-title" className="text-lg font-extrabold text-ink">
          Удалить {kindTitle}?
        </h2>
        <p className="mt-2 text-sm font-medium text-muted">
          «{label || 'Без названия'}» — удалить {kindLabel} полностью из трекера или только
          стикер с мудборда?
        </p>

        {!canDeleteEntity && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 ring-1 ring-amber-100">
            Это системная цель колеса баланса — из трекера её нельзя удалить. Можно убрать только
            стикер с доски.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {canDeleteEntity && (
            <button
              type="button"
              onClick={onDeleteFully}
              className="w-full rounded-xl bg-danger px-4 py-2.5 text-sm font-extrabold text-white hover:opacity-90"
            >
              Удалить всё
            </button>
          )}
          <button
            type="button"
            onClick={onDeleteStickerOnly}
            className="w-full rounded-xl bg-canvas px-4 py-2.5 text-sm font-extrabold text-ink ring-1 ring-line hover:bg-surface"
          >
            Удалить стикер
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl px-4 py-2 text-sm font-bold text-muted hover:text-ink"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}

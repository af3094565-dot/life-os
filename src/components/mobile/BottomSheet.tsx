import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  /** Extra classes on the sheet panel */
  className?: string
  /** Max height as CSS value, default ~90dvh */
  maxHeight?: string
  /** Show drag handle */
  handle?: boolean
  /** Hide header close button */
  hideClose?: boolean
  footer?: ReactNode
}

/**
 * Mobile-first bottom sheet. On `sm+` centers as a dialog.
 * Does NOT autofocus any input — keyboard only after user tap.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  className = '',
  maxHeight = 'min(90dvh, 640px)',
  handle = true,
  hideClose = false,
  footer,
}: Props) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`animate-sheet-up flex w-full max-w-lg flex-col rounded-t-2xl bg-surface shadow-xl ring-1 ring-line sm:rounded-2xl ${className}`}
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          touchStartY.current = e.touches[0]?.clientY ?? null
        }}
        onTouchEnd={(e) => {
          const start = touchStartY.current
          touchStartY.current = null
          if (start == null) return
          const end = e.changedTouches[0]?.clientY
          if (end != null && end - start > 80) onClose()
        }}
      >
        {handle && (
          <div className="flex shrink-0 justify-center pt-2 sm:hidden" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-line" />
          </div>
        )}

        {(title || !hideClose) && (
          <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-2 pt-3">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="text-lg font-extrabold text-ink">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-0.5 text-sm font-medium text-muted">{subtitle}</p>
              )}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                className="touch-target -mr-1 -mt-1 rounded-xl p-2.5 text-muted active:scale-95 hover:bg-canvas"
                aria-label="Закрыть"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

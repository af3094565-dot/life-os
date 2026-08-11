import { useEffect, useState } from 'react'
import { Check, Sparkles, X } from 'lucide-react'
import { DIAMOND, formatDiamonds } from '../lib/economy'

type Props = {
  open: boolean
  title: string
  subtitle?: string
  diamonds?: number
  streak?: number
  cta?: string
  onCta?: () => void
  onClose: () => void
}

/** Мгновенный фидбек после действия */
export function ActionToast({
  open,
  title,
  subtitle,
  diamonds,
  streak,
  cta,
  onCta,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open || cta) return
    const t = window.setTimeout(onClose, 2800)
    return () => window.clearTimeout(t)
  }, [open, cta, onClose])

  if (!open) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-4">
      <div className="pointer-events-auto animate-fade-up w-full max-w-sm rounded-2xl bg-ink px-4 py-3 text-white shadow-xl">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-ink">
            <Check size={16} strokeWidth={3} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">{title}</p>
            {subtitle && (
              <p className="mt-0.5 text-xs font-medium text-white/70">{subtitle}</p>
            )}
            {(diamonds != null || streak != null) && (
              <p className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                {diamonds != null && diamonds > 0 && (
                  <span className="rounded-lg bg-white/15 px-2 py-1">
                    +{formatDiamonds(diamonds)} {DIAMOND}
                  </span>
                )}
                {streak != null && streak > 0 && (
                  <span className="rounded-lg bg-white/15 px-2 py-1">
                    🔥 Серия: {streak} {streak === 1 ? 'день' : 'дней'}
                  </span>
                )}
              </p>
            )}
            {cta && onCta && (
              <button
                type="button"
                onClick={() => {
                  onCta()
                  onClose()
                }}
                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-extrabold text-ink"
              >
                <Sparkles size={12} />
                {cta}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function useActionToast() {
  const [toast, setToast] = useState<Omit<Props, 'open' | 'onClose'> | null>(null)
  return {
    toast,
    showToast: (t: Omit<Props, 'open' | 'onClose'>) => setToast(t),
    clearToast: () => setToast(null),
  }
}

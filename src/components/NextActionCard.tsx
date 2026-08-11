import type { ReactNode } from 'react'
import { ArrowRight, Play } from 'lucide-react'
import { Card } from './ui'

type Props = {
  title?: string
  action: string
  related?: string
  relatedHint?: string
  cta?: string
  onAction?: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  icon?: ReactNode
  className?: string
  done?: boolean
}

/**
 * Универсальная карточка «что сделать дальше» —
 * Dashboard, Goals, Habits, Quests, Progress, Life Map, Planner.
 */
export function NextActionCard({
  title = 'Следующий шаг',
  action,
  related,
  relatedHint,
  cta = 'Начать',
  onAction,
  secondaryLabel,
  onSecondary,
  icon,
  className = '',
  done = false,
}: Props) {
  return (
    <Card
      className={`border border-brand/15 bg-gradient-to-br from-brand-soft/40 to-surface ${className}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
        {done ? 'Готово' : title}
      </p>
      <div className="mt-2 flex items-start gap-3">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl ring-1 ring-line">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold leading-snug text-ink">{action}</p>
          {related && (
            <p className="mt-1.5 text-sm font-medium text-muted">
              {relatedHint ?? 'Связано с:'}{' '}
              <span className="font-bold text-ink">{related}</span>
            </p>
          )}
        </div>
      </div>
      {(onAction || onSecondary) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {onAction && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-base font-bold text-white shadow-sm transition hover:bg-brand-deep active:scale-[0.98]"
            >
              <Play size={14} fill="currentColor" />
              {cta}
            </button>
          )}
          {onSecondary && secondaryLabel && (
            <button
              type="button"
              onClick={onSecondary}
              className="inline-flex min-h-[48px] items-center gap-1 rounded-xl px-4 py-3 text-base font-bold text-muted hover:bg-canvas hover:text-ink"
            >
              {secondaryLabel}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}
    </Card>
  )
}

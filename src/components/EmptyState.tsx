import type { ReactNode } from 'react'
import { Card } from './ui'

type Props = {
  emoji: string
  title: string
  description: string
  cta?: string
  onCta?: () => void
  secondary?: string
  onSecondary?: () => void
  children?: ReactNode
  className?: string
}

/** Пустой экран: что это → зачем → что сделать */
export function EmptyState({
  emoji,
  title,
  description,
  cta,
  onCta,
  secondary,
  onSecondary,
  children,
  className = '',
}: Props) {
  return (
    <Card className={`py-12 text-center animate-fade-up ${className}`}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-2xl">
        {emoji}
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-muted">
        {description}
      </p>
      {(cta || secondary || children) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {cta && onCta && (
            <button
              type="button"
              onClick={onCta}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-deep"
            >
              {cta}
            </button>
          )}
          {secondary && onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted hover:bg-canvas hover:text-ink"
            >
              {secondary}
            </button>
          )}
          {children}
        </div>
      )}
    </Card>
  )
}

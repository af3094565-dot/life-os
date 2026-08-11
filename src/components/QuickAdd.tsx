import { useEffect, useId, useState } from 'react'
import { ListChecks, Plus, StickyNote, Target, X } from 'lucide-react'
import { CalendarCheck } from 'lucide-react'
import { blurActiveInput } from '../hooks/useKeyboardOpen'

export type QuickAddKind = 'goal' | 'habit' | 'task' | 'quest' | 'note'

type Props = {
  open: boolean
  onClose: () => void
  onPick: (kind: QuickAddKind) => void
  /** Скрыть Pro-пункты для free */
  hasSubscription?: boolean
}

const OPTIONS: {
  kind: QuickAddKind
  emoji: string
  label: string
  hint: string
  icon: typeof Target
  pro?: boolean
}[] = [
  {
    kind: 'goal',
    emoji: '🎯',
    label: 'Цель',
    hint: 'Куда хочешь прийти',
    icon: Target,
    pro: true,
  },
  {
    kind: 'habit',
    emoji: '🔥',
    label: 'Привычку',
    hint: 'Что повторять регулярно',
    icon: CalendarCheck,
  },
  {
    kind: 'task',
    emoji: '✓',
    label: 'Задачу',
    hint: 'Дело на сегодня или в план',
    icon: StickyNote,
  },
  {
    kind: 'quest',
    emoji: '⚔',
    label: 'Квест',
    hint: 'Испытание на срок с наградой',
    icon: ListChecks,
    pro: true,
  },
  {
    kind: 'note',
    emoji: '📝',
    label: 'Запись',
    hint: 'Идея на рабочий стол',
    icon: StickyNote,
  },
]

export function QuickAdd({
  open,
  onClose,
  onPick,
  hasSubscription = true,
}: Props) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    blurActiveInput()
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
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="animate-sheet-up w-full max-w-md rounded-t-2xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl ring-1 ring-line sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex justify-center sm:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-line" />
        </div>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-xl font-extrabold text-ink">
              Создать
            </h2>
            <p className="mt-1 text-sm font-medium text-muted">
              Выбери — дальше откроется короткий мастер
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-xl p-2.5 text-muted hover:bg-canvas"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        <ul className="space-y-2">
          {OPTIONS.map((o) => {
            const locked = Boolean(o.pro && !hasSubscription)
            return (
              <li key={o.kind}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(o.kind)
                    onClose()
                  }}
                  className="flex min-h-[56px] w-full items-center gap-3 rounded-xl bg-canvas px-3 py-3 text-left ring-1 ring-line transition active:scale-[0.99] hover:ring-brand/30"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg ring-1 ring-line">
                    {o.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-extrabold text-ink">
                      {o.label}
                      {locked && (
                        <span className="ml-2 text-[11px] font-bold text-brand">
                          Pro
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm font-medium text-muted">
                      {o.hint}
                    </span>
                  </span>
                  <Plus size={18} className="text-muted" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/** Desktop floating create — mobile uses center tab in MobileNav */
export function QuickAddFab({
  onClick,
  className = '',
}: {
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Добавить"
      className={`fixed bottom-8 right-8 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg transition hover:scale-105 hover:bg-brand-deep md:flex ${className}`}
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>
  )
}

export function useQuickAdd() {
  const [open, setOpen] = useState(false)
  return {
    open,
    openQuickAdd: () => setOpen(true),
    closeQuickAdd: () => setOpen(false),
    setQuickAddOpen: setOpen,
  }
}

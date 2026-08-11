import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export type WizardStep = {
  id: string
  title: string
  hint?: string
  content: ReactNode
}

type Props = {
  open: boolean
  title: string
  steps: WizardStep[]
  onClose: () => void
  /** Нижняя панель на последнем шаге (кнопка создать и т.п.) */
  lastFooter?: ReactNode
  /** Сброс шага при открытии */
  resetKey?: string | number | boolean
  /** Управляемый шаг (чтобы снаружи перейти к нужному полю) */
  step?: number
  onStepChange?: (step: number) => void
}

export function StepWizard({
  open,
  title,
  steps,
  onClose,
  lastFooter,
  resetKey,
  step: controlledStep,
  onStepChange,
}: Props) {
  const titleId = useId()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const ignoreScrollRef = useRef(false)
  const scrollTimerRef = useRef<number | null>(null)
  const [innerStep, setInnerStep] = useState(0)
  const total = Math.max(steps.length, 1)
  const step = Math.max(0, Math.min(total - 1, controlledStep ?? innerStep))
  const isLast = step >= total - 1
  const isFirst = step <= 0

  const setStep = (next: number) => {
    const clamped = Math.max(0, Math.min(total - 1, next))
    if (controlledStep === undefined) setInnerStep(clamped)
    onStepChange?.(clamped)
  }

  const scrollToStep = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const el = scrollerRef.current
    if (!el) return
    const width = el.clientWidth
    if (!width) return
    ignoreScrollRef.current = true
    if (scrollTimerRef.current != null) window.clearTimeout(scrollTimerRef.current)
    el.scrollTo({ left: index * width, behavior })
    scrollTimerRef.current = window.setTimeout(
      () => {
        ignoreScrollRef.current = false
        scrollTimerRef.current = null
      },
      behavior === 'smooth' ? 450 : 50,
    )
  }

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(total - 1, index))
    setStep(clamped)
    scrollToStep(clamped, 'smooth')
  }

  useEffect(() => {
    if (!open) return
    setStep(0)
    requestAnimationFrame(() => scrollToStep(0, 'auto'))
    return () => {
      if (scrollTimerRef.current != null) window.clearTimeout(scrollTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resetKey])

  useEffect(() => {
    if (controlledStep == null) return
    // Внешний jump (валидация) — прокрутить без отката через onScroll
    scrollToStep(step, 'smooth')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledStep])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && !isLast) goTo(step + 1)
      if (e.key === 'ArrowLeft' && !isFirst) goTo(step - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose, step, total, isLast, isFirst])

  if (!open) return null

  const onScroll = () => {
    if (ignoreScrollRef.current) return
    const el = scrollerRef.current
    if (!el || !el.clientWidth) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx !== step && idx >= 0 && idx < total) setStep(idx)
  }

  const current = steps[step]

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
        className="animate-fade-up flex h-[min(92dvh,640px)] w-full max-w-lg flex-col rounded-t-2xl bg-surface shadow-xl ring-1 ring-line sm:h-auto sm:max-h-[85vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-base font-extrabold text-ink">
              {title}
            </h2>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Шаг {step + 1} из {total}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-xl p-2.5 text-muted hover:bg-canvas hover:text-ink"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex shrink-0 gap-1.5 px-4 py-2">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Шаг ${i + 1}: ${s.title}`}
              onClick={() => goTo(i)}
              className={`h-1.5 flex-1 rounded-full transition ${
                i === step ? 'bg-brand' : i < step ? 'bg-brand/40' : 'bg-line'
              }`}
            />
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {steps.map((s) => (
              <div
                key={s.id}
                className="flex h-full w-full shrink-0 snap-center flex-col overflow-y-auto px-4 pb-3 pt-1"
              >
                <h3 className="text-lg font-extrabold text-ink">{s.title}</h3>
                {s.hint && (
                  <p className="mt-1 text-sm font-medium text-muted">{s.hint}</p>
                )}
                <div className="mt-4 flex-1">{s.content}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {isLast && lastFooter ? (
            lastFooter
          ) : (
            <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => goTo(step - 1)}
                    disabled={isFirst}
                    className="inline-flex min-h-[48px] items-center gap-1 rounded-xl px-3 py-2.5 text-base font-bold text-muted hover:bg-canvas disabled:opacity-30"
                  >
                    <ChevronLeft size={16} /> Назад
                  </button>
                  <p className="truncate text-center text-xs font-semibold text-muted">
                    {current?.title}
                  </p>
                  <button
                    type="button"
                    onClick={() => goTo(step + 1)}
                    disabled={isLast}
                    className="inline-flex min-h-[48px] items-center gap-1 rounded-xl bg-brand px-4 py-2.5 text-base font-bold text-white hover:bg-brand-deep disabled:opacity-30"
                  >
                    Далее <ChevronRight size={16} />
                  </button>
            </div>
          )}
          {isLast && lastFooter && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => goTo(step - 1)}
                className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-muted hover:bg-canvas"
              >
                <ChevronLeft size={16} /> Назад
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3 py-2 text-sm font-bold text-muted hover:bg-canvas"
              >
                Отмена
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

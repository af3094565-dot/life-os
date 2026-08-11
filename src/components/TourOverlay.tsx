import { useEffect, useLayoutEffect, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import type { TourStep } from '../data/tour'
import type { PageId } from '../data/seed'

type Rect = { top: number; left: number; width: number; height: number }

type Props = {
  steps: TourStep[]
  stepIndex: number
  page: PageId
  onNavigate: (page: PageId) => void
  onStepIndex: (index: number) => void
  onComplete: () => void
  onSkip: () => void
}

const PAD = 10

function readTargetRect(target: string): Rect | null {
  if (target === 'center') return null
  const nodes = document.querySelectorAll(`[data-tour="${target}"]`)
  for (const el of nodes) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    const style = window.getComputedStyle(el)
    if (style.visibility === 'hidden' || style.display === 'none') continue
    return {
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    }
  }
  return null
}

function clickTourTarget(target: string) {
  if (target === 'center') return
  const nodes = document.querySelectorAll(`[data-tour="${target}"]`)
  for (const el of nodes) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    if (el instanceof HTMLElement) {
      el.click()
      return
    }
  }
}

function queryVisibleTourTarget(target: string): Element | null {
  const nodes = document.querySelectorAll(`[data-tour="${target}"]`)
  for (const el of nodes) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    return el
  }
  return null
}

function navTargetToPage(target: string): PageId | null {
  const map: Record<string, PageId> = {
    'nav-dashboard': 'dashboard',
    'nav-desktop': 'desktop',
    'nav-planner': 'planner',
    'nav-calendar': 'planner-calendar',
    'nav-habits': 'habits',
    'nav-goals': 'goals',
    'nav-quests': 'quests',
    'nav-life-map': 'life-map',
    'nav-progress': 'progress',
  }
  return map[target] ?? null
}

function resolveGoPage(step: TourStep): PageId {
  return navTargetToPage(step.target) ?? step.page
}

export function TourOverlay({
  steps,
  stepIndex,
  page,
  onNavigate,
  onStepIndex,
  onComplete,
  onSkip,
}: Props) {
  const step = steps[stepIndex]
  const [hole, setHole] = useState<Rect | null>(null)

  useEffect(() => {
    if (!step) return
    // go — остаёмся на текущем экране, пока не нажмут «Перейти»
    if (step.action === 'go') return
    if (step.page !== page) onNavigate(step.page)
  }, [step, page, onNavigate])

  useLayoutEffect(() => {
    if (!step) return

    let cancelled = false
    let tries = 0

    const measure = () => {
      if (cancelled || !step) return
      const rect = readTargetRect(step.target)

      if (!rect && step.target !== 'center' && tries < 20) {
        tries += 1
        window.setTimeout(measure, 40)
        return
      }

      setHole(rect)
      if (rect) {
        queryVisibleTourTarget(step.target)?.scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
          behavior: 'smooth',
        })
      }
    }

    measure()
    const t = window.setTimeout(measure, 140)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelled = true
      window.clearTimeout(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step, page, stepIndex])

  useEffect(() => {
    if (!step || step.target === 'center') return
    if (step.action !== 'go' && step.action !== 'click') return

    const el = queryVisibleTourTarget(step.target)
    if (!el) return

    const onTargetClick = (e: Event) => {
      if (step.action === 'go') {
        onNavigate(resolveGoPage(step))
        advance()
        return
      }
      // Программный клик из CTA уже делает advance — здесь только живой клик пользователя
      if (step.action === 'click' && e.isTrusted) {
        window.setTimeout(() => advance(), 0)
      }
    }

    el.addEventListener('click', onTargetClick)
    return () => el.removeEventListener('click', onTargetClick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, stepIndex])

  if (!step) return null

  const isLast = stepIndex >= steps.length - 1
  const progress = `${stepIndex + 1} / ${steps.length}`

  function advance() {
    if (step!.action === 'done' || isLast) onComplete()
    else onStepIndex(stepIndex + 1)
  }

  const runCta = () => {
    if (step.action === 'go') {
      onNavigate(resolveGoPage(step))
      advance()
      return
    }
    if (step.action === 'click') {
      clickTourTarget(step.target)
      window.setTimeout(() => advance(), 0)
      return
    }
    if (step.action === 'done') {
      onComplete()
      return
    }
    advance()
  }

  const goBack = () => {
    if (stepIndex > 0) onStepIndex(stepIndex - 1)
  }

  // Затемнение ниже модалок (z-50), панель подсказки — выше
  const dim = 'pointer-events-auto absolute bg-ink/55'

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-40">
        {hole ? (
          <>
            <div
              className={dim}
              style={{ top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }}
            />
            <div
              className={dim}
              style={{
                top: hole.top + hole.height,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
            <div
              className={dim}
              style={{
                top: hole.top,
                left: 0,
                width: Math.max(0, hole.left),
                height: hole.height,
              }}
            />
            <div
              className={dim}
              style={{
                top: hole.top,
                left: hole.left + hole.width,
                right: 0,
                height: hole.height,
              }}
            />
            <div
              className="pointer-events-none absolute rounded-2xl ring-[3px] ring-brand"
              style={{
                top: hole.top,
                left: hole.left,
                width: hole.width,
                height: hole.height,
                boxShadow: '0 0 0 6px rgba(123, 63, 228, 0.28)',
              }}
            />
          </>
        ) : (
          <div className={`${dim} inset-0`} />
        )}
      </div>

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
        className="fixed bottom-0 right-0 z-[80] flex max-h-[min(72vh,560px)] w-full flex-col rounded-t-2xl bg-surface p-5 shadow-2xl ring-1 ring-line animate-fade-up sm:bottom-4 sm:right-4 sm:top-4 sm:max-h-[calc(100vh-2rem)] sm:w-[340px] sm:rounded-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="rounded-lg bg-brand-soft px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-brand">
            Обучение · {progress}
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink"
            aria-label="Пропустить обучение"
          >
            <X size={16} />
          </button>
        </div>

        <h3 id="tour-step-title" className="text-lg font-extrabold text-ink">
          {step.title}
        </h3>
        <p className="mt-2 flex-1 overflow-auto text-sm font-medium leading-relaxed text-muted">
          {step.body}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={runCta}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-extrabold text-white hover:bg-brand-deep"
          >
            {step.cta}
            {(step.action === 'go' || step.action === 'click') && (
              <ArrowRight size={16} />
            )}
          </button>
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="w-full rounded-xl bg-canvas px-4 py-2.5 text-sm font-bold text-ink ring-1 ring-line hover:bg-surface"
            >
              Назад
            </button>
          )}
        </div>
      </aside>
    </>
  )
}

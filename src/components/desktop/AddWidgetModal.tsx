import { X, Plus, Grid3x3, Trophy, Target, KanbanSquare, Type } from 'lucide-react'
import type { ComponentType } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { DesktopWidgetSize, DesktopWidgetType } from '../../hooks/useLifeOS'

type Props = {
  open: boolean
  onClose: () => void
  onAdd: (type: DesktopWidgetType, size: DesktopWidgetSize) => void
}

const SIZES: Array<{ size: DesktopWidgetSize; label: string; hint: string }> = [
  { size: 'minimal', label: 'S', hint: 'Компактно' },
  { size: 'medium', label: 'M', hint: 'Баланс' },
  { size: 'large', label: 'L', hint: 'Максимум' },
]

const WIDGETS: Array<{
  type: DesktopWidgetType
  label: string
  hint: string
  icon: ComponentType<{ size?: number }>
}> = [
  {
    type: 'habits',
    label: 'Трекер привычек',
    hint: 'Что делать сегодня',
    icon: (props) => <Trophy {...props} />,
  },
  {
    type: 'goals',
    label: 'Мои цели',
    hint: 'Активные цели и прогресс',
    icon: (props) => <Target {...props} />,
  },
  {
    type: 'planner',
    label: 'Планировщик',
    hint: 'Задачи и фокус',
    icon: (props) => <KanbanSquare {...props} />,
  },
  {
    type: 'moodboard',
    label: 'Мудборд',
    hint: 'Стикеры и стрелки',
    icon: (props) => <Grid3x3 {...props} />,
  },
]

export function AddWidgetModal({ open, onClose, onAdd }: Props) {
  const [selectedType, setSelectedType] = useState<DesktopWidgetType>('habits')
  const [selectedSize, setSelectedSize] = useState<DesktopWidgetSize>('medium')

  useEffect(() => {
    if (!open) return
    // Логика дефолта: мудборд выгоднее сразу брать большим
    setSelectedSize(selectedType === 'moodboard' ? 'large' : 'medium')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const selected = useMemo(() => WIDGETS.find((w) => w.type === selectedType) ?? WIDGETS[0], [selectedType])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-t-2xl bg-surface p-4 shadow-xl ring-1 ring-line sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Добавить виджет</p>
            <h2 className="mt-1 truncate text-lg font-extrabold text-ink">{selected.label}</h2>
            <p className="mt-1 text-sm font-medium text-muted">{selected.hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-ink ring-1 ring-line"
            aria-label="Закрыть"
            title="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_280px]">
          <div className="rounded-2xl border border-line bg-canvas/40 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Type size={16} className="text-muted" />
                <p className="text-sm font-extrabold text-ink">Выбор</p>
              </div>
            </div>

            <div className="space-y-2">
              {WIDGETS.map((w) => {
                const active = w.type === selectedType
                return (
                  <button
                    key={w.type}
                    type="button"
                    onClick={() => setSelectedType(w.type)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-brand/50 bg-brand/15'
                        : 'border-line bg-canvas/30 hover:bg-canvas/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand ring-1 ring-brand/25">
                          <w.icon size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-ink">{w.label}</div>
                          <div className="mt-1 text-[11px] font-medium text-muted">{w.hint}</div>
                        </div>
                      </div>
                      {active && <span className="text-xs font-extrabold text-brand">Выбран</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-canvas/40 p-3">
            <p className="text-sm font-extrabold text-ink">Размер</p>
            <p className="mt-1 text-xs font-medium text-muted">Определяет объём функций</p>

            <div className="mt-3 space-y-2">
              {SIZES.map((s) => {
                const active = s.size === selectedSize
                return (
                  <button
                    key={s.size}
                    type="button"
                    onClick={() => setSelectedSize(s.size)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                      active
                        ? 'border-brand/50 bg-brand/15'
                        : 'border-line bg-canvas/30 hover:bg-canvas/50'
                    }`}
                  >
                    <span className="text-brand">{s.label}</span>
                    <span className="text-xs font-medium text-muted">{s.hint}</span>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                onAdd(selectedType, selectedSize)
                onClose()
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-extrabold text-white hover:bg-brand-deep"
            >
              <Plus size={16} />
              Добавить виджет
            </button>
          </div>
        </div>

        <div className="mt-3 text-[11px] font-medium text-muted">
          Подсказка: виджеты можно переставлять в режиме “Редактировать” на странице.
        </div>
      </div>
    </div>
  )
}


import type { ComponentType } from 'react'
import { Grid3x3, Pencil, Plus, Target } from 'lucide-react'
import type { DesktopWidgetType } from '../../hooks/useLifeOS'

const WIDGETS: Array<{
  type: DesktopWidgetType
  label: string
  hint: string
  icon: ComponentType<{ size?: number }>
}> = [
  { type: 'habits', label: 'Трекер', hint: 'Привычки на сегодня', icon: Target },
  { type: 'goals', label: 'Цели', hint: 'Активные цели + чек-ин', icon: Target },
  { type: 'planner', label: 'Планировщик', hint: 'Задачи и фокус', icon: Pencil },
  { type: 'moodboard', label: 'Мудборд', hint: 'Стикеры + стрелки', icon: Grid3x3 },
]

export function WidgetLibrary({
  onAdd,
}: {
  onAdd: (type: DesktopWidgetType) => void
}) {
  return (
    <div className="w-full rounded-2xl border border-line bg-surface p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-ink">Виджеты</p>
      </div>

      <div className="space-y-2">
        {WIDGETS.map((w) => {
          const Icon = w.icon
          return (
            <div key={w.type} className="rounded-xl bg-canvas/50 p-3 ring-1 ring-line">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon size={16} />
                    <p className="truncate text-sm font-bold text-ink">{w.label}</p>
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-muted">{w.hint}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onAdd(w.type)}
                  className="inline-flex items-center gap-1 rounded-xl bg-brand-soft px-2.5 py-2 text-xs font-bold text-brand ring-1 ring-brand/20 hover:bg-brand-soft/70"
                >
                  <Plus size={14} /> Добавить
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


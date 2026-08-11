import type { ComponentType } from 'react'
import {
  CalendarCheck,
  CircleDot,
  Grid3x3,
  KanbanSquare,
  ListChecks,
  Pencil,
  Plus,
  Target,
  TrendingUp,
  LayoutDashboard,
  Trophy,
} from 'lucide-react'
import type { DesktopWidgetType } from '../../hooks/useLifeOS'

const WIDGETS: Array<{
  type: DesktopWidgetType
  label: string
  hint: string
  icon: ComponentType<{ size?: number }>
}> = [
  {
    type: 'dashboard',
    label: 'Сегодня',
    hint: 'Главный фокус дня — что сделать прямо сейчас',
    icon: LayoutDashboard,
  },
  {
    type: 'habits',
    label: 'Привычки',
    hint: 'Что отметить сегодня — прямо на столе',
    icon: CalendarCheck,
  },
  {
    type: 'goals',
    label: 'Цели',
    hint: 'Куда идёшь и сколько уже пройдено',
    icon: Target,
  },
  {
    type: 'planner',
    label: 'План дня',
    hint: 'Задачи и фокус-блоки на сегодня',
    icon: KanbanSquare,
  },
  {
    type: 'quests',
    label: 'Квесты',
    hint: 'Активные испытания и прогресс по ним',
    icon: ListChecks,
  },
  {
    type: 'life-map',
    label: 'Карта жизни',
    hint: 'Сферы жизни — где проседает баланс',
    icon: CircleDot,
  },
  {
    type: 'progress',
    label: 'Прогресс',
    hint: 'Получается ли? Короткий срез результата',
    icon: TrendingUp,
  },
  {
    type: 'achievements',
    label: 'Достижения',
    hint: 'Коллекция, ближайшие ачивки и completion %',
    icon: Trophy,
  },
  {
    type: 'moodboard',
    label: 'Мудборд',
    hint: 'Идеи, цели и привычки — связать стрелками',
    icon: Pencil,
  },
]

export function WidgetLibrary({
  onAdd,
}: {
  onAdd: (type: DesktopWidgetType) => void
}) {
  return (
    <div className="w-full rounded-2xl border border-line bg-surface p-3">
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-ink">Что добавить на стол?</p>
      </div>
      <p className="mb-3 text-[11px] font-medium text-muted">
        Каждый виджет — кусочек Life OS, который хочешь видеть каждый день.
      </p>

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
        <div className="rounded-xl bg-canvas/30 p-3 text-[11px] font-medium text-muted ring-1 ring-dashed ring-line">
          <div className="mb-1 flex items-center gap-2 font-bold text-ink">
            <Grid3x3 size={14} /> Совет
          </div>
          Перетаскивай виджеты, меняй размер углами. Лишнее — удали. Стол только твой.
        </div>
      </div>
    </div>
  )
}

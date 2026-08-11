import { useMemo, useState } from 'react'
import { Card } from '../components/ui'
import type { LifeOSState } from '../hooks/useLifeOS'
import type { DesktopWidgetType, DesktopWidgetSize } from '../hooks/useLifeOS'
import { DesktopGrid } from '../components/desktop/DesktopGrid'
import type { PageId } from '../data/seed'
import { AddWidgetModal } from '../components/desktop/AddWidgetModal'
import { Plus } from 'lucide-react'

type Props = { state: LifeOSState; userName: string; onNavigate: (page: PageId) => void }

const WIDGET_OPEN_NAV: Record<DesktopWidgetType, PageId | null> = {
  habits: 'habits',
  goals: 'goals',
  planner: 'planner',
  moodboard: null,
  dashboard: 'dashboard',
  quests: 'quests',
  'life-map': 'life-map',
  progress: 'progress',
}

export function DesktopPage({ state, userName: _userName, onNavigate }: Props) {
  const [editMode, setEditMode] = useState(false)
  const [addWidgetOpen, setAddWidgetOpen] = useState(false)

  const widgets = useMemo(() => state.desktop?.layout.widgets ?? [], [state.desktop?.layout.widgets])

  return (
    <div>
      <div className="mb-5 rounded-2xl bg-surface p-4 shadow-[0_1px_3px_rgba(26,26,46,0.04)] ring-1 ring-line animate-fade-up">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Life OS</p>
            <h1 className="mt-1 text-lg font-extrabold text-ink md:text-[20px]">Мой рабочий стол</h1>
            <p className="mt-1 text-sm font-medium text-muted">Перетаскивай виджеты, меняй размер и собирай мудборд.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAddWidgetOpen(true)}
              data-tour="desktop-add-widget"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-deep"
            >
              <Plus size={16} /> Добавить виджет
            </button>

            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold ring-1 transition ${
                editMode
                  ? 'bg-brand-soft text-brand ring-brand/30'
                  : 'bg-canvas text-ink ring-line hover:bg-surface'
              }`}
            >
              {editMode ? 'Готово' : 'Редактировать'}
            </button>
          </div>
        </div>
      </div>

      <DesktopGrid
        widgets={widgets}
        editMode={editMode}
        state={state}
        onMoveWidget={(widgetId, targetWidgetId) => state.moveDesktopWidget(widgetId, targetWidgetId)}
        onRemoveWidget={(widgetId) => state.removeDesktopWidget(widgetId)}
        onSetWidgetSize={(widgetId, size: DesktopWidgetSize) => state.setDesktopWidgetSize(widgetId, size)}
        onOpenWidget={(widgetId) => {
          const widget = widgets.find((w) => w.id === widgetId)
          if (!widget) return
          const page = WIDGET_OPEN_NAV[widget.type]
          if (page) onNavigate(page)
        }}
      />

      {widgets.length === 0 && (
        <Card className="mt-4 animate-fade-up bg-transparent">
          <p className="text-sm font-medium text-muted">
            Сетка пустая — нажми «Добавить виджет» и выбери, что закрепить на рабочем столе.
          </p>
        </Card>
      )}

      <AddWidgetModal
        open={addWidgetOpen}
        onClose={() => setAddWidgetOpen(false)}
        onAdd={(type, size) => {
          state.addDesktopWidget(type, size)
        }}
      />
    </div>
  )
}


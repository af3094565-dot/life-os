import { Grid3x3, Plus, Trash2 } from 'lucide-react'
import type {
  DesktopWidgetInstance,
  DesktopWidgetType,
  DesktopWidgetSize,
  LifeOSState,
} from '../../hooks/useLifeOS'
import { MoodboardWidget } from './moodboard/MoodboardWidget'
import { ProgressBar } from '../../components/ui'

function widgetTitle(type: DesktopWidgetType) {
  switch (type) {
    case 'habits':
      return 'Трекер (привычки)'
    case 'goals':
      return 'Цели'
    case 'planner':
      return 'Планировщик'
    case 'moodboard':
      return 'Мудборд'
    case 'dashboard':
      return 'Дашборд'
    case 'quests':
      return 'Квесты'
    case 'life-map':
      return 'Карта жизни'
    case 'progress':
      return 'Прогресс'
  }
}

export function WidgetCard({
  widget,
  state,
  editMode,
  onRemove,
  onSetSize,
  onOpen,
}: {
  widget: DesktopWidgetInstance
  state: LifeOSState
  editMode: boolean
  onRemove: () => void
  onSetSize: (size: DesktopWidgetSize) => void
  onOpen: () => void
}) {
  return (
    <div
      className={`h-full rounded-2xl bg-surface p-3 shadow-[0_1px_3px_rgba(26,26,46,0.04)] ring-1 ring-line transition ${
        editMode ? 'hover:ring-brand/30' : ''
      }`}
      onDoubleClick={() => onOpen()}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Grid3x3 size={16} className="text-muted" />
            <p className="truncate text-sm font-extrabold text-ink">{widgetTitle(widget.type)}</p>
          </div>
          <p className="mt-1 text-[11px] font-medium text-muted">
            Версия: <span className="font-bold text-brand">{widget.size}</span>
          </p>
        </div>

        {editMode ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-danger"
            aria-label="Удалить виджет"
            title="Удалить виджет"
          >
            <Trash2 size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
            aria-label="Открыть"
            title="Открыть"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      <div className="min-h-[120px]">
        {widget.type === 'moodboard' ? (
          <MoodboardWidget
            widgetSize={widget.size}
            moodboard={state.desktop?.moodboard ?? { stickers: [], arrows: [] }}
            addSticker={state.addDesktopSticker}
            updateSticker={state.updateDesktopSticker}
            deleteSticker={state.deleteDesktopSticker}
            addArrow={state.addDesktopArrow}
            updateArrow={state.updateDesktopArrow}
            deleteArrow={state.deleteDesktopArrow}
            updateView={state.updateDesktopMoodboardView}
            habits={state.habitsAll}
            goals={state.goals}
            diamonds={state.diamonds}
            addGoal={state.addGoal}
            addHabit={state.addHabit}
            convertStickerToGoal={state.convertDesktopStickerToGoal}
            convertStickerToHabit={state.convertDesktopStickerToHabit}
            convertGoalChildrenToHabits={state.convertMoodboardGoalChildrenToHabits}
            updateHabit={state.updateHabit}
            updateGoal={state.updateGoal}
            deleteHabit={state.deleteHabit}
            deleteGoal={state.deleteGoal}
          />
        ) : widget.type === 'habits' ? (
          <HabitsWidgetPreview widgetSize={widget.size} state={state} />
        ) : widget.type === 'goals' ? (
          <GoalsWidgetPreview widgetSize={widget.size} state={state} />
        ) : (
          <WidgetPreview type={widget.type} size={widget.size} />
        )}
      </div>

      {editMode && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(['minimal', 'medium', 'large'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSetSize(s)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition ${
                widget.size === s
                  ? 'bg-brand-soft text-brand ring-brand/30'
                  : 'bg-canvas text-muted ring-line hover:text-ink'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function WidgetPreview({ type, size }: { type: DesktopWidgetType; size: DesktopWidgetSize }) {
  const common = <span className="text-sm font-semibold text-muted">Превью · MVP</span>
  return (
    <div className="h-full">
      <div className="rounded-xl bg-canvas/50 px-3 py-3 ring-1 ring-line">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
          {type} · {size}
        </div>
        <div className="mt-2">{common}</div>
        <div className="mt-2 text-xs font-medium text-muted leading-relaxed">
          В этом размере позже появится расширенный функционал. Сейчас — базовая интеграция.
        </div>
      </div>
    </div>
  )
}

function HabitsWidgetPreview({ widgetSize, state }: { widgetSize: DesktopWidgetSize; state: LifeOSState }) {
  const reminders = state.habitReminders
  const warnings = state.warnings
  const yesterday = state.yesterdayMissed
  const todayDone = state.todayDone
  const todayTotal = state.todayTotal
  const dayComplete =
    state.quests.length > 0 &&
    state.quests.every((q) => q.done) &&
    (todayTotal === 0 || todayDone >= todayTotal)

  const nextPending = state.nextQuest && !state.nextQuest.done ? state.nextQuest : null

  if (widgetSize === 'minimal') {
    return (
      <div className="rounded-xl bg-canvas/50 px-3 py-3 ring-1 ring-line">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Прогресс дня</div>
            <div className="mt-1 text-lg font-extrabold text-ink">{state.todayPct}%</div>
          </div>
          <div className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-extrabold text-brand ring-1 ring-brand/20">
            {todayDone}/{todayTotal}
          </div>
        </div>
        <div className="mt-3 text-sm font-semibold text-ink">
          {dayComplete ? 'На сегодня всё' : nextPending ? `Следующий шаг: ${nextPending.title}` : 'Добавь первую привычку'}
        </div>
        {reminders.length > 0 && (
          <div className="mt-2 text-xs font-bold text-muted">
            Напоминаний сегодня: <span className="text-brand">{reminders.length}</span>
          </div>
        )}
      </div>
    )
  }

  if (widgetSize === 'medium') {
    return (
      <div className="rounded-xl bg-canvas/50 p-3 ring-1 ring-line">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Напоминания</div>
            <div className="mt-1 text-sm font-extrabold text-ink">{reminders.length} шт.</div>
          </div>
          <div className="rounded-full bg-canvas px-2 py-1 text-[11px] font-bold text-muted ring-1 ring-line">
            {state.todayPct}%
          </div>
        </div>

        {reminders.length === 0 ? (
          <div className="mt-3 text-xs font-medium text-muted leading-relaxed">Сегодня без напоминаний — самое время начать маленький шаг.</div>
        ) : (
          <ul className="mt-3 space-y-2">
            {reminders.slice(0, 3).map((r) => (
              <li key={r.habitId} className="flex items-start justify-between gap-3 rounded-xl bg-surface/70 px-3 py-2 ring-1 ring-line">
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold text-ink">{r.emoji} {r.name}</div>
                  {r.tagline && <div className="mt-1 truncate text-[11px] font-medium text-muted">{r.tagline}</div>}
                </div>
                <div className="shrink-0 rounded-full bg-canvas px-2 py-1 text-[11px] font-bold text-muted ring-1 ring-line">{r.reminderTime}</div>
              </li>
            ))}
            {reminders.length > 3 && (
              <li className="text-xs font-bold text-muted">Ещё {reminders.length - 3}…</li>
            )}
          </ul>
        )}
      </div>
    )
  }

  // large
  return (
    <div className="rounded-xl bg-canvas/50 p-3 ring-1 ring-line">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Сводка</div>
          <div className="mt-1 text-sm font-extrabold text-ink">{dayComplete ? 'День закрыт' : 'Фокус на сейчас'}</div>
        </div>
        <div className="text-xs font-bold text-muted">
          Вчера пропущено: <span className="text-brand">{yesterday.length}</span>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-muted">Загруженность</span>
          <span className="text-xs font-extrabold text-brand">{state.todayFocusBlocks}/{state.focusSettings.dailyFocusCap} блоков</span>
        </div>
        <ProgressBar value={state.focusLoadPct} className="mt-1" />
      </div>

      <div className="mt-3">
        <div className="text-xs font-bold text-muted">Напоминания</div>
        {reminders.length === 0 ? (
          <div className="mt-2 text-xs font-medium text-muted leading-relaxed">Без напоминаний. Проверь прогресс и выбери следующий шаг.</div>
        ) : (
          <ul className="mt-2 space-y-2">
            {reminders.slice(0, 6).map((r) => (
              <li key={r.habitId} className="rounded-xl bg-surface/70 px-3 py-2 ring-1 ring-line">
                <div className="text-sm font-extrabold text-ink">{r.emoji} {r.name}</div>
                <div className="mt-1 text-[11px] font-medium text-muted">{r.reminderTime}{r.tagline ? ` · ${r.tagline}` : ''}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-bold text-muted">Предупреждения</div>
          <div className="mt-2 space-y-1">
            {warnings.slice(0, 2).map((w) => (
              <div key={`${w.habitId}-${w.kind}`} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-900/80 ring-1 ring-rose-100">
                {w.emoji} {w.name}: {w.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GoalsWidgetPreview({ widgetSize, state }: { widgetSize: DesktopWidgetSize; state: LifeOSState }) {
  const activeGoals = [
    ...(state.lifeGoalsMapStat?.status === 'active' ? [state.lifeGoalsMapStat] : []),
    ...state.customGoalStats.filter((g) => g.status === 'active'),
  ]
  const activeGoal = activeGoals[0]
  const goalHabitIds = new Set(activeGoal?.habits.map((h) => h.id) ?? [])
  const goalQuests = activeGoal ? state.quests.filter((q) => q.habitId && goalHabitIds.has(q.habitId)) : []

  if (widgetSize === 'minimal') {
    if (!activeGoal) {
      return (
        <div className="rounded-xl bg-canvas/50 p-3 ring-1 ring-line">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Цели</div>
          <div className="mt-2 text-sm font-extrabold text-ink">Целей пока нет</div>
          <div className="mt-1 text-xs font-medium text-muted leading-relaxed">Создай цель и закрепи привычки — прогресс появится здесь.</div>
        </div>
      )
    }

    return (
      <div className="rounded-xl bg-canvas/50 p-3 ring-1 ring-line">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Активная цель</div>
            <div className="mt-1 truncate text-sm font-extrabold text-ink">{activeGoal.title}</div>
          </div>
          <div className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-extrabold text-brand ring-1 ring-brand/20">
            {activeGoal.progress}%
          </div>
        </div>
        <div className="mt-2 text-xs font-medium text-muted">
          Сегодня {activeGoal.todayDone}/{activeGoal.todayTotal} привычек
        </div>
      </div>
    )
  }

  if (widgetSize === 'medium') {
    if (!activeGoal) {
      return (
        <div className="rounded-xl bg-canvas/50 p-3 ring-1 ring-line">
          <div className="text-sm font-extrabold text-ink">Целей пока нет</div>
          <div className="mt-1 text-xs font-medium text-muted leading-relaxed">Добавь цель и прикрепи привычки.</div>
        </div>
      )
    }
    return (
      <div className="rounded-xl bg-canvas/50 p-3 ring-1 ring-line">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Активная цель</div>
            <div className="mt-1 text-sm font-extrabold text-ink">{activeGoal.title}</div>
            {activeGoal.metricLabel && <div className="mt-1 text-[11px] font-bold text-brand">{activeGoal.metricLabel}</div>}
          </div>
          <div className="shrink-0 rounded-full bg-canvas px-2 py-1 text-[11px] font-bold text-muted ring-1 ring-line">{activeGoal.progress}%</div>
        </div>
        <div className="mt-3">
          <ProgressBar value={activeGoal.progress} />
          <div className="mt-2 text-xs font-medium text-muted">
            Сегодня {activeGoal.todayDone}/{activeGoal.todayTotal} · {activeGoal.habitCount} привычек
          </div>
        </div>
        {goalQuests.length > 0 && (
          <div className="mt-3 rounded-xl bg-surface px-3 py-2 ring-1 ring-line">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">План цели на сегодня</div>
            <div className="mt-2 space-y-1">
              {goalQuests.slice(0, 3).map((q) => (
                <div key={q.id} className="flex items-center justify-between gap-2 text-xs font-medium">
                  <span className={q.done ? 'text-muted line-through' : 'text-ink'}>{q.title}</span>
                  <span className={q.done ? 'text-muted' : 'text-brand'}>{q.minutes} мин</span>
                </div>
              ))}
              {goalQuests.length > 3 && <div className="text-[11px] font-bold text-muted">Ещё {goalQuests.length - 3}…</div>}
            </div>
          </div>
        )}
      </div>
    )
  }

  // large
  return (
    <div className="rounded-xl bg-canvas/50 p-3 ring-1 ring-line">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Активные цели</div>
          <div className="mt-1 text-sm font-extrabold text-ink">{activeGoals.length}</div>
        </div>
        {activeGoal ? (
          <div className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-extrabold text-brand ring-1 ring-brand/20">
            {activeGoal.progress}%
          </div>
        ) : (
          <div className="rounded-full bg-canvas px-2 py-1 text-xs font-extrabold text-muted ring-1 ring-line">
            0%
          </div>
        )}
      </div>

      {activeGoals.length === 0 ? (
        <div className="mt-3 text-xs font-medium text-muted leading-relaxed">Добавь цель, чтобы закрепление привычек превратилось в видимый прогресс.</div>
      ) : (
        <div className="mt-3 space-y-3">
          {activeGoals.slice(0, 4).map((g) => (
            <div key={g.id} className="rounded-xl bg-surface px-3 py-2 ring-1 ring-line">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-extrabold text-ink">{g.title}</div>
                  {g.metricLabel && <div className="mt-1 text-[11px] font-bold text-brand">{g.metricLabel}</div>}
                </div>
                <div className="shrink-0 text-xs font-extrabold text-brand">{g.progress}%</div>
              </div>
              <div className="mt-2">
                <ProgressBar value={g.progress} />
              </div>
              <div className="mt-2 text-[11px] font-medium text-muted">
                Сегодня {g.todayDone}/{g.todayTotal}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


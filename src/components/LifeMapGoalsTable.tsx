import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  findLifeArea,
  LIFE_AREA_MAX_HABITS,
  lifeAreaHabitScore,
  type LifeAreaId,
} from '../data/lifeMap'
import type { GoalStat } from '../hooks/useLifeOS'
import { elapsedStats } from '../lib/habitLogic'
import { Card, ProgressBar } from './ui'

type Props = {
  goals: GoalStat[]
  hiddenAreas?: LifeAreaId[]
  onAddHabit: (goalId: string) => void
  onEditHabit: (habitId: string) => void
  onDeleteHabit: (habitId: string) => void
  onToggleHide?: (areaId: LifeAreaId) => void
  /** Компактный заголовок без лишнего текста */
  compact?: boolean
  onOpenLifeMap?: () => void
  /** Показывать скрытые аспекты серыми */
  showHidden?: boolean
}

export function LifeMapGoalsTable({
  goals,
  hiddenAreas = [],
  onAddHabit,
  onEditHabit,
  onDeleteHabit,
  onToggleHide,
  compact = false,
  onOpenLifeMap,
  showHidden = true,
}: Props) {
  const rows = goals.filter((g) => {
    if (!g.lifeArea) return false
    if (showHidden) return true
    return !hiddenAreas.includes(g.lifeArea)
  })

  return (
    <Card className="animate-fade-up overflow-hidden !p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div>
          <h3 className="text-base font-extrabold text-ink">Таблица целей · Карта жизни</h3>
          {!compact && (
            <p className="mt-1 max-w-xl text-sm font-medium text-muted">
              Оценка = число привычек (макс. {LIFE_AREA_MAX_HABITS}). Скрывай аспекты, которые
              сейчас не в фокусе.
            </p>
          )}
        </div>
        {onOpenLifeMap && (
          <button
            type="button"
            onClick={onOpenLifeMap}
            className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900 ring-1 ring-sky-100 hover:bg-sky-100"
          >
            Открыть колесо
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-canvas/80 text-[11px] font-bold uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5 sm:px-5">Аспект</th>
              <th className="w-28 px-2 py-2.5">Привычки</th>
              <th className="px-2 py-2.5">Список</th>
              <th className="w-36 px-4 py-2.5 text-right sm:px-5"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => {
              const area = findLifeArea(g.lifeArea)
              if (!area) return null
              const hidden = hiddenAreas.includes(area.id)
              const score = lifeAreaHabitScore(g.habits.length)
              const pct = Math.round((score / LIFE_AREA_MAX_HABITS) * 100)
              return (
                <tr
                  key={g.id}
                  className={`border-b border-line last:border-b-0 align-top ${
                    hidden ? 'opacity-45' : ''
                  }`}
                >
                  <td className="px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
                        style={{ background: `${area.color}18` }}
                      >
                        {area.emoji}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-ink">
                          {area.short}
                          {hidden ? ' · скрыт' : ''}
                        </p>
                        <p className="truncate text-[11px] font-medium text-muted">{area.hint}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold text-white"
                      style={{ background: area.color }}
                    >
                      {score}/{LIFE_AREA_MAX_HABITS}
                    </span>
                    <div className="mt-1.5 w-16">
                      <ProgressBar value={pct} className="!h-1" />
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    {g.habits.length === 0 ? (
                      <p className="text-sm font-medium text-muted">Пока пусто</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {g.habits.map((h) => {
                          const donePct = elapsedStats(h).pct
                          return (
                            <li
                              key={h.id}
                              className="flex items-center gap-2 rounded-lg bg-canvas px-2 py-1.5"
                            >
                              <span className="text-sm">{h.emoji}</span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-ink">{h.name}</p>
                                <p className="text-[10px] font-bold text-muted">
                                  {donePct}% · {h.timesPerWeek}×/нед
                                </p>
                              </div>
                              <button
                                type="button"
                                title="Редактировать"
                                onClick={() => onEditHabit(h.id)}
                                className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                title="Удалить"
                                onClick={() => {
                                  if (confirm(`Удалить привычку «${h.name}»?`)) {
                                    onDeleteHabit(h.id)
                                  }
                                }}
                                className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-danger"
                              >
                                <Trash2 size={14} />
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right sm:px-5">
                    <div className="inline-flex flex-wrap justify-end gap-1.5">
                      {onToggleHide && (
                        <button
                          type="button"
                          onClick={() => onToggleHide(area.id)}
                          title={hidden ? 'Показать аспект' : 'Скрыть аспект'}
                          className="rounded-xl bg-canvas px-2.5 py-1.5 text-xs font-bold text-muted ring-1 ring-line hover:text-ink"
                        >
                          {hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={hidden || g.habits.length >= LIFE_AREA_MAX_HABITS}
                        onClick={() => onAddHabit(g.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-brand px-2.5 py-1.5 text-xs font-bold text-white hover:bg-brand-deep disabled:opacity-40"
                      >
                        <Plus size={14} /> Добавить
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

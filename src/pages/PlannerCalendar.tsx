import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Header } from '../components/Header'
import { MONTH_NAMES, type PageId } from '../data/seed'
import type { LifeOSState } from '../hooks/useLifeOS'
import { formatRuDate, isDueOnDate, toDateKey } from '../lib/habitLogic'
import { Card } from '../components/ui'

type CalendarItem =
  | { date: string; time?: string; type: 'task'; id: string; label: string; done: boolean; meta: string }
  | { date: string; time?: string; type: 'habit'; id: string; label: string; done: boolean; meta: string }
  | { date: string; time?: string; type: 'goal'; id: string; label: string; done: boolean; meta: string }

type Props = { state: LifeOSState; userName: string; onNavigate: (page: PageId) => void }

export function PlannerCalendarPage({ state, userName, onNavigate }: Props) {
  const [view, setView] = useState<'day' | 'week' | 'month'>('month')
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()))
  const [selectedItem, setSelectedItem] = useState<
    | { type: 'task'; id: string }
    | { type: 'habit'; id: string }
    | { type: 'goal'; id: string }
    | null
  >(null)
  const [draggingItem, setDraggingItem] = useState<{ type: CalendarItem['type']; id: string } | null>(null)

  const sortItems = (items: CalendarItem[]) =>
    [...items].sort((a, b) => {
      const left = a.time ?? '99:99'
      const right = b.time ?? '99:99'
      if (left !== right) return left.localeCompare(right)
      return a.label.localeCompare(b.label, 'ru')
    })

  const calendarItems = useMemo(() => {
    const tasks = state.plannerTasksDetailed.map((task) => ({
      date: task.scheduledFor,
      type: 'task' as const,
      id: task.id,
      label: task.title,
      time: task.scheduledTime,
      done: !!task.completedAt,
      meta: `${task.focusBlocks} блок.`,
    }))
    const habits = state.habitsAll.flatMap((habit) => {
      const dates = new Set<string>()
      const daysInMonth = new Date(state.year, state.month + 1, 0).getDate()
      for (let day = 1; day <= daysInMonth; day += 1) {
        const key = toDateKey(new Date(state.year, state.month, day))
        if (isDueOnDate(habit, key) || habit.completions[key]) dates.add(key)
      }
      return Array.from(dates).map((date) => ({
        date,
        type: 'habit' as const,
        id: habit.id,
        label: `${habit.emoji} ${habit.name}`,
        time: habit.reminderTime,
        done: !!habit.completions[date],
        meta: `${habit.timesPerWeek}×/нед`,
      }))
    })
    const goals = state.goalStats.map((goal) => ({
      date: goal.scheduledFor ?? toDateKey(new Date(goal.createdAt)),
      type: 'goal' as const,
      id: goal.id,
      label: goal.title,
      time: goal.scheduledTime,
      done: goal.status === 'done',
      meta: `цель · ${goal.progress}%`,
    }))
    return sortItems([...tasks, ...goals, ...habits])
  }, [state.goalStats, state.habitsAll, state.month, state.plannerTasksDetailed, state.year])

  const itemsByDate = useMemo(() => {
    const map = new Map<string, typeof calendarItems>()
    calendarItems.forEach((item) => {
      const list = map.get(item.date) ?? []
      list.push(item)
      map.set(item.date, list)
    })
    return map
  }, [calendarItems])

  const selectedTask =
    selectedItem?.type === 'task'
      ? state.plannerTasksDetailed.find((task) => task.id === selectedItem.id) ?? null
      : null
  const selectedHabit =
    selectedItem?.type === 'habit'
      ? state.habitsAll.find((habit) => habit.id === selectedItem.id) ?? null
      : null
  const selectedGoal =
    selectedItem?.type === 'goal'
      ? state.goalStats.find((goal) => goal.id === selectedItem.id) ?? null
      : null

  const monthDays = Array.from(
    { length: new Date(state.year, state.month + 1, 0).getDate() },
    (_, index) => new Date(state.year, state.month, index + 1),
  )
  const firstDay = (new Date(state.year, state.month, 1).getDay() + 6) % 7
  const lead = Array.from({ length: firstDay }, () => null)
  const cells = [...lead, ...monthDays]

  const shiftMonth = (direction: -1 | 1) => {
    const date = new Date(state.year, state.month + direction, 1)
    state.setMonth(date.getFullYear(), date.getMonth())
  }

  const moveItemToDate = (item: CalendarItem, date: string) => {
    if (item.date === date) return
    if (item.type === 'task') state.reschedulePlannerTask(item.id, date)
    if (item.type === 'habit') state.rescheduleHabit(item.id, date)
    if (item.type === 'goal') state.rescheduleGoal(item.id, date)
    setSelectedDate(date)
  }

  const selectedDateObj = new Date(`${selectedDate}T12:00:00`)
  const selectedDayItems = itemsByDate.get(selectedDate) ?? []
  const weekStart = new Date(selectedDateObj)
  weekStart.setDate(selectedDateObj.getDate() - ((selectedDateObj.getDay() + 6) % 7))
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    return date
  })
  const hours = Array.from({ length: 18 }, (_, index) => index + 6)

  return (
    <div>
      <Header
        greeting="Календарь"
        subtitle="Чистый месяц и таймлайн дня для задач, целей и планов"
        streak={state.streak}
        diamonds={state.diamonds}
        visitStreak={state.visitStreak}
        diamondHistory={state.diamondHistory ?? []}
        userName={userName}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl bg-canvas p-1 ring-1 ring-line">
          {([
            ['day', 'День'],
            ['week', 'Неделя'],
            ['month', 'Месяц'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                view === id ? 'bg-brand text-white' : 'text-muted hover:bg-surface hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="text-sm font-semibold text-muted">
          {view === 'month'
            ? 'Нажми на день, чтобы открыть таймлайн'
            : view === 'week'
              ? 'Неделя вокруг выбранной даты'
              : formatRuDate(selectedDate)}
        </div>
      </div>

      {view === 'month' && (
        <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
          <Card className="animate-fade-up">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-extrabold text-ink">Календарь планировщика</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded-xl bg-canvas p-2 ring-1 ring-line hover:bg-surface"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="min-w-[150px] text-center text-sm font-extrabold text-ink">
                {MONTH_NAMES[state.month]} {state.year}
              </div>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded-xl bg-canvas p-2 ring-1 ring-line hover:bg-surface"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-2">
            {cells.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="min-h-[88px] rounded-2xl bg-canvas/50" />
              }
              const key = toDateKey(date)
              const items = itemsByDate.get(key) ?? []
              const active = selectedDate === key
              return (
                <div
                  key={key}
                  onClick={() => {
                    setSelectedDate(key)
                    setView('day')
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    const payload = event.dataTransfer.getData('text/calendar-item')
                    if (!payload) return
                    try {
                      const parsed = JSON.parse(payload) as { type: CalendarItem['type']; id: string }
                      const item = calendarItems.find(
                        (entry) => entry.type === parsed.type && entry.id === parsed.id,
                      )
                      if (!item) return
                      moveItemToDate(item, key)
                      setDraggingItem(null)
                    } catch {
                      // ignore invalid drag payload
                    }
                  }}
                  className={`min-h-[88px] rounded-2xl border p-2 text-left transition ${
                    active
                      ? 'border-brand bg-brand-soft'
                      : 'border-line bg-canvas hover:border-brand/40'
                  } ${draggingItem ? 'select-none' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-ink">{date.getDate()}</span>
                    <span className="text-[10px] font-bold text-muted">{items.length}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {items.slice(0, 6).map((item) => (
                      <button
                        key={`${item.type}-${item.id}`}
                        type="button"
                        title={`${item.time ? `${item.time} · ` : ''}${item.label}`}
                        draggable
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedItem({ type: item.type, id: item.id })
                        }}
                        onDragStart={(event) => {
                          event.dataTransfer.setData(
                            'text/calendar-item',
                            JSON.stringify({ type: item.type, id: item.id }),
                          )
                          setDraggingItem({ type: item.type, id: item.id })
                        }}
                        onDragEnd={() => setDraggingItem(null)}
                        className={`h-2.5 w-2.5 rounded-full ${
                          item.done
                            ? 'bg-emerald-500'
                            : item.type === 'task'
                              ? 'bg-violet-500'
                              : item.type === 'goal'
                                ? 'bg-amber-500'
                                : 'bg-sky-500'
                        }`}
                      />
                    ))}
                    {items.length > 6 && (
                      <div className="pl-1 text-[10px] font-bold text-muted">+{items.length - 6}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          </Card>

          <Card className="animate-fade-up" style={{ animationDelay: '120ms' }}>
          <h3 className="text-base font-extrabold text-ink">Лента дня</h3>
          <p className="mt-1 text-sm font-medium text-muted">{formatRuDate(selectedDate)}</p>
          <div className="mt-4 space-y-2">
            {(itemsByDate.get(selectedDate) ?? []).length === 0 && (
              <div className="rounded-xl bg-canvas px-3 py-4 text-sm font-medium text-muted">
                На этот день пока ничего не запланировано.
              </div>
            )}
            {(itemsByDate.get(selectedDate) ?? []).map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={() =>
                  setSelectedItem(
                    item.type === 'task'
                      ? { type: 'task', id: item.id }
                      : item.type === 'goal'
                        ? { type: 'goal', id: item.id }
                        : { type: 'habit', id: item.id },
                  )
                }
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(
                    'text/calendar-item',
                    JSON.stringify({ type: item.type, id: item.id }),
                  )
                  setDraggingItem({ type: item.type, id: item.id })
                }}
                onDragEnd={() => setDraggingItem(null)}
                className={`w-full rounded-2xl px-3 py-3 text-left ring-1 transition ${
                  selectedItem?.id === item.id ? 'bg-brand-soft ring-brand' : 'bg-canvas ring-line'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-[52px] rounded-xl bg-surface px-2 py-2 text-center text-xs font-extrabold text-ink">
                    {item.time || '--:--'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          item.done
                            ? 'bg-emerald-500'
                            : item.type === 'task'
                              ? 'bg-violet-500'
                              : item.type === 'goal'
                                ? 'bg-amber-500'
                                : 'bg-sky-500'
                        }`}
                      />
                      <div className="truncate text-sm font-bold text-ink">{item.label}</div>
                    </div>
                    <div className="mt-1 text-xs font-medium text-muted">{item.meta}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedTask && (
            <div className="mt-4 rounded-2xl bg-surface px-4 py-4 ring-1 ring-line">
              <p className="text-sm font-extrabold text-ink">{selectedTask.title}</p>
              <p className="mt-1 text-xs font-bold text-brand">{selectedTask.sectionTitle}</p>
              {selectedTask.note && (
                <p className="mt-2 text-sm font-medium leading-relaxed text-muted">
                  {selectedTask.note}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-muted">
                {selectedTask.scheduledTime && (
                  <span className="rounded-full bg-canvas px-2 py-1">{selectedTask.scheduledTime}</span>
                )}
                <span className="rounded-full bg-canvas px-2 py-1">{selectedTask.focusBlocks} блок.</span>
                <span className="rounded-full bg-canvas px-2 py-1">
                  {selectedTask.recommendedFocusMinutes} мин фокус
                </span>
                <span className="rounded-full bg-canvas px-2 py-1">привычка уже в трекере</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="mt-3 inline-flex rounded-xl bg-canvas px-3 py-2 text-xs font-bold text-ink ring-1 ring-line hover:bg-surface"
              >
                Открыть задачу
              </button>
            </div>
          )}

          {selectedGoal && (
            <div className="mt-4 rounded-2xl bg-surface px-4 py-4 ring-1 ring-line">
              <p className="text-sm font-extrabold text-ink">{selectedGoal.title}</p>
              <p className="mt-1 text-sm font-medium text-muted">
                Прогресс {selectedGoal.progress}% · привычек {selectedGoal.habitCount}
              </p>
              {selectedGoal.scheduledTime && (
                <p className="mt-1 text-xs font-bold text-brand">Время: {selectedGoal.scheduledTime}</p>
              )}
              {selectedGoal.note && (
                <p className="mt-2 text-sm font-medium leading-relaxed text-muted">
                  {selectedGoal.note}
                </p>
              )}
              <button
                type="button"
                onClick={() => onNavigate('goals')}
                className="mt-3 inline-flex rounded-xl bg-canvas px-3 py-2 text-xs font-bold text-ink ring-1 ring-line hover:bg-surface"
              >
                Открыть цель
              </button>
            </div>
          )}

          {selectedHabit && (
            <div className="mt-4 rounded-2xl bg-surface px-4 py-4 ring-1 ring-line">
              <p className="text-sm font-extrabold text-ink">
                {selectedHabit.emoji} {selectedHabit.name}
              </p>
              <p className="mt-1 text-sm font-medium text-muted">
                {selectedHabit.completions[selectedDate]
                  ? 'На выбранный день уже отмечено.'
                  : 'Еще не отмечено на выбранный день.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-muted">
                {selectedHabit.reminderTime && (
                  <span className="rounded-full bg-canvas px-2 py-1">{selectedHabit.reminderTime}</span>
                )}
                <span className="rounded-full bg-canvas px-2 py-1">
                  {selectedHabit.timesPerWeek}×/нед
                </span>
                <span className="rounded-full bg-canvas px-2 py-1">
                  старт {formatRuDate(selectedHabit.startDate)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('habits')}
                className="mt-3 inline-flex rounded-xl bg-canvas px-3 py-2 text-xs font-bold text-ink ring-1 ring-line hover:bg-surface"
              >
                Открыть план
              </button>
            </div>
          )}
          </Card>
        </div>
      )}

      {view === 'day' && (
        <Card className="animate-fade-up">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-ink">День</h3>
              <p className="mt-1 text-sm font-medium text-muted">{formatRuDate(selectedDate)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const date = new Date(selectedDateObj)
                  date.setDate(date.getDate() - 1)
                  setSelectedDate(toDateKey(date))
                }}
                className="rounded-xl bg-canvas p-2 ring-1 ring-line hover:bg-surface"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const date = new Date(selectedDateObj)
                  date.setDate(date.getDate() + 1)
                  setSelectedDate(toDateKey(date))
                }}
                className="rounded-xl bg-canvas p-2 ring-1 ring-line hover:bg-surface"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {hours.map((hour) => {
              const hourLabel = `${String(hour).padStart(2, '0')}:00`
              const items = selectedDayItems.filter((item) => (item.time ?? '').startsWith(String(hour).padStart(2, '0')))
              return (
                <div key={hour} className="grid gap-3 border-t border-line pt-3 md:grid-cols-[80px_1fr]">
                  <div className="text-sm font-bold text-muted">{hourLabel}</div>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <div className="rounded-xl bg-canvas/60 px-3 py-3 text-sm font-medium text-muted">
                        Свободно
                      </div>
                    ) : (
                      items.map((item) => (
                        <button
                          key={`${item.type}-${item.id}`}
                          type="button"
                          onClick={() =>
                            setSelectedItem(
                              item.type === 'task'
                                ? { type: 'task', id: item.id }
                                : item.type === 'goal'
                                  ? { type: 'goal', id: item.id }
                                  : { type: 'habit', id: item.id },
                            )
                          }
                          className="w-full rounded-2xl bg-canvas px-4 py-3 text-left ring-1 ring-line transition hover:bg-surface"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                item.done
                                  ? 'bg-emerald-500'
                                  : item.type === 'task'
                                    ? 'bg-violet-500'
                                    : item.type === 'goal'
                                      ? 'bg-amber-500'
                                      : 'bg-sky-500'
                              }`}
                            />
                            <span className="text-sm font-extrabold text-ink">{item.label}</span>
                            <span className="text-xs font-bold text-muted">{item.time}</span>
                          </div>
                          <div className="mt-1 text-xs font-medium text-muted">{item.meta}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )
            })}

            {selectedDayItems.filter((item) => !item.time).length > 0 && (
              <div className="grid gap-3 border-t border-line pt-3 md:grid-cols-[80px_1fr]">
                <div className="text-sm font-bold text-muted">Весь день</div>
                <div className="space-y-2">
                  {selectedDayItems
                    .filter((item) => !item.time)
                    .map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="rounded-2xl bg-canvas px-4 py-3 text-sm font-semibold text-ink ring-1 ring-line"
                      >
                        {item.label}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {view === 'week' && (
        <Card className="animate-fade-up">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-extrabold text-ink">Неделя</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const date = new Date(selectedDateObj)
                  date.setDate(date.getDate() - 7)
                  setSelectedDate(toDateKey(date))
                }}
                className="rounded-xl bg-canvas p-2 ring-1 ring-line hover:bg-surface"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const date = new Date(selectedDateObj)
                  date.setDate(date.getDate() + 7)
                  setSelectedDate(toDateKey(date))
                }}
                className="rounded-xl bg-canvas p-2 ring-1 ring-line hover:bg-surface"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-7">
            {weekDays.map((date) => {
              const key = toDateKey(date)
              const items = itemsByDate.get(key) ?? []
              return (
                <div
                  key={key}
                  className={`rounded-2xl border p-3 ${
                    key === selectedDate ? 'border-brand bg-brand-soft' : 'border-line bg-canvas'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(key)
                      setView('day')
                    }}
                    className="mb-3 text-left"
                  >
                    <div className="text-xs font-bold uppercase tracking-wide text-muted">
                      {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][((date.getDay() + 6) % 7)]}
                    </div>
                    <div className="text-lg font-extrabold text-ink">{date.getDate()}</div>
                  </button>
                  <div className="space-y-2">
                    {items.length === 0 && (
                      <div className="rounded-xl bg-surface px-2 py-2 text-xs font-medium text-muted">
                        Пусто
                      </div>
                    )}
                    {items.slice(0, 5).map((item) => (
                      <div key={`${item.type}-${item.id}`} className="rounded-xl bg-surface px-2 py-2">
                        <div className="truncate text-xs font-bold text-ink">
                          {item.time ? `${item.time} · ` : ''}
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

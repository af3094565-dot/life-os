import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { BackBar } from '../components/BackBar'
import { EmptyState } from '../components/EmptyState'
import { HabitFormModal } from '../components/HabitFormModal'
import { Header } from '../components/Header'
import { NextActionCard } from '../components/NextActionCard'
import { Card, ProgressBar, ProgressRing } from '../components/ui'
import {
  MONTH_NAMES,
  WEEKDAYS,
  durationMeta,
  priorityMeta,
} from '../data/seed'
import type { LifeOSState } from '../hooks/useLifeOS'
import { formatRuDate, todayKey, toDateKey } from '../lib/habitLogic'
import { retroConfirmMessage } from '../lib/retroMarks'
import { submitHabitWithMoodboardOption } from '../components/desktop/moodboard/placeOnMoodboard'

type Props = {
  state: LifeOSState
  userName: string
  focusHabitId?: string
  returnLabel?: string | null
  onBack?: () => void
  onOpenGoal?: (goalId: string) => void
  onToast?: (t: {
    title: string
    subtitle?: string
    diamonds?: number
    streak?: number
    cta?: string
    onCta?: () => void
  }) => void
}

export function HabitsPage({
  state,
  userName,
  focusHabitId,
  returnLabel,
  onBack,
  onOpenGoal,
  onToast,
}: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const focusRef = useRef<HTMLTableRowElement | null>(null)

  useEffect(() => {
    if (!focusHabitId || !focusRef.current) return
    focusRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [focusHabitId, state.habitStats])

  const pendingToday = state.quests.find((q) => !q.done)
  const pendingHabit = pendingToday?.habitId
    ? state.habitStats.find((h) => h.id === pendingToday.habitId)
    : state.habitStats.find((h) => {
        if (state.todayIndex < 0) return false
        return state.dayStatus(h.id, state.todayIndex) !== 'done'
      })

  const weekdayFor = (day: number) => {
    const d = new Date(state.year, state.month, day)
    const js = d.getDay()
    return WEEKDAYS[js === 0 ? 6 : js - 1]
  }

  const prevMonth = () => {
    const m = state.month === 0 ? 11 : state.month - 1
    const y = state.month === 0 ? state.year - 1 : state.year
    state.setMonth(y, m)
  }

  const nextMonth = () => {
    const m = state.month === 11 ? 0 : state.month + 1
    const y = state.month === 11 ? state.year + 1 : state.year
    state.setMonth(y, m)
  }

  const avgStrength = state.habitStats.length
    ? state.habitStats.reduce((a, h) => a + h.formPct, 0) / state.habitStats.length
    : 0

  return (
    <div className="pb-24 md:pb-0">
      {onBack && returnLabel && <BackBar label={`← ${returnLabel}`} onBack={onBack} />}
      <Header
        greeting="Привычки"
        subtitle="Что мне нужно повторять? · отмечай каждый день"
        streak={state.streak}
        diamonds={state.diamonds}
        visitStreak={state.visitStreak}
        diamondHistory={state.diamondHistory ?? []}
        userName={userName}
      />

      {pendingHabit && (
        <NextActionCard
          className="mb-5"
          action={`${pendingHabit.emoji} ${pendingHabit.name}`}
          related={
            pendingHabit.goalTitle
              ? `🎯 ${pendingHabit.goalTitle}`
              : 'Ещё не отмечено сегодня'
          }
          relatedHint={pendingHabit.goalTitle ? 'Помогает цели:' : undefined}
          cta="Отметить"
          onAction={() => {
            if (state.todayIndex < 0) return
            const r = state.toggleHabitDay(pendingHabit.id, state.todayIndex)
            if (!r.ok) {
              alert(r.reason)
              return
            }
            onToast?.({
              title: 'Выполнено',
              subtitle: pendingHabit.name,
              streak: state.streak + (state.dayStatus(pendingHabit.id, state.todayIndex) === 'done' ? 0 : 1),
            })
          }}
          secondaryLabel={
            pendingHabit.goalId && onOpenGoal ? 'Открыть цель' : undefined
          }
          onSecondary={
            pendingHabit.goalId && onOpenGoal
              ? () => onOpenGoal(pendingHabit.goalId!)
              : undefined
          }
          icon={pendingHabit.emoji}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-xl bg-surface p-2 ring-1 ring-line hover:bg-canvas"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-[160px] text-center text-sm font-extrabold text-ink">
            {MONTH_NAMES[state.month]} {state.year}
          </div>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-xl bg-surface p-2 ring-1 ring-line hover:bg-canvas"
          >
            <ChevronRight size={18} />
          </button>
          {!state.isCurrentMonth && (
            <button
              type="button"
              onClick={state.goToToday}
              className="rounded-xl bg-brand-soft px-3 py-2 text-sm font-bold text-brand hover:bg-brand hover:text-white"
            >
              Сегодня
            </button>
          )}
        </div>
        <button
          type="button"
          data-tour="habits-add"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white hover:bg-brand-deep"
        >
          <Plus size={16} /> Добавить привычку
        </button>
      </div>

      <Card className="mb-4 flex flex-col gap-3 !py-3 animate-fade-up sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            💡
          </div>
          <p className="text-sm font-medium leading-relaxed text-muted">
            Привычка формируется за выбранный срок. Пропуск дня{' '}
            <span className="font-bold text-ink">продлевает срок</span>. Отметка за прошлые дни —
            до 5 раз в месяц, потом пауза 30 суток (осталось{' '}
            <span className="font-bold text-ink">{state.retrofillStatus.remaining}</span>).
          </p>
        </div>
        {state.yesterdayMissed.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const n = state.yesterdayMissed.length
              const info = state.retrofillStatus
              if (!info.canUse) {
                alert(info.reason)
                return
              }
              if (
                !confirm(
                  retroConfirmMessage(info.remaining, n) +
                    `\n\nОтметить вчера для ${n} привычек?`,
                )
              ) {
                return
              }
              const r = state.markYesterdayMissed()
              if (!r.ok) alert(r.reason)
            }}
            className="shrink-0 rounded-xl bg-brand-soft px-3 py-2 text-sm font-bold text-brand hover:bg-brand hover:text-white"
          >
            Отметить вчера ({state.yesterdayMissed.length})
          </button>
        )}
      </Card>

      <Card className="mb-5 overflow-hidden !p-0 animate-fade-up">
        {state.habitStats.length === 0 ? (
          <div className="px-4 py-6">
            <EmptyState
              emoji="🔁"
              title="Здесь будут твои привычки"
              description="Привычка — то, что ты повторяешь регулярно. Она приближает тебя к цели. Создай первую за 30 секунд."
              cta="Создать привычку"
              onCta={() => setFormOpen(true)}
            />
          </div>
        ) : (
          <>
            {/* Mobile: cards, not a squeezed table */}
            <ul className="divide-y divide-line md:hidden">
              {state.habitStats.map((h) => {
                const p = priorityMeta(h.priority)
                const focused = focusHabitId === h.id
                const todayDone =
                  state.todayIndex >= 0 && !!h.days[state.todayIndex]
                return (
                  <li
                    key={h.id}
                    ref={
                      focused
                        ? (el) => {
                            focusRef.current = el as unknown as HTMLTableRowElement
                          }
                        : undefined
                    }
                    className={`p-4 ${focused ? 'bg-brand-soft/40' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        disabled={state.todayIndex < 0}
                        onClick={() => {
                          if (state.todayIndex < 0) return
                          const r = state.toggleHabitDay(h.id, state.todayIndex)
                          if (!r.ok) {
                            alert(r.reason)
                            return
                          }
                          if (!todayDone) {
                            onToast?.({
                              title: 'Отмечено',
                              subtitle: h.name,
                            })
                          }
                        }}
                        className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold disabled:opacity-40 ${
                          todayDone
                            ? 'border-brand bg-brand text-white'
                            : 'border-line bg-white text-transparent'
                        }`}
                        aria-label={todayDone ? 'Снять отметку' : 'Отметить сегодня'}
                      >
                        ✓
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-extrabold text-ink">
                          {h.emoji} {h.name}
                        </p>
                        <p className="mt-1 text-xs font-medium text-muted">
                          {h.pct}% · {h.timesPerWeek}×/нед · {p.label}
                        </p>
                        {h.goalTitle && onOpenGoal && h.goalId && (
                          <button
                            type="button"
                            onClick={() => onOpenGoal(h.goalId!)}
                            className="mt-1 text-left text-xs font-bold text-brand"
                          >
                            🎯 {h.goalTitle}
                          </button>
                        )}
                        <ProgressBar value={h.pct} className="mt-3" />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* Desktop: month grid table */}
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[920px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/70">
                  <th className="sticky left-0 z-10 bg-canvas/95 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted">
                    Привычка
                  </th>
                  {Array.from({ length: state.dayCount }, (_, i) => (
                    <th key={i} className="px-1 py-2 text-center">
                      <div className="text-[10px] font-semibold text-muted">
                        {weekdayFor(i + 1)}
                      </div>
                      <div
                        className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          i === state.todayIndex
                            ? 'bg-brand text-white'
                            : 'text-ink'
                        }`}
                      >
                        {i + 1}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide text-muted">
                    Цель
                  </th>
                  <th className="w-10 px-2" />
                </tr>
              </thead>
              <tbody>
                {state.habitStats.map((h) => {
                  const p = priorityMeta(h.priority)
                  const d = durationMeta(h.targetDays)
                  const focused = focusHabitId === h.id
                  return (
                    <tr
                      key={h.id}
                      ref={focused ? focusRef : undefined}
                      className={`border-b border-line last:border-0 ${
                        focused ? 'bg-brand-soft/40' : ''
                      }`}
                    >
                      <td className="sticky left-0 z-10 bg-surface px-4 py-2.5">
                        <div className="flex max-w-[260px] flex-col gap-1">
                          <div className="flex items-center gap-2 font-semibold text-ink">
                            <span>{h.emoji}</span>
                            <span className="truncate">{h.name}</span>
                          </div>
                          {h.goalId && h.goalTitle && onOpenGoal && (
                            <button
                              type="button"
                              onClick={() => onOpenGoal(h.goalId!)}
                              className="w-fit text-left text-[11px] font-bold text-brand hover:underline"
                            >
                              Цель: 🎯 {h.goalTitle}
                            </button>
                          )}
                          {h.questTagline && (
                            <p className="text-[11px] font-medium leading-snug text-muted">
                              {h.questTagline}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            <span
                              className="w-fit rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{ background: p.bg, color: p.color }}
                            >
                              {p.label}
                            </span>
                            <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-bold text-muted">
                              {h.timesPerWeek}×/нед
                            </span>
                            {h.goalTitle && (
                              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">
                                {h.goalTitle}
                              </span>
                            )}
                            {h.lifeAreaLabel && (
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                                style={{ background: h.lifeAreaColor ?? '#7b3fe4' }}
                              >
                                {h.lifeAreaLabel}
                              </span>
                            )}
                            {h.questTitle && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-100">
                                квест
                              </span>
                            )}
                            {h.fromMatrix && (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                карта · free
                              </span>
                            )}
                            {h.fromPlanner && (
                              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-800">
                                планировщик
                              </span>
                            )}
                            {h.reminderTime && (
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                                с {h.reminderTime}
                              </span>
                            )}
                            {h.planned && (
                              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                                старт {formatRuDate(h.startDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      {Array.from({ length: state.dayCount }, (_, dayIndex) => {
                        const status = state.dayStatus(h.id, dayIndex)
                        const outOfRange = status === 'before' || status === 'after'
                        const isFuture = status === 'future'
                        const locked = outOfRange || isFuture
                        return (
                          <td key={dayIndex} className="px-1 py-2 text-center">
                            <button
                              type="button"
                              disabled={locked}
                              title={
                                isFuture
                                  ? 'День ещё не наступил — отметить можно будет позже'
                                  : undefined
                              }
                              aria-label={`${h.name}, день ${dayIndex + 1}`}
                              onClick={() => {
                                const key = toDateKey(
                                  new Date(state.year, state.month, dayIndex + 1),
                                )
                                const today = todayKey()
                                const wasDone = !!h.days[dayIndex]
                                const willMark = !wasDone
                                if (willMark && key < today) {
                                  const info = state.retrofillStatus
                                  if (!info.canUse) {
                                    alert(info.reason)
                                    return
                                  }
                                  if (!confirm(retroConfirmMessage(info.remaining))) return
                                }
                                const r = state.toggleHabitDay(h.id, dayIndex)
                                if (!r.ok) alert(r.reason)
                              }}
                              className={`mx-auto h-6 w-6 rounded-full transition ${
                                outOfRange
                                  ? 'cursor-default bg-transparent opacity-25'
                                  : isFuture
                                    ? 'cursor-not-allowed bg-canvas ring-1 ring-line opacity-60'
                                    : status === 'done'
                                      ? 'bg-success shadow-sm hover:scale-110'
                                      : status === 'missed'
                                        ? 'bg-red-100 ring-1 ring-red-200 hover:scale-110'
                                        : 'bg-canvas ring-1 ring-line hover:scale-110 hover:ring-brand/40'
                              }`}
                            />
                          </td>
                        )
                      })}
                      <td className="min-w-[130px] px-3 py-2">
                        <div className="text-[11px] font-bold text-muted">
                          {h.totalDone}/{h.targetDays} · {d.label}
                        </div>
                        <ProgressBar
                          value={h.formPct}
                          className="mt-1 !h-1.5"
                          barClassName={h.formPct >= 100 ? 'bg-success' : 'bg-brand'}
                        />
                        <div className="mt-1 text-[10px] font-medium text-muted">
                          до {formatRuDate(h.endDate)}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          title="Удалить привычку"
                          aria-label={`Удалить ${h.name}`}
                          onClick={() => {
                            if (confirm(`Удалить привычку «${h.name}»?`)) {
                              state.deleteHabit(h.id)
                            }
                          }}
                          className="rounded-lg p-1.5 text-muted transition hover:bg-red-50 hover:text-danger"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex items-center gap-4 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <ProgressRing value={state.monthPct} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Общий прогресс</p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {state.monthDone} / {state.habitStats.length ? state.monthTotal : 0} отметок
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 animate-fade-up" style={{ animationDelay: '120ms' }}>
          <ProgressRing value={avgStrength} color="#22c55e" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Сила привычек</p>
            <p className="mt-1 text-sm font-semibold text-ink">К цели закрепления</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 animate-fade-up" style={{ animationDelay: '160ms' }}>
          <ProgressRing
            value={state.weakHabits[0]?.attentionPct ?? 100}
            color="#f59e0b"
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Внимание</p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {state.weakHabits[0]?.name ?? 'Всё стабильно'}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-muted/70">
              больше всего пропусков за сегодня и прошедшие дни
            </p>
          </div>
        </Card>
        <Card className="animate-fade-up" style={{ animationDelay: '200ms' }}>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Текущая серия</p>
          <p className="mt-2 text-4xl font-extrabold text-brand">{state.streak}</p>
          <p className="mt-1 text-sm font-medium text-muted">дней подряд · {userName}</p>
        </Card>
      </div>

      <HabitFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(input, addToMoodboard) =>
          submitHabitWithMoodboardOption(state, input, addToMoodboard)
        }
        goals={state.goals.filter((g) => g.status === 'active')}
        diamonds={state.diamonds}
        showMoodboardOption
      />
    </div>
  )
}

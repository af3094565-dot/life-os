import { useEffect, useId, useState } from 'react'
import { AlertTriangle, ArrowRight, Bell, Check, Play, Target, X } from 'lucide-react'
import { Header } from '../components/Header'
import { Card, ProgressBar } from '../components/ui'
import type { PageId } from '../data/seed'
import type { LifeOSState } from '../hooks/useLifeOS'
import { DIAMOND, ECONOMY, formatDiamonds } from '../lib/economy'
import { retroConfirmMessage } from '../lib/retroMarks'

const DIAMONDS_TIP_KEY = 'life-os-diamonds-tip-hidden'

type Props = {
  state: LifeOSState
  onNavigate: (page: PageId) => void
  userName: string
  isTester?: boolean
  lifeMapDeferred?: boolean
}

function greetingForNow(name: string) {
  const h = new Date().getHours()
  if (h < 12) return `Доброе утро, ${name}`
  if (h < 18) return `Добрый день, ${name}`
  return `Добрый вечер, ${name}`
}

export function Dashboard({
  state,
  onNavigate,
  userName,
  isTester = false,
  lifeMapDeferred = false,
}: Props) {
  const testerModalTitleId = useId()
  const [tipHidden, setTipHidden] = useState(() => {
    try {
      return localStorage.getItem(DIAMONDS_TIP_KEY) === '1'
    } catch {
      return false
    }
  })
  const [testerModalOpen, setTesterModalOpen] = useState(false)
  const [testerAmount, setTesterAmount] = useState('100')
  const next = state.nextQuest
  const activeGoals = [
    ...(state.lifeGoalsMapStat?.status === 'active'
      ? [state.lifeGoalsMapStat]
      : []),
    ...state.customGoalStats.filter((g) => g.status === 'active'),
  ]
  const activeGoal = activeGoals[0]
  const warnings = state.warnings
  const goalHabitIds = new Set(activeGoal?.habits.map((h) => h.id) ?? [])
  const goalQuests = activeGoal
    ? state.quests.filter((q) => q.habitId && goalHabitIds.has(q.habitId))
    : []
  const hasQuests = state.quests.length > 0
  const allQuestsDone = hasQuests && state.quests.every((q) => q.done)
  const habitsClearToday =
    state.todayTotal === 0 || state.todayDone >= state.todayTotal
  const dayComplete = allQuestsDone && habitsClearToday
  const nextPending = next && !next.done ? next : null
  const todayPlannerTasks = state.todayPlannerTasks

  const hideTip = () => {
    setTipHidden(true)
    try {
      localStorage.setItem(DIAMONDS_TIP_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!testerModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTesterModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [testerModalOpen])

  const handleTesterGrant = () => {
    const amount = Number(testerAmount.trim())
    const result = state.addTesterDiamonds(amount)
    if (!result.ok) {
      alert(result.reason)
      return
    }

    setTesterModalOpen(false)
    setTesterAmount('100')
    alert(`Добавлено ${formatDiamonds(Math.round(amount))}`)
  }

  return (
    <div>
      <Header
        greeting={greetingForNow(userName)}
        subtitle="Сосредоточься на следующем шаге"
        streak={state.streak}
        diamonds={state.diamonds}
        visitStreak={state.visitStreak}
        diamondHistory={state.diamondHistory ?? []}
        userName={userName}
      />

      {lifeMapDeferred && (
        <Card className="mb-5 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-ink">Карта жизни ждёт</p>
              <p className="mt-1 text-sm font-medium text-muted">
                Колесо баланса ещё не создано — можно сделать это в любой момент.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('life-map')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white hover:bg-brand-deep"
            >
              Создать карту
              <ArrowRight size={16} />
            </button>
          </div>
        </Card>
      )}

      {!tipHidden && (
        <Card className="relative mb-5 animate-fade-up">
          <button
            type="button"
            onClick={hideTip}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-muted transition hover:bg-canvas hover:text-ink"
            aria-label="Закрыть и больше не показывать"
            title="Закрыть"
          >
            <X size={16} />
          </button>
          <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-2xl ring-1 ring-sky-100">
                {DIAMOND}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Твои алмазы</p>
                <p className="text-3xl font-extrabold text-ink">
                  {formatDiamonds(state.diamonds)}
                </p>
                <p className="mt-1 text-[11px] font-medium text-muted">
                  История — нажми на {DIAMOND} в шапке
                </p>
              </div>
            </div>
            <p className="max-w-md text-sm font-medium leading-relaxed text-muted">
              Старт — {formatDiamonds(ECONOMY.START_DIAMONDS)}. Привычка −
              {formatDiamonds(ECONOMY.HABIT_COST)}, цель −{formatDiamonds(ECONOMY.GOAL_COST)}, день +
              {formatDiamonds(ECONOMY.DAY_REWARD)}. {ECONOMY.VISIT_STREAK_DAYS} дней подряд захода — +
              {formatDiamonds(ECONOMY.VISIT_STREAK_BONUS)}. Будущие дни отмечать нельзя.
            </p>
          </div>
        </Card>
      )}

      {isTester && (
        <Card className="mb-5 border border-sky-200 !bg-sky-50 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-sky-950">Панель тестировщика</p>
              <p className="mt-1 text-sm font-medium text-sky-900/80">
                Временная кнопка для ручного пополнения алмазов.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTesterModalOpen(true)}
              className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
            >
              Добавить себе алмазы
            </button>
          </div>
        </Card>
      )}

      {isTester && testerModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
          onClick={() => setTesterModalOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={testerModalTitleId}
            className="w-full max-w-md rounded-t-2xl bg-surface p-5 shadow-xl ring-1 ring-line sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  Панель тестировщика
                </p>
                <h2 id={testerModalTitleId} className="mt-1 text-lg font-extrabold text-ink">
                  Добавить алмазы
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setTesterModalOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-canvas"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>
            </div>

            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
              Количество алмазов
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={testerAmount}
              onChange={(e) => setTesterAmount(e.target.value)}
              className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-base font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
              placeholder="Например, 100"
            />
            <p className="mt-2 text-sm font-medium text-muted">
              Введи число и нажми `Добавить` для моментального пополнения баланса.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setTesterModalOpen(false)}
                className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-muted hover:bg-canvas"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleTesterGrant}
                className="flex-1 rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-700"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {state.habitReminders.length > 0 && (
        <Card className="mb-5 border border-indigo-200 !bg-indigo-50 animate-fade-up">
          <div className="mb-3 flex items-center gap-2">
            <Bell size={18} className="text-indigo-600" />
            <h3 className="text-base font-extrabold text-indigo-950">Пора выполнить</h3>
          </div>
          <ul className="space-y-2">
            {state.habitReminders.map((r) => (
              <li
                key={r.habitId}
                className="rounded-xl bg-white/80 px-3 py-2.5 text-sm ring-1 ring-indigo-100"
              >
                <span className="font-extrabold text-ink">
                  {r.emoji} {r.name}
                </span>
                {r.tagline && (
                  <span className="mt-0.5 block text-[13px] font-medium text-indigo-900/75">
                    {r.tagline}
                  </span>
                )}
                <span className="mt-1 block text-xs font-bold text-indigo-700">
                  Напоминание с {r.reminderTime}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onNavigate('habits')}
            className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-800 hover:underline"
          >
            Отметить в привычках <ArrowRight size={14} />
          </button>
        </Card>
      )}
      {state.yesterdayMissed.length > 0 && (
        <Card className="mb-5 animate-fade-up">
          <p className="text-sm font-medium text-muted">
            Забыл отметить вчера? Осталось{' '}
            <span className="font-bold text-ink">{state.retrofillStatus.remaining}</span> из 5
            отметок за прошлое в этом месяце.
          </p>
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
            className="mt-3 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-deep"
          >
            Отметить вчера ({state.yesterdayMissed.length})
          </button>
        </Card>
      )}
      {warnings.length > 0 && (
        <Card className="mb-5 border border-amber-200 !bg-amber-50 animate-fade-up">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <h3 className="text-base font-extrabold text-amber-950">
              Не пропускай — иначе привычка не закрепится
            </h3>
          </div>
          <p className="mb-3 text-sm font-medium text-amber-900/80">
            Если день за днём рвать цепочку, нейронные связи слабеют. Отметь привычку сегодня.
          </p>
          <ul className="space-y-2">
            {warnings.map((w) => (
              <li
                key={`${w.habitId}-${w.kind}`}
                className="rounded-xl bg-white/70 px-3 py-2.5 text-sm font-medium text-amber-950 ring-1 ring-amber-100"
              >
                <span className="font-extrabold">
                  {w.emoji} {w.name}
                </span>
                <span className="mt-0.5 block text-[13px] font-medium text-amber-900/75">
                  {w.message}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onNavigate('habits')}
            className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-amber-800 hover:underline"
          >
            Отметить в привычках <ArrowRight size={14} />
          </button>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-5">
          <div
            className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg animate-fade-up ${
              dayComplete
                ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-700'
                : 'bg-gradient-to-br from-[#8b5cf6] via-[#7b3fe4] to-[#5b21b6]'
            }`}
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute bottom-0 right-8 h-28 w-28 rounded-full bg-white/10" />
            {dayComplete ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                    <Check size={18} strokeWidth={3} />
                  </span>
                  <p className="text-sm font-semibold text-white/85">На сегодня всё</p>
                </div>
                <h2 className="mt-3 max-w-md text-2xl font-extrabold leading-tight">
                  Все квесты выполнены
                </h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/80">
                  Не перегружай себя. День закрыт — можно спокойно выдохнуть. Новый день — новые
                  начинания.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('progress')}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-sm transition hover:scale-[1.02]"
                >
                  <Check size={16} strokeWidth={3} />
                  Отмечено · день закрыт
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white/80">Твой следующий шаг</p>
                <h2 className="mt-2 max-w-md text-2xl font-extrabold leading-tight">
                  {nextPending?.title ??
                    (hasQuests ? 'Закрой оставшиеся привычки' : 'Добавь первую привычку')}
                </h2>
                <p className="mt-2 text-sm text-white/75">
                  {nextPending
                    ? `${nextPending.minutes} мин · ежедневные привычки`
                    : hasQuests
                      ? 'Есть привычки без отметки — загляни в сетку'
                      : 'Начни с раздела «Привычки»'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (nextPending) state.toggleQuest(nextPending.id)
                    else onNavigate('habits')
                  }}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand shadow-sm transition hover:scale-[1.02]"
                >
                  <Play size={16} fill="currentColor" />
                  {nextPending ? 'Начать квест' : 'К привычкам'}
                </button>
              </>
            )}
          </div>

          <Card className="animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-extrabold text-ink">Квесты на сегодня</h3>
              <span className="text-sm font-semibold text-muted">
                {state.quests.filter((q) => q.done).length} из {state.quests.length}{' '}
                выполнено
              </span>
            </div>
            {state.quests.length === 0 ? (
              <p className="py-4 text-sm font-medium text-muted">
                Пока пусто. Добавь привычку — и она появится здесь как квест дня.
              </p>
            ) : (
              <ul className="space-y-1">
                {state.quests.map((q) => {
                  const linkedHabit = q.habitId
                    ? state.habitsAll.find((h) => h.id === q.habitId)
                    : undefined
                  const goalTitle = linkedHabit?.goalId
                    ? state.goals.find((g) => g.id === linkedHabit.goalId)?.title
                    : undefined
                  return (
                    <li key={q.id}>
                      <button
                        type="button"
                        onClick={() => state.toggleQuest(q.id)}
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-canvas"
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                            q.done
                              ? 'border-brand bg-brand text-white'
                              : 'border-line bg-white text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-sm font-semibold ${
                              q.done ? 'text-muted line-through' : 'text-ink'
                            }`}
                          >
                            {q.title}
                          </span>
                          {goalTitle && (
                            <span className="mt-0.5 block truncate text-[11px] font-medium text-brand">
                              → {goalTitle}
                            </span>
                          )}
                        </span>
                        <span className="text-xs font-semibold text-muted">
                          {q.minutes} мин
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card className="animate-fade-up" style={{ animationDelay: '130ms' }}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-extrabold text-ink">План дня</h3>
              <span className="text-sm font-semibold text-muted">
                {todayPlannerTasks.filter((task) => task.completedAt).length} из{' '}
                {todayPlannerTasks.length}
              </span>
            </div>
            {todayPlannerTasks.length === 0 ? (
              <p className="py-2 text-sm font-medium text-muted">
                На сегодня задач пока нет. Добавь их во вкладке «Планировщик».
              </p>
            ) : (
              <ul className="space-y-2">
                {todayPlannerTasks.map((task) => (
                  <li
                    key={task.id}
                    className="rounded-xl bg-canvas px-3 py-3 ring-1 ring-line"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            task.completedAt ? 'text-muted line-through' : 'text-ink'
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-muted">
                          {task.sectionTitle} · {task.focusBlocks} блок. · цикл{' '}
                          {task.recommendedFocusMinutes} мин
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => state.togglePlannerTaskDone(task.id)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                          task.completedAt
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-brand-soft text-brand'
                        }`}
                      >
                        {task.completedAt ? 'Готово' : 'Закрыть'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => onNavigate('planner')}
              className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline"
            >
              Открыть планировщик <ArrowRight size={14} />
            </button>
          </Card>

          {activeGoal ? (
            <Card className="animate-fade-up" style={{ animationDelay: '160ms' }}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-extrabold text-ink">Активная цель</h3>
                <span className="text-sm font-bold text-brand">{activeGoal.progress}%</span>
              </div>
              <p className="mb-1 text-sm font-semibold text-ink">{activeGoal.title}</p>
              {activeGoal.metricLabel && (
                <p className="mb-1 text-xs font-bold text-brand">{activeGoal.metricLabel}</p>
              )}
              <p className="mb-3 text-xs font-medium text-muted">
                Сегодня {activeGoal.todayDone} из {activeGoal.todayTotal} привычек цели
                {activeGoal.habitCount === 0 ? ' · план пока пуст' : ''}
                {activeGoal.needsCheckIn ? ' · пора обновить результат' : ''}
              </p>
              <ProgressBar value={activeGoal.progress} className="mb-3" />
              {activeGoal.note && (
                <p className="mb-3 text-sm italic text-muted">«{activeGoal.note}»</p>
              )}

              {goalQuests.length > 0 && (
                <div className="mb-3 rounded-xl bg-canvas px-3 py-2.5">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                    План цели на сегодня
                  </p>
                  <ul className="space-y-1">
                    {goalQuests.map((q) => (
                      <li key={q.id} className="flex items-center gap-2 text-sm">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            q.done ? 'bg-success' : 'bg-line'
                          }`}
                        />
                        <span
                          className={
                            q.done ? 'font-medium text-muted line-through' : 'font-semibold text-ink'
                          }
                        >
                          {q.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeGoal.habitCount === 0 && (
                <p className="mb-3 text-sm font-medium text-muted">
                  Добавь привычки в план цели — они появятся здесь и во вкладке «Привычки».
                </p>
              )}

              <button
                type="button"
                onClick={() => onNavigate('goals')}
                className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline"
              >
                Открыть все цели <ArrowRight size={14} />
              </button>
            </Card>
          ) : (
            <Card className="animate-fade-up" style={{ animationDelay: '160ms' }}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-ink">Целей пока нет</h3>
                  <p className="mt-1 text-sm font-medium text-muted">
                    Создай цель и закрепи за ней привычки — прогресс появится здесь.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('goals')}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline"
                  >
                    Создать цель <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card className="animate-fade-up" style={{ animationDelay: '120ms' }}>
            <h3 className="mb-1 text-base font-extrabold text-ink">Прогресс дня</h3>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-brand">
                {state.todayPct}%
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-muted">
              {state.todayDone} из {state.todayTotal} привычек на сегодня
            </p>
            <ProgressBar value={state.todayPct} className="mt-4" />
            <button
              type="button"
              onClick={() => onNavigate('progress')}
              className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline"
            >
              Подробная статистика <ArrowRight size={14} />
            </button>
          </Card>

          {activeGoal && (
            <Card className="animate-fade-up" style={{ animationDelay: '150ms' }}>
              <h3 className="mb-3 text-base font-extrabold text-ink">Показатели цели</h3>
              <div className="space-y-3">
                <MetricRow
                  label="Вклад в цель сегодня"
                  value={`${activeGoal.todayPct}%`}
                  bar={activeGoal.todayPct}
                  hint={
                    activeGoal.todayTotal
                      ? `${activeGoal.todayDone}/${activeGoal.todayTotal} привычек`
                      : 'Нет привычек на сегодня'
                  }
                />
                <MetricRow
                  label="Неделя плана"
                  value={`${activeGoal.weekPct}%`}
                  bar={activeGoal.weekPct}
                  hint="За последние 7 дней"
                />
                <MetricRow
                  label="Закрепление"
                  value={`${activeGoal.formPct}%`}
                  bar={activeGoal.formPct}
                  hint="Средний прогресс привычек"
                />
              </div>
            </Card>
          )}

          <Card className="animate-fade-up" style={{ animationDelay: '180ms' }}>
            <h3 className="mb-4 text-base font-extrabold text-ink">Активные цели</h3>
            {activeGoals.length === 0 ? (
              <p className="text-sm font-medium text-muted">Целей пока нет.</p>
            ) : (
              <ul className="space-y-4">
                {activeGoals.map((g) => (
                  <li key={g.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-ink">{g.title}</span>
                      <span className="text-xs font-bold text-muted">{g.progress}%</span>
                    </div>
                    <ProgressBar value={g.progress} />
                    <p className="mt-1 text-[11px] font-medium text-muted">
                      {g.metricLabel
                        ? g.metricLabel
                        : g.habitCount > 0
                          ? `${g.habitCount} привыч. · сегодня ${g.todayDone}/${g.todayTotal}`
                          : 'добавь метрику или привычки'}
                      {g.needsCheckIn ? ' · обнови результат' : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function MetricRow({
  label,
  value,
  bar,
  hint,
}: {
  label: string
  value: string
  bar: number
  hint: string
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="text-sm font-extrabold text-brand">{value}</span>
      </div>
      <ProgressBar value={bar} className="!h-1.5" />
      <p className="mt-1 text-[11px] font-medium text-muted">{hint}</p>
    </div>
  )
}

import { ChoiceMoment } from '../components/life/Choices'
import { DayState } from '../components/life/DayState'
import { dateKey } from '../lib/life/model'
import { useEffect, useId, useState } from 'react'
import {
  Bell,
  Check,
  Plus,
  Target,
  X,
} from 'lucide-react'
import { Header } from '../components/Header'
import { NextActionCard } from '../components/NextActionCard'
import { EmptyState } from '../components/EmptyState'
import { todayOverview } from '../lib/todayOverview'
import { JourneyGuide } from '../components/JourneyGuide'
import { DashboardOverview } from '../components/DashboardOverview'
import { Card, ProgressBar } from '../components/ui'
import type { PageId } from '../data/seed'
import type { LifeOSState } from '../hooks/useLifeOS'
import { DIAMOND, ECONOMY, formatDiamonds } from '../lib/economy'
import { formatRuDate, todayKey } from '../lib/habitLogic'
import { retroConfirmMessage } from '../lib/retroMarks'
import { contractProgress } from '../lib/questLogic'

const DIAMONDS_TIP_KEY = 'life-os-energy-tip-hidden'

type Props = {
  state: LifeOSState
  onNavigate: (page: PageId, opts?: { entityId?: string; returnTo?: PageId }) => void
  userName: string
  hasSubscription: boolean
  isTester?: boolean
  lifeMapDeferred?: boolean
  onQuickAdd?: () => void
  onOpenCreateHabit?: () => void
  onOpenCreateGoal?: () => void
  onOpenCreateTask?: () => void
  onOpenCreateQuest?: () => void
  onToast?: (t: {
    title: string
    subtitle?: string
    diamonds?: number
    streak?: number
    cta?: string
    onCta?: () => void
  }) => void
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
  hasSubscription,
  isTester = false,
  lifeMapDeferred = false,
  onQuickAdd,
  onOpenCreateHabit,
  onOpenCreateGoal,
  onOpenCreateTask,
  onOpenCreateQuest,
  onToast,
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
  const [listFilter, setListFilter] = useState<'all' | 'pending' | 'done'>('all')

  const todayLabel = formatRuDate(todayKey())
  const overview = todayOverview(state.quests, state.todayPlannerTasks)
  const todayHabits = overview.habits
  const next = todayHabits.find(q => !q.done)
  const nextPending = next && !next.done ? next : null
  const activeGoals = [
    ...(state.lifeGoalsMapStat?.status === 'active'
      ? [state.lifeGoalsMapStat]
      : []),
    ...state.customGoalStats.filter((g) => g.status === 'active'),
  ]
  const activeGoal = activeGoals[0]
  const activeContract = state.activeContracts[0]
  const todayPlannerTasks = state.todayPlannerTasks
  const pendingTasks = todayPlannerTasks.filter((t) => !t.completedAt)
  const pendingHabits = todayHabits.filter((q) => !q.done)
  const doneCount =
    todayHabits.filter((q) => q.done).length +
    todayPlannerTasks.filter((t) => t.completedAt).length
  const totalCount = todayHabits.length + todayPlannerTasks.length
  const dayComplete =
    totalCount > 0 &&
    pendingHabits.length === 0 &&
    pendingTasks.length === 0

  const focusTitle =
    nextPending?.title ??
    pendingTasks[0]?.title ??
    (activeGoal ? `Продолжить: ${activeGoal.title}` : null)

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

  const dismissTip = () => {
    setTipHidden(true)
    try {
      localStorage.setItem(DIAMONDS_TIP_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const testerSheet =
    isTester && testerModalOpen ? (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
        onClick={() => setTesterModalOpen(false)}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={testerModalTitleId}
          className="animate-sheet-up w-full max-w-md rounded-t-2xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl ring-1 ring-line sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id={testerModalTitleId} className="text-lg font-extrabold text-ink">
            Добавить энергию
          </h2>
          <input
            type="number"
            inputMode="numeric"
            enterKeyHint="done"
            min={1}
            value={testerAmount}
            onChange={(e) => setTesterAmount(e.target.value)}
            className="mt-3 w-full min-h-[48px] rounded-xl border border-line bg-canvas px-4 py-3.5 text-base font-semibold outline-none focus:ring-2 focus:ring-brand/30"
          />
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setTesterModalOpen(false)}
              className="btn-mobile flex-1 text-muted"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleTesterGrant}
              className="btn-mobile flex-1 bg-sky-600 text-white"
            >
              Добавить
            </button>
          </div>
        </div>
      </div>
    ) : null

  return (
    <>
      <div className="dashboard-page pb-8">
      <Header
        greeting={greetingForNow(userName)}
        subtitle={`Сегодня, ${todayLabel} · немного ближе к своим целям`}
        streak={state.streak}
        diamonds={state.diamonds}
        dailyCharge={state.dailyCharge}
        visitStreak={state.visitStreak}
        diamondHistory={state.diamondHistory ?? []}
        userName={userName}
      />
      <ChoiceMoment state={state} />
      <DayState state={state} date={dateKey()} />


      <DashboardOverview state={state} done={doneCount} total={totalCount} goals={activeGoals.length}
        onAdd={onQuickAdd ?? onOpenCreateHabit ?? (() => onNavigate('habits'))} onNavigate={onNavigate} />
      <JourneyGuide state={state} hasSubscription={hasSubscription} onNavigate={onNavigate} onCreateHabit={onOpenCreateHabit ?? (() => onNavigate('habits'))} />
      <div className="dashboard-content">
      {state.achievements.history[0] && (
        <Card className="dashboard-achievement animate-fade-up">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            🏆 Последнее достижение
          </p>
          {(() => {
            const last = state.achievementViews.find(
              (a) => a.id === state.achievements.history[0]?.achievementId,
            )
            if (!last) return null
            const today = new Date().toISOString().slice(0, 10)
            const when =
              last.unlockedAt?.slice(0, 10) === today
                ? 'Получено сегодня'
                : last.unlockedAt
                  ? new Date(last.unlockedAt).toLocaleDateString('ru-RU')
                  : ''
            return (
              <>
                <p className="mt-1 text-lg font-extrabold text-ink">
                  {last.icon} «{last.title}»
                </p>
                <p className="mt-0.5 text-xs font-medium text-muted">{when}</p>
                <button
                  type="button"
                  onClick={() => onNavigate('achievements')}
                  className="mt-3 rounded-xl bg-brand-soft px-3 py-2 text-xs font-extrabold text-brand"
                >
                  Посмотреть
                </button>
              </>
            )
          })()}
        </Card>
      )}

      {/* Главный фокус */}
      {dayComplete ? (
        <NextActionCard
          className="dashboard-focus animate-fade-up"
          title="День закрыт"
          action="Все дела на сегодня сделаны"
          cta="Смотреть прогресс"
          onAction={() => onNavigate('progress')}
          icon={<Check size={20} className="text-emerald-600" />}
          done
        />
      ) : focusTitle ? (
        <NextActionCard
          className="dashboard-focus animate-fade-up"
          title="Главный фокус"
          action={focusTitle}
          related={
            activeGoal
              ? `🎯 ${activeGoal.title}`
              : nextPending
                ? 'Привычка на сегодня'
                : 'Задача из плана'
          }
          relatedHint="Зачем:"
          cta={nextPending || pendingTasks[0] ? 'Отметить' : 'Открыть'}
          onAction={() => {
            if (nextPending) {
              const wasDone = nextPending.done
              state.toggleQuest(nextPending.id)
              if (!wasDone) {
                onToast?.({
                  title: 'Выполнено',
                  subtitle: nextPending.title,

                  streak: state.streak + 1,
                })
              }
            } else if (pendingTasks[0]) {
              state.togglePlannerTaskDone(pendingTasks[0].id)
              onToast?.({
                title: 'Задача выполнена',
                subtitle: pendingTasks[0].title,
              })
            } else if (activeGoal) onNavigate('goals', { entityId: activeGoal.id, returnTo: 'dashboard' })
          }}
          secondaryLabel="Все задачи"
          onSecondary={() => onNavigate('planner')}
        />
      ) : (
        <div className="dashboard-focus">
          <EmptyState
            emoji="🌱"
            title="Начни свой день"
            description="Добавь привычку или задачу — и здесь появится главный шаг на сегодня."
            cta="Добавить привычку"
            onCta={onOpenCreateHabit ?? (() => onNavigate('habits'))}
            secondary="Добавить задачу"
            onSecondary={onOpenCreateTask ?? (() => onNavigate('planner'))}
          />
        </div>
      )}

      {/* Быстрые действия */}
      <Card className="dashboard-actions animate-fade-up" style={{ animationDelay: '40ms' }}>
        <p className="text-sm font-extrabold text-ink">Начни что-то новое</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            {
              label: 'Новая привычка',
              emoji: '🔁',
              onClick: onOpenCreateHabit ?? (() => onNavigate('habits')),
            },
            {
              label: 'Новая задача',
              emoji: '📋',
              onClick: onOpenCreateTask ?? (() => onNavigate('planner')),
            },
            {
              label: 'Новая цель',
              emoji: '🎯',
              onClick: onOpenCreateGoal ?? (() => onNavigate('goals')),
            },
            {
              label: 'Новый квест',
              emoji: '⚔',
              onClick: onOpenCreateQuest ?? (() => onNavigate('quests')),
            },
          ].map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              className="flex flex-col items-start gap-1 rounded-xl bg-canvas px-3 py-3 text-left ring-1 ring-line transition hover:ring-brand/30"
            >
              <span className="text-lg">{a.emoji}</span>
              <span className="text-xs font-bold text-ink">{a.label}</span>
            </button>
          ))}
        </div>
        {onQuickAdd && (
          <button
            type="button"
            onClick={onQuickAdd}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
          >
            <Plus size={14} /> Все варианты
          </button>
        )}
      </Card>

      {/* Сегодня — чеклист */}
      <Card tabIndex={-1} aria-label="Задания на сегодня" className="dashboard-checklist animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-extrabold text-ink">Дела на сегодня <span className="dashboard-count">{doneCount}/{totalCount}</span></h3>
          <button
            type="button"
            onClick={() => onNavigate('habits')}
            className="text-xs font-bold text-brand hover:underline"
          >
            Все привычки
          </button>
        </div>
        <div className="dashboard-filters" aria-label="Фильтр дел">
          {([{ id: 'all', label: 'Все дела' }, { id: 'pending', label: 'В процессе' }, { id: 'done', label: 'Готово' }] as const).map(filter => <button key={filter.id} type="button" aria-pressed={listFilter === filter.id} onClick={() => setListFilter(filter.id)}>{filter.label}</button>)}
        </div>
        {totalCount > 0 && ((listFilter === 'pending' && doneCount === totalCount) || (listFilter === 'done' && doneCount === 0)) && <p className="py-6 text-sm text-muted">{listFilter === 'pending' ? 'Всё выполнено. Отличная работа!' : 'Пока нет выполненных дел. Начни с одного небольшого шага.'}</p>}
        {todayHabits.length === 0 && todayPlannerTasks.length === 0 ? (
          <p className="py-2 text-sm font-medium text-muted">
            Пока пусто. Добавь привычку — она появится здесь как дело дня.
          </p>
        ) : (
          <ul className="space-y-1">
            {todayHabits.filter(q => listFilter === 'all' || (listFilter === 'done' ? q.done : !q.done)).map((q) => {
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
                    aria-pressed={q.done}
                    onClick={() => {
                      const wasDone = q.done
                      state.toggleQuest(q.id)
                      if (!wasDone) {
                        onToast?.({
                          title: 'Выполнено',
                          subtitle: q.title,

                          streak: state.streak + 1,
                        })
                      }
                    }}
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
                  </button>
                </li>
              )
            })}
            {todayPlannerTasks.filter(task => listFilter === 'all' || (listFilter === 'done' ? !!task.completedAt : !task.completedAt)).map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  aria-pressed={Boolean(task.completedAt)}
                  onClick={() => state.togglePlannerTaskDone(task.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-canvas"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                      task.completedAt
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-line bg-white text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span
                    className={`min-w-0 flex-1 text-sm font-semibold ${
                      task.completedAt ? 'text-muted line-through' : 'text-ink'
                    }`}
                  >
                    {task.title}
                    <span className="mt-0.5 block text-[11px] font-medium text-muted">
                      Из плана · {task.sectionTitle}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="dashboard-goals grid gap-5 sm:grid-cols-2">
        {/* Активный квест */}
        {activeContract ? (
          <Card className="animate-fade-up" style={{ animationDelay: '80ms' }}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Активный квест
            </p>
            <p className="mt-1 text-base font-extrabold text-ink">
              ⚔ {activeContract.title}
            </p>
            {(() => {
              const habit = activeContract.habitId
                ? state.habitsAll.find((h) => h.id === activeContract.habitId)
                : null
              const p = contractProgress(activeContract, habit)
              return (
                <>
                  <p className="mt-2 text-sm font-medium text-muted">
                    {p.current} / {p.target}
                  </p>
                  <ProgressBar value={p.pct} className="mt-2" />
                </>
              )
            })()}
            <button
              type="button"
              onClick={() =>
                onNavigate('quests', {
                  entityId: activeContract.id,
                  returnTo: 'dashboard',
                })
              }
              className="mt-3 text-sm font-bold text-brand hover:underline"
            >
              Продолжить квест
            </button>
          </Card>
        ) : (
          <Card className="animate-fade-up" style={{ animationDelay: '80ms' }}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Квесты
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
              Испытание на срок с наградой
            </p>
            <p className="mt-1 text-xs font-medium text-muted">
              Когда привычки войдут в ритм — возьми квест.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('quests')}
              className="mt-3 text-sm font-bold text-brand hover:underline"
            >
              Смотреть квесты
            </button>
          </Card>
        )}

        {/* Ближайшая цель */}
        {activeGoal ? (
          <Card className="animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                Ближайшая цель
              </p>
              <span className="text-sm font-bold text-brand">
                {activeGoal.progress}%
              </span>
            </div>
            <p className="mt-1 text-base font-extrabold text-ink">
              🎯 {activeGoal.title}
            </p>
            <ProgressBar value={activeGoal.progress} className="mt-3" />
            <p className="mt-2 text-xs font-medium text-muted">
              Сегодня {activeGoal.todayDone} из {activeGoal.todayTotal} привычек
            </p>
            <button
              type="button"
              onClick={() =>
                onNavigate('goals', {
                  entityId: activeGoal.id,
                  returnTo: 'dashboard',
                })
              }
              className="mt-3 text-sm font-bold text-brand hover:underline"
            >
              Продолжить цель
            </button>
          </Card>
        ) : (
          <Card className="animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Target size={20} />
              </div>
              <div>
                <p className="text-sm font-extrabold text-ink">Целей пока нет</p>
                <p className="mt-1 text-xs font-medium text-muted">
                  Цель помогает понять, ради чего ты делаешь привычки.
                </p>
                <button
                  type="button"
                  onClick={onOpenCreateGoal ?? (() => onNavigate('goals'))}
                  className="mt-2 text-sm font-bold text-brand hover:underline"
                >
                  Создать цель
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>

      </div>

      {/* Напоминания */}
      {state.habitReminders.length > 0 && (
        <Card className="mt-5 border border-indigo-200 !bg-indigo-50 animate-fade-up">
          <div className="mb-2 flex items-center gap-2">
            <Bell size={16} className="text-indigo-600" />
            <h3 className="text-sm font-extrabold text-indigo-950">Напоминания</h3>
          </div>
          <ul className="space-y-1.5">
            {state.habitReminders.map((r) => (
              <li key={r.habitId} className="text-sm font-semibold text-ink">
                {r.emoji} {r.name}
                <span className="ml-2 text-xs font-medium text-indigo-700">
                  с {r.reminderTime}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {state.yesterdayMissed.length > 0 && (
        <Card className="mt-5 animate-fade-up">
          <p className="text-sm font-medium text-muted">
            Забыл отметить вчера? Восстанови день — без лимита и без начисления энергии.
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

      {lifeMapDeferred && (
        <Card className="mt-5 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-ink">Карта жизни ждёт</p>
              <p className="mt-1 text-sm font-medium text-muted">
                Когда освоишь базу — оцени сферы жизни.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('life-map')}
              className="rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white hover:bg-brand-deep"
            >
              Открыть карту
            </button>
          </div>
        </Card>
      )}

      {!tipHidden && (
        <Card className="relative mt-5 animate-fade-up">
          <button
            type="button"
            onClick={dismissTip}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-muted hover:bg-canvas"
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>
          <p className="pr-8 text-sm font-medium text-muted">
            <span className="font-extrabold text-ink">{DIAMOND} Энергия</span> —
            одна батарейка для планов и действий. При нехватке можно создать привычку в долг.
            Привычка −{formatDiamonds(ECONOMY.HABIT_COST)}, цель −{formatDiamonds(ECONOMY.GOAL_COST)}.
            Первые выполнения заряжают сильнее, следующие — меньше. Правила — по нажатию на батарейку.
          </p>
        </Card>
      )}

      {isTester && (
        <Card className="mt-5 border border-sky-200 !bg-sky-50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-extrabold text-sky-950">Панель тестировщика</p>
            <button
              type="button"
              onClick={() => setTesterModalOpen(true)}
              className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white"
            >
              Добавить энергию
            </button>
          </div>
        </Card>
      )}
      </div>

      {testerSheet}
    </>
  )
}

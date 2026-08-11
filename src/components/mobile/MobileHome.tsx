import { Check, Flame } from 'lucide-react'
import { NextActionCard } from '../NextActionCard'
import { EmptyState } from '../EmptyState'
import { Card, ProgressBar } from '../ui'
import type { PageId } from '../../data/seed'
import type { LifeOSState } from '../../hooks/useLifeOS'
import { ECONOMY } from '../../lib/economy'
import { contractProgress } from '../../lib/questLogic'

type Props = {
  state: LifeOSState
  userName: string
  greeting: string
  onNavigate: (page: PageId, opts?: { entityId?: string; returnTo?: PageId }) => void
  onOpenCreateHabit?: () => void
  onOpenCreateTask?: () => void
  onToast?: (t: {
    title: string
    subtitle?: string
    diamonds?: number
    streak?: number
  }) => void
}

/**
 * Mobile Home — answers “what should I do now?”
 * Intentionally lean; secondary surfaces live in other tabs / sheets.
 */
export function MobileHome({
  state,
  userName,
  greeting,
  onNavigate,
  onOpenCreateHabit,
  onOpenCreateTask,
  onToast,
}: Props) {
  const next = state.nextQuest
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
  const pendingHabits = state.quests.filter((q) => !q.done)
  const doneCount =
    state.quests.filter((q) => q.done).length +
    todayPlannerTasks.filter((t) => t.completedAt).length
  const totalCount = state.quests.length + todayPlannerTasks.length
  const dayPct =
    totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)
  const dayComplete =
    totalCount > 0 &&
    pendingHabits.length === 0 &&
    pendingTasks.length === 0

  const focusTitle =
    nextPending?.title ??
    pendingTasks[0]?.title ??
    (activeGoal ? `Продолжить: ${activeGoal.title}` : null)

  const checklist = [
    ...state.quests.map((q) => ({
      id: q.id,
      title: q.title,
      done: q.done,
      kind: 'habit' as const,
      onToggle: () => {
        const wasDone = q.done
        state.toggleQuest(q.id)
        if (!wasDone) {
          onToast?.({
            title: 'Выполнено',
            subtitle: q.title,
            diamonds: ECONOMY.DAY_REWARD,
            streak: state.streak + 1,
          })
        }
      },
    })),
    ...todayPlannerTasks.map((task) => ({
      id: task.id,
      title: task.title,
      done: Boolean(task.completedAt),
      kind: 'task' as const,
      onToggle: () => {
        state.togglePlannerTaskDone(task.id)
        if (!task.completedAt) {
          onToast?.({
            title: 'Задача выполнена',
            subtitle: task.title,
          })
        }
      },
    })),
  ]

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-4">
      <header className="pt-1">
        <p className="text-[28px] font-extrabold leading-tight tracking-tight text-ink">
          {greeting}
        </p>
        {state.streak > 0 ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700 ring-1 ring-orange-100">
            <Flame size={16} />
            {state.streak} дн. подряд
          </p>
        ) : (
          <p className="mt-2 text-sm font-medium text-muted">
            Привет, {userName.split(' ')[0]} — начнём с одного шага
          </p>
        )}
      </header>

      {dayComplete ? (
        <NextActionCard
          title="День закрыт"
          action="Все дела на сегодня сделаны"
          cta="Смотреть прогресс"
          onAction={() => onNavigate('progress')}
          icon={<Check size={20} className="text-emerald-600" />}
          done
        />
      ) : focusTitle ? (
        <NextActionCard
          title="Главная задача"
          action={focusTitle}
          related={
            activeGoal
              ? activeGoal.title
              : nextPending
                ? 'Привычка'
                : 'Задача'
          }
          relatedHint="Контекст:"
          cta={nextPending ? 'Выполнить' : pendingTasks[0] ? 'Выполнить' : 'Открыть'}
          onAction={() => {
            if (nextPending) {
              const wasDone = nextPending.done
              state.toggleQuest(nextPending.id)
              if (!wasDone) {
                onToast?.({
                  title: 'Выполнено',
                  subtitle: nextPending.title,
                  diamonds: ECONOMY.DAY_REWARD,
                  streak: state.streak + 1,
                })
              }
            } else if (pendingTasks[0]) {
              state.togglePlannerTaskDone(pendingTasks[0].id)
              onToast?.({
                title: 'Задача выполнена',
                subtitle: pendingTasks[0].title,
              })
            } else onNavigate('habits')
          }}
        />
      ) : (
        <EmptyState
          emoji="🌱"
          title="Что сделаем сегодня?"
          description="Добавь привычку или задачу — здесь появится главный шаг."
          cta="Добавить привычку"
          onCta={onOpenCreateHabit ?? (() => onNavigate('habits'))}
          secondary="Добавить задачу"
          onSecondary={onOpenCreateTask ?? (() => onNavigate('planner'))}
        />
      )}

      {checklist.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-ink">Сегодня ещё</h2>
            <button
              type="button"
              onClick={() => onNavigate('habits')}
              className="min-h-[44px] px-2 text-sm font-bold text-brand"
            >
              Все
            </button>
          </div>
          <ul className="space-y-1 rounded-2xl bg-surface p-2 ring-1 ring-line">
            {checklist.slice(0, 8).map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <button
                  type="button"
                  onClick={item.onToggle}
                  className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left active:bg-canvas"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                      item.done
                        ? 'border-brand bg-brand text-white'
                        : 'border-line bg-white text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span
                    className={`min-w-0 flex-1 text-[15px] font-semibold ${
                      item.done ? 'text-muted line-through' : 'text-ink'
                    }`}
                  >
                    {item.kind === 'habit' ? '🔥 ' : '○ '}
                    {item.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Card className="!p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-ink">Прогресс дня</p>
            <p className="mt-0.5 text-xs font-medium text-muted">
              {doneCount} из {totalCount || '—'}
            </p>
          </div>
          <p className="text-2xl font-extrabold text-ink">{dayPct}%</p>
        </div>
        <ProgressBar value={dayPct} className="mt-3" />
      </Card>

      {(activeGoal || activeContract) && (
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {activeGoal && (
            <button
              type="button"
              onClick={() =>
                onNavigate('goals', {
                  entityId: activeGoal.id,
                  returnTo: 'dashboard',
                })
              }
              className="min-w-[72%] shrink-0 rounded-2xl bg-surface p-4 text-left ring-1 ring-line active:scale-[0.99]"
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                Цель
              </p>
              <p className="mt-1 text-sm font-extrabold text-ink">
                🎯 {activeGoal.title}
              </p>
              <ProgressBar value={activeGoal.progress} className="mt-3" />
              <p className="mt-1.5 text-xs font-medium text-muted">
                {activeGoal.progress}%
              </p>
            </button>
          )}
          {activeContract && (
            <button
              type="button"
              onClick={() =>
                onNavigate('quests', {
                  entityId: activeContract.id,
                  returnTo: 'dashboard',
                })
              }
              className="min-w-[72%] shrink-0 rounded-2xl bg-surface p-4 text-left ring-1 ring-line active:scale-[0.99]"
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                Квест
              </p>
              <p className="mt-1 text-sm font-extrabold text-ink">
                ⚔ {activeContract.title}
              </p>
              {(() => {
                const habit = activeContract.habitId
                  ? state.habitsAll.find((h) => h.id === activeContract.habitId)
                  : null
                const p = contractProgress(activeContract, habit)
                return (
                  <>
                    <ProgressBar value={p.pct} className="mt-3" />
                    <p className="mt-1.5 text-xs font-medium text-muted">
                      {p.current} / {p.target}
                    </p>
                  </>
                )
              })()}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  ClipboardCheck,
  Grid3x3,
  Link2,
  Pause,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { AttachHabitModal } from '../components/AttachHabitModal'
import { BackBar } from '../components/BackBar'
import { EmptyState } from '../components/EmptyState'
import { GoalCheckInModal } from '../components/GoalCheckInModal'
import { GoalFormModal } from '../components/GoalFormModal'
import { HabitFormModal } from '../components/HabitFormModal'
import { LifeGoalsMap } from '../components/LifeGoalsMap'
import { MandalaMatrixModal } from '../components/MandalaMatrixModal'
import { Header } from '../components/Header'
import { NextActionCard } from '../components/NextActionCard'
import { SubscriptionPaywall } from '../components/SubscriptionPaywall'
import { Card, ProgressBar } from '../components/ui'
import { LIFE_GOALS_MAP_ID } from '../data/lifeMap'
import type { GoalStat, LifeOSState } from '../hooks/useLifeOS'
import { ECONOMY } from '../lib/economy'
import { cadenceLabel } from '../lib/goalLogic'
import { completedCount, todayKey } from '../lib/habitLogic'
import { filledHabitTitles } from '../lib/mandala'
import {
  submitGoalWithMoodboardOption,
  submitHabitWithMoodboardOption,
  linkHabitToGoalWithMoodboard,
  ensureHabitOnMoodboardForGoal,
} from '../components/desktop/moodboard/placeOnMoodboard'

type Props = {
  state: LifeOSState
  userName: string
  hasSubscription: boolean
  onBuySubscription: () => void
  focusGoalId?: string
  returnLabel?: string | null
  onBack?: () => void
  onOpenHabit?: (habitId: string) => void
  onClearFocus?: () => void
}

const STATUS_LABEL: Record<GoalStat['status'], string> = {
  active: 'Активна',
  paused: 'Пауза',
  done: 'Достигнута',
}

export function GoalsPage({
  state,
  userName,
  hasSubscription,
  onBuySubscription,
  focusGoalId,
  returnLabel,
  onBack,
  onOpenHabit,
}: Props) {
  const [goalFormOpen, setGoalFormOpen] = useState(false)
  const [matrixOpen, setMatrixOpen] = useState(false)
  const [matrixEditId, setMatrixEditId] = useState<string | null>(null)
  const [lifeGoalsMapOpen, setLifeGoalsMapOpen] = useState(false)
  const [habitFormGoalId, setHabitFormGoalId] = useState<string | null>(null)
  const [attachGoalId, setAttachGoalId] = useState<string | null>(null)
  const [checkInGoalId, setCheckInGoalId] = useState<string | null>(null)
  const focusRef = useRef<HTMLDivElement | null>(null)

  const attachable = state.habitsAll.filter(
    (h) => !h.goalId || (attachGoalId && h.goalId !== attachGoalId),
  )

  const checkInGoal =
    state.goalStats.find((g) => g.id === checkInGoalId) ?? null
  const matrixEditGoal =
    state.goalStats.find((g) => g.id === matrixEditId) ?? null

  const customGoals = state.customGoalStats
  const listGoals = [
    ...(state.lifeGoalsMapStat ? [state.lifeGoalsMapStat] : []),
    ...customGoals,
  ]

  const focusGoal =
    listGoals.find((g) => g.id === focusGoalId) ??
    listGoals.find((g) => g.status === 'active')

  useEffect(() => {
    if (!focusGoalId || !focusRef.current) return
    focusRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [focusGoalId])

  if (!hasSubscription) {
    return (
      <div>
        <Header
          greeting="Цели"
          subtitle="Куда я хочу прийти?"
          streak={state.streak}
          diamonds={state.diamonds}
          visitStreak={state.visitStreak}
          diamondHistory={state.diamondHistory ?? []}
          userName={userName}
        />
        <SubscriptionPaywall feature="goals" onBuy={onBuySubscription} />
      </div>
    )
  }

  const nextHabit = focusGoal?.habits.find((h) => {
    const key = todayKey()
    return !h.completions[key]
  })

  return (
    <div className="pb-24 md:pb-0">
      {onBack && returnLabel && <BackBar label={`← ${returnLabel}`} onBack={onBack} />}
      <Header
        greeting="Цели"
        subtitle="Куда я хочу прийти? · цель → привычки → сегодня"
        streak={state.streak}
        diamonds={state.diamonds}
        visitStreak={state.visitStreak}
        diamondHistory={state.diamondHistory ?? []}
        userName={userName}
      />

      {focusGoal && focusGoal.status === 'active' && (
        <NextActionCard
          className="mb-5"
          title="Продолжить цель"
          action={
            nextHabit
              ? `${nextHabit.emoji} ${nextHabit.name}`
              : focusGoal.habitCount === 0
                ? 'Добавь первую привычку к цели'
                : focusGoal.needsCheckIn
                  ? 'Обнови результат цели'
                  : `🎯 ${focusGoal.title} · ${focusGoal.progress}%`
          }
          related={`🎯 ${focusGoal.title}`}
          relatedHint="Цель:"
          cta={
            nextHabit
              ? 'Сделать сейчас'
              : focusGoal.habitCount === 0
                ? 'Добавить привычку'
                : focusGoal.needsCheckIn
                  ? 'Обновить'
                  : 'Открыть'
          }
          onAction={() => {
            if (nextHabit && onOpenHabit) onOpenHabit(nextHabit.id)
            else if (focusGoal.habitCount === 0) setHabitFormGoalId(focusGoal.id)
            else if (focusGoal.needsCheckIn) setCheckInGoalId(focusGoal.id)
          }}
          icon="🎯"
        />
      )}

      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          data-tour="goals-matrix"
          onClick={() => {
            setMatrixEditId(null)
            setMatrixOpen(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-sm font-bold text-white hover:bg-ink/90"
        >
          <Grid3x3 size={16} /> Карта цели · −{ECONOMY.MATRIX_COST}
        </button>
        <button
          type="button"
          data-tour="goals-new"
          onClick={() => setGoalFormOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white hover:bg-brand-deep"
        >
          <Plus size={16} /> Новая цель
        </button>
      </div>

      {listGoals.length === 0 ? (
        <EmptyState
          emoji="🎯"
          title="Здесь будут твои цели"
          description="Цель помогает понять, ради чего ты выполняешь привычки. Создай первую цель за 30 секунд."
          cta="Создать цель"
          onCta={() => setGoalFormOpen(true)}
          secondary="Карта цели 9×9"
          onSecondary={() => {
            setMatrixEditId(null)
            setMatrixOpen(true)
          }}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {listGoals.map((g, i) => {
            const isLifeWheel = g.id === LIFE_GOALS_MAP_ID
            const focused = focusGoalId === g.id
            return (
              <div
                key={g.id}
                ref={focused ? focusRef : undefined}
                className={focused ? 'rounded-2xl ring-2 ring-brand/40' : undefined}
              >
                <GoalCard
                  goal={g}
                  delay={i * 60}
                  systemLocked={isLifeWheel}
                  onCheckIn={() => setCheckInGoalId(g.id)}
                  onToggleStage={(stageId) => state.toggleGoalStage(g.id, stageId)}
                  onAddHabit={() => setHabitFormGoalId(g.id)}
                  onAttach={() => setAttachGoalId(g.id)}
                  onUnlink={(habitId) => state.linkHabitToGoal(habitId, null)}
                  onOpenHabit={onOpenHabit}
                  onPause={() =>
                    state.setGoalStatus(g.id, g.status === 'paused' ? 'active' : 'paused')
                  }
                  onDone={() =>
                    state.setGoalStatus(g.id, g.status === 'done' ? 'active' : 'done')
                  }
                  onDelete={() => {
                    if (
                      confirm(
                        `Удалить цель «${g.title}»? Связанные привычки тоже удалятся.`,
                      )
                    ) {
                      state.deleteGoal(g.id)
                    }
                  }}
                  onEditMatrix={
                    g.measureKind === 'matrix'
                      ? () => {
                          if (isLifeWheel) {
                            setLifeGoalsMapOpen(true)
                            return
                          }
                          setMatrixEditId(g.id)
                          setMatrixOpen(true)
                        }
                      : undefined
                  }
                />
              </div>
            )
          })}
        </div>
      )}

      <GoalFormModal
        open={goalFormOpen}
        onClose={() => setGoalFormOpen(false)}
        onSubmit={(input, attachedHabits, addToMoodboard) =>
          submitGoalWithMoodboardOption(state, input, attachedHabits, addToMoodboard)
        }
        diamonds={state.diamonds}
        showMoodboardOption
      />

      <MandalaMatrixModal
        open={matrixOpen}
        onClose={() => {
          setMatrixOpen(false)
          setMatrixEditId(null)
        }}
        diamonds={state.diamonds}
        goal={matrixEditGoal}
        habits={state.habitsAll}
        onCreateGoal={state.createMatrixGoal}
        onSetPillar={state.setMatrixPillar}
        onAddHabit={(input) => {
          const result = state.addHabit(input)
          if (result.ok && result.habitId) {
            ensureHabitOnMoodboardForGoal(
              state,
              result.habitId,
              input.goalId ?? input.matrixGoalId,
            )
          }
          return result
        }}
        onGoalCreated={(id) => setMatrixEditId(id)}
      />

      {lifeGoalsMapOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
          onClick={() => setLifeGoalsMapOpen(false)}
          role="presentation"
        >
          <div
            className="relative max-h-[94dvh] w-full max-w-3xl overflow-auto rounded-t-2xl bg-canvas p-3 shadow-xl sm:rounded-2xl sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLifeGoalsMapOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-lg bg-surface p-1.5 text-muted ring-1 ring-line hover:text-ink"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
            <LifeGoalsMap
              goal={state.lifeGoalsMapGoal}
              habits={state.habitsAll}
              diamonds={state.diamonds}
              hiddenAreas={state.hiddenLifeAreas}
              onAddHabit={(input) => {
                const result = state.addHabit(input)
                if (result.ok && result.habitId) {
                  ensureHabitOnMoodboardForGoal(
                    state,
                    result.habitId,
                    input.goalId ?? input.matrixGoalId,
                  )
                }
                return result
              }}
            />
          </div>
        </div>
      )}

      <GoalCheckInModal
        open={!!checkInGoalId}
        goal={checkInGoal}
        onClose={() => setCheckInGoalId(null)}
        onLogValue={state.logGoalValue}
        onCompleteStage={state.completeGoalStage}
      />

      <HabitFormModal
        open={!!habitFormGoalId}
        onClose={() => setHabitFormGoalId(null)}
        onSubmit={(input, addToMoodboard) =>
          submitHabitWithMoodboardOption(state, input, addToMoodboard)
        }
        goals={state.goals.filter((g) => g.status === 'active' && !g.fromLifeMap)}
        defaultGoalId={habitFormGoalId ?? undefined}
        diamonds={state.diamonds}
        showMoodboardOption
      />

      <AttachHabitModal
        open={!!attachGoalId}
        onClose={() => setAttachGoalId(null)}
        habits={attachable}
        onPick={(habitId) => {
          if (attachGoalId) linkHabitToGoalWithMoodboard(state, habitId, attachGoalId)
        }}
      />
    </div>
  )
}

function GoalCard({
  goal: g,
  delay,
  systemLocked,
  onCheckIn,
  onToggleStage,
  onAddHabit,
  onAttach,
  onUnlink,
  onOpenHabit,
  onPause,
  onDone,
  onDelete,
  onEditMatrix,
}: {
  goal: GoalStat
  delay: number
  systemLocked?: boolean
  onCheckIn: () => void
  onToggleStage: (stageId: string) => void
  onAddHabit: () => void
  onAttach: () => void
  onUnlink: (habitId: string) => void
  onOpenHabit?: (habitId: string) => void
  onPause: () => void
  onDone: () => void
  onDelete: () => void
  onEditMatrix?: () => void
}) {
  const hasMeasure = g.measureKind === 'number' || g.measureKind === 'stages'
  const isMatrix = g.measureKind === 'matrix'
  const isLifeWheel = g.id === LIFE_GOALS_MAP_ID
  const matrixHabits = g.matrix ? filledHabitTitles(g.matrix).length : 0
  const matrixPillars = g.matrix?.pillars.filter((p) => p.trim()).length ?? 0

  return (
    <Card className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold text-ink">{g.title}</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                g.status === 'active'
                  ? 'bg-brand-soft text-brand'
                  : g.status === 'done'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-canvas text-muted'
              }`}
            >
              {STATUS_LABEL[g.status]}
            </span>
            {isLifeWheel && (
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800 ring-1 ring-sky-100">
                колесо баланса
              </span>
            )}
            {isMatrix && !isLifeWheel && (
              <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800 ring-1 ring-sky-100">
                карта цели
              </span>
            )}
            {g.metricLabel && (
              <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-bold text-muted">
                {g.metricLabel}
              </span>
            )}
            {hasMeasure && (
              <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-bold text-muted">
                {cadenceLabel(g.cadence)}
              </span>
            )}
          </div>
        </div>
        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">
          {g.progress}%
        </span>
      </div>

      <ProgressBar value={g.progress} className="mb-2" />
      <p className="mb-3 text-[11px] font-medium text-muted">
        {isLifeWheel
          ? `Аспектов: ${matrixPillars}/8 · привычек: ${g.habitCount}`
          : isMatrix
            ? `Направлений: ${matrixPillars}/8 · привычек в таблице: ${matrixHabits}`
            : g.resultProgress != null
              ? 'Шкала по результату цели'
              : 'Шкала по привычкам — задай метрику, чтобы мерить итог'}
      </p>

      {isMatrix && onEditMatrix && (
        <button
          type="button"
          onClick={onEditMatrix}
          className="mb-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-50 px-3 py-2.5 text-sm font-bold text-sky-900 ring-1 ring-sky-100 hover:bg-sky-100"
        >
          <Grid3x3 size={16} /> Открыть карту
        </button>
      )}

      {g.needsCheckIn && g.status === 'active' && (
        <button
          type="button"
          onClick={onCheckIn}
          className="mb-3 flex w-full items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-left text-sm font-semibold text-amber-950 ring-1 ring-amber-100 hover:bg-amber-100/80"
        >
          <ClipboardCheck size={16} className="shrink-0 text-amber-600" />
          <span>
            Пора обновить результат
            <span className="mt-0.5 block text-[11px] font-medium text-amber-900/70">
              {cadenceLabel(g.cadence)} · нажми, чтобы отметить где ты сейчас
            </span>
          </span>
        </button>
      )}

      {g.measureKind === 'number' && g.status === 'active' && !g.needsCheckIn && (
        <button
          type="button"
          onClick={onCheckIn}
          className="mb-3 inline-flex items-center gap-1.5 rounded-xl bg-brand-soft px-3 py-2 text-xs font-bold text-brand hover:bg-brand hover:text-white"
        >
          <ClipboardCheck size={14} /> Обновить значение
        </button>
      )}

      {g.measureKind === 'stages' && (g.stages?.length ?? 0) > 0 && (
        <ul className="mb-3 space-y-1.5">
          {g.stages!.map((st, i) => (
            <li key={st.id}>
              <button
                type="button"
                onClick={() => onToggleStage(st.id)}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-canvas"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    st.done
                      ? 'bg-success text-white'
                      : 'bg-canvas text-muted ring-1 ring-line'
                  }`}
                >
                  {st.done ? '✓' : i + 1}
                </span>
                <span
                  className={
                    st.done
                      ? 'font-medium text-muted line-through'
                      : 'font-semibold text-ink'
                  }
                >
                  {st.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isMatrix && g.matrix && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {g.matrix.pillars
            .map((p, i) => ({ p: p.trim(), i }))
            .filter((x) => x.p)
            .map(({ p, i }) => (
              <span
                key={i}
                className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-900"
              >
                {p}
              </span>
            ))}
        </div>
      )}

      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-canvas px-2 py-2">
          <p className="text-sm font-extrabold text-ink">{g.todayPct}%</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Сегодня
          </p>
        </div>
        <div className="rounded-xl bg-canvas px-2 py-2">
          <p className="text-sm font-extrabold text-ink">{g.weekPct}%</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Неделя
          </p>
        </div>
        <div className="rounded-xl bg-canvas px-2 py-2">
          <p className="text-sm font-extrabold text-ink">{g.habitProgress}%</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Привычки
          </p>
        </div>
      </div>

      {g.note && !isMatrix && (
        <p className="mb-3 text-sm italic leading-relaxed text-muted">«{g.note}»</p>
      )}

      <div className="mb-3 border-t border-line pt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-muted">
            Связанные привычки · {g.habitCount}
            {isMatrix && !isLifeWheel ? ' · бесплатно' : ''}
          </h4>
        </div>

        {g.habits.length === 0 ? (
          <p className="mb-3 text-sm font-medium text-muted">
            {isLifeWheel
              ? 'Открой карту и заполни ячейки вокруг аспектов.'
              : isMatrix
                ? 'Заполни ячейки в матрице — привычки появятся сами.'
                : 'Пока пусто — добавь или закрепи привычки к этой цели.'}
          </p>
        ) : (
          <ul className="mb-3 space-y-2">
            {g.habits.map((h) => {
              const formPct = Math.min(
                100,
                Math.round((completedCount(h) / h.targetDays) * 100),
              )
              return (
                <li
                  key={h.id}
                  className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => onOpenHabit?.(h.id)}
                  >
                    <span>{h.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {h.name}
                        {h.fromMatrix && (
                          <span className="ml-1 text-[10px] font-bold text-emerald-700">
                            free
                          </span>
                        )}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <ProgressBar value={formPct} className="!h-1 flex-1" />
                        <span className="shrink-0 text-[10px] font-bold text-muted">
                          {h.timesPerWeek}×/нед
                        </span>
                      </div>
                    </div>
                  </button>
                  {!systemLocked && (
                    <button
                      type="button"
                      title="Отвязать от цели"
                      onClick={() => onUnlink(h.id)}
                      className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink"
                    >
                      <Link2 size={14} />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {!systemLocked && (
          <div className="flex flex-wrap gap-2">
            {!isMatrix && (
              <button
                type="button"
                onClick={onAddHabit}
                className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-deep"
              >
                <Plus size={14} /> Добавить привычку
              </button>
            )}
            <button
              type="button"
              onClick={onAttach}
              className="inline-flex items-center gap-1 rounded-xl bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand hover:text-white"
            >
              <Link2 size={14} /> Закрепить существующую
            </button>
          </div>
        )}
      </div>

      {!systemLocked && (
        <div className="flex flex-wrap gap-1 border-t border-line pt-3">
          <button
            type="button"
            onClick={onPause}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-muted hover:bg-canvas hover:text-ink"
          >
            <Pause size={14} />
            {g.status === 'paused' ? 'Возобновить' : 'Пауза'}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-muted hover:bg-canvas hover:text-ink"
          >
            <CheckCircle2 size={14} />
            {g.status === 'done' ? 'Вернуть' : 'Достигнута'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-danger hover:bg-red-50"
          >
            <Trash2 size={14} /> Удалить
          </button>
        </div>
      )}
    </Card>
  )
}

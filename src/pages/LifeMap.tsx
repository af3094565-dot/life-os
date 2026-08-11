import { useMemo, useState } from 'react'
import { CircleDot, Eye, EyeOff, Pencil, Plus } from 'lucide-react'
import { Header } from '../components/Header'
import { HabitFormModal } from '../components/HabitFormModal'
import { LifeGoalsMap } from '../components/LifeGoalsMap'
import { LifeMapGoalsTable } from '../components/LifeMapGoalsTable'
import { LifeWheel } from '../components/LifeWheel'
import { SubscriptionPaywall } from '../components/SubscriptionPaywall'
import { Card } from '../components/ui'
import {
  LIFE_AREA_MAX_HABITS,
  findLifeArea,
  lifeAreaHabitScore,
  lifeMapGoalId,
  type LifeAreaId,
} from '../data/lifeMap'
import type { LifeOSState } from '../hooks/useLifeOS'
import { DIAMOND, ECONOMY, formatDiamonds } from '../lib/economy'
import { elapsedStats } from '../lib/habitLogic'
import {
  placeLifeMapOnMoodboard,
  submitHabitWithMoodboardOption,
  ensureHabitOnMoodboardForGoal,
} from '../components/desktop/moodboard/placeOnMoodboard'

type Props = {
  state: LifeOSState
  userName: string
  hasSubscription: boolean
  onBuySubscription: () => void
  onLifeMapCreated?: () => void
}

export function LifeMapPage({
  state,
  userName,
  hasSubscription,
  onBuySubscription,
  onLifeMapCreated,
}: Props) {
  const [selected, setSelected] = useState<LifeAreaId | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editHabitId, setEditHabitId] = useState<string | null>(null)
  const [createPaywall, setCreatePaywall] = useState(false)
  const [addToMoodboard, setAddToMoodboard] = useState(false)

  const scores = useMemo(() => {
    const map = {} as Record<LifeAreaId, number>
    for (const a of state.visibleLifeAreas) {
      const count = state.habitsAll.filter((h) => h.lifeArea === a.id).length
      map[a.id] = lifeAreaHabitScore(count)
    }
    return map
  }, [state.habitsAll, state.visibleLifeAreas])

  const areaHabits = useMemo(() => {
    if (!selected) return []
    return state.habitsAll.filter((h) => h.lifeArea === selected)
  }, [state.habitsAll, selected])

  const selectedArea = findLifeArea(selected ?? undefined)
  const selectedGoalId = selected ? lifeMapGoalId(selected) : undefined
  const editHabit = editHabitId
    ? state.habitsAll.find((h) => h.id === editHabitId) ?? null
    : null

  const createMap = () => {
    if (!hasSubscription) {
      setCreatePaywall(true)
      return
    }
    state.createLifeMap()
    if (addToMoodboard) placeLifeMapOnMoodboard(state)
    onLifeMapCreated?.()
    setCreatePaywall(false)
  }

  const buyAndCreate = () => {
    onBuySubscription()
    state.createLifeMap()
    if (addToMoodboard) placeLifeMapOnMoodboard(state)
    onLifeMapCreated?.()
    setCreatePaywall(false)
  }

  const openAdd = (id: LifeAreaId) => {
    const count = state.habitsAll.filter((h) => h.lifeArea === id).length
    if (count >= LIFE_AREA_MAX_HABITS) return
    setSelected(id)
    setEditHabitId(null)
    setFormOpen(true)
  }

  const openAddForGoal = (goalId: string) => {
    const goal = state.lifeMapGoalStats.find((g) => g.id === goalId)
    if (goal?.lifeArea) {
      setSelected(goal.lifeArea)
      const count = state.habitsAll.filter((h) => h.lifeArea === goal.lifeArea).length
      if (count >= LIFE_AREA_MAX_HABITS) return
    }
    setEditHabitId(null)
    setFormOpen(true)
  }

  if (!state.hasLifeMap) {
    return (
      <div>
        <Header
          greeting="Карта жизни"
          subtitle="Колесо баланса · аспекты · привычки"
          streak={state.streak}
          diamonds={state.diamonds}
          visitStreak={state.visitStreak}
          diamondHistory={state.diamondHistory ?? []}
          userName={userName}
        />

        {createPaywall ? (
          <SubscriptionPaywall feature="life-map" onBuy={buyAndCreate} />
        ) : (
          <Card className="animate-fade-up">
            <div className="mx-auto flex max-w-md flex-col items-center py-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <CircleDot size={26} />
              </div>
              <h3 className="text-xl font-extrabold text-ink">Создать карту жизни</h3>
              <p className="mt-2 text-sm font-medium text-muted">
                Появится колесо баланса, 8 аспектов и цели для них. Создание доступно
                по подписке Life OS Pro.
              </p>
              <label className="mt-5 flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-xl bg-canvas px-3 py-3 text-left ring-1 ring-line">
                <input
                  type="checkbox"
                  checked={addToMoodboard}
                  onChange={(e) => setAddToMoodboard(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--brand,#7c3aed)]"
                />
                <span>
                  <span className="block text-sm font-bold text-ink">Добавить на мудборд?</span>
                  <span className="mt-0.5 block text-[12px] font-medium text-muted">
                    Центр и 8 аспектов — стикерами со стрелками
                  </span>
                </span>
              </label>
              <button
                type="button"
                onClick={createMap}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-deep"
              >
                <Plus size={16} />
                Создать карту
              </button>
            </div>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div>
      <Header
        greeting="Карта жизни"
        subtitle="Колесо · карта целей · привычки по аспектам"
        streak={state.streak}
        diamonds={state.diamonds}
        visitStreak={state.visitStreak}
        diamondHistory={state.diamondHistory ?? []}
        userName={userName}
      />

      <Card className="mb-5 animate-fade-up" data-tour="life-wheel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-ink">Колесо баланса</h3>
            <p className="mt-1 max-w-lg text-sm font-medium text-muted">
              Оценка сектора = сколько привычек в аспекте (макс.{' '}
              {LIFE_AREA_MAX_HABITS}). Нажми сектор — добавь привычку за{' '}
              <span className="font-bold text-ink">
                {formatDiamonds(ECONOMY.LIFE_MAP_HABIT_COST)}
              </span>
              .
            </p>
          </div>
          <div className="rounded-full bg-sky-50 px-3 py-1.5 text-sm font-bold text-ink ring-1 ring-sky-100">
            {DIAMOND} {state.diamonds} · −{ECONOMY.LIFE_MAP_HABIT_COST}
          </div>
        </div>

        <div className="mt-4">
          {state.visibleLifeAreas.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-muted">
              Все аспекты скрыты. Покажи хотя бы один в таблице ниже.
            </p>
          ) : (
            <LifeWheel
              scores={scores}
              areas={state.visibleLifeAreas}
              selectedId={selected}
              onSelect={(id) => openAdd(id)}
            />
          )}
        </div>
      </Card>

      <div className="mb-5">
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

      <div className="mb-5">
        <LifeMapGoalsTable
          goals={state.lifeMapGoalStats}
          hiddenAreas={state.hiddenLifeAreas}
          onAddHabit={openAddForGoal}
          onEditHabit={(id) => {
            setEditHabitId(id)
            setFormOpen(false)
          }}
          onDeleteHabit={state.deleteHabit}
          onToggleHide={state.toggleHideLifeArea}
        />
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {state.visibleLifeAreas.map((a, i) => {
          const count = state.habitsAll.filter((h) => h.lifeArea === a.id).length
          const score = lifeAreaHabitScore(count)
          const active = selected === a.id
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a.id)}
              className={`rounded-2xl bg-surface p-4 text-left shadow-[0_1px_3px_rgba(26,26,46,0.04)] ring-1 transition animate-fade-up ${
                active ? 'ring-2' : 'ring-line hover:ring-brand/30'
              }`}
              style={{
                animationDelay: `${i * 40}ms`,
                ...(active ? { boxShadow: `0 0 0 1px ${a.color}` } : {}),
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xl">{a.emoji}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-extrabold text-white"
                  style={{ background: a.color }}
                >
                  {score}/{LIFE_AREA_MAX_HABITS}
                </span>
              </div>
              <p className="mt-2 text-sm font-extrabold text-ink">{a.short}</p>
              <p className="mt-0.5 text-[11px] font-medium text-muted">{a.hint}</p>
              <p className="mt-2 text-[11px] font-bold" style={{ color: a.color }}>
                {count
                  ? `${count} ${count === 1 ? 'привычка' : count < 5 ? 'привычки' : 'привычек'}`
                  : 'пока пусто'}
              </p>
            </button>
          )
        })}
      </div>

      {state.hiddenLifeAreas.length > 0 && (
        <Card className="mb-5 !py-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
            Скрытые аспекты
          </p>
          <div className="flex flex-wrap gap-2">
            {state.hiddenLifeAreas.map((id) => {
              const a = findLifeArea(id)
              if (!a) return null
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => state.toggleHideLifeArea(id)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white"
                  style={{ background: a.color }}
                >
                  <Eye size={12} /> {a.emoji} {a.short}
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {selectedArea && !state.hiddenLifeAreas.includes(selectedArea.id) && (
        <Card className="mt-5 animate-fade-up">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-ink">
                {selectedArea.emoji} {selectedArea.title}
              </h3>
              <p className="mt-0.5 text-sm font-medium text-muted">
                {selectedArea.hint} · {areaHabits.length}/{LIFE_AREA_MAX_HABITS} привычек
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => state.toggleHideLifeArea(selectedArea.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-canvas px-3 py-2 text-sm font-bold text-muted ring-1 ring-line hover:text-ink"
              >
                <EyeOff size={16} /> Скрыть
              </button>
              <button
                type="button"
                disabled={areaHabits.length >= LIFE_AREA_MAX_HABITS}
                onClick={() => openAdd(selectedArea.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white hover:bg-brand-deep disabled:opacity-40"
              >
                <Plus size={16} /> Добавить · −{formatDiamonds(ECONOMY.LIFE_MAP_HABIT_COST)}
              </button>
            </div>
          </div>

          {areaHabits.length === 0 ? (
            <p className="text-sm font-medium text-muted">
              В этом аспекте ещё нет привычек. Добавь первую — сектор на колесе вырастет.
            </p>
          ) : (
            <ul className="space-y-2">
              {areaHabits.map((h) => {
                const pct = elapsedStats(h).pct
                return (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2.5"
                  >
                    <span className="text-sm font-semibold text-ink">
                      {h.emoji} {h.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted">{pct}%</span>
                      <button
                        type="button"
                        title="Редактировать"
                        onClick={() => setEditHabitId(h.id)}
                        className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      )}

      <HabitFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(input, addToMoodboard) =>
          submitHabitWithMoodboardOption(state, input, addToMoodboard)
        }
        goals={state.goals.filter((g) => g.status === 'active')}
        defaultGoalId={selectedGoalId}
        diamonds={state.diamonds}
        cost={ECONOMY.LIFE_MAP_HABIT_COST}
        lifeArea={selected ?? undefined}
        fromLifeMap
        lockGoal
        title={selectedArea ? `Привычка · ${selectedArea.short}` : 'Привычка с карты жизни'}
        defaultEmoji={selectedArea?.emoji ?? '⭐'}
      />

      <HabitFormModal
        open={!!editHabit}
        onClose={() => setEditHabitId(null)}
        habit={editHabit}
        onUpdate={state.updateHabit}
        lifeArea={editHabit?.lifeArea}
        fromLifeMap
      />
    </div>
  )
}

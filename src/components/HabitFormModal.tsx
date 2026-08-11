import { useEffect, useMemo, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import {
  DURATION_OPTIONS,
  PRIORITY_OPTIONS,
  type Goal,
  type Habit,
  type HabitDuration,
  type HabitPriority,
} from '../data/seed'
import { findLifeArea, type LifeAreaId } from '../data/lifeMap'
import type { NewHabitInput, UpdateHabitInput } from '../hooks/useLifeOS'
import {
  ECONOMY,
  canAfford,
  formatDiamonds,
  habitCostHint,
  lifeMapHabitCostHint,
} from '../lib/economy'
import { plannedEndPreview, todayKey } from '../lib/habitLogic'
import { blurActiveInput } from '../hooks/useKeyboardOpen'
import { StepWizard, type WizardStep } from './StepWizard'

const EMOJIS = ['🛌', '🚶', '📚', '💧', '🧘', '🥗', '✍️', '💪', '🧠', '⭐', '🌅', '🪥']
const FREQ_OPTIONS = [1, 2, 3, 4, 5, 6, 7]

type Props = {
  open: boolean
  onClose: () => void
  onSubmit?: (
    input: NewHabitInput,
    addToMoodboard?: boolean,
  ) => { ok: boolean; reason?: string } | void
  onUpdate?: (
    habitId: string,
    input: UpdateHabitInput,
  ) => { ok: boolean; reason?: string } | void
  /** Режим редактирования существующей привычки */
  habit?: Habit | null
  goals?: Goal[]
  defaultGoalId?: string
  diamonds?: number
  /** Цена создания (по умолчанию HABIT_COST) */
  cost?: number
  /** Аспект карты жизни */
  lifeArea?: LifeAreaId
  fromLifeMap?: boolean
  title?: string
  defaultEmoji?: string
  /** Бесплатная привычка с карты цели */
  fromMatrix?: boolean
  /** Не давать менять цель — уже закреплена */
  lockGoal?: boolean
  /** Показать галочку «Добавить на мудборд» */
  showMoodboardOption?: boolean
}

export function HabitFormModal({
  open,
  onClose,
  onSubmit,
  onUpdate,
  habit = null,
  goals = [],
  defaultGoalId,
  diamonds = ECONOMY.START_DIAMONDS,
  cost = ECONOMY.HABIT_COST,
  lifeArea,
  fromLifeMap = false,
  title,
  defaultEmoji = '🛌',
  fromMatrix = false,
  lockGoal = false,
  showMoodboardOption = false,
}: Props) {
  const isEdit = !!habit
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(defaultEmoji)
  const [priority, setPriority] = useState<HabitPriority>('important')
  const [targetDays, setTargetDays] = useState<HabitDuration>(21)
  const [startDate, setStartDate] = useState(todayKey())
  const [reminderTime, setReminderTime] = useState('')
  const [timesPerWeek, setTimesPerWeek] = useState(7)
  const [goalId, setGoalId] = useState('')
  const [addToMoodboard, setAddToMoodboard] = useState(false)
  const [error, setError] = useState('')
  const [wizardStep, setWizardStep] = useState(0)
  const [showDetails, setShowDetails] = useState(false)
  const [highlight, setHighlight] = useState<{ name?: boolean; start?: boolean }>({})
  const affordable = isEdit || cost <= 0 || canAfford(diamonds, cost)
  const area = findLifeArea(lifeArea ?? habit?.lifeArea)
  const costHintFn = fromLifeMap || area ? lifeMapHabitCostHint : habitCostHint
  const modalTitle =
    title ??
    (isEdit
      ? 'Редактировать привычку'
      : area
        ? `Привычка · ${area.short}`
        : 'Новая привычка')
  const canSubmit = !!name.trim() && !!startDate && (isEdit || affordable)

  useEffect(() => {
    if (!open) return
    if (habit) {
      setName(habit.name)
      setEmoji(habit.emoji || defaultEmoji)
      setPriority(habit.priority)
      setTargetDays(habit.targetDays)
      setStartDate(habit.startDate)
      setReminderTime(habit.reminderTime ?? '')
      setTimesPerWeek(habit.timesPerWeek)
      setGoalId(habit.goalId ?? '')
    } else {
      setName('')
      setEmoji(defaultEmoji)
      setPriority('important')
      setTargetDays(21)
      setStartDate(todayKey())
      setReminderTime('')
      setTimesPerWeek(7)
      setGoalId(defaultGoalId ?? '')
    }
    setAddToMoodboard(false)
    setError('')
    setWizardStep(0)
    setShowDetails(false)
    setHighlight({})
  }, [open, defaultGoalId, defaultEmoji, habit])

  const selectedDuration = DURATION_OPTIONS.find((d) => d.value === targetDays)
  const endPreview = plannedEndPreview(startDate, targetDays, timesPerWeek)
  const startLabel = new Date(startDate + 'T12:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })
  const endLabel = new Date(endPreview + 'T12:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })

  const steps: WizardStep[] = useMemo(() => {
    const nameStep: WizardStep = {
      id: 'name',
      title: 'Что ты хочешь делать?',
      hint: area
        ? `Привычка для сферы «${area.title}»`
        : 'Напиши просто — как ребёнку понятно',
      content: (
        <div className="space-y-3">
          {area && (
            <div
              className="rounded-xl px-3 py-2.5 text-sm font-semibold ring-1"
              style={{
                background: `${area.color}18`,
                color: area.color,
                boxShadow: `inset 0 0 0 1px ${area.color}33`,
              }}
            >
              {area.emoji} {area.title}
              <span className="mt-0.5 block text-[12px] font-medium opacity-80">
                {area.hint}
              </span>
            </div>
          )}
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (e.target.value.trim()) {
                setHighlight((h) => ({ ...h, name: false }))
                setError('')
              }
            }}
            placeholder="Например: читать каждый день"
            inputMode="text"
            enterKeyHint="next"
            autoComplete="off"
            className={`w-full min-h-[48px] rounded-xl border bg-canvas px-4 py-3.5 text-base font-semibold text-ink outline-none placeholder:font-medium placeholder:text-muted focus:ring-2 ${
              highlight.name
                ? 'border-danger ring-2 ring-danger/40'
                : 'border-line ring-brand/30'
            }`}
          />
          {highlight.name && (
            <p className="text-sm font-semibold text-danger">
              Заполни название — без него привычку не создать
            </p>
          )}
        </div>
      ),
    }

    const emojiStep: WizardStep = {
      id: 'emoji',
      title: 'Иконка',
      hint: 'Выбери символ — так проще узнавать привычку',
      content: (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`flex h-14 items-center justify-center rounded-xl text-2xl transition ${
                emoji === e
                  ? 'bg-brand-soft ring-2 ring-brand'
                  : 'bg-canvas ring-1 ring-line hover:ring-brand/40'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      ),
    }

    const freqStep: WizardStep = {
      id: 'freq',
      title: 'Как часто?',
      hint: 'Сколько раз в неделю будешь делать',
      content: (
        <div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {FREQ_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTimesPerWeek(n)}
                className={`h-12 rounded-xl text-base font-bold transition ${
                  timesPerWeek === n
                    ? 'bg-brand text-white'
                    : 'bg-canvas text-ink ring-1 ring-line hover:ring-brand/40'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm font-medium text-muted">
            {timesPerWeek === 7 ? 'Каждый день' : `${timesPerWeek}× в неделю`}
          </p>
        </div>
      ),
    }

    const durationStep: WizardStep = {
      id: 'duration',
      title: 'Как долго?',
      hint: 'За сколько хочешь закрепить привычку',
      content: (
        <div className="grid gap-2">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setTargetDays(d.value)}
              className={`rounded-xl px-3 py-3 text-left ring-1 transition ${
                targetDays === d.value
                  ? 'bg-brand-soft ring-2 ring-brand'
                  : 'bg-canvas ring-line hover:ring-brand/30'
              }`}
            >
              <div className="text-sm font-extrabold text-ink">{d.label}</div>
              <div className="mt-0.5 text-[11px] font-medium text-muted">{d.hint}</div>
            </button>
          ))}
        </div>
      ),
    }

    const reminderStep: WizardStep = {
      id: 'reminder',
      title: 'Когда напоминать?',
      hint: 'Можно пропустить — напомнишь себе сам',
      content: (
        <div className="space-y-3">
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-base font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
          />
          <p className="text-sm font-medium text-muted">
            {reminderTime
              ? `Напоминание в ${reminderTime}`
              : 'Без напоминания — старт сегодня'}
          </p>
          {(isEdit || showDetails) && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                Дата старта
              </p>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (e.target.value) {
                    setHighlight((h) => ({ ...h, start: false }))
                    setError('')
                  }
                }}
                className={`w-full rounded-xl border bg-canvas px-3 py-3 text-base font-semibold text-ink outline-none focus:ring-2 ${
                  highlight.start
                    ? 'border-danger ring-2 ring-danger/40'
                    : 'border-line focus:ring-brand/30'
                }`}
              />
            </div>
          )}
        </div>
      ),
    }

    const priorityStep: WizardStep = {
      id: 'priority',
      title: 'Приоритет',
      hint: 'Насколько это важно для тебя',
      content: (
        <div className="grid gap-2">
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={`rounded-xl px-3 py-3 text-left transition ring-1 ${
                priority === p.value ? 'ring-2' : 'ring-line hover:ring-brand/30'
              }`}
              style={{
                background: p.bg,
                color: p.color,
                ...(priority === p.value ? { boxShadow: `0 0 0 1px ${p.color}` } : {}),
              }}
            >
              <div className="text-sm font-extrabold">{p.label}</div>
              <div className="mt-0.5 text-[11px] font-medium opacity-80">{p.hint}</div>
            </button>
          ))}
        </div>
      ),
    }

    const confirmStep: WizardStep = {
      id: 'confirm',
      title: isEdit ? 'Сохранить?' : 'Готово?',
      hint: isEdit ? 'Проверь изменения' : 'Проверь план и создай привычку',
      content: (
        <div className="space-y-3">
          <div className="rounded-xl bg-canvas px-3 py-3 ring-1 ring-line">
            <p className="text-base font-extrabold text-ink">
              {emoji} {name.trim() || 'Без названия'}
            </p>
            <p className="mt-1 text-sm font-medium text-muted">
              с {startLabel} до ~{endLabel} · {targetDays} дн. ·{' '}
              {timesPerWeek === 7 ? 'каждый день' : `${timesPerWeek}/нед`}
              {reminderTime ? ` · ⏰ ${reminderTime}` : ''}
            </p>
            {area && (
              <p className="mt-1 text-xs font-bold" style={{ color: area.color }}>
                {area.emoji} {area.short}
              </p>
            )}
          </div>
          {!isEdit && (
            <>
              {!showDetails && (
                <button
                  type="button"
                  onClick={() => setShowDetails(true)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm font-bold text-brand ring-1 ring-brand/20 hover:bg-brand-soft"
                >
                  Настроить подробнее
                </button>
              )}
              {showDetails && (
                <div className="space-y-3 rounded-xl bg-canvas px-3 py-3 ring-1 ring-line">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">
                    Подробнее
                  </p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setEmoji(e)}
                        className={`flex h-10 items-center justify-center rounded-lg text-lg ${
                          emoji === e
                            ? 'bg-brand-soft ring-2 ring-brand'
                            : 'bg-surface ring-1 ring-line'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  {goals.length > 0 && !lockGoal && (
                    <select
                      value={goalId}
                      onChange={(e) => setGoalId(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold"
                    >
                      <option value="">Без цели</option>
                      {goals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="grid gap-2 sm:grid-cols-3">
                    {PRIORITY_OPTIONS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPriority(p.value)}
                        className={`rounded-lg px-2 py-2 text-xs font-bold ring-1 ${
                          priority === p.value ? 'ring-2 ring-brand' : 'ring-line'
                        }`}
                        style={{ background: p.bg, color: p.color }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold"
                  />
                </div>
              )}
              <div className="flex gap-3 rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-900 ring-1 ring-amber-100">
                <Lightbulb size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <p className="font-medium leading-relaxed">
                  {selectedDuration?.value === 21 && timesPerWeek === 7
                    ? 'Привычка формируется, если делать её каждый день 21 день.'
                    : 'Пропущенный день продлевает срок. Не перегружай себя.'}
                </p>
              </div>
              {showMoodboardOption && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-canvas px-3 py-3 ring-1 ring-line">
                  <input
                    type="checkbox"
                    checked={addToMoodboard}
                    onChange={(e) => setAddToMoodboard(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[var(--brand,#7c3aed)]"
                  />
                  <span>
                    <span className="block text-sm font-bold text-ink">
                      Добавить привычку на мудборд?
                    </span>
                    <span className="mt-0.5 block text-[12px] font-medium text-muted">
                      Стикер появится на рабочем столе
                    </span>
                  </span>
                </label>
              )}
              <div className="rounded-xl bg-sky-50 px-3 py-3 text-sm text-sky-950 ring-1 ring-sky-100">
                <p className="font-extrabold">
                  {cost <= 0
                    ? `Бесплатно · у тебя ${formatDiamonds(diamonds)} 💎`
                    : `💎 Создание привычки · ${formatDiamonds(cost)}`}
                </p>
                {cost > 0 && (
                  <ul className="mt-2 space-y-1 text-[13px] font-medium text-sky-900/80">
                    <li>У тебя: {formatDiamonds(diamonds)} 💎</li>
                    <li>
                      После останется:{' '}
                      <span className="font-extrabold">
                        {formatDiamonds(Math.max(0, diamonds - cost))} 💎
                      </span>
                    </li>
                  </ul>
                )}
                <p className="mt-1 text-[12px] font-medium text-sky-900/70">
                  {cost <= 0
                    ? 'Привычка с карты цели не списывает алмазы.'
                    : costHintFn(diamonds)}
                </p>
              </div>
            </>
          )}
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          )}
        </div>
      ),
    }

    // Создание: короткий путь. Редактирование: полный.
    if (!isEdit) {
      const list: WizardStep[] = [nameStep, freqStep, durationStep, reminderStep]
      if (lockGoal) {
        const g =
          goals.find((x) => x.id === defaultGoalId) ?? goals.find((x) => x.id === goalId)
        list.splice(1, 0, {
          id: 'goal-locked',
          title: 'Цель',
          hint: area
            ? 'Закрепится за сферой жизни'
            : 'Сразу закрепится за картой цели',
          content: (
            <div className="rounded-xl bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-100">
              {g ? `Закреплено: ${g.title}` : area ? `Сфера: ${area.short}` : 'Закреплено'}
              {fromMatrix ? ' · бесплатно' : ''}
            </div>
          ),
        })
      }
      list.push(confirmStep)
      return list
    }

    const list: WizardStep[] = [nameStep, emojiStep]
    if (goals.length > 0 && !lockGoal) {
      list.push({
        id: 'goal',
        title: 'Цель',
        hint: 'Можно привязать к цели или пропустить',
        content: (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setGoalId('')}
              className={`w-full rounded-xl px-3 py-3 text-left text-sm font-bold ring-1 transition ${
                !goalId
                  ? 'bg-brand-soft ring-2 ring-brand'
                  : 'bg-canvas ring-line hover:ring-brand/30'
              }`}
            >
              Без цели
            </button>
            {goals.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoalId(g.id)}
                className={`w-full rounded-xl px-3 py-3 text-left text-sm font-bold ring-1 transition ${
                  goalId === g.id
                    ? 'bg-brand-soft ring-2 ring-brand'
                    : 'bg-canvas ring-line hover:ring-brand/30'
                }`}
              >
                {g.title}
              </button>
            ))}
          </div>
        ),
      })
    }
    list.push(reminderStep, freqStep, priorityStep, durationStep, confirmStep)
    return list
  }, [
    name,
    emoji,
    goals,
    goalId,
    startDate,
    timesPerWeek,
    reminderTime,
    priority,
    targetDays,
    startLabel,
    endLabel,
    selectedDuration,
    diamonds,
    error,
    area,
    cost,
    costHintFn,
    lockGoal,
    fromMatrix,
    defaultGoalId,
    isEdit,
    showMoodboardOption,
    addToMoodboard,
    showDetails,
    highlight.name,
    highlight.start,
  ])

  const goToStepId = (id: string) => {
    const idx = steps.findIndex((s) => s.id === id)
    if (idx >= 0) setWizardStep(idx)
  }

  const submit = () => {
    const missingName = !name.trim()
    const missingStart = !startDate
    if (missingName || missingStart) {
      setHighlight({ name: missingName, start: missingStart })
      if (missingName) {
        setError('Укажи название привычки')
        goToStepId('name')
      } else {
        setError('Укажи дату старта')
        goToStepId('reminder')
      }
      return
    }
    setHighlight({})
    if (!isEdit && !affordable) {
      setError(costHintFn(diamonds))
      goToStepId('confirm')
      return
    }

    if (isEdit && habit && onUpdate) {
      const result = onUpdate(habit.id, {
        name: name.trim(),
        emoji,
        priority,
        targetDays,
        startDate,
        timesPerWeek,
        reminderTime: reminderTime || undefined,
      })
      if (result && !result.ok) {
        setError(result.reason ?? 'Не удалось сохранить')
        return
      }
      onClose()
      return
    }

    if (!onSubmit) return
    const result = onSubmit(
      {
        name: name.trim(),
        emoji,
        priority,
        targetDays,
        startDate,
        timesPerWeek,
        reminderTime: reminderTime || undefined,
        goalId: goalId || undefined,
        lifeArea: lifeArea ?? habit?.lifeArea,
        fromLifeMap: fromLifeMap || undefined,
        fromMatrix: fromMatrix || undefined,
      },
      showMoodboardOption ? addToMoodboard : undefined,
    )
    if (result && !result.ok) {
      setError(result.reason ?? 'Недостаточно алмазов')
      return
    }
    blurActiveInput()
    onClose()
  }

  return (
    <StepWizard
      open={open}
      title={modalTitle}
      steps={steps}
      onClose={onClose}
      resetKey={`${open}-${habit?.id ?? 'new'}`}
      step={wizardStep}
      onStepChange={setWizardStep}
      lastFooter={
        <button
          type="button"
          onClick={submit}
          className={`w-full rounded-xl px-4 py-3 text-sm font-bold text-white ${
            canSubmit
              ? 'bg-brand hover:bg-brand-deep'
              : 'bg-brand/70 ring-2 ring-amber-300 ring-offset-2 ring-offset-surface'
          }`}
        >
          {isEdit
            ? 'Сохранить'
            : `Добавить${cost > 0 ? ` · −${formatDiamonds(cost)}` : ' · бесплатно'}`}
          {!canSubmit ? ' · заполнить' : ''}
        </button>
      }
    />
  )
}

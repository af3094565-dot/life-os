import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { GoalCadence, GoalMeasureKind } from '../data/seed'
import type { NewGoalInput } from '../hooks/useLifeOS'
import { ECONOMY, canAfford, formatDiamonds, goalCostHint, matrixCostHint } from '../lib/economy'
import { blurActiveInput } from '../hooks/useKeyboardOpen'
import { StepWizard, type WizardStep } from './StepWizard'

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (
    input: NewGoalInput,
    attachedHabits?: Array<{ name: string; emoji: string }>,
    addToMoodboard?: boolean,
  ) => { ok: boolean; reason?: string } | void
  diamonds?: number
  /** Режим карты цели: только название, цена MATRIX_COST */
  matrixMode?: boolean
  /** Позволить добавить привычки при создании (для мудборда) */
  allowAttachHabits?: boolean
  /** Показать галочку «Добавить на мудборд» */
  showMoodboardOption?: boolean
}

const MEASURE_OPTIONS: {
  value: GoalMeasureKind
  label: string
  hint: string
}[] = [
  {
    value: 'number',
    label: 'Числом',
    hint: 'Вес, деньги, клиенты, страницы…',
  },
  {
    value: 'stages',
    label: 'Этапами',
    hint: 'Бизнес, проект, путь из шагов',
  },
  {
    value: 'none',
    label: 'Пока без метрики',
    hint: 'Только привычки, результат добавишь позже',
  },
]

const CADENCE_OPTIONS: { value: GoalCadence; label: string }[] = [
  { value: 'daily', label: 'Ежедневно' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'anytime', label: 'Когда удобно' },
]

export function GoalFormModal({
  open,
  onClose,
  onSubmit,
  diamonds = ECONOMY.START_DIAMONDS,
  matrixMode = false,
  allowAttachHabits = false,
  showMoodboardOption = false,
}: Props) {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [measureKind, setMeasureKind] = useState<GoalMeasureKind>('number')
  const [unit, setUnit] = useState('')
  const [startValue, setStartValue] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [cadence, setCadence] = useState<GoalCadence>('weekly')
  const [scheduledTime, setScheduledTime] = useState('')
  const [stages, setStages] = useState<string[]>(['', ''])
  const [habitDrafts, setHabitDrafts] = useState<Array<{ name: string; emoji: string }>>([])
  const [addToMoodboard, setAddToMoodboard] = useState(false)
  const [error, setError] = useState('')
  const [wizardStep, setWizardStep] = useState(0)
  const [highlight, setHighlight] = useState<{
    name?: boolean
    number?: boolean
    stages?: boolean
  }>({})
  const cost = matrixMode ? ECONOMY.MATRIX_COST : ECONOMY.GOAL_COST
  const habitExtraCost = allowAttachHabits
    ? habitDrafts.filter((h) => h.name.trim()).length * ECONOMY.HABIT_COST
    : 0
  const totalCost = cost + habitExtraCost
  const affordable = canAfford(diamonds, totalCost)

  useEffect(() => {
    if (!open) return
    setName('')
    setNote('')
    setMeasureKind('number')
    setUnit('')
    setStartValue('')
    setTargetValue('')
    setCadence('weekly')
    setScheduledTime('')
    setStages(['', ''])
    setHabitDrafts([])
    setAddToMoodboard(false)
    setError('')
    setWizardStep(0)
    setHighlight({})
  }, [open])

  const numStart = startValue === '' ? undefined : Number(startValue)
  const numTarget = targetValue === '' ? undefined : Number(targetValue)
  const numberOk =
    measureKind !== 'number' ||
    (!!unit.trim() &&
      numStart != null &&
      !Number.isNaN(numStart) &&
      numTarget != null &&
      !Number.isNaN(numTarget) &&
      numStart !== numTarget)

  const stagesClean = stages.map((s) => s.trim()).filter(Boolean)
  const stagesOk = measureKind !== 'stages' || stagesClean.length >= 2
  const canSubmit = matrixMode
    ? !!name.trim() && affordable
    : !!name.trim() && numberOk && stagesOk && affordable

  const steps: WizardStep[] = useMemo(() => {
    if (matrixMode) {
      return [
        {
          id: 'name',
          title: 'Большая цель',
          hint: 'Одна главная цель в центре карты',
          content: (
            <div className="space-y-2">
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (e.target.value.trim()) {
                    setHighlight((h) => ({ ...h, name: false }))
                    setError('')
                  }
                }}
                placeholder="Например: стать первым на драфте"
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
                  Заполни название цели
                </p>
              )}
            </div>
          ),
        },
        {
          id: 'note',
          title: 'Зачем тебе это',
          hint: 'Можно пропустить',
          content: (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Одной фразой"
              className="w-full resize-none rounded-xl border border-line bg-canvas px-3 py-3 text-base font-medium text-ink outline-none focus:ring-2 focus:ring-brand/30"
            />
          ),
        },
        {
          id: 'confirm',
          title: 'Создать карту?',
          hint: 'После этого заполняй аспекты и привычки на поле 9×9',
          content: (
            <div className="space-y-3">
              <div className="rounded-xl bg-canvas px-3 py-3 ring-1 ring-line">
                <p className="text-base font-extrabold text-ink">
                  {name.trim() || 'Без названия'}
                </p>
                {note.trim() && (
                  <p className="mt-1 text-sm font-medium text-muted">{note.trim()}</p>
                )}
              </div>
              <div className="rounded-xl bg-sky-50 px-3 py-3 text-sm text-sky-950 ring-1 ring-sky-100">
                <p className="font-semibold">
                  −{formatDiamonds(ECONOMY.MATRIX_COST)} · у тебя {formatDiamonds(diamonds)}
                </p>
                <p className="mt-1 text-[12px] font-medium text-sky-900/70">
                  {matrixCostHint(diamonds)}. Привычки на карте — бесплатно.
                </p>
              </div>
              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-100">
                  {error}
                </p>
              )}
            </div>
          ),
        },
      ]
    }

    const list: WizardStep[] = [
      {
        id: 'name',
        title: 'Что хочешь достичь',
        hint: 'Сформулируй цель коротко',
        content: (
          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (e.target.value.trim()) {
                  setHighlight((h) => ({ ...h, name: false }))
                  setError('')
                }
              }}
              placeholder="Похудеть / заработать / открыть бизнес…"
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
              <p className="text-sm font-semibold text-danger">Заполни название цели</p>
            )}
          </div>
        ),
      },
      {
        id: 'measure',
        title: 'Как измерять',
        hint: 'Выбери способ отслеживать результат',
        content: (
          <div className="grid gap-2">
            {MEASURE_OPTIONS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMeasureKind(m.value)}
                className={`rounded-xl px-3 py-3 text-left ring-1 transition ${
                  measureKind === m.value
                    ? 'bg-brand-soft ring-2 ring-brand'
                    : 'bg-canvas ring-line hover:ring-brand/30'
                }`}
              >
                <div className="text-sm font-extrabold text-ink">{m.label}</div>
                <div className="mt-0.5 text-[11px] font-medium text-muted">{m.hint}</div>
              </button>
            ))}
          </div>
        ),
      },
    ]

    if (measureKind === 'number') {
      list.push({
        id: 'number',
        title: 'Цифры',
        hint: 'Единица, сейчас и цель',
        content: (
          <div className="space-y-3">
            {highlight.number && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-danger ring-1 ring-red-100">
                Заполни единицу, текущее значение и цель
              </p>
            )}
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
                В чём измеряем
              </label>
              <input
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value)
                  setHighlight((h) => ({ ...h, number: false }))
                }}
                placeholder="кг, ₽, клиентов…"
                className={`w-full rounded-xl border bg-canvas px-3 py-3 text-base font-semibold text-ink outline-none focus:ring-2 ${
                  highlight.number && !unit.trim()
                    ? 'border-danger ring-2 ring-danger/40'
                    : 'border-line focus:ring-brand/30'
                }`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
                  Сейчас
                </label>
                <input
                  type="number"
                  step="any"
                  value={startValue}
                  onChange={(e) => {
                    setStartValue(e.target.value)
                    setHighlight((h) => ({ ...h, number: false }))
                  }}
                  placeholder="80"
                  className={`w-full rounded-xl border bg-canvas px-3 py-3 text-base font-semibold text-ink outline-none focus:ring-2 ${
                    highlight.number && startValue === ''
                      ? 'border-danger ring-2 ring-danger/40'
                      : 'border-line focus:ring-brand/30'
                  }`}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
                  Цель
                </label>
                <input
                  type="number"
                  step="any"
                  value={targetValue}
                  onChange={(e) => {
                    setTargetValue(e.target.value)
                    setHighlight((h) => ({ ...h, number: false }))
                  }}
                  placeholder="70"
                  className={`w-full rounded-xl border bg-canvas px-3 py-3 text-base font-semibold text-ink outline-none focus:ring-2 ${
                    highlight.number && targetValue === ''
                      ? 'border-danger ring-2 ring-danger/40'
                      : 'border-line focus:ring-brand/30'
                  }`}
                />
              </div>
            </div>
            <p className="text-[11px] font-medium text-muted">
              Можно идти вверх или вниз — шкала сама поймёт направление.
            </p>
          </div>
        ),
      })
    }

    if (measureKind === 'stages') {
      list.push({
        id: 'stages',
        title: 'Этапы',
        hint: 'Разбей путь на шаги (минимум 2)',
        content: (
          <div className="space-y-2">
            {highlight.stages && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-danger ring-1 ring-red-100">
                Нужно минимум 2 заполненных этапа
              </p>
            )}
            {stages.map((st, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={st}
                  onChange={(e) => {
                    const next = [...stages]
                    next[i] = e.target.value
                    setStages(next)
                    setHighlight((h) => ({ ...h, stages: false }))
                  }}
                  placeholder={
                    i === 0
                      ? '1. Зарегистрировать ИП'
                      : i === 1
                        ? '2. Сделать MVP'
                        : `${i + 1}. Следующий шаг`
                  }
                  className={`w-full rounded-xl border bg-canvas px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:ring-2 ${
                    highlight.stages && !st.trim()
                      ? 'border-danger ring-2 ring-danger/40'
                      : 'border-line focus:ring-brand/30'
                  }`}
                />
                {stages.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setStages(stages.filter((_, j) => j !== i))}
                    className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setStages([...stages, ''])}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
            >
              <Plus size={14} /> Ещё этап
            </button>
          </div>
        ),
      })
    }

    if (measureKind !== 'none') {
      list.push({
        id: 'cadence',
        title: 'Как часто отмечать',
        hint: 'Ритм проверки прогресса',
        content: (
          <div className="grid gap-2">
            {CADENCE_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCadence(c.value)}
                className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                  cadence === c.value
                    ? 'bg-brand text-white'
                    : 'bg-canvas text-ink ring-1 ring-line hover:ring-brand/40'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        ),
      })
    }

    list.push({
      id: 'time',
      title: 'Время',
      hint: 'Необязательно, но попадет в календарь дня',
      content: (
        <input
          type="time"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-base font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
        />
      ),
    })

    list.push({
      id: 'note',
      title: 'Заметка',
      hint: 'Зачем тебе это — можно пропустить',
      content: (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Одной фразой"
          className="w-full resize-none rounded-xl border border-line bg-canvas px-3 py-3 text-base font-medium text-ink outline-none ring-brand/30 placeholder:text-muted focus:ring-2"
        />
      ),
    })

    if (allowAttachHabits) {
      list.push({
        id: 'habits',
        title: 'Привычки',
        hint: 'Опционально: сразу закрепи привычки за целью',
        content: (
          <div className="space-y-3">
            {habitDrafts.length === 0 ? (
              <p className="rounded-xl bg-canvas px-3 py-3 text-sm font-medium text-muted ring-1 ring-line">
                Можно создать только цель — или сразу добавить привычки, они появятся на мудборде со
                стрелками.
              </p>
            ) : (
              habitDrafts.map((h, idx) => (
                <div key={idx} className="rounded-xl bg-canvas p-3 ring-1 ring-line">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">
                      Привычка {idx + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => setHabitDrafts((list) => list.filter((_, i) => i !== idx))}
                      className="rounded-lg p-1 text-muted hover:bg-red-50 hover:text-danger"
                      aria-label="Удалить"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input
                    value={h.name}
                    onChange={(e) =>
                      setHabitDrafts((list) =>
                        list.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)),
                      )
                    }
                    placeholder="Название привычки"
                    className="mb-2 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <div className="flex flex-wrap gap-1">
                    {['⭐', '🛌', '🚶', '📚', '💧', '🧘', '💪', '🧠'].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() =>
                          setHabitDrafts((list) =>
                            list.map((item, i) => (i === idx ? { ...item, emoji: em } : item)),
                          )
                        }
                        className={`rounded-lg px-2 py-1 text-sm ${
                          h.emoji === em
                            ? 'bg-brand-soft ring-1 ring-brand/30'
                            : 'bg-surface ring-1 ring-line'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
            <button
              type="button"
              onClick={() => setHabitDrafts((list) => [...list, { name: '', emoji: '⭐' }])}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-soft px-3 py-2.5 text-sm font-bold text-brand ring-1 ring-brand/20"
            >
              <Plus size={16} /> Добавить привычку
            </button>
            {habitDrafts.filter((h) => h.name.trim()).length > 0 && (
              <p className="text-xs font-medium text-muted">
                +{formatDiamonds(habitExtraCost)} за привычки · всего −
                {formatDiamonds(totalCost)}
              </p>
            )}
          </div>
        ),
      })
    }

    list.push({
      id: 'confirm',
      title: 'Готово?',
      hint: 'Проверь и создай цель',
      content: (
        <div className="space-y-3">
          <div className="rounded-xl bg-canvas px-3 py-3 ring-1 ring-line">
            <p className="text-base font-extrabold text-ink">
              {name.trim() || 'Без названия'}
            </p>
            <p className="mt-1 text-sm font-medium text-muted">
              {MEASURE_OPTIONS.find((m) => m.value === measureKind)?.label}
              {measureKind === 'number' && unit
                ? ` · ${startValue || '?'} → ${targetValue || '?'} ${unit}`
                : ''}
              {measureKind === 'stages' ? ` · ${stagesClean.length} этапов` : ''}
              {scheduledTime ? ` · ${scheduledTime}` : ''}
            </p>
            {note.trim() && (
              <p className="mt-2 text-sm font-medium text-muted">{note.trim()}</p>
            )}
            {allowAttachHabits && habitDrafts.filter((h) => h.name.trim()).length > 0 && (
              <ul className="mt-2 space-y-1">
                {habitDrafts
                  .filter((h) => h.name.trim())
                  .map((h, i) => (
                    <li key={i} className="text-sm font-semibold text-ink">
                      {h.emoji} {h.name.trim()}
                    </li>
                  ))}
              </ul>
            )}
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
                <span className="block text-sm font-bold text-ink">Добавить цель на мудборд?</span>
                <span className="mt-0.5 block text-[12px] font-medium text-muted">
                  Поставь галочку — стикер появится в свободном месте на доске
                  {habitDrafts.some((h) => h.name.trim())
                    ? ', привычки — рядом со стрелками'
                    : ''}
                </span>
              </span>
            </label>
          )}
          <div className="rounded-xl bg-sky-50 px-3 py-3 text-sm text-sky-950 ring-1 ring-sky-100">
            <p className="font-semibold">
              −{formatDiamonds(totalCost)} · у тебя {formatDiamonds(diamonds)}
            </p>
            <p className="mt-1 text-[12px] font-medium text-sky-900/70">
              {goalCostHint(diamonds)}
            </p>
          </div>
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          )}
        </div>
      ),
    })

    return list
  }, [
    matrixMode,
    allowAttachHabits,
    showMoodboardOption,
    addToMoodboard,
    name,
    measureKind,
    unit,
    startValue,
    targetValue,
    stages,
    stagesClean.length,
    cadence,
    scheduledTime,
    note,
    habitDrafts,
    habitExtraCost,
    totalCost,
    diamonds,
    error,
    highlight.name,
    highlight.number,
    highlight.stages,
  ])

  const goToStepId = (id: string) => {
    const idx = steps.findIndex((s) => s.id === id)
    if (idx >= 0) setWizardStep(idx)
  }

  const submit = () => {
    if (!name.trim()) {
      setHighlight({ name: true })
      setError('Укажи название цели')
      goToStepId('name')
      return
    }
    if (!matrixMode && measureKind === 'number' && !numberOk) {
      setHighlight({ number: true })
      setError('Заполни единицу, «сейчас» и «цель»')
      goToStepId('number')
      return
    }
    if (!matrixMode && measureKind === 'stages' && !stagesOk) {
      setHighlight({ stages: true })
      setError('Нужно минимум 2 этапа')
      goToStepId('stages')
      return
    }
    if (!affordable) {
      setError(matrixMode ? matrixCostHint(diamonds) : goalCostHint(diamonds))
      goToStepId('confirm')
      return
    }
    setHighlight({})
    const attached = allowAttachHabits
      ? habitDrafts
          .map((h) => ({ name: h.name.trim(), emoji: h.emoji || '⭐' }))
          .filter((h) => h.name)
      : undefined
    const result = onSubmit(
      {
        title: name.trim(),
        note: note.trim() || undefined,
        measureKind: matrixMode ? 'matrix' : measureKind,
        unit: !matrixMode && measureKind === 'number' ? unit.trim() : undefined,
        startValue: !matrixMode && measureKind === 'number' ? numStart : undefined,
        targetValue: !matrixMode && measureKind === 'number' ? numTarget : undefined,
        currentValue: !matrixMode && measureKind === 'number' ? numStart : undefined,
        stages:
          !matrixMode && measureKind === 'stages'
            ? stagesClean.map((title) => ({ title }))
            : undefined,
        cadence: matrixMode || measureKind === 'none' ? 'anytime' : cadence,
        scheduledTime: scheduledTime || undefined,
      },
      attached?.length ? attached : undefined,
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
      title={matrixMode ? 'Большая цель карты' : 'Новая цель'}
      steps={steps}
      onClose={onClose}
      resetKey={`${open}-${matrixMode}`}
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
          {canSubmit
            ? `Создать · −${formatDiamonds(totalCost)}`
            : 'Создать · заполнить поля'}
        </button>
      }
    />
  )
}

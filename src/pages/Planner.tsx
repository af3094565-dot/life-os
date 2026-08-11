import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  PauseCircle,
  Play,
  Plus,
  Rows3,
  Trash2,
  X,
} from 'lucide-react'
import { Header } from '../components/Header'
import { PlanTabs } from '../components/PlanTabs'
import { StepWizard, type WizardStep } from '../components/StepWizard'
import type { PageId } from '../data/seed'
import type { FocusProfileId, LifeOSState, PlannerTaskEnergy } from '../hooks/useLifeOS'
import { formatRuDate, todayKey } from '../lib/habitLogic'
import { Card, ProgressBar } from '../components/ui'

type Props = { state: LifeOSState; userName: string; onNavigate: (page: PageId) => void }

type TimerPhase = 'focus' | 'short-break' | 'long-break'

type TimerState = {
  taskId: string
  phase: TimerPhase
  phaseEndsAt: number
  completedFocusSessions: number
}

const PROFILE_COPY: Record<FocusProfileId, { label: string; hint: string }> = {
  gentle: {
    label: 'Легко отвлекаюсь',
    hint: 'Короткий фокус, быстрый отдых, мягкий вход в работу.',
  },
  balanced: {
    label: 'Обычный ритм',
    hint: 'Универсальный режим, если день разный и нужна устойчивость.',
  },
  deep: {
    label: 'Держу глубокий фокус',
    hint: 'Длинные блоки для сложной работы и меньшего переключения.',
  },
}

const ENERGY_COPY: Record<PlannerTaskEnergy, { label: string; hint: string }> = {
  light: { label: 'Легкая', hint: 'Разогрев или быстрая задача' },
  medium: { label: 'Нормальная', hint: 'Основная повседневная работа' },
  deep: { label: 'Глубокая', hint: 'Нужна концентрация и минимум отвлечений' },
}

const DURATIONS = [7, 21, 30, 66, 90, 100, 365] as const

function closestDuration(days: number): (typeof DURATIONS)[number] {
  return DURATIONS.reduce((best, current) =>
    Math.abs(current - days) < Math.abs(best - days) ? current : best,
  )
}

export function PlannerPage({ state, userName, onNavigate }: Props) {
  const [taskOpen, setTaskOpen] = useState(false)
  const [sectionOpen, setSectionOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskNote, setTaskNote] = useState('')
  const [taskSectionId, setTaskSectionId] = useState(state.plannerSections[0]?.id ?? '')
  const [taskDate, setTaskDate] = useState(todayKey())
  const [taskEndDate, setTaskEndDate] = useState(todayKey())
  const [taskTime, setTaskTime] = useState('')
  const [taskPriority, setTaskPriority] = useState<'important' | 'urgent' | 'low'>('important')
  const [sectionTitle, setSectionTitle] = useState('')
  const [taskError, setTaskError] = useState('')
  const [sectionError, setSectionError] = useState('')
  const [taskStep, setTaskStep] = useState(0)
  const [timer, setTimer] = useState<TimerState | null>(null)
  const [now, setNow] = useState(Date.now())
  const [mobileSectionId, setMobileSectionId] = useState(
    state.plannerSections[0]?.id ?? '',
  )

  useEffect(() => {
    if (!state.plannerSections.some((section) => section.id === taskSectionId)) {
      setTaskSectionId(state.plannerSections[0]?.id ?? '')
    }
  }, [state.plannerSections, taskSectionId])

  useEffect(() => {
    if (!state.plannerSections.some((s) => s.id === mobileSectionId)) {
      setMobileSectionId(state.plannerSections[0]?.id ?? '')
    }
  }, [state.plannerSections, mobileSectionId])

  useEffect(() => {
    if (!timer) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [timer])

  useEffect(() => {
    if (!timer) return
    if (timer.phaseEndsAt > now) return
    const settings = state.focusSettings
    if (timer.phase === 'focus') {
      const completed = timer.completedFocusSessions + 1
      const isLongBreak = completed % settings.sessionsBeforeLongBreak === 0
      state.recordFocusSession({
        minutes: settings.focusMinutes,
        uninterrupted: true,
      })
      setTimer({
        taskId: timer.taskId,
        phase: isLongBreak ? 'long-break' : 'short-break',
        phaseEndsAt:
          Date.now() +
          (isLongBreak ? settings.longBreakMinutes : settings.shortBreakMinutes) * 60_000,
        completedFocusSessions: completed,
      })
      return
    }
    setTimer({
      taskId: timer.taskId,
      phase: 'focus',
      phaseEndsAt: Date.now() + state.focusSettings.focusMinutes * 60_000,
      completedFocusSessions: timer.completedFocusSessions,
    })
  }, [timer, now, state.focusSettings])

  const loadText =
    state.focusLoadPct >= 100
      ? 'день перегружен'
      : state.focusLoadPct >= 70
        ? 'нагрузка плотная'
        : 'нагрузка комфортная'

  const startTimer = (taskId: string) => {
    setNow(Date.now())
    setTimer({
      taskId,
      phase: 'focus',
      phaseEndsAt: Date.now() + state.focusSettings.focusMinutes * 60_000,
      completedFocusSessions: 0,
    })
  }

  const remainingSeconds = timer ? Math.max(0, Math.ceil((timer.phaseEndsAt - now) / 1000)) : 0
  const remainingLabel = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(
    remainingSeconds % 60,
  ).padStart(2, '0')}`
  const timerTask =
    timer ? state.plannerTasksDetailed.find((task) => task.id === timer.taskId) ?? null : null

  const phaseTotalMs = timer
    ? (timer.phase === 'focus'
        ? state.focusSettings.focusMinutes
        : timer.phase === 'short-break'
          ? state.focusSettings.shortBreakMinutes
          : state.focusSettings.longBreakMinutes) *
      60_000
    : 1
  const remainingMs = timer ? Math.max(0, timer.phaseEndsAt - now) : 0
  const progress01 = timer ? 1 - remainingMs / phaseTotalMs : 0
  const circleRadius = 52
  const circleCircumference = 2 * Math.PI * circleRadius

  const phaseText =
    timer?.phase === 'focus'
      ? 'text-brand'
      : timer?.phase === 'short-break'
        ? 'text-sky-500'
        : timer
          ? 'text-amber-500'
          : 'text-muted'
  const phaseLabel =
    timer?.phase === 'focus'
      ? 'Фокус'
      : timer?.phase === 'short-break'
        ? 'Короткий отдых'
        : 'Длинный отдых'

  const nextFocusSessionNumber = timer ? timer.completedFocusSessions + 1 : 0
  const nextBreakIsLong =
    timer && (timer.completedFocusSessions + 1) % state.focusSettings.sessionsBeforeLongBreak === 0
      ? true
      : false

  const handleCreateTask = () => {
    const start = new Date(`${taskDate}T12:00:00`).getTime()
    const end = new Date(`${taskEndDate}T12:00:00`).getTime()
    if (!taskTitle.trim()) {
      setTaskError('Опиши задачу')
      setTaskStep(0)
      return
    }
    if (!taskDate) {
      setTaskError('Укажи дату начала')
      setTaskStep(1)
      return
    }
    if (!taskEndDate || end < start) {
      setTaskError('Дата завершения должна быть не раньше старта')
      setTaskStep(2)
      return
    }
    const diffDays = Math.max(1, Math.round((end - start) / 86_400_000) + 1)
    const taskEnergy: PlannerTaskEnergy =
      taskPriority === 'urgent' ? 'deep' : taskPriority === 'important' ? 'medium' : 'light'
    const taskBlocks = taskPriority === 'urgent' ? 3 : taskPriority === 'important' ? 2 : 1
    const result = state.addPlannerTask({
      title: taskTitle,
      note: taskNote,
      sectionId: taskSectionId,
      scheduledFor: taskDate,
      scheduledTime: taskTime || undefined,
      priority: taskPriority,
      energy: taskEnergy,
      focusBlocks: taskBlocks,
      timesPerWeek: 5,
      targetDays: closestDuration(diffDays),
    })
    if (!result.ok) {
      setTaskError(result.reason ?? 'Не удалось создать задачу')
      return
    }
    setTaskTitle('')
    setTaskNote('')
    setTaskDate(todayKey())
    setTaskEndDate(todayKey())
    setTaskTime('')
    setTaskError('')
    setTaskStep(0)
    setTaskOpen(false)
  }

  const handleCreateSection = () => {
    const result = state.addPlannerSection(sectionTitle)
    if (!result.ok) {
      setSectionError(result.reason ?? 'Не удалось создать раздел')
      return
    }
    setSectionTitle('')
    setSectionError('')
    setSectionOpen(false)
  }

  const taskSteps: WizardStep[] = useMemo(
    () => [
      {
        id: 'describe',
        title: 'Опишите задачу',
        hint: 'Коротко и понятно, чтобы сразу хотелось начать',
        content: (
          <div className="space-y-3">
            <input
              value={taskTitle}
              onChange={(event) => {
                setTaskTitle(event.target.value)
                if (event.target.value.trim()) setTaskError('')
              }}
              placeholder="Например: подготовить презентацию"
              inputMode="text"
              enterKeyHint="next"
              autoComplete="off"
              className="w-full min-h-[48px] rounded-xl border border-line bg-canvas px-4 py-3.5 text-base font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
            />
            <textarea
              value={taskNote}
              onChange={(event) => setTaskNote(event.target.value)}
              placeholder="Короткая заметка: что именно нужно сделать"
              enterKeyHint="done"
              className="min-h-[120px] w-full rounded-xl border border-line bg-canvas px-4 py-3.5 text-base font-medium text-ink outline-none focus:ring-2 focus:ring-brand/30"
            />
            {taskError && taskStep === 0 && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-danger">
                {taskError}
              </p>
            )}
          </div>
        ),
      },
      {
        id: 'start',
        title: 'Когда начать',
        hint: 'Дата, с которой задача должна появиться в работе',
        content: (
          <div className="space-y-3">
            <input
              type="date"
              value={taskDate}
              onChange={(event) => {
                setTaskDate(event.target.value)
                setTaskError('')
              }}
              className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
            />
            <input
              type="time"
              value={taskTime}
              onChange={(event) => setTaskTime(event.target.value)}
              className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
            />
            {taskError && taskStep === 1 && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-danger">
                {taskError}
              </p>
            )}
          </div>
        ),
      },
      {
        id: 'finish',
        title: 'Когда закончим',
        hint: 'Срок, приоритет и раздел доски',
        content: (
          <div className="space-y-3">
            <input
              type="date"
              value={taskEndDate}
              onChange={(event) => {
                setTaskEndDate(event.target.value)
                setTaskError('')
              }}
              className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
            />
            <select
              value={taskPriority}
              onChange={(event) => setTaskPriority(event.target.value as 'important' | 'urgent' | 'low')}
              className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-semibold text-ink outline-none"
            >
              <option value="urgent">Срочно</option>
              <option value="important">Важно</option>
              <option value="low">Спокойно</option>
            </select>
            <select
              value={taskSectionId}
              onChange={(event) => setTaskSectionId(event.target.value)}
              className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-semibold text-ink outline-none"
            >
              {state.plannerSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
            <div className="rounded-xl bg-canvas px-3 py-3 text-sm font-medium text-muted ring-1 ring-line">
              Привычка и фокус-блоки создадутся автоматически по сроку и приоритету.
            </div>
            {taskError && taskStep === 2 && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-danger">
                {taskError}
              </p>
            )}
          </div>
        ),
      },
    ],
    [state.plannerSections, taskDate, taskEndDate, taskError, taskNote, taskPriority, taskSectionId, taskStep, taskTime, taskTitle],
  )

  return (
    <div>
      <Header
        greeting="План"
        subtitle="Что мне нужно сделать? · задачи и фокус"
        streak={state.streak}
        diamonds={state.diamonds}
        visitStreak={state.visitStreak}
        diamondHistory={state.diamondHistory ?? []}
        userName={userName}
      />
      <PlanTabs page="planner" onNavigate={onNavigate} />

      {/* Фокус-профиль и фокус-таймер перенесены вниз страницы */}

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTaskOpen(true)}
          data-tour="planner-add-task"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-deep"
        >
          <Plus size={16} /> Новая задача
        </button>
        <button
          type="button"
          onClick={() => setSectionOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-soft px-4 py-2.5 text-sm font-bold text-brand hover:bg-brand hover:text-white"
        >
          <Rows3 size={16} /> Новый раздел
        </button>
        <button
          type="button"
          onClick={() => onNavigate('planner-calendar')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-canvas px-4 py-2.5 text-sm font-bold text-ink ring-1 ring-line hover:bg-surface"
        >
          Открыть календарь
        </button>
      </div>

      <Card className="mb-5 !py-3 animate-fade-up">
        <p className="text-sm font-medium text-muted">
          Задачи и разделы теперь добавляются через окно. Календарь вынесен в отдельную вкладку.
        </p>
      </Card>

      <Card className="mb-5 !p-3 animate-fade-up md:!p-4">
        {/* Mobile: one column at a time */}
        <div className="md:hidden">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {state.plannerSections.map((section) => {
              const count = state.plannerTasksDetailed.filter(
                (t) => t.sectionId === section.id,
              ).length
              const active = section.id === mobileSectionId
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setMobileSectionId(section.id)}
                  className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ring-1 ${
                    active
                      ? 'bg-brand-soft text-brand ring-brand/20'
                      : 'bg-canvas text-ink ring-line'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: section.color }}
                  />
                  {section.title}
                  <span className="text-xs text-muted">{count}</span>
                </button>
              )
            })}
          </div>
          {(() => {
            const section =
              state.plannerSections.find((s) => s.id === mobileSectionId) ??
              state.plannerSections[0]
            if (!section) {
              return (
                <p className="py-6 text-center text-sm font-medium text-muted">
                  Здесь пока пусто. Создай первый раздел.
                </p>
              )
            }
            const sectionIndex = state.plannerSections.findIndex(
              (s) => s.id === section.id,
            )
            const tasks = state.plannerTasksDetailed.filter(
              (task) => task.sectionId === section.id,
            )
            return (
              <div className="rounded-2xl bg-canvas p-3">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: section.color }}
                  />
                  <h3 className="text-base font-extrabold text-ink">{section.title}</h3>
                  <span className="ml-auto text-xs font-bold text-muted">
                    {tasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {tasks.length === 0 && (
                    <div className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-sm font-medium text-muted">
                      Здесь пока пусто
                    </div>
                  )}
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-2xl bg-surface p-4 ring-1 ring-line"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-extrabold text-ink">{task.title}</p>
                          <p className="mt-1 text-xs font-medium text-muted">
                            {formatRuDate(task.scheduledFor)} · {task.focusBlocks} блок.
                          </p>
                        </div>
                        {task.completedAt && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            Готово
                          </span>
                        )}
                      </div>
                      {task.note && (
                        <p className="mt-2 text-sm font-medium leading-relaxed text-muted">
                          {task.note}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => state.togglePlannerTaskDone(task.id)}
                          className="btn-mobile flex-1 bg-brand text-white"
                        >
                          {task.completedAt ? 'Вернуть' : 'Выполнить'}
                        </button>
                        <button
                          type="button"
                          onClick={() => state.movePlannerTask(task.id, -1)}
                          disabled={sectionIndex === 0}
                          className="touch-target rounded-xl bg-canvas px-3 text-muted ring-1 ring-line disabled:opacity-30"
                          aria-label="Влево"
                        >
                          <ArrowLeft size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => state.movePlannerTask(task.id, 1)}
                          disabled={sectionIndex === state.plannerSections.length - 1}
                          className="touch-target rounded-xl bg-canvas px-3 text-muted ring-1 ring-line disabled:opacity-30"
                          aria-label="Вправо"
                        >
                          <ArrowRight size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={sectionIndex <= 0}
                    onClick={() =>
                      setMobileSectionId(
                        state.plannerSections[sectionIndex - 1]?.id ?? section.id,
                      )
                    }
                    className="btn-mobile flex-1 bg-surface text-muted ring-1 ring-line disabled:opacity-30"
                  >
                    ← Назад
                  </button>
                  <button
                    type="button"
                    disabled={sectionIndex >= state.plannerSections.length - 1}
                    onClick={() =>
                      setMobileSectionId(
                        state.plannerSections[sectionIndex + 1]?.id ?? section.id,
                      )
                    }
                    className="btn-mobile flex-1 bg-surface text-muted ring-1 ring-line disabled:opacity-30"
                  >
                    Далее →
                  </button>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Desktop: multi-column board */}
        <div className="hidden overflow-x-auto md:block">
        <div className="flex min-w-[900px] gap-4">
          {state.plannerSections.map((section, sectionIndex) => {
            const tasks = state.plannerTasksDetailed.filter((task) => task.sectionId === section.id)
            const dragging = draggingSectionId === section.id
            return (
              <div
                key={section.id}
                draggable
                onDragStart={() => setDraggingSectionId(section.id)}
                onDragEnd={() => setDraggingSectionId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggingSectionId && draggingSectionId !== section.id) {
                    state.movePlannerSection(draggingSectionId, section.id)
                  }
                  setDraggingSectionId(null)
                }}
                className={`w-[300px] shrink-0 rounded-2xl bg-canvas p-3 transition ${
                  dragging ? 'opacity-60 ring-2 ring-brand/30' : ''
                }`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: section.color }}
                  />
                  <h3 className="text-sm font-extrabold text-ink">{section.title}</h3>
                  <span className="ml-auto text-xs font-bold text-muted">{tasks.length}</span>
                </div>
                <p className="mb-3 text-[11px] font-medium text-muted">
                  Перетащи раздел, чтобы поменять местами
                </p>
                <div className="space-y-3">
                  {tasks.length === 0 && (
                    <div className="rounded-xl border border-dashed border-line px-3 py-4 text-sm font-medium text-muted">
                      Здесь пока пусто
                    </div>
                  )}
                  {tasks.map((task) => (
                    <div key={task.id} className="rounded-2xl bg-surface p-4 ring-1 ring-line">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-extrabold text-ink">{task.title}</p>
                          <p className="mt-1 text-xs font-medium text-muted">
                            {formatRuDate(task.scheduledFor)} · {task.focusBlocks} блок.
                          </p>
                        </div>
                        {task.completedAt && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            Готово
                          </span>
                        )}
                      </div>
                      {task.note && (
                        <p className="mt-2 text-sm font-medium leading-relaxed text-muted">
                          {task.note}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-brand-soft px-2 py-1 text-[11px] font-bold text-brand">
                          {ENERGY_COPY[task.energy].label}
                        </span>
                        <span className="rounded-full bg-canvas px-2 py-1 text-[11px] font-bold text-muted">
                          {task.timesPerWeek}×/нед
                        </span>
                        <span className="rounded-full bg-canvas px-2 py-1 text-[11px] font-bold text-muted">
                          цикл {task.recommendedFocusMinutes} мин
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startTimer(task.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-deep"
                        >
                          <Play size={14} />
                          Фокус
                        </button>
                        <button
                          type="button"
                          onClick={() => state.togglePlannerTaskDone(task.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                        >
                          <Check size={14} />
                          {task.completedAt ? 'Вернуть' : 'Закрыть'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate('planner-calendar')}
                          className="rounded-xl bg-canvas px-3 py-2 text-xs font-bold text-ink ring-1 ring-line hover:bg-surface"
                        >
                          В календарь
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={sectionIndex === 0}
                            onClick={() => state.movePlannerTask(task.id, -1)}
                            className="rounded-lg bg-canvas p-1.5 text-muted ring-1 ring-line disabled:opacity-40"
                          >
                            <ArrowLeft size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={sectionIndex === state.plannerSections.length - 1}
                            onClick={() => state.movePlannerTask(task.id, 1)}
                            className="rounded-lg bg-canvas p-1.5 text-muted ring-1 ring-line disabled:opacity-40"
                          >
                            <ArrowRight size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Удалить задачу «${task.title}» и связанную привычку?`)) {
                              state.deletePlannerTask(task.id)
                            }
                          }}
                          className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        </div>
      </Card>

      <Card className="mb-10 overflow-hidden !p-4 animate-fade-up">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-ink">Фокус и таймер</h3>
                <p className="mt-1 text-sm font-medium text-muted">
                  {PROFILE_COPY[state.focusSettings.profile].label}
                </p>
              </div>
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                {loadText}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-sm font-bold text-ink ring-1 ring-line hover:bg-surface"
              >
                <Play size={14} className="rotate-0" />
                Профиль
              </button>
              <div className="min-w-[220px] flex-1">
                <div className="mb-1 flex items-center justify-between text-xs font-bold text-muted">
                  <span>Нагрузка дня</span>
                  <span>
                    {state.todayFocusBlocks}/{state.focusSettings.dailyFocusCap} блоков
                  </span>
                </div>
                <ProgressBar value={state.focusLoadPct} />
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-canvas px-4 py-3">
              <div className="text-sm font-semibold text-ink">
                Сейчас: {timer ? phaseLabel : 'не запущено'}
              </div>
              <div className="mt-1 text-xs font-medium text-muted">
                {timer ? (
                  <>
                    Сессий завершено: {timer.completedFocusSessions}. Следом фокус-сессия №
                    {nextFocusSessionNumber}
                    {timer.phase === 'focus' && nextBreakIsLong
                      ? ' (после него длинный отдых)'
                      : ''}
                  </>
                ) : (
                  <>Запусти таймер у карточки задачи — он сам чередует фокус и отдых.</>
                )}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-1 items-center justify-center xl:max-w-[320px]">
            <div className={`w-[260px] ${timer ? '' : 'opacity-80'}`}>
              <div className={`relative flex items-center justify-center ${phaseText}`}>
                <svg width="220" height="220" viewBox="0 0 120 120" className="block">
                  <circle
                    cx="60"
                    cy="60"
                    r={circleRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeOpacity="0.12"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={circleRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circleCircumference}
                    strokeDashoffset={circleCircumference * (1 - progress01)}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                  />
                </svg>
                <div className="absolute flex w-[220px] flex-col items-center justify-center">
                  <div className="text-3xl font-extrabold text-center leading-none text-ink">
                    {timer ? remainingLabel : '00:00'}
                  </div>
                  <div className="mt-2 text-xs font-bold text-muted">{timer ? phaseLabel : 'Фокус таймер'}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-col items-center gap-2">
                {timer && timerTask ? (
                  <>
                    <p className="w-full text-center text-sm font-extrabold text-ink">
                      {timerTask.title}
                    </p>
                    <p className="text-xs font-bold text-muted">
                      Следом: фокус №{nextFocusSessionNumber} {nextBreakIsLong ? '(длинный цикл)' : '(короткий цикл)'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setTimer(null)}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-canvas px-3 py-2 text-sm font-bold text-ink ring-1 ring-line hover:bg-surface"
                    >
                      <PauseCircle size={16} />
                      Остановить
                    </button>
                  </>
                ) : (
                  <div className="w-full rounded-2xl bg-canvas px-4 py-4 text-center text-xs font-medium text-muted ring-1 ring-line">
                    Запусти таймер у карточки задачи.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {profileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
          onClick={() => setProfileOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-2xl rounded-t-2xl bg-surface p-5 shadow-xl ring-1 ring-line sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Фокус-профиль</p>
                <h3 className="mt-1 text-lg font-extrabold text-ink">Настрой цикл внимания</h3>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-canvas"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              {(Object.keys(PROFILE_COPY) as FocusProfileId[]).map((profile) => {
                const active = state.focusSettings.profile === profile
                const settings = active ? state.focusSettings : null
                return (
                  <button
                    key={profile}
                    type="button"
                    onClick={() => {
                      state.setFocusProfile(profile)
                      setProfileOpen(false)
                    }}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-brand bg-brand-soft ring-2 ring-brand/25'
                        : 'border-line bg-canvas hover:border-brand/40'
                    }`}
                  >
                    <div className="text-sm font-extrabold text-ink">{PROFILE_COPY[profile].label}</div>
                    <div className="mt-1 text-xs font-medium leading-relaxed text-muted">
                      {PROFILE_COPY[profile].hint}
                    </div>
                    <div className="mt-2 text-xs font-bold text-brand">
                      {(settings ?? state.focusSettings).focusMinutes}/
                      {(settings ?? state.focusSettings).shortBreakMinutes} мин
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 rounded-2xl bg-canvas px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Цикл: {state.focusSettings.focusMinutes} мин фокуса /{' '}
                    {state.focusSettings.shortBreakMinutes} мин отдыха
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted">
                    После {state.focusSettings.sessionsBeforeLongBreak} фокус-сессий длинный отдых{' '}
                    {state.focusSettings.longBreakMinutes} минут.
                  </p>
                </div>
                <div className="min-w-[180px]">
                  <div className="mb-1 flex items-center justify-between text-xs font-bold text-muted">
                    <span>Нагрузка дня</span>
                    <span>
                      {state.todayFocusBlocks}/{state.focusSettings.dailyFocusCap} блоков
                    </span>
                  </div>
                  <ProgressBar value={state.focusLoadPct} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {taskOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
          onClick={() => setTaskOpen(false)}
          role="presentation"
        >
          <div onClick={(e) => e.stopPropagation()}>
            <StepWizard
              open={taskOpen}
              title="Новая задача"
              steps={taskSteps}
              step={taskStep}
              onStepChange={setTaskStep}
              onClose={() => {
                setTaskOpen(false)
                setTaskStep(0)
                setTaskError('')
              }}
              resetKey={taskOpen}
              lastFooter={
                <button
                  type="button"
                  onClick={handleCreateTask}
                  className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-deep"
                >
                  Создать задачу
                </button>
              }
            />
          </div>
        </div>
      )}

      {sectionOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
          onClick={() => setSectionOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-surface p-5 shadow-xl ring-1 ring-line sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Новый раздел</p>
                <h3 className="mt-1 text-lg font-extrabold text-ink">Добавь колонку на доску</h3>
              </div>
              <button
                type="button"
                onClick={() => setSectionOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-canvas"
              >
                <X size={18} />
              </button>
            </div>
            <input
              value={sectionTitle}
              onChange={(event) => setSectionTitle(event.target.value)}
              placeholder="Например: На согласовании"
              className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
            />
            {sectionError && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-danger">
                {sectionError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSectionOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted hover:bg-canvas"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleCreateSection}
                className="rounded-xl bg-brand-soft px-4 py-2.5 text-sm font-bold text-brand hover:bg-brand hover:text-white"
              >
                Добавить раздел
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

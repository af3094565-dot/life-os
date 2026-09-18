import { ArrowUpRight, CalendarDays, CheckCheck, Flame, Plus, Target } from 'lucide-react'
import type { LifeOSState } from '../hooks/useLifeOS'
import type { PageId } from '../data/seed'
import { todayOverview } from '../lib/todayOverview'
import { addDays, parseDateKey, todayKey } from '../lib/habitLogic'

type Props = {
  state: LifeOSState
  done: number
  total: number
  goals: number
  onAdd: () => void
  onNavigate: (page: PageId) => void
}

export function DashboardOverview({ state, done, total, goals, onAdd, onNavigate }: Props) {
  const { habits } = todayOverview(state.quests, state.todayPlannerTasks)
  const charge = state.dailyCharge
  const pct = charge.percent
  const today = todayKey()
  const days = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i - 6)
    return {
      key,
      label: parseDateKey(key).toLocaleDateString('ru-RU', { weekday: 'short' }),
      count: state.habitsAll.filter(h => h.completions[key]).length,
    }
  })
  const max = Math.max(1, ...days.map(d => d.count))
  const weekTotal = days.reduce((sum, d) => sum + d.count, 0)

  return (
    <>
      <section className={`dashboard-hero day-charge-hero ${pct < 0 ? 'day-is-debt' : pct >= 100 ? 'day-is-complete' : ''}`} aria-label="Энергия дня">
        <div className="dashboard-hero-copy">
          <span className="dashboard-eyebrow"><span className="dashboard-status-dot" /> ЭНЕРГИЯ ТВОЕГО ДНЯ</span>
          <h2>{charge.title}</h2>
          <p className="day-charge-reminder">Выполняй задания и пополняй энергию.</p>
          <p>{total ? `Выполнено ${done} из ${total} дел. ${charge.complete ? 'Ты сделал всё, что запланировал. Можно отдохнуть.' : 'Каждая отметка приближает к полному заряду.'}` : 'Добавь посильный план: привычку или задачу. Заряд появится после выполнения.'}</p>
          <div className="day-charge-actions">
            <button type="button" className="dashboard-hero-button" onClick={charge.complete ? () => onNavigate('progress') : total ? () => {
              const list = document.querySelector<HTMLElement>('.dashboard-checklist')
              list?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
              list?.focus({ preventScroll: true })
            } : onAdd}>{!total && <Plus size={17} />}{charge.complete ? 'Посмотреть результат' : total ? 'К заданиям на сегодня' : 'Составить план дня'}<ArrowUpRight size={15} /></button>
            {total > 0 && <button type="button" className="day-charge-plan-link" onClick={() => onNavigate('planner')}>Изменить план</button>}
          </div>
        </div>
        <div className="day-charge-display">
          <div className="day-charge-battery" role="meter" aria-label="Заряд дня" aria-valuenow={pct} aria-valuemin={-100} aria-valuemax={100}>
            <div className="day-charge-fill" style={{ width: `${Math.max(0, pct)}%` }} />
            <strong>{pct}<span>%</span></strong>
          </div>
          <span className="day-charge-caption" role="status">{pct < 0 ? 'Долг восстанавливается выполнением дел' : pct >= 100 ? 'Полный заряд ✓' : 'Первые действия заряжают сильнее'}</span>
          <small>Минимум 4 выполнения для полного заряда</small>
        </div>
      </section>
      <p className="day-charge-reserve">Одна батарейка: создание планов расходует энергию, выполнение восстанавливает. <span>Долг — до −100. За 1 из 20 дел — около 13%; за 50 из 100 — около 85% без учёта затрат.</span></p>
      <div className="dashboard-metrics">
        {[
          { label: 'Привычки сегодня', value: `${habits.filter(q => q.done).length} / ${habits.length}`, detail: 'Маленькие шаги каждый день', icon: CheckCheck, tone: 'violet', page: 'habits' as const },
          { label: 'Задачи сегодня', value: `${state.todayPlannerTasks.filter(t => t.completedAt).length} / ${state.todayPlannerTasks.length}`, detail: 'Всё важное в одном месте', icon: CalendarDays, tone: 'blue', page: 'planner' as const },
          { label: 'Серия привычек', value: `${state.streak} дн.`, detail: 'Твоя последовательность', icon: Flame, tone: 'orange', page: 'progress' as const },
          { label: 'Активные цели', value: goals, detail: 'То, к чему ты движешься', icon: Target, tone: 'green', page: 'goals' as const },
        ].map(({ label, value, detail, icon: Icon, tone, page }) => (
          <button type="button" key={label} className="dashboard-metric" onClick={() => onNavigate(page)}>
            <span className={`dashboard-metric-icon ${tone}`}><Icon size={19} /></span><ArrowUpRight size={15} className="dashboard-metric-arrow" />
            <span className="dashboard-metric-label">{label}</span><strong>{value}</strong><span className="dashboard-metric-detail">{detail}</span>
          </button>
        ))}
      </div>
      <section className="dashboard-week" aria-label="Отметки привычек за последние семь дней">
        <div><span className="dashboard-eyebrow">ТВОЯ ПОСЛЕДОВАТЕЛЬНОСТЬ</span><h2>Каждый день в зачёт</h2><p>{weekTotal ? `${weekTotal} отметок привычек за последние 7 дней` : 'Отмечай привычки — здесь появится твой ритм'}</p><button type="button" onClick={() => onNavigate('progress')}>Вся статистика <ArrowUpRight size={15} /></button></div>
        <div className="dashboard-bars">{days.map(day => <div key={day.key} className={`dashboard-bar-column ${day.key === today ? 'is-today' : ''}`} aria-label={`${parseDateKey(day.key).toLocaleDateString('ru-RU')}: ${day.count} отметок`}><span className="dashboard-bar-value">{day.count}</span><div className="dashboard-bar-track"><div style={{ height: `${day.count / max * 100}%` }} /></div><span>{day.label}</span></div>)}</div>
      </section>
    </>
  )
}

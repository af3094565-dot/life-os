import { ArrowRight, Check, ChevronDown, Compass, Repeat2, Target, TrendingUp } from 'lucide-react'
import type { PageId } from '../data/seed'
import type { LifeOSState } from '../hooks/useLifeOS'

type Props = { state: LifeOSState; hasSubscription: boolean; onNavigate: (page: PageId, opts?: { entityId?: string }) => void; onCreateHabit: () => void }
export function JourneyGuide({ state, hasSubscription, onNavigate, onCreateHabit }: Props) {
  const hasHabit = state.habitsAll.length > 0
  const hasMark = state.habitsAll.some(h => Object.values(h.completions).some(Boolean))
  const activeGoal = state.customGoalStats.find(g => g.status === 'active')
  const linked = activeGoal && state.habitsAll.some(h => h.goalId === activeGoal.id)
  const steps = [
    { title: 'Создай привычку', description: 'Одно действие, которое хочешь повторять.', done: hasHabit, action: onCreateHabit },
    { title: 'Сделай первый шаг', description: 'Отметь выполнение в списке дел ниже.', done: hasMark, action: () => document.querySelector('.dashboard-checklist')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) },
    { title: 'Свяжи с целью', description: 'Пойми, к какому результату ведут твои действия.', done: !!linked, action: () => onNavigate('goals', activeGoal ? { entityId: activeGoal.id } : undefined) },
  ]
  const current = steps.findIndex(step => !step.done)
  return <section className="journey-guide" aria-label="Твой маршрут">
    {current >= 0 && <><div className="journey-heading"><div><span className="workspace-overline">ТВОЙ МАРШРУТ</span><h2>{hasHabit ? 'От действия — к результату' : 'Начни с одной привычки'}</h2></div><span>{steps.filter(step => step.done).length} из 3 шагов</span></div><div className="journey-steps">{steps.map((step, index) => <button type="button" key={step.title} className={step.done ? 'is-complete' : current === index ? 'is-current' : ''} onClick={step.action}><span className="journey-number">{step.done ? <Check size={15} /> : index + 1}</span><span><strong>{step.title}{index === 2 && !hasSubscription && <em>Pro</em>}</strong><small>{step.description}</small></span><ArrowRight size={16} /></button>)}</div></>}
    <details className="journey-map"><summary>Как устроен мой трекер<ChevronDown size={16} /></summary><p>Делай шаги каждый день, а остальные разделы помогут выбрать направление и увидеть результат.</p><div className="journey-map-links">{[
      { icon: Compass, title: 'Выбери направление', hint: 'Карта жизни и цели', page: 'life-map' as const },
      { icon: Repeat2, title: 'Составь план', hint: 'Привычки, задачи, календарь', page: 'habits' as const },
      { icon: Target, title: 'Действуй сегодня', hint: 'Дела дня и шаги квестов', page: 'dashboard' as const },
      { icon: TrendingUp, title: 'Замечай результат', hint: 'Статистика и достижения', page: 'progress' as const },
    ].map(item => <button type="button" key={item.page} onClick={() => onNavigate(item.page)}><item.icon size={19} /><strong>{item.title}</strong><small>{item.hint}</small><ArrowRight size={14} /></button>)}</div></details>
  </section>
}

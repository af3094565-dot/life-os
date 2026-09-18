import { useState } from 'react'
import { Check, Pin, Trophy } from 'lucide-react'
import { Header } from '../components/Header'
import type { PageId } from '../data/seed'
import type { LifeOSState } from '../hooks/useLifeOS'

type Props = { state: LifeOSState; userName: string; onNavigate?: (page: PageId) => void }
export function AchievementsPage({ state, userName }: Props) {
  const [filter, setFilter] = useState<'all' | 'earned' | 'ahead'>('all')
  const earned = state.achievementViews.filter(a => a.isUnlocked)
  const items = state.achievementViews.filter(a => filter === 'all' || (filter === 'earned' ? a.isUnlocked : !a.isUnlocked))
  const archiveCount = Object.keys(state.achievements.archive?.unlocked ?? {}).length
  return <div className="achievement-collection">
    <Header greeting="Маленькие победы" subtitle="Не за клики. За то, что у тебя получилось." userName={userName} streak={state.streak} diamonds={state.diamonds} dailyCharge={state.dailyCharge} visitStreak={state.visitStreak} diamondHistory={state.diamondHistory} />
    <section className="achievement-intro"><span className="achievement-intro-icon">🏅</span><div><span className="workspace-overline">КОЛЛЕКЦИЯ ХОРОШИХ МОМЕНТОВ</span><h2>Есть чем себя порадовать</h2><p>Всего 12 историй про твой прогресс. Без гонки, секретных условий и наград за открытие вкладок.</p><small>Уведомление — максимум одно в день, без звука. Остальные победы спокойно ждут здесь.</small></div><strong>{earned.length}<span> из 12</span></strong></section>
    <nav className="achievement-filters" aria-label="Фильтр достижений">{([{ id: 'all', label: 'Вся коллекция' }, { id: 'earned', label: 'Мои победы' }, { id: 'ahead', label: 'Впереди' }] as const).map(item => <button type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</nav>
    {items.length === 0 && <div className="achievement-empty"><Trophy size={30} /><h3>{filter === 'earned' ? 'Первая история ещё впереди' : 'Вся коллекция твоя'}</h3><p>{filter === 'earned' ? 'Выполни одно дело. Остальное постепенно сложится.' : 'Теперь главное — продолжать в своём ритме.'}</p></div>}
    <div className="achievement-grid">{items.map(a => <article key={a.id} className={`story-badge ${a.isUnlocked ? 'is-earned' : ''}`}>
      <div className="story-badge-top"><span className="story-badge-emoji" aria-hidden>{a.icon}</span>{a.isUnlocked ? <span className="story-badge-earned"><Check size={12} /> Получено</span> : <span className="story-badge-ahead">Впереди</span>}</div>
      <h3>{a.title}</h3><p>{a.description}</p>
      <div className="story-badge-footer">{a.isUnlocked ? <><span>{a.unlockedAt ? new Date(a.unlockedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'Твоя победа'}</span><button type="button" aria-label={`${state.achievements.pinnedIds.includes(a.id) ? 'Убрать из профиля' : 'Закрепить в профиле'}: ${a.title}`} aria-pressed={state.achievements.pinnedIds.includes(a.id)} disabled={!state.achievements.pinnedIds.includes(a.id) && state.achievements.pinnedIds.length >= 3} onClick={() => state.togglePinAchievement(a.id)}><Pin size={14} />{state.achievements.pinnedIds.includes(a.id) ? 'В профиле' : 'Закрепить'}</button></> : a.progress ? <span>{Math.min(a.progress.current, a.progress.target)} из {a.progress.target}</span> : null}</div>
    </article>)}</div>
    <p className="achievement-footnote">Можно закрепить в профиле до трёх любимых побед. Эти награды не меняют энергию — они про твой путь.</p>
    {archiveCount > 0 && <details className="achievement-archive"><summary>Предыдущая коллекция · {archiveCount} наград сохранено</summary><p>Старые даты и записи сохранены в аккаунте. Новая коллекция учитывает подтверждённый прогресс привычек, задач и целей, без старых наград за клики.</p></details>}
  </div>
}

import { useMemo, useState } from 'react'
import {
  History,
  Search,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Header } from '../components/Header'
import { AchievementCard } from '../components/achievements/AchievementCard'
import { Card, ProgressBar } from '../components/ui'
import type { PageId } from '../data/seed'
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  ACHIEVEMENT_TITLES,
  findTitle,
  TOTAL_ACHIEVEMENTS,
  type AchievementCategory,
  type AchievementView,
} from '../lib/achievements'
import type { LifeOSState } from '../hooks/useLifeOS'
import { DIAMOND } from '../lib/economy'

type Props = {
  state: LifeOSState
  userName: string
  onNavigate?: (page: PageId) => void
}

type StatusFilter =
  | 'all'
  | 'unlocked'
  | 'locked'
  | 'secret'
  | 'rare'
  | 'legendary'

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'unlocked', label: 'Полученные' },
  { id: 'locked', label: 'Не полученные' },
  { id: 'secret', label: 'Секретные' },
  { id: 'rare', label: 'Редкие' },
  { id: 'legendary', label: 'Легендарные' },
]

const CATEGORY_FILTERS: Array<AchievementCategory | 'all'> = [
  'all',
  'habits',
  'goals',
  'quests',
  'focus',
  'exploration',
  'diamonds',
  'streaks',
  'secret',
  'funny',
]

function formatDayLabel(isoDate: string) {
  const today = new Date()
  const y = today.toISOString().slice(0, 10)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yKey = yesterday.toISOString().slice(0, 10)
  if (isoDate === y) return 'Сегодня'
  if (isoDate === yKey) return 'Вчера'
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })
}

export function AchievementsPage({ state, userName }: Props) {
  const [status, setStatus] = useState<StatusFilter>('all')
  const [category, setCategory] = useState<AchievementCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'collection' | 'history' | 'titles'>('collection')

  const views = state.achievementViews
  const unlocked = state.unlockedAchievementCount
  const total = state.totalAchievements || TOTAL_ACHIEVEMENTS
  const pct = total ? Math.round((unlocked / total) * 100) : 0
  const inProgress = views.filter((a) => !a.isUnlocked && a.progress).length
  const secretLocked = views.filter((a) => a.isSecretLocked).length
  const todayUnlocks = state.achievements.daily.unlocks.length
  const title = findTitle(state.achievements.activeTitleId ?? 'novice')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return views.filter((a) => {
      if (status === 'unlocked' && !a.isUnlocked) return false
      if (status === 'locked' && a.isUnlocked) return false
      if (status === 'secret' && !(a.hidden || a.rarity === 'secret' || a.category === 'secret'))
        return false
      if (status === 'rare' && a.rarity !== 'rare' && a.rarity !== 'epic') return false
      if (status === 'legendary' && a.rarity !== 'legendary') return false
      if (category !== 'all' && a.category !== category) return false
      if (!q) return true
      if (a.isSecretLocked) {
        return 'секрет'.includes(q) || 'secret'.includes(q) || (a.hint ?? '').toLowerCase().includes(q)
      }
      return (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        ACHIEVEMENT_CATEGORY_LABELS[a.category].toLowerCase().includes(q)
      )
    })
  }, [views, status, category, query])

  const historyGroups = useMemo(() => {
    const map = new Map<string, AchievementView[]>()
    for (const entry of state.achievements.history) {
      const day = entry.unlockedAt.slice(0, 10)
      const view = views.find((v) => v.id === entry.achievementId)
      if (!view) continue
      const list = map.get(day) ?? []
      list.push(view)
      map.set(day, list)
    }
    return [...map.entries()]
  }, [state.achievements.history, views])

  const pinned = state.achievements.pinnedIds
    .map((id) => views.find((v) => v.id === id))
    .filter(Boolean) as AchievementView[]

  const nearest = state.nearestAchievements
  const secretPlaceholders = Math.min(12, secretLocked || 5)

  return (
    <div className="pb-24 md:pb-0">
      <div className="mb-4 md:hidden">
        <h1 className="text-[28px] font-extrabold tracking-tight text-ink">
          🏆 Достижения
        </h1>
        <p className="mt-1 text-sm font-medium text-muted">
          {unlocked} / {total} · {pct}% собрано
        </p>
        <ProgressBar value={pct} className="mt-3" />
      </div>

      <div className="hidden md:block">
      <Header
        greeting="Достижения"
        subtitle="Коллекция · редкость · секреты"
        streak={state.streak}
        diamonds={state.diamonds}
        visitStreak={state.visitStreak}
        diamondHistory={state.diamondHistory ?? []}
        userName={userName}
      />
      </div>

      <Card className="mb-5 hidden overflow-hidden animate-fade-up md:block">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
              Achievements
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-ink">
              {unlocked} / {total}
            </p>
            <p className="mt-1 text-sm font-medium text-muted">{pct}% собрано</p>
          </div>
          <button
            type="button"
            onClick={() =>
              state.toggleAchievementSound(!state.achievements.soundEnabled)
            }
            className="inline-flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-xs font-bold text-muted ring-1 ring-line hover:text-ink"
            aria-label={
              state.achievements.soundEnabled
                ? 'Выключить звук достижений'
                : 'Включить звук достижений'
            }
          >
            {state.achievements.soundEnabled ? (
              <Volume2 size={14} />
            ) : (
              <VolumeX size={14} />
            )}
            Звук {state.achievements.soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <ProgressBar value={pct} className="mt-4" />
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Сегодня" value={`🏆 ${todayUnlocks}`} />
          <Stat
            label="Серия разблокировок"
            value={`🔥 ${state.achievements.meta.unlockStreakDays} дн.`}
          />
          <Stat
            label="Алмазы за ачивки"
            value={`${state.achievements.diamondsFromAchievements} ${DIAMOND}`}
          />
          <Stat
            label="Achievement XP"
            value={`⭐ ${state.achievements.achievementXp.toLocaleString('ru-RU')}`}
          />
        </div>
        <p className="mt-4 text-xs font-semibold text-muted">
          Открыто: {unlocked} · В процессе: {inProgress} · Не найдено:{' '}
          {Math.max(0, total - unlocked - inProgress)}
        </p>
      </Card>

      <Card className="mb-5 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-xl">
            {title?.emoji ?? '🌱'}
          </div>
          <div>
            <p className="text-lg font-extrabold text-ink">{userName}</p>
            <p className="text-sm font-semibold text-brand">
              {title?.emoji} {title?.label ?? 'Новичок'}
            </p>
            <p className="text-xs font-medium text-muted">
              {unlocked} / {total} · Achievement Hunter
            </p>
          </div>
        </div>

        {pinned.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Моя витрина
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pinned.map((a) => (
                <div
                  key={a.id}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-canvas text-xl ring-1 ring-line"
                  title={a.title}
                >
                  {a.icon}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {nearest.length > 0 && (
        <Card className="mb-5 animate-fade-up">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
            Ближайшие
          </p>
          <div className="mt-3 space-y-3">
            {nearest.map((a) => (
              <div key={a.id}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="font-extrabold text-ink">
                    {a.icon} {a.title}
                  </span>
                  <span className="text-xs font-bold text-muted">
                    {a.progress!.current} / {a.progress!.target}
                  </span>
                </div>
                <ProgressBar
                  value={(a.progress!.current / a.progress!.target) * 100}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mb-5 animate-fade-up">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
          Secret achievements
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: secretPlaceholders }).map((_, i) => (
            <div
              key={i}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink/90 text-sm text-white/80"
              aria-hidden
            >
              🔒
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs font-medium text-muted">
          Скрытых ещё много. Условия не показываем — только любопытство.
        </p>
      </Card>

      <div className="mb-4 flex gap-2">
        {(
          [
            ['collection', 'Коллекция', Trophy],
            ['history', 'История', History],
            ['titles', 'Титулы', Trophy],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold ring-1 ${
              tab === id
                ? 'bg-brand text-white ring-brand'
                : 'bg-surface text-muted ring-line hover:text-ink'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'collection' && (
        <>
          <div className="mb-3 flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5 ring-1 ring-line">
            <Search size={16} className="text-muted" />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Найти достижение"
              className="min-h-[44px] w-full bg-transparent text-base font-semibold text-ink outline-none placeholder:text-muted"
              aria-label="Найти достижение"
            />
          </div>

          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {STATUS_FILTERS.map((f) => (
              <Chip
                key={f.id}
                active={status === f.id}
                onClick={() => setStatus(f.id)}
                label={f.label}
              />
            ))}
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {CATEGORY_FILTERS.map((c) => (
              <Chip
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
                label={
                  c === 'all' ? 'Категории' : ACHIEVEMENT_CATEGORY_LABELS[c]
                }
              />
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((a) => (
              <AchievementCard
                key={a.id}
                achievement={a}
                pinned={state.achievements.pinnedIds.includes(a.id)}
                onTogglePin={() => state.togglePinAchievement(a.id)}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <Card className="mt-3 text-sm font-medium text-muted">
              Ничего не нашлось. Попробуй другой фильтр или поиск.
            </Card>
          )}
        </>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          {historyGroups.length === 0 && (
            <Card className="text-sm font-medium text-muted">
              История пока пуста — первое достижение уже близко.
            </Card>
          )}
          {historyGroups.map(([day, items]) => (
            <Card key={day}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                {formatDayLabel(day)}
              </p>
              <ul className="mt-2 space-y-2">
                {items.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-sm font-bold text-ink">
                    <span>{a.icon}</span>
                    <span>{a.title}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {tab === 'titles' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {ACHIEVEMENT_TITLES.map((t) => {
            const unlockedTitle = state.achievements.unlockedTitleIds.includes(t.id)
            const active = state.achievements.activeTitleId === t.id
            return (
              <Card
                key={t.id}
                className={!unlockedTitle ? 'opacity-60' : ''}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-extrabold text-ink">
                      {t.emoji} {t.label}
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted">
                      {unlockedTitle ? t.description : 'Ещё не открыт'}
                    </p>
                  </div>
                  {unlockedTitle && (
                    <button
                      type="button"
                      onClick={() => state.selectAchievementTitle(t.id)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-extrabold ${
                        active
                          ? 'bg-brand text-white'
                          : 'bg-brand-soft text-brand'
                      }`}
                    >
                      {active ? 'Активен' : 'Использовать'}
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {unlocked >= total && total > 0 && (
        <Card className="mt-5 bg-ink text-white">
          <p className="text-lg font-extrabold">🏆 Achievement Master</p>
          <p className="mt-1 text-sm text-white/70">
            Ты собрал всё из текущего каталога. Сезонные и новые ещё впереди.
          </p>
        </Card>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-canvas px-3 py-2 ring-1 ring-line">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-extrabold text-ink">{value}</p>
    </div>
  )
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ${
        active
          ? 'bg-brand text-white ring-brand'
          : 'bg-surface text-muted ring-line hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}

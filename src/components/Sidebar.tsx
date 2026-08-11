import { useState } from 'react'
import type { PageId } from '../data/seed'
import { isPlanPage } from '../lib/navigation'
import {
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  CircleDot,
  Crown,
  Grid3x3,
  Home,
  KanbanSquare,
  ListChecks,
  Lock,
  LogOut,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react'

type NavItem = {
  id: PageId
  label: string
  icon: typeof Home
  pro?: boolean
  tour?: string
  advanced?: boolean
}

const TODAY: NavItem = {
  id: 'dashboard',
  label: 'Сегодня',
  icon: Home,
  tour: 'nav-dashboard',
}

const LIFE_CORE: NavItem[] = [
  { id: 'goals', label: 'Цели', icon: Target, pro: true, tour: 'nav-goals' },
  { id: 'habits', label: 'Привычки', icon: CalendarCheck, tour: 'nav-habits' },
]

const LIFE_ADVANCED: NavItem[] = [
  {
    id: 'quests',
    label: 'Квесты',
    icon: ListChecks,
    pro: true,
    tour: 'nav-quests',
    advanced: true,
  },
  {
    id: 'life-map',
    label: 'Карта жизни',
    icon: CircleDot,
    pro: true,
    tour: 'nav-life-map',
    advanced: true,
  },
]

const PLAN_ITEMS: NavItem[] = [
  { id: 'planner', label: 'Сегодня / задачи', icon: KanbanSquare, tour: 'nav-planner' },
  {
    id: 'planner-calendar',
    label: 'Календарь',
    icon: CalendarDays,
    tour: 'nav-calendar',
  },
]

const MORE: NavItem[] = [
  { id: 'achievements', label: 'Достижения', icon: Trophy, tour: 'nav-achievements', advanced: true },
  { id: 'desktop', label: 'Рабочий стол', icon: Grid3x3, tour: 'nav-desktop', advanced: true },
]

type Props = {
  page: PageId
  onNavigate: (page: PageId) => void
  hasSubscription: boolean
  onOpenAccount: () => void
  onLogout: () => void
  /** Показать продвинутые разделы (после онбординга / опыта) */
  showAdvanced?: boolean
  diamonds?: number
}

function NavButton({
  item,
  active,
  locked,
  onClick,
}: {
  item: NavItem
  active: boolean
  locked: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      data-tour={item.tour}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
        active
          ? 'bg-brand-soft text-brand'
          : 'text-muted hover:bg-canvas hover:text-ink'
      }`}
    >
      <Icon size={18} strokeWidth={active ? 2.4 : 2} />
      <span className="flex-1">{item.label}</span>
      {locked && <Lock size={14} className="opacity-60" />}
    </button>
  )
}

export function Sidebar({
  page,
  onNavigate,
  hasSubscription,
  onOpenAccount,
  onLogout,
  showAdvanced = false,
  diamonds,
}: Props) {
  const lifeAdvancedVisible =
    showAdvanced || LIFE_ADVANCED.some((a) => a.id === page)
  const [moreOpen, setMoreOpen] = useState(
    () => MORE.some((a) => a.id === page) || showAdvanced,
  )
  const [planOpen, setPlanOpen] = useState(() => isPlanPage(page))

  const planActive = isPlanPage(page)

  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col border-r border-line bg-surface px-4 py-6">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm animate-pulse-soft">
          <Sparkles size={18} />
        </div>
        <div>
          <div className="text-[15px] font-extrabold tracking-tight text-ink">
            Life OS
          </div>
          <div className="text-[11px] font-medium text-muted">Твой следующий шаг</div>
        </div>
      </div>

      {!hasSubscription && (
        <button
          type="button"
          onClick={onOpenAccount}
          className="mb-3 flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2.5 text-left text-xs font-bold text-brand transition hover:bg-brand/15"
        >
          <Crown size={14} />
          Попробовать Pro
        </button>
      )}

      {hasSubscription && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
          <Crown size={14} />
          Pro активна
        </div>
      )}

      {diamonds != null && (
        <button
          type="button"
          onClick={onOpenAccount}
          className="mb-4 flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-left text-xs font-bold text-sky-800 ring-1 ring-sky-100"
        >
          <span aria-hidden>💎</span>
          {diamonds} алмазов
        </button>
      )}

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        <NavButton
          item={TODAY}
          active={page === TODAY.id}
          locked={false}
          onClick={() => onNavigate(TODAY.id)}
        />

        <p className="mb-1 mt-4 px-3 text-[10px] font-bold uppercase tracking-wider text-muted/80">
          Моя жизнь
        </p>
        {LIFE_CORE.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={page === item.id}
            locked={Boolean(item.pro && !hasSubscription)}
            onClick={() => onNavigate(item.id)}
          />
        ))}
        {lifeAdvancedVisible &&
          LIFE_ADVANCED.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={page === item.id}
              locked={Boolean(item.pro && !hasSubscription)}
              onClick={() => onNavigate(item.id)}
            />
          ))}

        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              setPlanOpen((v) => !v)
              if (!planActive) onNavigate('planner')
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
              planActive
                ? 'bg-brand-soft text-brand'
                : 'text-muted hover:bg-canvas hover:text-ink'
            }`}
          >
            <KanbanSquare size={18} strokeWidth={planActive ? 2.4 : 2} />
            <span className="flex-1">План</span>
            <ChevronDown
              size={14}
              className={`transition ${planOpen || planActive ? 'rotate-180' : ''}`}
            />
          </button>
          {(planOpen || planActive) && (
            <div className="ml-3 mt-0.5 space-y-0.5 border-l border-line pl-2">
              {PLAN_ITEMS.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  active={page === item.id}
                  locked={false}
                  onClick={() => onNavigate(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-2">
          <NavButton
            item={{
              id: 'progress',
              label: 'Прогресс',
              icon: TrendingUp,
              tour: 'nav-progress',
            }}
            active={page === 'progress'}
            locked={false}
            onClick={() => onNavigate('progress')}
          />
        </div>

        <div className="my-3 border-t border-line" />

        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-muted hover:bg-canvas hover:text-ink"
        >
          <span className="flex-1">Ещё</span>
          <ChevronDown
            size={14}
            className={`transition ${moreOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {moreOpen &&
          MORE.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={page === item.id}
              locked={Boolean(item.pro && !hasSubscription)}
              onClick={() => onNavigate(item.id)}
            />
          ))}
        {!lifeAdvancedVisible && (
          <p className="mt-2 px-3 text-[10px] font-medium leading-relaxed text-muted">
            Квесты и карта жизни появятся, когда освоишь базу.
          </p>
        )}
      </nav>

      <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
        <button
          type="button"
          onClick={onOpenAccount}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-canvas hover:text-ink"
        >
          <Settings size={18} />
          Профиль
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-red-50 hover:text-danger"
        >
          <LogOut size={18} />
          Выйти
        </button>
      </div>
    </aside>
  )
}

import type { PageId } from '../data/seed'
import {
  LayoutDashboard,
  Target,
  ListChecks,
  TrendingUp,
  Settings,
  Sparkles,
  KanbanSquare,
  CalendarCheck,
  CircleDot,
  Crown,
  CalendarDays,
  Grid3x3,
  Lock,
  LogOut,
} from 'lucide-react'

const nav: {
  id: PageId
  label: string
  icon: typeof LayoutDashboard
  pro?: boolean
  tour?: string
}[] = [
  { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard, tour: 'nav-dashboard' },
  { id: 'desktop', label: 'Рабочий стол', icon: Grid3x3, tour: 'nav-desktop' },
  { id: 'planner', label: 'Планировщик', icon: KanbanSquare, tour: 'nav-planner' },
  {
    id: 'planner-calendar',
    label: 'Календарь',
    icon: CalendarDays,
    tour: 'nav-calendar',
  },
  { id: 'habits', label: 'Привычки', icon: CalendarCheck, tour: 'nav-habits' },
  { id: 'goals', label: 'Цели', icon: Target, pro: true, tour: 'nav-goals' },
  { id: 'quests', label: 'Квесты', icon: ListChecks, pro: true, tour: 'nav-quests' },
  {
    id: 'life-map',
    label: 'Карта жизни',
    icon: CircleDot,
    pro: true,
    tour: 'nav-life-map',
  },
  { id: 'progress', label: 'Прогресс', icon: TrendingUp, tour: 'nav-progress' },
]

type Props = {
  page: PageId
  onNavigate: (page: PageId) => void
  hasSubscription: boolean
  onOpenAccount: () => void
  onLogout: () => void
}

export function Sidebar({
  page,
  onNavigate,
  hasSubscription,
  onOpenAccount,
  onLogout,
}: Props) {
  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-line bg-surface px-4 py-6">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm animate-pulse-soft">
          <Sparkles size={18} />
        </div>
        <div>
          <div className="text-[15px] font-extrabold tracking-tight text-ink">
            Life OS
          </div>
          <div className="text-[11px] font-medium text-muted">Build your life</div>
        </div>
      </div>

      {!hasSubscription && (
        <button
          type="button"
          onClick={onOpenAccount}
          className="mb-4 flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2.5 text-left text-xs font-bold text-brand transition hover:bg-brand/15"
        >
          <Crown size={14} />
          Купить подписку
        </button>
      )}

      {hasSubscription && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
          <Crown size={14} />
          Pro активна
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-1">
        {nav.map(({ id, label, icon: Icon, pro, tour }) => {
          const active = page === id
          const locked = Boolean(pro && !hasSubscription)
          return (
            <button
              key={id}
              type="button"
              data-tour={tour}
              onClick={() => onNavigate(id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                active
                  ? 'bg-brand-soft text-brand'
                  : 'text-muted hover:bg-canvas hover:text-ink'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 2} />
              <span className="flex-1">{label}</span>
              {locked && <Lock size={14} className="opacity-60" />}
            </button>
          )
        })}
      </nav>

      <div className="mt-4 flex flex-col gap-1">
        <button
          type="button"
          onClick={onOpenAccount}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-canvas hover:text-ink"
        >
          <Settings size={18} />
          Аккаунт
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

import { useState } from 'react'
import type { PageId } from '../data/seed'
import { isPlanPage } from '../lib/navigation'
import { useKeyboardOpen } from '../hooks/useKeyboardOpen'
import {
  CalendarCheck,
  CircleDot,
  Grid3x3,
  Home,
  KanbanSquare,
  ListChecks,
  Plus,
  Target,
  TrendingUp,
  Trophy,
  User,
  X,
} from 'lucide-react'

type Props = {
  page: PageId
  onNavigate: (page: PageId) => void
  onOpenAccount: () => void
  onCreate: () => void
  hasSubscription: boolean
  createOpen?: boolean
}

const TABS: {
  id: 'dashboard' | 'planner' | 'create' | 'progress' | 'profile'
  label: string
  icon: typeof Home
  match?: (p: PageId) => boolean
}[] = [
  { id: 'dashboard', label: 'Дом', icon: Home },
  {
    id: 'planner',
    label: 'Задачи',
    icon: ListChecks,
    match: isPlanPage,
  },
  { id: 'create', label: 'Создать', icon: Plus },
  { id: 'progress', label: 'Прогресс', icon: TrendingUp },
  { id: 'profile', label: 'Я', icon: User },
]

const MORE: { id: PageId; label: string; icon: typeof Home; pro?: boolean }[] = [
  { id: 'habits', label: 'Привычки', icon: CalendarCheck },
  { id: 'goals', label: 'Цели', icon: Target },
  { id: 'achievements', label: 'Достижения', icon: Trophy },
  { id: 'quests', label: 'Квесты', icon: ListChecks, pro: true },
  { id: 'life-map', label: 'Карта жизни', icon: CircleDot, pro: true },
  { id: 'desktop', label: 'Рабочий стол', icon: Grid3x3 },
  { id: 'planner-calendar', label: 'Календарь', icon: KanbanSquare },
]

/**
 * Mobile bottom navigation — 5 slots with Create in the center.
 * Hidden while soft keyboard is open.
 */
export function MobileNav({
  page,
  onNavigate,
  onOpenAccount,
  onCreate,
  hasSubscription,
  createOpen = false,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false)
  const keyboardOpen = useKeyboardOpen()

  if (keyboardOpen) return null

  const profileActive = moreOpen

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Основная навигация"
      >
        <div className="flex items-stretch justify-around px-1 pt-1">
          {TABS.map((item) => {
            if (item.id === 'create') {
              return (
                <button
                  key="create"
                  type="button"
                  onClick={() => {
                    setMoreOpen(false)
                    onCreate()
                  }}
                  aria-label="Создать"
                  aria-expanded={createOpen}
                  className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5"
                >
                  <span
                    className={`flex h-12 w-12 -translate-y-3 items-center justify-center rounded-2xl text-white shadow-md transition active:scale-95 ${
                      createOpen ? 'bg-brand-deep' : 'bg-brand'
                    }`}
                  >
                    <Plus size={26} strokeWidth={2.5} />
                  </span>
                  <span className="-mt-2 text-[10px] font-bold text-brand">
                    {item.label}
                  </span>
                </button>
              )
            }

            if (item.id === 'profile') {
              return (
                <button
                  key="profile"
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className={`touch-target flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-bold active:scale-95 ${
                    profileActive ? 'text-brand' : 'text-muted'
                  }`}
                >
                  <User size={22} strokeWidth={profileActive ? 2.5 : 2} />
                  <span>Я</span>
                </button>
              )
            }

            const pageId = item.id
            const active = item.match ? item.match(page) : page === pageId
            const Icon = item.icon
            return (
              <button
                key={pageId}
                type="button"
                data-tour={
                  pageId === 'dashboard'
                    ? 'nav-dashboard'
                    : pageId === 'planner'
                      ? 'nav-planner'
                      : pageId === 'progress'
                        ? 'nav-progress'
                        : undefined
                }
                onClick={() => {
                  setMoreOpen(false)
                  onNavigate(pageId)
                }}
                className={`touch-target flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-bold active:scale-95 ${
                  active ? 'text-brand' : 'text-muted'
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {moreOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 md:hidden"
          onClick={() => setMoreOpen(false)}
          role="presentation"
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-surface p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex justify-center sm:hidden" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-line" />
            </div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-extrabold text-ink">Ещё и профиль</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="touch-target rounded-xl p-2.5 text-muted active:scale-95 hover:bg-canvas"
                aria-label="Закрыть"
              >
                <X size={20} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setMoreOpen(false)
                onOpenAccount()
              }}
              className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-brand-soft px-4 py-4 text-left ring-1 ring-brand/20 active:scale-[0.99]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-white">
                Я
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-extrabold text-ink">
                  Профиль и настройки
                </span>
                <span className="mt-0.5 block text-sm font-medium text-muted">
                  Подписка, обучение, выход
                </span>
              </span>
            </button>

            <ul className="grid grid-cols-2 gap-2">
              {MORE.map((item) => {
                const Icon = item.icon
                const active = page === item.id
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      data-tour={
                        item.id === 'quests'
                          ? 'nav-quests'
                          : item.id === 'life-map'
                            ? 'nav-life-map'
                            : item.id === 'desktop'
                              ? 'nav-desktop'
                              : item.id === 'habits'
                                ? 'nav-habits'
                                : item.id === 'goals'
                                  ? 'nav-goals'
                                  : item.id === 'achievements'
                                    ? 'nav-achievements'
                                    : item.id === 'planner-calendar'
                                      ? 'nav-calendar'
                                      : undefined
                      }
                      onClick={() => {
                        setMoreOpen(false)
                        onNavigate(item.id)
                      }}
                      className={`flex min-h-[52px] w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-bold ring-1 active:scale-[0.99] ${
                        active
                          ? 'bg-brand-soft text-brand ring-brand/20'
                          : 'bg-canvas text-ink ring-line'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.pro && !hasSubscription && (
                        <span className="text-[10px] font-bold text-brand">Pro</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}

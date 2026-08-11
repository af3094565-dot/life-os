import { useEffect } from 'react'
import { Crown, GraduationCap, LogOut, X } from 'lucide-react'
import type { PublicUser } from '../lib/auth'
import { findTitle } from '../lib/achievements'
import { DIAMOND } from '../lib/economy'

type Props = {
  open: boolean
  user: PublicUser
  onClose: () => void
  onBuy: () => void
  onLogout: () => void
  onOpenLifeMap: () => void
  onRestartTraining?: () => void
  showLifeMapCta?: boolean
  diamonds?: number
  achievementSummary?: {
    unlocked: number
    total: number
    titleId?: string
    pinnedIcons: string[]
    favoriteTitle?: string
    onOpenAchievements?: () => void
  }
}

export function AccountPanel({
  open,
  user,
  onClose,
  onBuy,
  onLogout,
  onOpenLifeMap,
  onRestartTraining,
  showLifeMapCta = false,
  diamonds,
  achievementSummary,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  const title = findTitle(achievementSummary?.titleId ?? 'novice')
  const initial = (user.name.trim()[0] ?? 'Я').toUpperCase()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-panel-title"
        className="animate-sheet-up max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl ring-1 ring-line sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex justify-center sm:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-line" />
        </div>

        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="account-panel-title" className="sr-only">
            Профиль
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="touch-target ml-auto rounded-xl p-2.5 text-muted hover:bg-canvas hover:text-ink"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl font-extrabold text-white">
            {initial}
          </span>
          <p className="mt-3 text-xl font-extrabold text-ink">{user.name}</p>
          <p className="mt-0.5 text-sm font-medium text-muted">{user.email}</p>
          {achievementSummary && (
            <p className="mt-2 text-sm font-bold text-brand">
              {title?.emoji} {title?.label}
            </p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {achievementSummary && (
            <div className="rounded-xl bg-canvas px-3 py-3 ring-1 ring-line">
              <p className="text-[11px] font-bold uppercase text-muted">Достижения</p>
              <p className="mt-1 text-lg font-extrabold text-ink">
                🏆 {achievementSummary.unlocked}/{achievementSummary.total}
              </p>
            </div>
          )}
          {diamonds != null && (
            <div className="rounded-xl bg-canvas px-3 py-3 ring-1 ring-line">
              <p className="text-[11px] font-bold uppercase text-muted">Алмазы</p>
              <p className="mt-1 text-lg font-extrabold text-ink">
                {DIAMOND} {diamonds}
              </p>
            </div>
          )}
          <div className="col-span-2 rounded-xl bg-canvas px-3 py-3 ring-1 ring-line">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Crown
                size={16}
                className={user.hasSubscription ? 'text-brand' : 'text-muted'}
              />
              {user.hasSubscription ? (
                <span className="text-brand">Подписка активна</span>
              ) : (
                <span className="text-muted">Без подписки</span>
              )}
            </div>
            {!user.hasSubscription && (
              <button
                type="button"
                onClick={onBuy}
                className="btn-mobile mt-3 w-full bg-brand text-white hover:bg-brand-deep"
              >
                Купить подписку
              </button>
            )}
          </div>
        </div>

        {achievementSummary && (
          <div className="mt-3 rounded-xl bg-canvas p-4 ring-1 ring-line">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Моя витрина
            </p>
            {achievementSummary.pinnedIcons.length > 0 ? (
              <div className="mt-2 flex gap-2">
                {achievementSummary.pinnedIcons.map((icon, i) => (
                  <span
                    key={`${icon}-${i}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-lg ring-1 ring-line"
                  >
                    {icon}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm font-medium text-muted">
                Закрепи до 5 достижений на странице «Достижения»
              </p>
            )}
            {achievementSummary.favoriteTitle && (
              <p className="mt-2 text-sm font-semibold text-ink">
                Любимое: 🏆 «{achievementSummary.favoriteTitle}»
              </p>
            )}
            {achievementSummary.onOpenAchievements && (
              <button
                type="button"
                onClick={() => {
                  achievementSummary.onOpenAchievements?.()
                  onClose()
                }}
                className="btn-mobile mt-3 w-full bg-brand-soft text-brand"
              >
                Открыть достижения
              </button>
            )}
          </div>
        )}

        {showLifeMapCta && (
          <button
            type="button"
            onClick={() => {
              onOpenLifeMap()
              onClose()
            }}
            className="btn-mobile mt-3 w-full bg-brand-soft text-brand"
          >
            Создать карту жизни
          </button>
        )}

        {onRestartTraining && (
          <button
            type="button"
            onClick={onRestartTraining}
            className="btn-mobile mt-3 flex w-full items-center justify-center gap-2 bg-canvas text-ink ring-1 ring-line"
          >
            <GraduationCap size={16} className="text-brand" />
            Пройти обучение снова
          </button>
        )}

        <button
          type="button"
          onClick={onLogout}
          className="btn-mobile mt-4 flex w-full items-center justify-center gap-2 border border-line text-danger hover:bg-red-50"
        >
          <LogOut size={16} />
          Выйти из аккаунта
        </button>
      </div>
    </div>
  )
}

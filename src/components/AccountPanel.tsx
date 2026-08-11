import { Crown, GraduationCap, LogOut, X } from 'lucide-react'
import type { PublicUser } from '../lib/auth'

type Props = {
  open: boolean
  user: PublicUser
  onClose: () => void
  onBuy: () => void
  onLogout: () => void
  onOpenLifeMap: () => void
  onRestartTraining?: () => void
  showLifeMapCta?: boolean
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
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-panel-title"
        className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl ring-1 ring-line animate-fade-up"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="account-panel-title" className="text-lg font-extrabold text-ink">
              Аккаунт
            </h2>
            <p className="mt-0.5 text-sm font-medium text-muted">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rounded-xl bg-canvas p-4 ring-1 ring-line">
          <div className="text-sm font-extrabold text-ink">{user.name}</div>
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
            <Crown size={15} className={user.hasSubscription ? 'text-brand' : 'text-muted'} />
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
              className="mt-3 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-deep"
            >
              Купить подписку
            </button>
          )}
        </div>

        {showLifeMapCta && (
          <button
            type="button"
            onClick={() => {
              onOpenLifeMap()
              onClose()
            }}
            className="mt-3 w-full rounded-xl bg-brand-soft px-4 py-2.5 text-sm font-bold text-brand"
          >
            Создать карту жизни
          </button>
        )}

        {onRestartTraining && (
          <button
            type="button"
            onClick={onRestartTraining}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-canvas px-4 py-2.5 text-sm font-bold text-ink ring-1 ring-line hover:bg-surface"
          >
            <GraduationCap size={16} className="text-brand" />
            Пройти обучение снова
          </button>
        )}

        <button
          type="button"
          onClick={onLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-danger hover:bg-red-50"
        >
          <LogOut size={16} />
          Выйти из аккаунта
        </button>
      </div>
    </div>
  )
}

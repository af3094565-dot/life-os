import { Pin, PinOff } from 'lucide-react'
import type { AchievementView } from '../../lib/achievements'
import {
  ACHIEVEMENT_RARITY_LABELS,
  rarityFlavor,
} from '../../lib/achievements'
import { ProgressBar } from '../ui'
import { DIAMOND, formatDiamonds } from '../../lib/economy'

type Props = {
  achievement: AchievementView
  pinned?: boolean
  onTogglePin?: () => void
  onSelect?: () => void
}

const RARITY_STYLE: Record<string, string> = {
  common: 'bg-slate-100 text-slate-700',
  uncommon: 'bg-emerald-50 text-emerald-800',
  rare: 'bg-sky-50 text-sky-800',
  epic: 'bg-violet-50 text-violet-800',
  legendary: 'bg-amber-50 text-amber-900',
  secret: 'bg-ink text-white',
}

export function AchievementCard({
  achievement: a,
  pinned,
  onTogglePin,
  onSelect,
}: Props) {
  const lockedSecret = a.isSecretLocked
  const locked = !a.isUnlocked

  return (
    <article
      className={`group relative flex flex-col rounded-2xl p-4 ring-1 transition ${
        locked
          ? 'bg-canvas/80 ring-line opacity-90'
          : 'bg-surface ring-line shadow-[0_1px_3px_rgba(26,26,46,0.04)] hover:ring-brand/30'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 flex-col text-left"
        aria-label={lockedSecret ? 'Секретное достижение' : a.title}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
              locked ? 'bg-line/60 grayscale' : 'bg-brand-soft'
            }`}
            aria-hidden
          >
            {lockedSecret ? '🔒' : a.icon}
          </span>
          <span
            className={`rounded-lg px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${RARITY_STYLE[a.rarity]}`}
          >
            {ACHIEVEMENT_RARITY_LABELS[a.rarity]}
          </span>
        </div>
        <h3 className="mt-3 text-sm font-extrabold text-ink">
          {lockedSecret ? '???' : a.title}
        </h3>
        <p className="mt-1 line-clamp-3 text-xs font-medium text-muted">
          {a.description}
        </p>

        {a.progress && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] font-bold text-muted">
              <span>
                {a.progress.current} / {a.progress.target}
              </span>
              <span>осталось {Math.max(0, a.progress.target - a.progress.current)}</span>
            </div>
            <ProgressBar
              value={(a.progress.current / a.progress.target) * 100}
            />
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold text-muted">
          {!lockedSecret && (
            <span className="rounded-md bg-canvas px-1.5 py-0.5">⭐ +{a.xpReward}</span>
          )}
          {a.diamondReward && !lockedSecret ? (
            <span className="rounded-md bg-canvas px-1.5 py-0.5">
              +{formatDiamonds(a.diamondReward)} {DIAMOND}
            </span>
          ) : null}
          {a.isUnlocked && a.unlockedAt && (
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-800">
              {new Date(a.unlockedAt).toLocaleDateString('ru-RU')}
            </span>
          )}
          {!a.isUnlocked && !a.progress && (
            <span className="rounded-md bg-canvas px-1.5 py-0.5">
              {rarityFlavor(a.rarity)}
            </span>
          )}
        </div>
      </button>

      {a.isUnlocked && onTogglePin && (
        <button
          type="button"
          onClick={onTogglePin}
          className="absolute right-3 top-14 rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-brand"
          aria-label={pinned ? 'Открепить' : 'Закрепить в витрине'}
        >
          {pinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
      )}
    </article>
  )
}

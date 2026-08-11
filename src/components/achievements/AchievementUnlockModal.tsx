import { useEffect } from 'react'
import { X } from 'lucide-react'
import { getAchievementDefinition } from '../../lib/achievements'
import { DIAMOND } from '../../lib/economy'

type Props = {
  achievementId: string | null
  batchCount?: number
  batchXp?: number
  batchDiamonds?: number
  soundEnabled?: boolean
  onClose: () => void
  onOpen?: () => void
}

/** Компактная верхняя вкладка при разблокировке — исчезает через 3 сек */
export function AchievementUnlockModal({
  achievementId,
  batchCount,
  batchXp,
  batchDiamonds,
  soundEnabled,
  onClose,
  onOpen,
}: Props) {
  const isBatch = (batchCount ?? 0) >= 4
  const def = achievementId ? getAchievementDefinition(achievementId) : undefined

  useEffect(() => {
    if (!achievementId && !isBatch) return
    const t = window.setTimeout(onClose, 3000)
    return () => window.clearTimeout(t)
  }, [achievementId, isBatch, onClose])

  useEffect(() => {
    if (!soundEnabled || (!achievementId && !isBatch)) return
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      if (!Ctx) return
      const ctx = new Ctx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(523.25, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
      window.setTimeout(() => ctx.close(), 400)
    } catch {
      /* ignore */
    }
  }, [achievementId, isBatch, soundEnabled])

  if (!isBatch && !def) return null

  const title = isBatch
    ? `${batchCount} новых достижений`
    : def?.title ?? 'Достижение'
  const subtitle = isBatch
    ? [
        batchXp ? `⭐ +${batchXp}` : null,
        batchDiamonds ? `+${batchDiamonds} ${DIAMOND}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : [
        def?.xpReward ? `⭐ +${def.xpReward}` : null,
        def?.diamondReward ? `+${def.diamondReward} ${DIAMOND}` : null,
      ]
        .filter(Boolean)
        .join(' · ')

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-3 z-[90] flex justify-center px-3"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl bg-ink px-3 py-2.5 text-white shadow-lg ring-1 ring-white/10 animate-achievement-toast">
        <button
          type="button"
          onClick={() => {
            onOpen?.()
            onClose()
          }}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          aria-label={
            isBatch
              ? `Разблокировано ${batchCount} достижений`
              : `Достижение: ${title}`
          }
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg"
            aria-hidden
          >
            {isBatch ? '🏆' : def?.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-white/55">
              {isBatch ? 'Пачка ачивок' : 'Достижение'}
            </span>
            <span className="mt-0.5 block truncate text-sm font-extrabold">
              {isBatch ? title : `«${title}»`}
            </span>
            {subtitle ? (
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-white/65">
                {subtitle}
              </span>
            ) : null}
          </span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-white/45 hover:bg-white/10 hover:text-white"
          aria-label="Закрыть"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

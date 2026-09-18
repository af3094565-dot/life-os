import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { getAchievementDefinition } from '../../lib/achievements'

type Props = { achievementId: string | null; onClose: () => void; onOpen?: () => void }
/** Non-blocking, silent, once-per-day celebration; never steals focus. */
export function AchievementUnlockModal({ achievementId, onClose, onOpen }: Props) {
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])
  useEffect(() => {
    if (!achievementId) return
    const timer = window.setTimeout(() => close.current(), 6000)
    return () => window.clearTimeout(timer)
  }, [achievementId])
  const badge = achievementId ? getAchievementDefinition(achievementId) : null
  if (!badge) return null
  return <div className="story-celebration" role="status" aria-live="polite"><span aria-hidden>{badge.icon}</span><button type="button" onClick={() => { onOpen?.(); onClose() }}><small>МАЛЕНЬКАЯ ПОБЕДА</small><strong>{badge.title}</strong><span>{badge.description}</span></button><button type="button" className="story-celebration-close" aria-label="Закрыть поздравление" onClick={onClose}><X size={16} /></button></div>
}

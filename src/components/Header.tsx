import { useState } from 'react'
import { CalendarCheck, Flame } from 'lucide-react'
import { avatarLetter } from '../lib/auth'
import { DIAMOND, ECONOMY, formatDiamonds, type DiamondTx } from '../lib/economy'
import { DiamondHistoryModal } from './DiamondHistoryModal'

type Props = {
  greeting: string
  subtitle: string
  streak: number
  diamonds: number
  visitStreak?: number
  diamondHistory?: DiamondTx[]
  userName?: string
}

export function Header({
  greeting,
  subtitle,
  streak,
  diamonds,
  visitStreak = 0,
  diamondHistory = [],
  userName = 'Гость',
}: Props) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const level = Math.max(1, Math.floor(diamonds / 100) + 1)
  const rank =
    level <= 1 ? 'Новичок' : level === 2 ? 'Исследователь' : level === 3 ? 'Строитель' : 'Мастер'
  const inCycle = visitStreak % ECONOMY.VISIT_STREAK_DAYS
  const toBonus =
    inCycle === 0 && visitStreak > 0
      ? ECONOMY.VISIT_STREAK_DAYS
      : ECONOMY.VISIT_STREAK_DAYS - inCycle

  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-[28px]">
          {greeting}
        </h1>
        <p className="mt-1 text-sm font-medium text-muted">{subtitle}</p>
      </div>

      <div
        data-tour="header-economy"
        className="flex flex-wrap items-center gap-2.5 animate-fade-up"
        style={{ animationDelay: '80ms' }}
      >
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-sm font-bold text-ink shadow-sm ring-1 ring-sky-100 transition hover:bg-sky-100"
          title={`${formatDiamonds(diamonds)} · история`}
          aria-label={`Алмазы: ${diamonds}. Открыть историю`}
        >
          <span aria-hidden>{DIAMOND}</span>
          {diamonds}
        </button>
        <div
          className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-bold shadow-sm ring-1 ring-line"
          title="Серия привычек"
        >
          <Flame size={16} className="text-orange-500" fill="currentColor" />
          {streak}
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-bold shadow-sm ring-1 ring-line"
          title={`Заходы подряд: ${visitStreak}. Через ${toBonus} дн. бонус +${formatDiamonds(ECONOMY.VISIT_STREAK_BONUS)}`}
        >
          <CalendarCheck size={16} className="text-emerald-600" />
          {visitStreak}/{ECONOMY.VISIT_STREAK_DAYS}
        </div>
        <div className="rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-ink shadow-sm ring-1 ring-line">
          Уровень {level}: {rank}
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white"
          title={userName}
        >
          {avatarLetter(userName)}
        </div>
      </div>

      <DiamondHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        diamonds={diamonds}
        history={diamondHistory}
      />
    </header>
  )
}

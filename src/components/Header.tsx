import type { DayCharge } from '../lib/dayCharge'
import { EnergyMeter } from './EnergyMeter'
import { useState } from 'react'
import { CalendarCheck, Flame } from 'lucide-react'
import { avatarLetter } from '../lib/auth'
import { ECONOMY, type DiamondTx } from '../lib/economy'
import { DiamondHistoryModal } from './DiamondHistoryModal'

type Props = {
  greeting: string
  subtitle: string
  streak: number
  diamonds: number
  dailyCharge: DayCharge
  visitStreak?: number
  diamondHistory?: DiamondTx[]
  userName?: string
}

export function Header({
  greeting,
  subtitle,
  streak,
  diamonds,
  dailyCharge,
  visitStreak = 0,
  diamondHistory = [],
  userName = 'Гость',
}: Props) {
  const [historyOpen, setHistoryOpen] = useState(false)

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
          className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-ink shadow-sm ring-1 ring-emerald-100 transition hover:bg-emerald-100"
          title={`Энергия: ${diamonds}. Выполнено ${dailyCharge.done} из ${dailyCharge.total} дел.`}
          aria-label={`Энергия ${dailyCharge.percent}%. Открыть правила и историю`}
        >
          <EnergyMeter value={dailyCharge.percent} />
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
          title={`Дней подряд в приложении: ${visitStreak}`}
        >
          <CalendarCheck size={16} className="text-emerald-600" />
          {visitStreak}/{ECONOMY.VISIT_STREAK_DAYS}
        </div>
        <div className="rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-ink shadow-sm ring-1 ring-line">
          Каждый шаг важен
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
        dailyCharge={dailyCharge}
      />
    </header>
  )
}

import { Crown } from 'lucide-react'

type Props = {
  feature: 'goals' | 'quests' | 'life-map'
  onBuy: () => void
}

const COPY = {
  goals: {
    emoji: '🎯',
    title: 'Цели',
    text: 'С помощью целей ты превращаешь желания в конкретные результаты — и видишь, какие привычки к ним ведут.',
  },
  quests: {
    emoji: '⚔',
    title: 'Квесты',
    text: 'Квест — это испытание на срок: ставка в алмазах, привычка или список дел и награда за победу.',
  },
  'life-map': {
    emoji: '🧭',
    title: 'Карта жизни',
    text: 'Восемь сфер жизни. Выбери, что улучшить — и система поможет связать сферу с целью и привычками.',
  },
} as const

export function SubscriptionPaywall({ feature, onBuy }: Props) {
  const copy = COPY[feature]

  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-2xl bg-surface px-6 py-12 text-center shadow-[0_1px_3px_rgba(26,26,46,0.04)] ring-1 ring-line animate-fade-up">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-2xl">
        {copy.emoji}
      </div>
      <h2 className="text-xl font-extrabold text-ink">{copy.title}</h2>
      <p className="mt-2 max-w-sm text-sm font-medium leading-relaxed text-muted">
        {copy.text}
      </p>
      <p className="mt-3 text-sm font-bold text-brand">Это функция Pro</p>

      <div className="mt-6 w-full max-w-xs rounded-2xl bg-canvas p-4 text-left ring-1 ring-line">
        <div className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Crown size={16} className="text-brand" />
          Life OS Pro
        </div>
        <p className="mt-1 text-xs font-medium text-muted">
          Тестовый режим: оплата не нужна — просто попробуй.
        </p>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-2xl font-extrabold text-ink">0 ₽</span>
          <span className="text-xs font-semibold text-muted">/ тест</span>
        </div>
        <button
          type="button"
          onClick={onBuy}
          className="mt-4 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-brand-deep"
        >
          Попробовать Pro
        </button>
      </div>
    </div>
  )
}

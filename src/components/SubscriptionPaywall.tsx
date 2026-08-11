import { Crown, Lock } from 'lucide-react'

type Props = {
  feature: 'goals' | 'quests' | 'life-map'
  onBuy: () => void
}

const COPY = {
  goals: {
    title: 'Цели — по подписке',
    text: 'Создавай цели, матрицы и отслеживай прогресс с подпиской Life OS Pro.',
  },
  quests: {
    title: 'Квесты — по подписке',
    text: 'Каталог контрактов, свои квесты и обмен — доступны с подпиской.',
  },
  'life-map': {
    title: 'Карта жизни — по подписке',
    text: 'Колесо баланса, аспекты и цели карты жизни доступны с подпиской Life OS Pro.',
  },
} as const

export function SubscriptionPaywall({ feature, onBuy }: Props) {
  const copy = COPY[feature]

  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-2xl bg-surface px-6 py-12 text-center shadow-[0_1px_3px_rgba(26,26,46,0.04)] ring-1 ring-line animate-fade-up">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Lock size={26} />
      </div>
      <h2 className="text-xl font-extrabold text-ink">{copy.title}</h2>
      <p className="mt-2 max-w-sm text-sm font-medium text-muted">{copy.text}</p>

      <div className="mt-6 w-full max-w-xs rounded-2xl bg-canvas p-4 text-left ring-1 ring-line">
        <div className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Crown size={16} className="text-brand" />
          Life OS Pro
        </div>
        <p className="mt-1 text-xs font-medium text-muted">
          Тестовый режим: оплата не требуется — нажми «Купить».
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
          Купить подписку
        </button>
      </div>
    </div>
  )
}

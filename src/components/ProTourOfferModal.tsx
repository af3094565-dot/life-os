import { GraduationCap } from 'lucide-react'

type Props = {
  open: boolean
  userName: string
  onStart: () => void
  onSkip: () => void
}

export function ProTourOfferModal({ open, userName, onStart, onSkip }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-tour-offer-title"
        className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl ring-1 ring-line animate-fade-up"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <GraduationCap size={24} />
        </div>
        <h2 id="pro-tour-offer-title" className="text-xl font-extrabold text-ink">
          Обучение Pro-разделам
        </h2>
        <p className="mt-2 text-sm font-medium text-muted">
          {userName}, подписка активна. Пройдём карту жизни, способы создания целей
          и квесты — что куда отображается и как разделы связаны.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onStart}
            className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-deep"
          >
            Продолжить обучение
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 rounded-xl bg-canvas px-4 py-2.5 text-sm font-extrabold text-ink ring-1 ring-line hover:bg-surface"
          >
            Пропустить
          </button>
        </div>
      </div>
    </div>
  )
}

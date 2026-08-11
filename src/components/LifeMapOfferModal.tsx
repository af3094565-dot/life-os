import { useState } from 'react'
import { CircleDot } from 'lucide-react'

type Props = {
  open: boolean
  userName: string
  onAccept: (addToMoodboard: boolean) => void
  onDefer: () => void
}

export function LifeMapOfferModal({ open, userName, onAccept, onDefer }: Props) {
  const [addToMoodboard, setAddToMoodboard] = useState(false)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="life-map-offer-title"
        className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl ring-1 ring-line animate-fade-up"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <CircleDot size={24} />
        </div>
        <h2 id="life-map-offer-title" className="text-xl font-extrabold text-ink">
          Создать колесо баланса?
        </h2>
        <p className="mt-2 text-sm font-medium text-muted">
          {userName}, карта жизни с колесом баланса поможет увидеть сферы и выбрать
          первые привычки. Если откажешься — карта и цели пока не создадутся; можно
          вернуться позже.
        </p>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-canvas px-3 py-3 ring-1 ring-line">
          <input
            type="checkbox"
            checked={addToMoodboard}
            onChange={(e) => setAddToMoodboard(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--brand,#7c3aed)]"
          />
          <span>
            <span className="block text-sm font-bold text-ink">Добавить на мудборд?</span>
            <span className="mt-0.5 block text-[12px] font-medium text-muted">
              Центр и 8 аспектов появятся стикерами со стрелками
            </span>
          </span>
        </label>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={() => onAccept(addToMoodboard)}
            className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-deep"
          >
            Создать сейчас
          </button>
          <button
            type="button"
            onClick={onDefer}
            className="flex-1 rounded-xl bg-canvas px-4 py-2.5 text-sm font-extrabold text-ink ring-1 ring-line hover:bg-surface"
          >
            Позже
          </button>
        </div>
      </div>
    </div>
  )
}

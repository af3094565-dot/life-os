import { ArrowLeft } from 'lucide-react'

type Props = {
  label?: string | null
  onBack: () => void
  className?: string
}

export function BackBar({ label = 'Назад', onBack, className = '' }: Props) {
  if (!label) return null
  return (
    <button
      type="button"
      onClick={onBack}
      className={`mb-4 inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-bold text-muted transition hover:bg-canvas hover:text-ink ${className}`}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  )
}

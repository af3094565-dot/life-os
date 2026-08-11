import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  style?: CSSProperties
} & Pick<HTMLAttributes<HTMLDivElement>, 'data-tour'>

export function Card({ children, className = '', style, ...rest }: Props) {
  return (
    <div
      style={style}
      className={`rounded-2xl bg-surface p-5 shadow-[0_1px_3px_rgba(26,26,46,0.04)] ring-1 ring-line ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

export function ProgressBar({
  value,
  className = '',
  barClassName = 'bg-brand',
}: {
  value: number
  className?: string
  barClassName?: string
}) {
  return (
    <div className={`h-2.5 overflow-hidden rounded-full bg-brand-soft ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${barClassName}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function ProgressRing({
  value,
  size = 88,
  stroke = 8,
  color = '#7b3fe4',
  label,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  label?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(100, value) / 100) * c

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#efe7ff"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold text-ink">{Math.round(value)}%</span>
        {label && <span className="text-[10px] font-medium text-muted">{label}</span>}
      </div>
    </div>
  )
}

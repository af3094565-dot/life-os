import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

const base =
  'w-full rounded-xl border border-line bg-canvas px-4 py-3.5 text-base font-semibold text-ink outline-none placeholder:font-medium placeholder:text-muted focus:ring-2 focus:ring-brand/30 min-h-[48px]'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  hint?: string
}

/**
 * Mobile-friendly text field. Never autofocuses.
 * Prefer chips/pickers over typing when possible.
 */
export function MobileInput({
  label,
  error,
  hint,
  className = '',
  inputMode = 'text',
  enterKeyHint = 'done',
  autoComplete = 'off',
  ...rest
}: FieldProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      )}
      <input
        {...rest}
        inputMode={inputMode}
        enterKeyHint={enterKeyHint}
        autoComplete={autoComplete}
        autoFocus={false}
        className={`${base} ${error ? 'border-danger ring-2 ring-danger/30' : ''} ${className}`}
      />
      {error && <span className="mt-1 block text-sm font-semibold text-danger">{error}</span>}
      {hint && !error && (
        <span className="mt-1 block text-xs font-medium text-muted">{hint}</span>
      )}
    </label>
  )
}

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  error?: string
}

export function MobileTextarea({
  label,
  error,
  className = '',
  enterKeyHint = 'done',
  ...rest
}: AreaProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      )}
      <textarea
        {...rest}
        enterKeyHint={enterKeyHint}
        autoFocus={false}
        className={`${base} min-h-[96px] resize-y ${error ? 'border-danger ring-2 ring-danger/30' : ''} ${className}`}
      />
      {error && <span className="mt-1 block text-sm font-semibold text-danger">{error}</span>}
    </label>
  )
}

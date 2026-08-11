import { useEffect, useState, type FormEvent } from 'react'
import { Sparkles } from 'lucide-react'
import type { AuthState } from '../hooks/useAuth'
import { ensureOwnerAccount, OWNER_ACCOUNT } from '../lib/auth'

type Mode = 'register' | 'login'

type Props = {
  auth: AuthState
  onRegistered: () => void
}

export function AuthPage({ auth, onRegistered }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState<string>(OWNER_ACCOUNT.email)
  const [password, setPassword] = useState<string>(OWNER_ACCOUNT.password)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void ensureOwnerAccount()
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'register') {
        const result = await auth.register({ name, email, password })
        if (!result.ok) {
          setError(result.reason)
          return
        }
        onRegistered()
      } else {
        const result = await auth.login({ email, password })
        if (!result.ok) {
          setError(result.reason)
          return
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 20% 10%, rgba(123,63,228,0.14), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(34,197,94,0.1), transparent 50%)',
        }}
      />

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-sm animate-pulse-soft">
            <Sparkles size={22} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Life OS</h1>
          <p className="mt-2 text-sm font-medium text-muted">
            {mode === 'register'
              ? 'Создай аккаунт и начни строить свою систему жизни'
              : 'Войди, чтобы продолжить'}
          </p>
        </div>

        <div className="rounded-2xl bg-surface p-6 shadow-[0_1px_3px_rgba(26,26,46,0.06)] ring-1 ring-line">
          <div className="mb-5 flex rounded-xl bg-canvas p-1">
            {(
              [
                ['register', 'Регистрация'],
                ['login', 'Вход'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setMode(id)
                  setError('')
                  if (id === 'login') {
                    setEmail(OWNER_ACCOUNT.email)
                    setPassword(OWNER_ACCOUNT.password)
                  } else {
                    setEmail('')
                    setPassword('')
                    setName('')
                  }
                }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
                  mode === id ? 'bg-surface text-brand shadow-sm' : 'text-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3.5">
            {mode === 'register' && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-muted">Имя</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Как к тебе обращаться"
                  className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm font-medium text-ink outline-none ring-brand focus:ring-2"
                  required
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-muted">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm font-medium text-ink outline-none ring-brand focus:ring-2"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-muted">Пароль</span>
              <input
                type="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm font-medium text-ink outline-none ring-brand focus:ring-2"
                required
                minLength={6}
              />
            </label>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-brand-deep disabled:opacity-60"
            >
              {busy
                ? 'Подождите…'
                : mode === 'register'
                  ? 'Зарегистрироваться'
                  : 'Войти'}
            </button>
          </form>

          {mode === 'login' && (
            <p className="mt-4 rounded-xl bg-canvas px-3 py-2.5 text-center text-xs font-medium text-muted">
              Логин: <span className="font-bold text-ink">{OWNER_ACCOUNT.email}</span>
              <br />
              Пароль: <span className="font-bold text-ink">{OWNER_ACCOUNT.password}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

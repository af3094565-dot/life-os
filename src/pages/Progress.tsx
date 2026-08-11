import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Header } from '../components/Header'
import { Card, ProgressBar } from '../components/ui'
import { MONTH_NAMES } from '../data/seed'
import type { LifeOSState } from '../hooks/useLifeOS'
import {
  DIAMOND,
  formatDiamonds,
  formatTxAmount,
  formatTxTime,
} from '../lib/economy'

type Props = { state: LifeOSState; userName: string }

export function ProgressPage({ state, userName }: Props) {
  const chartData = state.dailyProgress.map((d) => ({
    name: String(d.day),
    pct: d.pct,
    done: d.done,
  }))

  const ranked = [...state.habitStats].sort((a, b) => b.pct - a.pct)
  const best = ranked[0]
  const insights = [
    best
      ? `Лучшая привычка месяца — «${best.name}» (${best.pct}%).`
      : null,
    state.weakHabits[0]
      ? `Нужно внимание: «${state.weakHabits[0].name}» — ${state.weakHabits[0].attentionPct}% за прошедшие дни (${state.weakHabits[0].attentionMisses} пропусков).`
      : 'Пропусков нет — отличный ритм.',
    `Месячный прогресс: ${state.monthPct}% (${state.monthDone} из ${state.monthTotal}).`,
  ].filter(Boolean) as string[]

  return (
    <div>
      <Header
        greeting="Прогресс"
        subtitle={`Аналитика за ${MONTH_NAMES[state.month].toLowerCase()} ${state.year}`}
        streak={state.streak}
        diamonds={state.diamonds}
        visitStreak={state.visitStreak}
        diamondHistory={state.diamondHistory ?? []}
        userName={userName}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Отметок за месяц', value: String(state.monthDone) },
          { label: 'Прогресс месяца', value: `${state.monthPct}%` },
          { label: 'Алмазы', value: formatDiamonds(state.diamonds) },
          {
            label: 'Активных привычек',
            value: String(state.habits.length),
          },
        ].map((m, i) => (
          <Card key={m.label} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{m.label}</p>
            <p className="mt-2 text-3xl font-extrabold text-ink">{m.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card className="animate-fade-up" style={{ animationDelay: '100ms' }}>
          <h3 className="mb-4 text-base font-extrabold text-ink">Активность по дням</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pctFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7b3fe4" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#7b3fe4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceef3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #eceef3',
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value}%`, 'Прогресс']}
                />
                <Area
                  type="monotone"
                  dataKey="pct"
                  stroke="#7b3fe4"
                  strokeWidth={2.5}
                  fill="url(#pctFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="animate-fade-up" style={{ animationDelay: '140ms' }}>
          <h3 className="mb-4 text-base font-extrabold text-ink">Инсайты</h3>
          <ul className="space-y-3">
            {insights.map((t) => (
              <li
                key={t}
                className="rounded-xl bg-brand-soft/60 px-3 py-3 text-sm font-medium leading-relaxed text-ink"
              >
                {t}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-5 animate-fade-up" style={{ animationDelay: '160ms' }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-extrabold text-ink">История алмазов</h3>
          <span className="text-xs font-bold text-muted">
            Баланс {DIAMOND} {state.diamonds}
          </span>
        </div>
        {(state.diamondHistory ?? []).length === 0 ? (
          <p className="text-sm font-medium text-muted">
            Пока пусто. Начисления и оплаты появятся здесь. Также можно открыть историю, нажав на
            алмазы в шапке.
          </p>
        ) : (
          <ul className="space-y-1">
            {(state.diamondHistory ?? []).slice(0, 12).map((tx) => {
              const earn = tx.amount > 0
              return (
                <li
                  key={tx.id}
                  className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition hover:bg-canvas"
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                      earn
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                        : 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
                    }`}
                  >
                    {earn ? '+' : '−'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{tx.label}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-muted">
                      {formatTxTime(tx.at)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-extrabold tabular-nums ${
                      earn ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatTxAmount(tx.amount)} {DIAMOND}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        {(state.diamondHistory ?? []).length > 12 && (
          <p className="mt-3 text-center text-xs font-medium text-muted">
            Полная история — нажми на {DIAMOND} в шапке
          </p>
        )}
      </Card>

      <Card className="mt-5 animate-fade-up" style={{ animationDelay: '180ms' }}>
        <h3 className="mb-4 text-base font-extrabold text-ink">По привычкам</h3>
        <ul className="space-y-4">
          {state.habitStats
            .slice()
            .sort((a, b) => b.pct - a.pct)
            .map((h) => (
              <li key={h.id}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {h.emoji} {h.name}
                  </span>
                  <span className="text-xs font-bold text-muted">
                    {h.done}/{state.dayCount} · {h.pct}%
                  </span>
                </div>
                <ProgressBar
                  value={h.pct}
                  barClassName={h.pct < 60 ? 'bg-warn' : h.pct >= 80 ? 'bg-success' : 'bg-brand'}
                />
              </li>
            ))}
        </ul>
      </Card>
    </div>
  )
}

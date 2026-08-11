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
import { NextActionCard } from '../components/NextActionCard'
import { EmptyState } from '../components/EmptyState'
import { Card, ProgressBar } from '../components/ui'
import type { PageId } from '../data/seed'
import { MONTH_NAMES } from '../data/seed'
import type { LifeOSState } from '../hooks/useLifeOS'
import {
  DIAMOND,
  formatDiamonds,
  formatTxAmount,
  formatTxTime,
} from '../lib/economy'

type Props = {
  state: LifeOSState
  userName: string
  onNavigate?: (page: PageId, opts?: { entityId?: string }) => void
}

export function ProgressPage({ state, userName, onNavigate }: Props) {
  const chartData = state.dailyProgress.map((d) => ({
    name: String(d.day),
    pct: d.pct,
    done: d.done,
  }))

  const ranked = [...state.habitStats].sort((a, b) => b.pct - a.pct)
  const best = ranked[0]
  const weak = state.weakHabits[0]
  const activeGoals = state.customGoalStats.filter((g) => g.status === 'active').length
  const goalsTotal =
    activeGoals + state.customGoalStats.filter((g) => g.status !== 'active').length

  return (
    <div className="pb-24 md:pb-0">
      <div className="mb-5 md:hidden">
        <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Прогресс</h1>
        {state.streak > 0 && (
          <p className="mt-2 text-sm font-bold text-orange-700">🔥 {state.streak} дн. подряд</p>
        )}
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-extrabold text-ink">Сегодня</p>
                <p className="mt-0.5 text-xs font-medium text-muted">
                  {state.todayDone} из {state.todayTotal}
                </p>
              </div>
              <p className="text-2xl font-extrabold text-ink">{state.todayPct}%</p>
            </div>
            <ProgressBar value={state.todayPct} className="mt-3" />
          </div>
          <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
            <p className="text-sm font-extrabold text-ink">Привычки</p>
            <p className="mt-1 text-lg font-extrabold text-ink">
              {best ? `${best.pct}% лучшая` : 'Пока рано'}
            </p>
            <p className="mt-0.5 text-xs font-medium text-muted">
              {weak ? `Проседает: ${weak.name}` : 'Всё стабильно'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onNavigate?.('goals')}
              className="rounded-2xl bg-surface p-4 text-left ring-1 ring-line active:scale-[0.99]"
            >
              <p className="text-xs font-bold uppercase text-muted">Цели</p>
              <p className="mt-1 text-lg font-extrabold text-ink">
                {activeGoals} / {goalsTotal || activeGoals || '—'}
              </p>
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('achievements')}
              className="rounded-2xl bg-surface p-4 text-left ring-1 ring-line active:scale-[0.99]"
            >
              <p className="text-xs font-bold uppercase text-muted">Достижения</p>
              <p className="mt-1 text-lg font-extrabold text-ink">
                🏆 {state.unlockedAchievementCount} / {state.totalAchievements}
              </p>
            </button>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
      <Header
        greeting="Прогресс"
        subtitle="У меня получается? · сначала вывод, потом графики"
        streak={state.streak}
        diamonds={state.diamonds}
        visitStreak={state.visitStreak}
        diamondHistory={state.diamondHistory ?? []}
        userName={userName}
      />
      </div>

      <Card className="mb-5 hidden animate-fade-up md:block">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
          Твой результат
        </p>
        <p className="mt-1 text-5xl font-extrabold tracking-tight text-ink">
          {state.todayPct}%
        </p>
        <p className="mt-1 text-sm font-medium text-muted">
          Сегодня · {state.todayDone} из {state.todayTotal}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-emerald-50 px-3 py-3 ring-1 ring-emerald-100">
            <p className="text-[11px] font-bold uppercase text-emerald-800">
              Получается лучше всего
            </p>
            <p className="mt-1 text-sm font-extrabold text-ink">
              {best ? `🏆 ${best.emoji} ${best.name}` : 'Пока рано судить'}
            </p>
            {best && (
              <p className="mt-0.5 text-xs font-medium text-muted">{best.pct}% за месяц</p>
            )}
          </div>
          <div className="rounded-xl bg-amber-50 px-3 py-3 ring-1 ring-amber-100">
            <p className="text-[11px] font-bold uppercase text-amber-800">
              Что проседает
            </p>
            <p className="mt-1 text-sm font-extrabold text-ink">
              {weak ? `⚠ ${weak.emoji} ${weak.name}` : 'Всё стабильно'}
            </p>
            {weak && (
              <p className="mt-0.5 text-xs font-medium text-muted">
                {weak.attentionMisses} пропусков
              </p>
            )}
          </div>
        </div>
      </Card>

      {weak && onNavigate ? (
        <NextActionCard
          className="mb-5"
          title="Что сделать"
          action={`Добавить «${weak.name}» в фокус сегодня`}
          related="Слабое место по прогрессу"
          cta="Открыть привычку"
          onAction={() => onNavigate('habits', { entityId: weak.id })}
          icon={weak.emoji}
        />
      ) : state.habitStats.length === 0 ? (
        <div className="mb-5">
          <EmptyState
            emoji="📊"
            title="Прогресс появится после первых отметок"
            description="Выполни привычку сегодня — здесь станет видно, что получается и что проседает."
            cta="К привычкам"
            onCta={() => onNavigate?.('habits')}
          />
        </div>
      ) : null}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Неделя', value: `${state.todayPct}%` },
          { label: 'Месяц', value: `${state.monthPct}%` },
          { label: 'Алмазы', value: formatDiamonds(state.diamonds) },
          { label: 'Привычек', value: String(state.habits.length) },
        ].map((m, i) => (
          <Card key={m.label} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{m.label}</p>
            <p className="mt-2 text-3xl font-extrabold text-ink">{m.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-5 animate-fade-up">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
          🏆 Achievement Progress
        </p>
        <p className="mt-1 text-2xl font-extrabold text-ink">
          {state.unlockedAchievementCount} / {state.totalAchievements}
        </p>
        <ProgressBar
          value={
            state.totalAchievements
              ? (state.unlockedAchievementCount / state.totalAchievements) * 100
              : 0
          }
          className="mt-3"
        />
        <p className="mt-2 text-xs font-medium text-muted">
          +{state.achievements.daily.unlocks.length} сегодня · ⭐{' '}
          {state.achievements.achievementXp} Achievement XP
        </p>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('achievements')}
            className="mt-3 rounded-xl bg-brand-soft px-3 py-2 text-xs font-extrabold text-brand"
          >
            Открыть достижения
          </button>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card className="animate-fade-up" style={{ animationDelay: '100ms' }}>
          <h3 className="mb-4 text-base font-extrabold text-ink">
            Активность · {MONTH_NAMES[state.month]}
          </h3>
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
            {[
              best
                ? `Лучшая привычка месяца — «${best.name}» (${best.pct}%).`
                : null,
              weak
                ? `Нужно внимание: «${weak.name}» — ${weak.attentionPct}% (${weak.attentionMisses} пропусков).`
                : 'Пропусков нет — отличный ритм.',
              `Месячный прогресс: ${state.monthPct}% (${state.monthDone} из ${state.monthTotal}).`,
            ]
              .filter(Boolean)
              .map((t) => (
                <li
                  key={t as string}
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
            Пока пусто. Начисления появятся после выполнения привычек.
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
      </Card>

      <Card className="mt-5 animate-fade-up" style={{ animationDelay: '180ms' }}>
        <h3 className="mb-4 text-base font-extrabold text-ink">По привычкам</h3>
        {state.habitStats.length === 0 ? (
          <p className="text-sm font-medium text-muted">Привычек пока нет.</p>
        ) : (
          <ul className="space-y-4">
            {state.habitStats
              .slice()
              .sort((a, b) => b.pct - a.pct)
              .map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="mb-1.5 flex w-full items-center justify-between gap-2 text-left"
                    onClick={() => onNavigate?.('habits', { entityId: h.id })}
                  >
                    <span className="text-sm font-semibold text-ink">
                      {h.emoji} {h.name}
                    </span>
                    <span className="text-xs font-bold text-muted">
                      {h.done}/{state.dayCount} · {h.pct}%
                    </span>
                  </button>
                  <ProgressBar
                    value={h.pct}
                    barClassName={
                      h.pct < 60 ? 'bg-warn' : h.pct >= 80 ? 'bg-success' : 'bg-brand'
                    }
                  />
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

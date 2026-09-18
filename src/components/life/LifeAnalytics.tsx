import { reductionSummary } from "../../lib/life/patterns";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LifeOSState } from "../../hooks/useLifeOS";
import type { Sphere } from "../../lib/life/types";
import { dateKey } from "../../lib/life/model";
import { dateRange, duration, eventPart } from "../../lib/life/selectors";
import { lifeInsights } from "../../lib/life/insights";
import { calendarMetric, type CalendarMetric } from "../../lib/life/metrics";
import { Card } from "../ui";
export function LifeAnalytics({ state }: { state: LifeOSState }) {
  const [period, setPeriod] = useState(28);
  const [sphere, setSphere] = useState<Sphere | "">("");
  const [metric, setMetric] = useState<CalendarMetric>("rating");
  const today = dateKey();
  const habits = state.habitsAll.filter(
    (h) =>
      !sphere ||
      (h.sphere ??
        (h.lifeArea ? state.life.areaSpheres[h.lifeArea] : undefined)) ===
        sphere,
  );
  const dates = useMemo(() => dateRange(today, period), [today, period]);
  const filteredLife = useMemo(
    () => ({
      ...state.life,
      events: state.life.events.filter((e) => !sphere || e.sphere === sphere),
      marks: state.life.marks.filter(
        (m) =>
          !sphere ||
          state.life.indicators.find((i) => i.id === m.indicatorId)?.sphere ===
            sphere,
      ),
    }),
    [state.life, sphere],
  );
  const data = dates.map((date) => ({
    date,
    value: calendarMetric(filteredLife, habits, date, metric),
  }));
  const known = data.filter((d) => d.value !== undefined).length;
  const insights = lifeInsights(
    state.life,
    state.habitsAll,
    today,
    period,
    sphere || undefined,
  );
  const totalMinutes = dates.reduce(
    (sum, date) =>
      sum +
      filteredLife.events
        .filter((e) => !e.planned)
        .reduce((s, e) => {
          const part = eventPart(e, date);
          return s + (part ? duration(part) : 0);
        }, 0),
    0,
  );
  const metrics: [CalendarMetric, string][] = [
    ["rating", "Моя оценка"],
    ["analysis", "Анализ дня"],
    ["mood", "Настроение"],
    ["felt-energy", "Энергия по ощущениям"],
    ["sleep", "Сон"],
    ["habits", "Привычки"],
  ];
  return (
    <Card className="mb-4">
      <h3 className="font-extrabold">Жизнь за период</h3>
      <p className="life-muted mt-1">
        Динамика по твоим записям. Пробелы не заменяются нулями.
      </p>
      <div className="life-form mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label>
          Период
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
          >
            {[7, 28, 90].map((n) => (
              <option key={n} value={n}>
                {n} дней
              </option>
            ))}
          </select>
        </label>
        <label>
          Сфера
          <select
            value={sphere}
            onChange={(e) => setSphere(e.target.value as Sphere | "")}
          >
            <option value="">Все сферы</option>
            {Object.entries(state.life.sphereNames).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Показатель
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as CalendarMetric)}
          >
            {metrics.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <span>
          Дней с данными:{" "}
          <b>
            {known} / {period}
          </b>
        </span>
        <span>
          Записанное время: <b>{Math.round(totalMinutes)} мин</b>
        </span>
      </div>
      {known >= 2 ? (
        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid stroke="#eceef3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => String(d).slice(5)}
                minTickGap={28}
              />
              <YAxis width={36} />
              <Tooltip />
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey="value"
                name={metrics.find(([k]) => k === metric)?.[1]}
                stroke="#7b3fe4"
                fill="#f3ecff"
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-4 life-muted">
          Для графика нужны записи хотя бы за два дня.
        </p>
      )}
      {habits.some((h) => h.intent === "reduce") && (
        <section className="mt-5">
          <h4 className="font-bold">Привычки, которые сокращаю</h4>
          <p className="life-muted">
            За {period} дней. День без записи не считается днём без эпизодов.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {habits
              .filter((h) => h.intent === "reduce")
              .map((h) => {
                const summary = reductionSummary(state.life, h, today, period);
                const confirmed = dates.filter(
                  (d) =>
                    h.records?.[d]?.confirmed &&
                    h.records[d].intent === "reduce",
                ).length;
                return (
                  <article
                    key={h.id}
                    className="min-w-0 rounded-xl bg-canvas p-3"
                  >
                    <p className="break-words text-sm font-bold">
                      {h.emoji} {h.name}
                    </p>
                    <p className="mt-2 text-sm">
                      Эпизодов: {summary.count} · дней с эпизодами:{" "}
                      {summary.days}
                    </p>
                    <p className="life-muted">
                      Подтверждено дней: {confirmed} / {period}
                    </p>
                    {summary.count > 0 && (
                      <>
                        <p className="life-muted">
                          {summary.durationCount
                            ? `Средний эпизод: ${summary.averageMinutes} мин · с длительностью: ${summary.durationCount}`
                            : "Длительность не указана"}
                          {summary.typical
                            ? ` · время в записях: около ${summary.typical}`
                            : ""}
                        </p>
                        <p className="life-muted">
                          {summary.weekdays.join(" · ")}
                        </p>
                        {summary.contexts.length > 0 && (
                          <p className="life-muted break-words">
                            Контекст: {summary.contexts.join(", ")}
                          </p>
                        )}
                      </>
                    )}
                    {h.alternative && (
                      <p className="mt-2 text-xs text-muted">
                        Вариант замены: {h.alternative}
                      </p>
                    )}
                  </article>
                );
              })}
          </div>
        </section>
      )}
      {insights.length > 0 && (
        <section className="mt-5">
          <h4 className="font-bold">Что можно заметить</h4>
          <p className="life-muted">
            Это совпадения в записях, не доказанные причины.
          </p>
          {insights.map((i) => (
            <article key={i.id} className="mt-3 rounded-xl bg-canvas p-3">
              <p className="text-sm">{i.text}</p>
              <p className="mt-2 text-xs text-muted">
                {i.period} · наблюдений: {i.sample}
              </p>
              <button
                className="mt-1 min-h-11 text-xs text-brand"
                onClick={() =>
                  state.updateLife((l) => ({
                    ...l,
                    hiddenInsights: [...l.hiddenInsights, i.id],
                  }))
                }
              >
                Скрыть наблюдение
              </button>
            </article>
          ))}
        </section>
      )}
      {state.life.hiddenInsights.length > 0 && (
        <button
          className="mt-2 min-h-11 text-xs text-muted"
          onClick={() =>
            state.updateLife((l) => ({ ...l, hiddenInsights: [] }))
          }
        >
          Вернуть скрытые наблюдения
        </button>
      )}
      <details className="mt-4 life-muted">
        <summary>Данные за период</summary>
        <ul>
          {data
            .filter((d) => d.value !== undefined)
            .map((d) => (
              <li key={d.date}>
                {d.date}: {Math.round(d.value! * 10) / 10}
              </li>
            ))}
        </ul>
      </details>
    </Card>
  );
}

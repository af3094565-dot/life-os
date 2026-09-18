import type { Habit } from "../../data/seed";
import type { LifeData, Sphere } from "./types";
import { dateRange, duration } from "./selectors.ts";
import { indicatorValue } from "./metrics.ts";
export type Insight = {
  id: string;
  text: string;
  sample: number;
  period: string;
};
const mean = (values: number[]) =>
  values.reduce((s, v) => s + v, 0) / values.length;
export function lifeInsights(
  life: LifeData,
  habits: Habit[],
  end: string,
  count = 28,
  sphere?: Sphere,
): Insight[] {
  const dates = dateRange(end, count);
  const start = dates[0];
  const result: Insight[] = [];
  const period = `${start} — ${end}`;
  const events = life.events.filter(
    (e) =>
      !e.planned &&
      e.date >= start &&
      e.date <= end &&
      (!sphere || e.sphere === sphere),
  );
  const compare = (
    id: string,
    rows: { value: number; group: boolean }[],
    positive: string,
    negative: string,
  ) => {
    const a = rows.filter((r) => r.group).map((r) => r.value),
      b = rows.filter((r) => !r.group).map((r) => r.value);
    if (
      rows.length < 14 ||
      a.length < 5 ||
      b.length < 5 ||
      Math.abs(mean(a) - mean(b)) < 0.5
    )
      return;
    result.push({
      id,
      text: `${mean(a) > mean(b) ? positive : negative} Средние: ${mean(a).toFixed(1)} и ${mean(b).toFixed(1)}; ${a.length} и ${b.length} дней.`,
      sample: rows.length,
      period,
    });
  };
  if (!sphere || sphere === "base") {
    compare(
      "workout-rating",
      dates.flatMap((date) => {
        const value = life.days[date]?.rating;
        return value === undefined
          ? []
          : [
              {
                value,
                group:
                  events.some(
                    (e) => e.date === date && e.category === "workout",
                  ) ||
                  habits.some(
                    (h) => h.category === "workout" && h.completions[date],
                  ),
              },
            ];
      }),
      "В дни с записанной тренировкой твоя оценка дня была выше, чем в остальных оценённых днях.",
      "В дни с записанной тренировкой твоя оценка дня была ниже, чем в остальных оценённых днях.",
    );
    const sleepTarget = life.indicators.find((i) => i.id === "sleep")?.target;
    if (sleepTarget)
      compare(
        "sleep-energy",
        dates.flatMap((date) => {
          const sleep = indicatorValue(life, "sleep", date)?.value;
          const morning = life.marks.filter(
            (m) =>
              m.date === date &&
              m.indicatorId === "felt-energy" &&
              m.time &&
              m.time < "12:00",
          );
          return sleep === undefined || !morning.length
            ? []
            : [
                {
                  value: mean(morning.map((m) => m.value)),
                  group: sleep < sleepTarget,
                },
              ];
        }),
        "После сна короче твоего ориентира утренняя энергия в записях была выше.",
        "После сна короче твоего ориентира утренняя энергия в записях была ниже.",
      );
  }
  for (const h of habits.filter(
    (h) => h.intent === "reduce" && (!sphere || h.sphere === sphere),
  )) {
    const ep = events.filter((e) => e.habitId === h.id);
    const timed = ep.filter((e) => e.start);
    if (timed.length >= 5 && new Set(timed.map((e) => e.date)).size >= 4) {
      const late = timed.filter(
        (e) => e.start! >= "23:00" || e.start! < "02:00",
      );
      if (late.length / timed.length >= 0.6)
        result.push({
          id: `late-${h.id}`,
          text: `${h.name}: ${late.length} из ${timed.length} записанных эпизодов начались между 23:00 и 02:00.`,
          sample: timed.length,
          period,
        });
    }
    if (h.limit !== undefined && h.unit === "мин")
      compare(
        `mood-${h.id}`,
        dates.flatMap((date) => {
          const mood = indicatorValue(life, "mood", date)?.value;
          const confirmed = h.records?.[date];
          if (mood === undefined || !confirmed?.confirmed) return [];
          return [{ value: mood, group: confirmed.value > confirmed.target }];
        }),
        `В дни с ${h.name} дольше своего предела настроение в записях было выше.`,
        `В дни с ${h.name} дольше своего предела настроение в записях было ниже.`,
      );
  }
  if (count >= 28)
    for (const h of habits.filter(
      (h) => h.intent !== "reduce" && (!sphere || h.sphere === sphere),
    )) {
      const recent = dates.slice(-28);
      const groups = [recent.slice(0, 14), recent.slice(14)].map((ds) =>
        ds.filter((d) => h.records?.[d]?.confirmed || h.completions[d]),
      );
      if (groups.some((g) => g.length < 5)) continue;
      const rates = groups.map(
        (g) => g.filter((d) => h.completions[d]).length / g.length,
      );
      if (rates[1] - rates[0] >= 0.2)
        result.push({
          id: `regular-${h.id}`,
          text: `${h.name}: доля полных выполнений среди дней с отметками выросла с ${Math.round(rates[0] * 100)}% до ${Math.round(rates[1] * 100)}% за две половины последних четырёх недель.`,
          sample: groups[0].length + groups[1].length,
          period: `${recent[0]} — ${end}`,
        });
    }
  const growth = events.filter((e) => e.sphere === "growth");
  const totals = new Map<string, number>();
  for (const e of growth)
    totals.set(e.category, (totals.get(e.category) ?? 0) + duration(e));
  const top = [...totals].sort((a, b) => b[1] - a[1])[0];
  if (top && new Set(growth.map((e) => e.date)).size >= 7 && top[1] > 0) {
    const label =
      life.indicators.find((i) => i.id === top[0])?.name ??
      growth.find((e) => e.category === top[0])?.name ??
      top[0];
    result.push({
      id: "growth-time",
      text: `Больше всего записанного времени в сфере «Рост» за период: ${label} — ${Math.round(top[1])} мин.`,
      sample: new Set(growth.map((e) => e.date)).size,
      period,
    });
  }
  return result.filter((i) => !life.hiddenInsights.includes(i.id)).slice(0, 3);
}

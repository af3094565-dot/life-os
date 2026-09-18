import type { Habit } from "../../data/seed";
import { dateKey, shiftDate } from "./model.ts";
export function habitDay(h: Habit, date: string, today = dateKey()) {
  if (date > today || date < h.startDate)
    return { kind: "outside", ratio: 0 } as const;
  const r = h.records?.[date];
  if (r) {
    if (
      (r.intent ?? h.intent) === "reduce" &&
      r.confirmed &&
      h.limit === undefined
    )
      return { kind: "recorded", ratio: 0 } as const;
    const ratio =
      (r.intent ?? h.intent) === "reduce"
        ? r.confirmed && h.limit !== undefined
          ? r.value <= r.target
            ? 1
            : 0
          : 0
        : Math.min(1, r.value / Math.max(r.target, 1));
    return {
      kind: !r.confirmed
        ? "unknown"
        : ratio >= 1
          ? "done"
          : ratio > 0
            ? "partial"
            : "missed",
      ratio,
    } as const;
  }
  return {
    kind: h.completions[date] ? "done" : "unknown",
    ratio: h.completions[date] ? 1 : 0,
  } as const;
}
/** Mirror legacy boolean actions into dated records without inventing old timestamps. */
export function reconcileHabitRecords<T extends { habits: Habit[] }>(
  previous: T,
  next: T,
  now = new Date(),
): T {
  const today = dateKey(now);
  let changed = false;
  const habits = next.habits.map((h) => {
    const old = previous.habits.find((x) => x.id === h.id);
    let records = { ...h.records };
    let modified = false;
    for (const date of new Set([
      ...Object.keys(old?.completions ?? {}),
      ...Object.keys(h.completions),
    ])) {
      if (!!old?.completions[date] === !!h.completions[date]) {
        if (h.completions[date] && !records[date]) {
          records[date] = {
            value: old?.quantityTarget ?? h.quantityTarget ?? 1,
            target: old?.quantityTarget ?? h.quantityTarget ?? 1,
            confirmed: true,
            intent: "develop",
          };
          modified = true;
        }
        continue;
      }
      if (h.records?.[date] !== old?.records?.[date]) continue;
      records[date] = {
        value: h.completions[date]
          ? (records[date]?.target ?? h.quantityTarget ?? 1)
          : 0,
        target: records[date]?.target ?? h.quantityTarget ?? 1,
        confirmed: true,
        intent: "develop",
        at: date === today ? now.toISOString() : undefined,
      };
      modified = true;
    }
    if (modified) {
      changed = true;
      return { ...h, records };
    }
    return h;
  });
  return changed ? { ...next, habits } : next;
}
export function habitPeriod(h: Habit, from: string, to: string) {
  const end = to < dateKey() ? to : dateKey();
  const days: string[] = [];
  for (let d = from; d <= end; d = shiftDate(d, 1))
    if (d >= h.startDate) days.push(d);
  const done = days.filter((d) => habitDay(h, d).kind === "done").length;
  const known = days.filter(
    (d) => !["unknown", "outside"].includes(habitDay(h, d).kind),
  ).length;
  const buckets = new Map<string, string[]>();
  for (const d of days) {
    const date = new Date(`${d}T12:00:00`);
    const key = shiftDate(d, -((date.getDay() + 6) % 7));
    buckets.set(key, [...(buckets.get(key) ?? []), d]);
  }
  let expected = 0,
    credited = 0;
  for (const ds of buckets.values()) {
    const quota = Math.min(ds.length, h.timesPerWeek);
    expected += quota;
    credited += Math.min(
      quota,
      ds.filter((d) => habitDay(h, d).kind === "done").length,
    );
  }
  let run = 0,
    best = 0;
  if (h.timesPerWeek >= 7) {
    for (let d = h.startDate; d <= end; d = shiftDate(d, 1)) {
      if (habitDay(h, d).kind === "done") {
        run++;
        best = Math.max(best, run);
      } else if (d !== dateKey()) run = 0;
    }
  } else {
    const start = new Date(`${h.startDate}T12:00:00`);
    let week = shiftDate(h.startDate, -((start.getDay() + 6) % 7));
    for (; week <= end; week = shiftDate(week, 7)) {
      const ds = Array.from({ length: 7 }, (_, i) => shiftDate(week, i)).filter(
        (d) => d >= h.startDate && d <= end,
      );
      const count = ds.filter((d) => habitDay(h, d).kind === "done").length;
      const complete = count >= Math.min(7, h.timesPerWeek, ds.length);
      if (complete) {
        run++;
        best = Math.max(best, run);
      } else if (shiftDate(week, 6) < dateKey()) run = 0;
    }
  }
  return {
    done,
    best,
    current: run,
    known,
    unit: h.timesPerWeek >= 7 ? "дн." : "нед.",
    regularity: expected ? Math.round((credited / expected) * 100) : 0,
  };
}

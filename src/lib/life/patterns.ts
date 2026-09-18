import type { Habit } from "../../data/seed";
import type { LifeData, LifeEvent } from "./types";
import { shiftDate } from "./model.ts";
import {
  minutes,
  duration,
  dayEvents,
  dateRange,
  type TaskLike,
} from "./selectors.ts";
export function circularDistance(a: number, b: number) {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
}
export function timeLabel(minute: number) {
  const n = (Math.round(minute) + 1440) % 1440;
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}
export function reductionSummary(life: LifeData, habit: Habit, end: string) {
  const events = life.events.filter(
    (e) =>
      e.habitId === habit.id &&
      !e.planned &&
      e.date >= shiftDate(end, -6) &&
      e.date <= end,
  );
  const timed = events.filter((e) => e.start);
  const typical = timed.length
    ? timed.reduce((best, e) =>
        timed.reduce(
          (s, x) => s + circularDistance(minutes(e.start!), minutes(x.start!)),
          0,
        ) <
        timed.reduce(
          (s, x) =>
            s + circularDistance(minutes(best.start!), minutes(x.start!)),
          0,
        )
          ? e
          : best,
      ).start
    : undefined;
  return {
    events,
    count: events.length,
    days: new Set(events.map((e) => e.date)).size,
    averageMinutes: events.length
      ? Math.round(events.reduce((s, e) => s + duration(e), 0) / events.length)
      : 0,
    typical,
    weekdays: [
      ...new Set(
        events.map((e) =>
          new Date(`${e.date}T12:00:00`).toLocaleDateString("ru-RU", {
            weekday: "short",
          }),
        ),
      ),
    ],
    contexts: [...new Set(events.map((e) => e.context).filter(Boolean))],
  };
}
export function choiceCandidates(life: LifeData, habits: Habit[], end: string) {
  return habits
    .filter((h) => h.intent === "reduce" && h.alternative)
    .flatMap((h) => {
      const events = life.events.filter(
        (e) =>
          e.habitId === h.id &&
          e.start &&
          !e.planned &&
          e.date >= shiftDate(end, -27) &&
          e.date <= end,
      );
      if (events.length < 5 || new Set(events.map((e) => e.date)).size < 4)
        return [];
      let best: LifeEvent[] = [];
      for (const e of events) {
        const cluster = events.filter(
          (x) => circularDistance(minutes(x.start!), minutes(e.start!)) <= 60,
        );
        if (cluster.length > best.length) best = cluster;
      }
      if (
        best.length / events.length < 0.6 ||
        new Set(best.map((e) => e.date)).size < 4
      )
        return [];
      const anchor = minutes(best[0].start!);
      const offsets = best
        .map((e) => ((minutes(e.start!) - anchor + 2160) % 1440) - 720)
        .sort((a, b) => a - b);
      return [
        {
          habit: h,
          time: timeLabel(anchor + offsets[Math.floor(offsets.length / 2)]),
          count: best.length,
          days: new Set(best.map((e) => e.date)).size,
        },
      ];
    });
}
export type DayPattern = {
  id: string;
  categories: string[];
  names: string[];
  count: number;
  dates: string[];
};
export function dayPatterns(
  life: LifeData,
  end: string,
  habits: Habit[] = [],
  tasks: TaskLike[] = [],
): DayPattern[] {
  const groups = new Map<string, LifeEvent[]>();
  for (const e of dateRange(end, 28).flatMap((date) =>
    dayEvents(life, habits, tasks, date),
  ))
    if (
      !e.planned &&
      e.start &&
      e.date >= shiftDate(end, -27) &&
      e.date <= end
    ) {
      const list = groups.get(e.date) ?? [];
      list.push(e);
      groups.set(e.date, list);
    }
  const patterns = new Map<string, DayPattern>();
  for (const [date, raw] of groups) {
    const list = raw.sort((a, b) => minutes(a.start!) - minutes(b.start!));
    for (let n = 3; n <= 5; n++)
      for (let i = 0; i <= list.length - n; i++) {
        const sequence = list.slice(i, i + n);
        if (
          sequence.some(
            (e, j) =>
              j > 0 &&
              minutes(sequence[j - 1].start!) + duration(sequence[j - 1]) >=
                minutes(e.start!),
          )
        )
          continue;
        const categories = sequence.map((e) => e.habitId ?? e.category);
        if (new Set(categories).size < 2) continue;
        const id = categories.join("|");
        const found = patterns.get(id) ?? {
          id,
          categories,
          names: sequence.map((e) => e.name),
          count: 0,
          dates: [],
        };
        if (!found.dates.includes(date)) {
          found.dates.push(date);
          found.count++;
          patterns.set(id, found);
        }
      }
  }
  return [...patterns.values()]
    .filter((p) => p.count >= 4)
    .sort(
      (a, b) => b.categories.length - a.categories.length || b.count - a.count,
    )
    .filter(
      (p, index, all) =>
        !all.slice(0, index).some((other) => other.id.includes(p.id)),
    )
    .slice(0, 3);
}

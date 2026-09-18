import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyLife,
  normalizeLife,
  syncLifeHistory,
} from "../src/lib/life/model.ts";
const habit = {
  id: "h",
  name: "English",
  createdAt: "2024-01-01T12:00:00",
  completions: { "2024-01-01": true },
  priority: "important",
  targetDays: 21,
  startDate: "2024-01-01",
  timesPerWeek: 7,
  emoji: "⭐",
} as const;
test("tracking defaults are opt-in and normalize repeatedly without losing disabled data", () => {
  const l = emptyLife();
  assert.ok(l.indicators.every((i) => !i.enabled));
  l.days["2024-01-01"] = { rating: 8 };
  assert.deepEqual(normalizeLife(normalizeLife(l)), l);
});
test("deleting habit archives actual history and preserves direction", () => {
  const initial = syncLifeHistory(
    { habits: [habit] },
    { habits: [habit] },
    new Date("2024-01-02"),
  );
  const removed = syncLifeHistory(
    initial,
    { ...initial, habits: [] },
    new Date("2024-01-03"),
  );
  assert.equal(removed.life?.archivedHabits[0].completions["2024-01-01"], true);
  assert.equal(removed.life?.directions.length, 1);
  assert.equal(removed.life?.directions[0].versions.at(-1)?.archived, true);
});
import { eventPart, duration, dayEvents } from "../src/lib/life/selectors.ts";
test("overnight interval appears on both days with one source and correct duration", () => {
  const e = {
    id: "e",
    name: "Sleep",
    category: "sleep",
    date: "2026-09-16",
    start: "23:30",
    end: "01:00",
    endDate: "2026-09-17",
    kind: "interval",
    source: "manual",
  } as const;
  assert.equal(duration(e), 90);
  assert.equal(duration(eventPart(e, "2026-09-16")!), 30);
  assert.equal(duration(eventPart(e, "2026-09-17")!), 60);
  assert.equal(eventPart(e, "2026-09-18"), null);
});
test("task and its habit become one event; old marks get no invented time", () => {
  const events = dayEvents(
    emptyLife(),
    [habit],
    [
      {
        id: "t",
        title: "Task",
        habitId: "h",
        scheduledFor: "2024-01-01",
        completedAt: "2026-01-01T12:00:00",
      },
    ],
    "2024-01-01",
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].start, undefined);
});
import { dayAnalysis, indicatorValue } from "../src/lib/life/metrics.ts";
test("unknown data does not count as failure and historical target remains fixed", () => {
  const l = emptyLife();
  l.indicators = l.indicators.map((i) => ({
    ...i,
    enabled: i.id === "water" || i.id === "sleep",
    target: 10,
  }));
  l.marks = [
    {
      id: "m",
      indicatorId: "water",
      date: "2024-01-01",
      value: 5,
      target: 5,
      importance: "foundation",
    },
  ];
  assert.equal(dayAnalysis(l, "2024-01-01").score, 100);
  assert.equal(dayAnalysis(l, "2024-01-01").known, 1);
  assert.equal(dayAnalysis(l, "2024-01-02").score, undefined);
  l.marks[0].value = 0;
  assert.equal(dayAnalysis(l, "2024-01-01").score, 0);
});
test("sleep belongs to wake date", () => {
  const l = emptyLife();
  l.events = [
    {
      id: "s",
      name: "Сон",
      category: "sleep",
      date: "2026-09-16",
      start: "23:00",
      end: "07:00",
      endDate: "2026-09-17",
      kind: "interval",
      source: "manual",
    },
  ];
  assert.equal(indicatorValue(l, "sleep", "2026-09-17")?.value, 8);
  assert.equal(indicatorValue(l, "sleep", "2026-09-16"), undefined);
});
import { habitDay, reconcileHabitRecords } from "../src/lib/life/habits.ts";
test("partial amounts do not complete and legacy targets survive changes", () => {
  const h = {
    ...habit,
    quantityTarget: 30,
    records: { "2024-01-01": { value: 10, target: 30, confirmed: true } },
    completions: {},
  };
  assert.equal(habitDay(h, "2024-01-01").kind, "partial");
  const old = { habits: [{ ...habit, quantityTarget: 30 }] };
  const next = reconcileHabitRecords(old, {
    habits: [{ ...old.habits[0], quantityTarget: 60 }],
  });
  assert.equal(next.habits[0].records?.["2024-01-01"].target, 30);
  assert.equal(next.habits[0].records?.["2024-01-01"].at, undefined);
});
import {
  choiceCandidates,
  dayPatterns,
  circularDistance,
} from "../src/lib/life/patterns.ts";
test("reduction is unknown without confirmation; zero limit is supported", () => {
  const h = {
    ...habit,
    intent: "reduce" as const,
    limit: 0,
    completions: {},
    records: { "2024-01-01": { value: 0, target: 0, confirmed: true } },
  };
  assert.equal(habitDay(h, "2024-01-01").kind, "done");
  assert.equal(habitDay(h, "2024-01-02").kind, "unknown");
});
test("choice detection requires history and handles midnight", () => {
  assert.equal(circularDistance(1430, 10), 20);
  const l = emptyLife();
  const h = { ...habit, intent: "reduce" as const, alternative: "Read" };
  const make = (i: number) => ({
    id: String(i),
    date: `2026-09-${String(i + 10).padStart(2, "0")}`,
    name: "Phone",
    category: "phone",
    start: i % 2 ? "23:50" : "00:10",
    kind: "point" as const,
    source: "manual" as const,
    habitId: "h",
  });
  l.events = [make(0)];
  assert.equal(choiceCandidates(l, [h], "2026-09-18").length, 0);
  l.events = Array.from({ length: 5 }, (_, i) => make(i));
  assert.equal(choiceCandidates(l, [h], "2026-09-18").length, 1);
});
test("patterns require four days and exclude overlapping sequences", () => {
  const l = emptyLife();
  for (let day = 10; day < 14; day++)
    for (let i = 0; i < 3; i++)
      l.events.push({
        id: `${day}-${i}`,
        date: `2026-09-${day}`,
        name: `Action ${i}`,
        category: `c${i}`,
        start: `${18 + i}:00`,
        end: `${18 + i}:30`,
        kind: "interval",
        source: "manual",
      });
  assert.equal(dayPatterns(l, "2026-09-18").length, 1);
  l.events = l.events.map((e) => ({ ...e, end: "23:00" }));
  assert.equal(dayPatterns(l, "2026-09-18").length, 0);
});
import { neuronsAt } from "../src/lib/life/neurons.ts";
test("neuron past views exclude future actions and retain archived history", () => {
  const l = emptyLife();
  l.directions = [
    {
      id: "h",
      createdAt: habit.createdAt,
      habitIds: ["h"],
      versions: [
        { at: habit.createdAt, name: "English" },
        { at: "2025-01-01T12:00:00", name: "English", archived: true },
      ],
    },
  ];
  l.archivedHabits = [
    { ...habit, completions: { ...habit.completions, "2025-02-01": true } },
  ];
  assert.equal(neuronsAt(l, [], "2023-12-31").length, 0);
  assert.equal(neuronsAt(l, [], "2024-01-31")[0].activeDays, 1);
  assert.equal(neuronsAt(l, [], "2024-01-31")[0].archived, undefined);
  assert.equal(neuronsAt(l, [], "2025-02-28")[0].activeDays, 2);
  assert.equal(neuronsAt(l, [], "2025-02-28")[0].archived, true);
});
import { lifeInsights } from "../src/lib/life/insights.ts";
test("correlation needs 14 observed days and five days per group; hidden cards remain hidden", () => {
  const l = emptyLife();
  for (let i = 1; i <= 14; i++) {
    const date = `2026-09-${String(i).padStart(2, "0")}`;
    l.days[date] = { rating: i <= 7 ? 9 : 5 };
    if (i <= 7)
      l.events.push({
        id: String(i),
        date,
        name: "Workout",
        category: "workout",
        kind: "point",
        source: "manual",
        sphere: "base",
      });
  }
  assert.ok(
    lifeInsights(l, [], "2026-09-18").some((i) => i.id === "workout-rating"),
  );
  l.hiddenInsights = ["workout-rating"];
  assert.equal(lifeInsights(l, [], "2026-09-18").length, 0);
  l.hiddenInsights = [];
  delete l.days["2026-09-14"];
  assert.equal(lifeInsights(l, [], "2026-09-18").length, 0);
});
test("returning after a long gap cannot shrink accumulated neuron strength", () => {
  const l = emptyLife();
  l.directions = [
    {
      id: "h",
      createdAt: habit.createdAt,
      habitIds: ["h"],
      versions: [{ at: habit.createdAt, name: "English" }],
    },
  ];
  const h = {
    ...habit,
    completions: { "2024-01-01": true, "2024-01-02": true, "2024-01-03": true },
  };
  const earlier = neuronsAt(l, [h], "2024-01-03")[0];
  const later = neuronsAt(
    l,
    [{ ...h, completions: { ...h.completions, "2026-09-18": true } }],
    "2026-09-18",
  )[0];
  assert.ok(later.strength >= earlier.strength);
});
test("linked instances share one direction without generating repeated history versions", () => {
  const old = syncLifeHistory({ habits: [habit] }, { habits: [habit] });
  const next = syncLifeHistory(old, {
    ...old,
    habits: [{ ...habit, id: "h2", name: "Return", directionId: "h" }],
  });
  const stable = syncLifeHistory(next, { ...next });
  assert.equal(stable.life?.directions.length, 1);
  assert.equal(
    stable.life?.directions[0].versions.length,
    next.life?.directions[0].versions.length,
  );
});

test("reduction without a limit records observation without judging success", () => {
  const h = {
    ...habit,
    intent: "reduce" as const,
    completions: {},
    records: {
      "2024-01-01": {
        intent: "reduce" as const,
        confirmed: true,
        value: 0,
        target: 0,
      },
    },
  };
  assert.equal(habitDay(h, "2024-01-01").kind, "recorded");
  assert.equal(habitDay(h, "2024-01-02").kind, "unknown");
  assert.equal(habitDay({ ...h, limit: 0 }, "2024-01-01").kind, "done");
});
import { reductionSummary } from "../src/lib/life/patterns.ts";
test("reduction statistics respect selected period and ignore planned episodes", () => {
  const life = emptyLife();
  life.events = [
    {
      id: "a",
      name: "Phone",
      habitId: "h",
      category: "phone",
      source: "manual",
      kind: "point",
      date: "2024-01-01",
    },
    {
      id: "b",
      name: "Phone",
      habitId: "h",
      category: "phone",
      source: "manual",
      kind: "point",
      date: "2024-01-28",
    },
    {
      id: "c",
      name: "Phone",
      habitId: "h",
      category: "phone",
      source: "manual",
      kind: "point",
      date: "2024-01-28",
      planned: true,
    },
  ];
  assert.equal(reductionSummary(life, habit, "2024-01-28", 7).count, 1);
  assert.equal(reductionSummary(life, habit, "2024-01-28", 28).count, 2);
});

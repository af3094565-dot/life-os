import { reductionSummary } from "../../lib/life/patterns";
import { useState } from "react";
import type { Habit } from "../../data/seed";
import type { LifeOSState } from "../../hooks/useLifeOS";
import { EventEditor } from "./DayHistory";
import { dateKey, shiftDate, uid } from "../../lib/life/model";
import { duration } from "../../lib/life/selectors";
export function ReductionPanel({
  state,
  habit,
  date = dateKey(),
}: {
  state: LifeOSState;
  habit: Habit;
  date?: string;
}) {
  const [open, setOpen] = useState(false);
  const events = state.life.events.filter(
    (e) =>
      e.habitId === habit.id &&
      !e.planned &&
      e.date >= shiftDate(date, -6) &&
      e.date <= date,
  );
  const summary = reductionSummary(state.life, habit, date);
  const today = events.filter((e) => e.date === date);
  const total = events.reduce((s, e) => s + duration(e), 0);
  const days = new Set(events.map((e) => e.date)).size;
  const value =
    habit.unit === "мин"
      ? today.reduce((s, e) => s + duration(e), 0)
      : today.length;
  return (
    <div className="mt-3 rounded-xl bg-canvas p-3">
      <p className="text-sm font-bold">Сокращаю · {habit.name}</p>
      <p className="life-muted">
        За 7 дней: {events.length} эпизодов · {days} дней ·{" "}
        {days ? Math.round(total / days) : 0} мин в активный день
      </p>
      <p className="life-muted">
        Средний эпизод: {summary.averageMinutes} мин
        {summary.typical ? ` · обычно около ${summary.typical}` : ""}
      </p>
      <p className="life-muted">{summary.weekdays.join(" · ")}</p>
      {summary.contexts.length > 0 && (
        <p className="life-muted">Контекст: {summary.contexts.join(", ")}</p>
      )}
      {habit.alternative && (
        <p className="life-muted">Вариант замены: {habit.alternative}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button className="life-button secondary" onClick={() => setOpen(true)}>
          Записать эпизод
        </button>
        {habit.limit !== undefined && (
          <button
            className="life-button secondary"
            onClick={() => state.confirmReductionDay(habit.id, date, value)}
          >
            Подтвердить итог дня: {value} / {habit.limit} {habit.unit ?? "раз"}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        Без записи мы не считаем день успешным или неуспешным. Здесь нет
        штрафов.
      </p>
      {open && (
        <EventEditor
          state={state}
          date={date}
          event={{
            id: uid(),
            name: habit.name,
            date,
            kind: "interval",
            start: "18:00",
            end: "18:10",
            source: "manual",
            category: habit.category ?? habit.id,
            habitId: habit.id,
            sphere: habit.sphere,
            goalId: habit.goalId,
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

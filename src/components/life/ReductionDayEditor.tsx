import { useState } from "react";
import type { Habit } from "../../data/seed";
import type { LifeOSState } from "../../hooks/useLifeOS";
import type { LifeEvent } from "../../lib/life/types";
import { dateKey, shiftDate, uid } from "../../lib/life/model";
import { duration, eventError } from "../../lib/life/selectors";
import { BottomSheet } from "../mobile/BottomSheet";

export function ReductionDayEditor({
  state,
  habit,
  date,
  onClose,
}: {
  state: LifeOSState;
  habit: Habit;
  date: string;
  onClose: () => void;
}) {
  const [events, setEvents] = useState(() =>
    state.life.events.filter(
      (e) => e.habitId === habit.id && e.date === date && !e.planned,
    ),
  );
  const [answer, setAnswer] = useState<"yes" | "no" | null>(() =>
    events.length ? "yes" : habit.records?.[date]?.confirmed ? "no" : null,
  );
  const [adding, setAdding] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [context, setContext] = useState("");
  const [error, setError] = useState("");
  const value =
    habit.unit === "мин"
      ? events.reduce((sum, e) => sum + duration(e), 0)
      : events.length;
  function add() {
    const event: LifeEvent = {
      id: uid(),
      name: habit.name,
      date,
      start: start || undefined,
      end: end || undefined,
      endDate: start && end && end < start ? shiftDate(date, 1) : date,
      kind: end || habit.unit === "мин" ? "interval" : "point",
      source: "manual",
      category: habit.category ?? habit.id,
      habitId: habit.id,
      goalId: habit.goalId,
      sphere: habit.sphere,
      reduction: true,
      context: context.trim() || undefined,
    };
    const message = eventError(event, dateKey());
    if (message) {
      setError(message);
      return;
    }
    setEvents([...events, event]);
    setAdding(false);
    setStart("");
    setEnd("");
    setContext("");
    setError("");
  }
  return (
    <BottomSheet
      open
      onClose={onClose}
      title={habit.name}
      subtitle={new Date(`${date}T12:00:00`).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}
    >
      <div className="life-form space-y-4">
        <fieldset>
          <legend className="mb-2 font-bold">Были эпизоды в этот день?</legend>
          <div className="flex gap-2">
            <button
              type="button"
              className="life-button secondary"
              aria-pressed={answer === "no"}
              disabled={events.length > 0}
              onClick={() => {
                setAnswer("no");
                setAdding(false);
                setError("");
              }}
            >
              Нет{answer === "no" ? " ✓" : ""}
            </button>
            <button
              type="button"
              className="life-button secondary"
              aria-pressed={answer === "yes"}
              onClick={() => {
                setAnswer("yes");
                if (!events.length) setAdding(true);
              }}
            >
              Да{answer === "yes" ? " ✓" : ""}
            </button>
          </div>
        </fieldset>
        {answer === "no" && (
          <p className="life-muted">Отметим день без эпизодов.</p>
        )}
        {answer === "yes" && (
          <>
            {events.length > 0 && (
              <ul className="space-y-2">
                {events.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2"
                  >
                    <span className="min-w-0 break-words text-sm">
                      {e.start ?? "Время не указано"}
                      {e.end ? `–${e.end}` : ""}
                      {e.endDate && e.endDate > date ? " (+1 день)" : ""}
                      {e.context && (
                        <span className="block text-xs text-muted">
                          {e.context}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      className="min-h-11 shrink-0 text-xs text-muted"
                      aria-label={`Удалить эпизод ${e.start ?? "без времени"}`}
                      onClick={() =>
                        setEvents(events.filter((x) => x.id !== e.id))
                      }
                    >
                      Удалить
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {adding ? (
              <div className="space-y-3 rounded-xl bg-canvas p-3">
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    Начало{habit.unit !== "мин" ? " (необязательно)" : ""}
                    <input
                      type="time"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </label>
                  <label>
                    Окончание{habit.unit !== "мин" ? " (необязательно)" : ""}
                    <input
                      type="time"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </label>
                </div>
                {start && end && end < start && (
                  <p className="life-muted">Окончание на следующий день.</p>
                )}
                <label>
                  Что происходило?{" "}
                  <span className="text-muted">Необязательно</span>
                  <input
                    value={context}
                    placeholder="Например, отдыхал после работы"
                    onChange={(e) => setContext(e.target.value)}
                  />
                </label>
                {error && (
                  <p role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="life-button secondary"
                    onClick={add}
                  >
                    Добавить эпизод
                  </button>
                  <button
                    type="button"
                    className="life-button secondary"
                    onClick={() => {
                      setAdding(false);
                      setError("");
                    }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="life-button secondary"
                onClick={() => setAdding(true)}
              >
                Ещё эпизод
              </button>
            )}
            {events.length > 0 && (
              <p className="text-sm">
                За день: {value} {habit.unit ?? "раз"}
                {habit.limit !== undefined
                  ? ` · ориентир: не больше ${habit.records?.[date]?.target ?? habit.limit}`
                  : ""}
              </p>
            )}
          </>
        )}
        <p className="text-xs text-muted">
          Это наблюдение, без штрафов. Статистика — в «Результатах».
        </p>
        {!adding && error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button
          type="button"
          className="life-button w-full"
          disabled={!answer || adding || (answer === "yes" && !events.length)}
          onClick={() => {
            const result = state.confirmReductionDay(habit.id, date, events);
            if (!result.ok) {
              setError(result.reason ?? "Не удалось сохранить день");
              return;
            }
            onClose();
          }}
        >
          Сохранить день
        </button>
      </div>
    </BottomSheet>
  );
}

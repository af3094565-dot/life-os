import { useState } from "react";
import type { Habit } from "../../data/seed";
import type { LifeOSState } from "../../hooks/useLifeOS";
import { BottomSheet } from "../mobile/BottomSheet";
export function HabitRecordEditor({
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
  const target = habit.records?.[date]?.target ?? habit.quantityTarget ?? 1;
  const [value, setValue] = useState(
    String(
      habit.records?.[date]?.value ?? (habit.completions[date] ? target : 0),
    ),
  );
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  return (
    <BottomSheet open onClose={onClose} title={habit.name} subtitle={date}>
      <div className="life-form space-y-3">
        <p className="life-muted">
          Ориентир на этот день: {target} {habit.unit ?? "выполнение"}.
          Заполнение прошлых дней не начисляет игровую энергию.
        </p>
        <label>
          Сколько выполнено
          <input
            type="number"
            min="0"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <label>
          Время, если помнишь
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            className="life-button"
            onClick={() => {
              const r = state.recordHabitValue(
                habit.id,
                date,
                Number(value),
                time || undefined,
              );
              if (r.ok) onClose();
              else setError(r.reason ?? "Ошибка");
            }}
          >
            Сохранить выполнение
          </button>
          <button
            className="life-button secondary"
            onClick={() => {
              state.recordHabitValue(habit.id, date, null);
              onClose();
            }}
          >
            Убрать данные
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

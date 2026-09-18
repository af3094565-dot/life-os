import type { Habit } from "../../data/seed";
import { habitDay } from "../../lib/life/habits";
export function HabitCell({
  habit,
  date,
  onClick,
}: {
  habit: Habit;
  date: string;
  onClick: () => void;
}) {
  const { kind, ratio } = habitDay(habit, date);
  const labels = {
    outside: "Вне периода",
    unknown: "Нет данных",
    missed: "Не выполнено",
    partial: "Частично",
    done: "Выполнено",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={kind === "outside"}
      aria-label={`${habit.name}, ${date}: ${labels[kind]}`}
      title={`${date}: ${labels[kind]}`}
      className={`habit-cell ${kind}`}
      style={
        kind === "partial"
          ? {
              background: `linear-gradient(to top, var(--color-brand) ${ratio * 100}%, var(--color-brand-soft) ${ratio * 100}%)`,
            }
          : undefined
      }
    >
      {kind === "done" ? "✓" : kind === "missed" ? "·" : ""}
    </button>
  );
}

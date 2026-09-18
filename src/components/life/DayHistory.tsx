import { useMemo, useState } from "react";
import type { LifeOSState } from "../../hooks/useLifeOS";
import type { LifeEvent, Sphere } from "../../lib/life/types";
import { dateKey, shiftDate, uid } from "../../lib/life/model";
import { dayEvents, duration, eventError } from "../../lib/life/selectors";
import { Card } from "../ui";
import { BottomSheet } from "../mobile/BottomSheet";
const categories = [
  ["work", "Работа", "life"],
  ["phone", "Телефон", "life"],
  ["food", "Еда", "base"],
  ["travel", "Дорога", "life"],
  ["rest", "Отдых", "life"],
  ["social", "Общение", "life"],
  ["games", "Игры", "life"],
  ["workout", "Спорт", "base"],
  ["sleep", "Сон", "base"],
  ["reading", "Чтение", "growth"],
  ["custom", "Своё", "growth"],
] as const;
export function EventEditor({
  state,
  date,
  event,
  onClose,
}: {
  state: LifeOSState;
  date: string;
  event?: LifeEvent;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<LifeEvent>(
    event ?? {
      id: uid(),
      name: "",
      date,
      kind: "interval",
      start: "18:00",
      end: "19:00",
      source: "manual",
      category: "custom",
    },
  );
  const [error, setError] = useState("");
  const patch = (p: Partial<LifeEvent>) => setDraft((d) => ({ ...d, ...p }));
  const save = () => {
    const next = {
      ...draft,
      reduction:
        draft.reduction ??
        state.habitsAll.find((h) => h.id === draft.habitId)?.intent ===
          "reduce",
      endDate:
        draft.kind === "interval" &&
        draft.start &&
        draft.end &&
        draft.end < draft.start
          ? shiftDate(draft.date, 1)
          : draft.date,
    };
    const err = eventError(next, dateKey());
    if (err) {
      setError(err);
      return;
    }
    state.updateLife((l) => ({
      ...l,
      events: [...l.events.filter((e) => e.id !== next.id), next],
    }));
    onClose();
  };
  return (
    <BottomSheet
      open
      onClose={onClose}
      title={event ? "Изменить действие" : "Восстановить день"}
      subtitle="Что происходило? Укажи то, что помнишь."
    >
      <div className="life-form space-y-3">
        <div className="flex flex-wrap gap-2">
          {categories.map(([category, name, sphere]) => (
            <button
              key={category}
              className="life-button secondary"
              onClick={() =>
                patch({
                  category,
                  name: category === "custom" ? "" : name,
                  sphere,
                })
              }
            >
              {name}
            </button>
          ))}
        </div>
        <label>
          Название
          <input
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            Дата
            <input
              type="date"
              value={draft.date}
              max={dateKey()}
              onChange={(e) => patch({ date: e.target.value })}
            />
          </label>
          <label>
            Тип
            <select
              value={draft.kind}
              onChange={(e) =>
                patch({ kind: e.target.value as LifeEvent["kind"] })
              }
            >
              <option value="interval">Интервал</option>
              <option value="point">Точка</option>
            </select>
          </label>
          <label>
            Начало / время
            <input
              type="time"
              value={draft.start ?? ""}
              onChange={(e) => patch({ start: e.target.value || undefined })}
            />
          </label>
          {draft.kind === "interval" && (
            <label>
              Окончание
              <input
                type="time"
                value={draft.end ?? ""}
                onChange={(e) => patch({ end: e.target.value })}
              />
            </label>
          )}
        </div>
        {draft.start &&
          draft.end &&
          draft.end < draft.start &&
          draft.kind === "interval" && (
            <p className="life-muted">Окончание на следующий день.</p>
          )}
        <label>
          Сфера
          <select
            value={draft.sphere ?? ""}
            onChange={(e) =>
              patch({ sphere: (e.target.value || undefined) as Sphere })
            }
          >
            <option value="">Без сферы</option>
            {Object.entries(state.life.sphereNames).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Привычка, необязательно
          <select
            value={draft.habitId ?? ""}
            onChange={(e) => {
              const h = state.habitsAll.find((h) => h.id === e.target.value);
              patch({
                habitId: h?.id,
                goalId: h?.goalId,
                sphere: h?.sphere ?? draft.sphere,
                name: h?.name ?? draft.name,
              });
            }}
          >
            <option value="">Не связывать</option>
            {state.habitsAll.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Вклад в цель
          <select
            value={draft.goalId ?? ""}
            onChange={(e) => patch({ goalId: e.target.value || undefined })}
          >
            <option value="">Без цели</option>
            {state.goalStats.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Направление развития
          <select
            value={draft.directionId ?? ""}
            onChange={(e) =>
              patch({ directionId: e.target.value || undefined })
            }
          >
            <option value="">Без направления</option>
            {state.life.directions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.versions.at(-1)?.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Контекст, необязательно
          <textarea
            value={draft.context ?? ""}
            onChange={(e) => patch({ context: e.target.value })}
          />
        </label>
        <p className="life-muted">
          Пересекающиеся события допустимы. Запись времени не отмечает привычку
          выполненной автоматически.
        </p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button className="life-button" onClick={save}>
          Сохранить действие
        </button>
      </div>
    </BottomSheet>
  );
}
type PlannedItem = {
  id: string;
  type: "task" | "habit" | "goal";
  label: string;
  time?: string;
  done: boolean;
};
export function DayHistory({
  state,
  date,
  plan = [],
  onOpenPlan,
}: {
  state: LifeOSState;
  date: string;
  plan?: PlannedItem[];
  onOpenPlan?: (type: PlannedItem["type"]) => void;
}) {
  const [editing, setEditing] = useState<LifeEvent | null | undefined>();
  const actual = useMemo(
    () =>
      dayEvents(state.life, state.habitsAll, state.plannerTasksDetailed, date),
    [state.life, state.habitsAll, state.plannerTasksDetailed, date],
  );
  const planned: LifeEvent[] = plan
    .filter(
      (p) =>
        !actual.some((e) =>
          p.type === "habit"
            ? e.habitId === p.id
            : p.type === "task"
              ? e.sourceId === p.id ||
                state.plannerTasksDetailed.some(
                  (t) => t.id === p.id && t.habitId === e.habitId,
                )
              : false,
        ),
    )
    .map((p) => ({
      id: `plan-${p.type}-${p.id}`,
      name: p.label,
      date,
      start: p.time,
      kind: "point",
      source: p.type === "goal" ? "manual" : p.type,
      sourceId: p.id,
      category: p.type,
      planned: true,
    }));
  const events = [
    ...actual,
    ...planned,
    ...state.life.events.filter((e) => e.planned && e.date === date),
  ].sort((a, b) => (a.start ?? "99:99").localeCompare(b.start ?? "99:99"));
  return (
    <Card className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold">История дня</h3>
          <p className="life-muted">
            00:00 — 24:00 · планы и фактические действия
          </p>
        </div>
        <button
          className="life-button"
          disabled={date > dateKey()}
          onClick={() => setEditing(null)}
        >
          Восстановить день
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {events.length === 0 && (
          <p className="life-muted">
            Нет записей. Это не означает, что день был пустым. Восстанови один
            запомнившийся момент.
          </p>
        )}
        {events.map((e) => (
          <article
            key={e.id}
            className={`flex gap-3 border-l-2 pl-3 ${e.planned ? "border-line" : "border-brand-soft"}`}
          >
            <div className="w-24 shrink-0 text-xs font-bold text-muted">
              {e.start ?? "Без времени"}
              {e.kind === "interval" && `–${e.end}`}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{e.name}</p>
              <p className="life-muted">
                {e.planned
                  ? "В плане"
                  : e.kind === "interval"
                    ? `${Math.round(duration(e))} мин`
                    : "Отмечено"}
                {e.sphere ? ` · ${state.life.sphereNames[e.sphere]}` : ""}
                {e.goalId && duration(e) > 0
                  ? ` · вклад в цель: ${Math.round(duration(e))} мин`
                  : ""}
              </p>
              {e.context && <p className="life-muted">{e.context}</p>}
              {e.id.startsWith("plan-") ? (
                <button
                  className="min-h-11 text-xs text-brand"
                  onClick={() =>
                    onOpenPlan?.(e.category as PlannedItem["type"])
                  }
                >
                  Открыть в плане
                </button>
              ) : (
                state.life.events.some((x) => x.id === e.id) && (
                  <div className="flex flex-wrap gap-3 text-xs text-brand">
                    <button
                      className="min-h-11"
                      onClick={() =>
                        setEditing({
                          ...state.life.events.find((x) => x.id === e.id)!,
                          planned: false,
                        })
                      }
                    >
                      {e.planned ? "Записать, что получилось" : "Изменить"}
                    </button>
                    <button
                      className="min-h-11"
                      onClick={() => {
                        if (window.confirm("Удалить эту запись?"))
                          state.updateLife((l) => ({
                            ...l,
                            events: l.events.filter((x) => x.id !== e.id),
                          }));
                      }}
                    >
                      Удалить запись
                    </button>
                  </div>
                )
              )}
            </div>
          </article>
        ))}
      </div>
      {editing !== undefined && (
        <EventEditor
          state={state}
          date={date}
          event={editing ?? undefined}
          onClose={() => setEditing(undefined)}
        />
      )}
    </Card>
  );
}

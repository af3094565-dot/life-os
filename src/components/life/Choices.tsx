import { useEffect, useMemo, useState } from "react";
import type { LifeOSState } from "../../hooks/useLifeOS";
import {
  choiceCandidates,
  circularDistance,
  dayPatterns,
} from "../../lib/life/patterns";
import { dateKey, uid } from "../../lib/life/model";
import { minutes } from "../../lib/life/selectors";
import { Card } from "../ui";
import { BottomSheet } from "../mobile/BottomSheet";
import { useFocusClock } from "../../hooks/useFocusClock";
export function ChoiceMoment({ state }: { state: LifeOSState }) {
  const now = useFocusClock();
  const today = dateKey(new Date(now));
  const candidates = useMemo(
    () => choiceCandidates(state.life, state.habitsAll, today),
    [state.life, state.habitsAll, today],
  );
  const currentMinutes =
    new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const candidate = candidates.find((c) => {
    const setting = state.life.choices[c.habit.id];
    return (
      setting?.enabled &&
      setting.dismissedDate !== today &&
      circularDistance(minutes(setting.time), currentMinutes) <= 30
    );
  });
  const [shown, setShown] = useState<string | null>(null);
  const focus = state.life.activeFocus;
  useEffect(() => {
    if (candidate && state.life.choiceShownDate !== today) {
      setShown(candidate.habit.id);
      state.updateLife((l) => ({ ...l, choiceShownDate: today }));
    }
  }, [candidate, today, state]);
  if (focus) {
    const seconds = Math.max(0, Math.ceil((focus.endsAt - now) / 1000));
    return (
      <Card className="mb-4">
        <h3 className="font-bold">{focus.name} · маленькая альтернатива</h3>
        <p className="text-2xl font-bold text-brand">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            className="life-button"
            disabled={seconds > 0}
            onClick={() => {
              state.recordFocusSession({
                minutes: 10,
                name: focus.name,
                habitId: focus.habitId,
                sessionId: `alternative-${focus.endsAt}`,
              });
              state.updateLife((l) => ({ ...l, activeFocus: undefined }));
              setShown(null);
            }}
          >
            Завершить 10 минут
          </button>
          <button
            className="life-button secondary"
            onClick={() => {
              state.updateLife((l) => ({ ...l, activeFocus: undefined }));
              setShown(null);
            }}
          >
            Остановить
          </button>
        </div>
        <p className="life-muted mt-2">
          После завершения время появится в истории. Выполнение привычки можно
          отметить отдельно.
        </p>
      </Card>
    );
  }
  if (!candidate || shown !== candidate.habit.id) return null;
  const dismiss = () => {
    state.updateLife((l) => ({
      ...l,
      choices: {
        ...l.choices,
        [candidate.habit.id]: {
          ...l.choices[candidate.habit.id],
          dismissedDate: today,
        },
      },
    }));
    setShown(null);
  };
  return (
    <Card className="mb-4">
      <p className="text-xs font-bold uppercase text-brand">Точка выбора</p>
      <h3 className="mt-2 font-bold">
        Обычно примерно сейчас — {candidate.habit.name}
      </h3>
      <p className="life-muted mt-1">
        Попробуем 10 минут: {candidate.habit.alternative}? Это только вариант.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          className="life-button"
          onClick={() => {
            state.updateLife((l) => ({
              ...l,
              activeFocus: {
                name: candidate.habit.alternative!,
                habitId: candidate.habit.alternativeHabitId,
                endsAt: Date.now() + 600000,
              },
            }));
            dismiss();
          }}
        >
          Начать
        </button>
        <button className="life-button secondary" onClick={dismiss}>
          Сегодня не хочу
        </button>
      </div>
    </Card>
  );
}
export function PatternPanel({ state }: { state: LifeOSState }) {
  const today = dateKey();
  const candidates = choiceCandidates(state.life, state.habitsAll, today);
  const patterns = dayPatterns(
    state.life,
    today,
    state.habitsAll,
    state.plannerTasksDetailed,
  );
  const [proposal, setProposal] = useState<
    { name: string; category: string; time: string }[] | null
  >(null);
  if (!candidates.length && !patterns.length) return null;
  return (
    <Card className="mb-4">
      <h3 className="font-extrabold">Повторяющиеся моменты</h3>
      <p className="life-muted mt-1">
        Наблюдения за 28 дней. Можно принять, изменить или просто пропустить.
      </p>
      {candidates.map((c) => {
        const setting = state.life.choices[c.habit.id];
        return (
          <div
            key={c.habit.id}
            className="life-form mt-3 rounded-xl bg-canvas p-3"
          >
            <p className="font-bold">
              {c.habit.name} → {c.habit.alternative}
            </p>
            <p className="life-muted">
              {c.count} эпизодов на {c.days} днях · обычно около {c.time}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label>
                Время
                <input
                  type="time"
                  value={setting?.time ?? c.time}
                  onChange={(e) =>
                    state.updateLife((l) => ({
                      ...l,
                      choices: {
                        ...l.choices,
                        [c.habit.id]: {
                          enabled: setting?.enabled ?? false,
                          time: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </label>
              <button
                className="life-button secondary"
                onClick={() =>
                  state.updateLife((l) => ({
                    ...l,
                    choices: {
                      ...l.choices,
                      [c.habit.id]: {
                        time: setting?.time ?? c.time,
                        enabled: !setting?.enabled,
                      },
                    },
                  }))
                }
              >
                {setting?.enabled ? "Отключить" : "Принять предложение"}
              </button>
            </div>
          </div>
        );
      })}
      {patterns.map((p) => (
        <div key={p.id} className="mt-4">
          <p className="font-semibold">{p.names.join(" → ")}</p>
          <p className="life-muted">Повторилось на {p.count} днях.</p>
          <button
            className="life-button secondary mt-2"
            onClick={() =>
              setProposal(
                p.categories.map((category, i) => {
                  const h = state.habitsAll.find((h) => h.id === category);
                  return {
                    name:
                      h?.intent === "reduce" && h.alternative
                        ? h.alternative
                        : p.names[i],
                    category: h?.intent === "reduce" ? "alternative" : category,
                    time: `${String(18 + i).padStart(2, "0")}:00`,
                  };
                }),
              )
            }
          >
            Попробовать сегодня
          </button>
        </div>
      ))}
      <BottomSheet
        open={!!proposal}
        onClose={() => setProposal(null)}
        title="Вариант на сегодня"
        subtitle="Измени действия и время. Существующий план останется на месте."
      >
        <div className="life-form space-y-3">
          {proposal?.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_100px] gap-2">
              <label>
                Действие {i + 1}
                <input
                  value={p.name}
                  onChange={(e) =>
                    setProposal((list) =>
                      list!.map((x, j) =>
                        i === j ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Время
                <input
                  type="time"
                  value={p.time}
                  onChange={(e) =>
                    setProposal((list) =>
                      list!.map((x, j) =>
                        i === j ? { ...x, time: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
            </div>
          ))}
          <button
            className="life-button"
            disabled={proposal?.some((p) => !p.name.trim() || !p.time)}
            onClick={() => {
              if (!proposal) return;
              state.updateLife((l) => ({
                ...l,
                events: [
                  ...l.events,
                  ...proposal.map((p) => ({
                    id: uid(),
                    name: p.name,
                    category: p.category,
                    date: today,
                    start: p.time,
                    kind: "point" as const,
                    source: "manual" as const,
                    planned: true,
                  })),
                ],
              }));
              setProposal(null);
            }}
          >
            Добавить выбранный сценарий в план
          </button>
        </div>
      </BottomSheet>
    </Card>
  );
}

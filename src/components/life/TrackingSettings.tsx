import { useState } from "react";
import type { LifeOSState } from "../../hooks/useLifeOS";
import type { Sphere, Importance } from "../../lib/life/types";
import { SPHERES, IMPORTANCE, uid } from "../../lib/life/model";
import { BottomSheet } from "../mobile/BottomSheet";
export function TrackingSettings({
  state,
  open,
  onClose,
}: {
  state: LifeOSState;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [sphere, setSphere] = useState<Sphere>("growth");
  const [unit, setUnit] = useState("мин");
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Что я хочу отслеживать"
      subtitle="Выбери только то, что полезно тебе. Всё остальное можно не заполнять."
    >
      <div className="life-form space-y-5">
        {(Object.keys(SPHERES) as Sphere[]).map((s) => (
          <section key={s}>
            <label className="font-bold">
              Название сферы
              <input
                aria-label={`Название: ${SPHERES[s]}`}
                value={state.life.sphereNames[s]}
                onChange={(e) =>
                  state.updateLife((l) => ({
                    ...l,
                    sphereNames: { ...l.sphereNames, [s]: e.target.value },
                  }))
                }
              />
            </label>
            {state.life.indicators
              .filter((i) => i.sphere === s)
              .map((i) => (
                <div key={i.id} className="mt-2 rounded-xl bg-canvas p-3">
                  <label className="flex items-center gap-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={i.enabled}
                      onChange={(e) =>
                        state.updateLife((l) => ({
                          ...l,
                          indicators: l.indicators.map((x) =>
                            x.id === i.id
                              ? { ...x, enabled: e.target.checked }
                              : x,
                          ),
                        }))
                      }
                    />
                    {i.name}
                  </label>
                  {i.enabled && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label>
                        Сфера
                        <select
                          value={i.sphere}
                          onChange={(e) =>
                            state.updateLife((l) => ({
                              ...l,
                              indicators: l.indicators.map((x) =>
                                x.id === i.id
                                  ? { ...x, sphere: e.target.value as Sphere }
                                  : x,
                              ),
                            }))
                          }
                        >
                          {Object.keys(SPHERES).map((k) => (
                            <option key={k} value={k}>
                              {state.life.sphereNames[k as Sphere]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Важность
                        <select
                          value={i.importance}
                          onChange={(e) =>
                            state.updateLife((l) => ({
                              ...l,
                              indicators: l.indicators.map((x) =>
                                x.id === i.id
                                  ? {
                                      ...x,
                                      importance: e.target.value as Importance,
                                    }
                                  : x,
                              ),
                            }))
                          }
                        >
                          {Object.entries(IMPORTANCE).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="col-span-2">
                        Мой ориентир ({i.unit}), необязательно
                        <input
                          type="number"
                          min="0.1"
                          max={i.kind === "scale" ? 10 : undefined}
                          step="any"
                          value={i.target ?? ""}
                          onChange={(e) =>
                            state.updateLife((l) => ({
                              ...l,
                              indicators: l.indicators.map((x) =>
                                x.id === i.id
                                  ? {
                                      ...x,
                                      target:
                                        Number(e.target.value) > 0
                                          ? Number(e.target.value)
                                          : undefined,
                                    }
                                  : x,
                              ),
                            }))
                          }
                        />
                      </label>
                    </div>
                  )}
                </div>
              ))}
          </section>
        ))}
        <section className="rounded-xl border border-line p-3">
          <h3 className="font-bold">Свой показатель</h3>
          <label>
            Название
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              Сфера
              <select
                value={sphere}
                onChange={(e) => setSphere(e.target.value as Sphere)}
              >
                {Object.entries(state.life.sphereNames).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Единица
              <input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </label>
          </div>
          <button
            className="life-button mt-3"
            disabled={!name.trim()}
            onClick={() => {
              state.updateLife((l) => ({
                ...l,
                indicators: [
                  ...l.indicators,
                  {
                    id: uid(),
                    name: name.trim(),
                    sphere,
                    unit,
                    kind: "number",
                    enabled: true,
                    importance: "personal",
                  },
                ],
              }));
              setName("");
            }}
          >
            Добавить показатель
          </button>
        </section>
        <details>
          <summary>Связь с картой жизни</summary>
          {Object.entries(state.life.areaSpheres).map(([area, value]) => (
            <label key={area}>
              {
                (
                  {
                    health: "Здоровье",
                    family: "Семья",
                    friends: "Друзья",
                    career: "Карьера",
                    finance: "Финансы",
                    spirit: "Дух и творчество",
                    growth: "Развитие",
                    joy: "Радость",
                  } as Record<string, string>
                )[area]
              }
              <select
                value={value}
                onChange={(e) =>
                  state.updateLife((l) => ({
                    ...l,
                    areaSpheres: {
                      ...l.areaSpheres,
                      [area]: e.target.value as Sphere,
                    },
                  }))
                }
              >
                {Object.entries(state.life.sphereNames).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </details>
        <p className="text-xs text-muted">
          Настройки сохраняются сразу. Отключение не удаляет историю. Игровая
          батарейка не связана с оценкой самочувствия.
        </p>
      </div>
    </BottomSheet>
  );
}

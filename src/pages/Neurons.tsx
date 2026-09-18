import { useEffect, useMemo, useRef, useState } from "react";
import type { LifeOSState } from "../hooks/useLifeOS";
import { Card } from "../components/ui";
import { Header } from "../components/Header";
import { BottomSheet } from "../components/mobile/BottomSheet";
import { dateKey, uid } from "../lib/life/model";
import { neuronsAt, neuronLinks, neuronPosition } from "../lib/life/neurons";
export function NeuronsPage({
  state,
  userName,
}: {
  state: LifeOSState;
  userName: string;
}) {
  const today = dateKey();
  const months = useMemo(() => {
    const first =
      state.life.directions.map((d) => d.createdAt.slice(0, 7)).sort()[0] ??
      today.slice(0, 7);
    const out: string[] = [];
    let d = new Date(`${first}-01T12:00:00`);
    while (dateKey(d).slice(0, 7) <= today.slice(0, 7)) {
      out.push(dateKey(d).slice(0, 7));
      d.setMonth(d.getMonth() + 1);
    }
    return out;
  }, [state.life.directions, today]);
  const [month, setMonth] = useState(today.slice(0, 7));
  const end =
    month === today.slice(0, 7)
      ? today
      : dateKey(
          new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
        );
  const nodes = useMemo(
    () => neuronsAt(state.life, state.habitsAll, end),
    [state.life, state.habitsAll, end],
  );
  const links = useMemo(() => neuronLinks(nodes), [nodes]);
  const [selected, setSelected] = useState<string | null>(null);
  const active = nodes.find((n) => n.id === selected);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );
  const canvas = useRef<HTMLCanvasElement>(null);
  const [create, setCreate] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [tags, setTags] = useState("");
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const paint = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      el.width = w * dpr;
      el.height = h * dpr;
      const ctx = el.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
      ctx.translate(w / 2 + offset.x, h / 2 + offset.y);
      const scale = Math.min(w / 700, h / 560) * zoom;
      ctx.scale(scale, scale);
      ctx.translate(-350, -280);
      for (const link of links) {
        const a = neuronPosition(link.a),
          b = neuronPosition(link.b);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(
          (a.x + b.x) / 2 + 15,
          (a.y + b.y) / 2 - 15,
          b.x,
          b.y,
        );
        ctx.strokeStyle = "rgba(123,63,228,.18)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      for (const n of nodes) {
        const p = neuronPosition(n.id);
        const r = 7 + n.strength * 24;
        const alpha = 0.4 + n.recent * 0.6;
        for (let i = 0; i < 2 + Math.floor(n.strength * 8); i++) {
          const a = i * 2.399;
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
          ctx.lineTo(
            p.x + Math.cos(a) * (r + 12),
            p.y + Math.sin(a) * (r + 12),
          );
          ctx.strokeStyle = `rgba(123,63,228,${alpha * 0.45})`;
          ctx.stroke();
        }
        const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r * 2);
        glow.addColorStop(0, `rgba(123,63,228,${alpha * 0.35})`);
        glow.addColorStop(1, "rgba(123,63,228,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(123,63,228,${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (n.id === selected) {
          ctx.strokeStyle = "#5b21b6";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.font = '600 12px "Plus Jakarta Sans",sans-serif';
        ctx.fillStyle = "#1a1a2e";
        ctx.textAlign = "center";
        ctx.fillText(
          n.name.length > 22 ? n.name.slice(0, 21) + "…" : n.name,
          p.x,
          p.y + r + 28,
        );
      }
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(el);
    return () => ro.disconnect();
  }, [nodes, links, zoom, offset, selected]);
  return (
    <div>
      <Header
        greeting="Нейроны"
        subtitle="История того, что ты развивал в себе"
        userName={userName}
        streak={state.streak}
        diamonds={state.diamonds}
        dailyCharge={state.dailyCharge}
        visitStreak={state.visitStreak}
        diamondHistory={state.diamondHistory}
      />
      <Card>
        <p className="life-muted">
          Нейронная сеть здесь — метафора обучения и развития, а не изображение
          мозга. Повторение, время и регулярность укрепляют карту. Одно
          выполнение не означает появление отдельного нейрона.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            className="life-button secondary"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            aria-label="Увеличить карту"
          >
            +
          </button>
          <button
            className="life-button secondary"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            aria-label="Уменьшить карту"
          >
            −
          </button>
          <button
            className="life-button secondary"
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
          >
            Вся карта
          </button>
          <button
            className="life-button ml-auto"
            onClick={() => setCreate(true)}
          >
            Добавить направление
          </button>
        </div>
        {!nodes.length && (
          <p className="mt-4 life-muted">
            В этом периоде ещё нет направлений. Добавь привычку или своё
            длительное направление.
          </p>
        )}
        <canvas
          ref={canvas}
          className="mt-3 h-[380px] w-full touch-none rounded-2xl bg-canvas sm:h-[500px]"
          aria-label={`Карта развития: ${nodes.length} направлений. Список доступен ниже.`}
          role="img"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              ox: offset.x,
              oy: offset.y,
            };
          }}
          onPointerMove={(e) => {
            if (drag.current)
              setOffset({
                x: drag.current.ox + e.clientX - drag.current.x,
                y: drag.current.oy + e.clientY - drag.current.y,
              });
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            if (
              d &&
              Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < 6
            ) {
              const rect = e.currentTarget.getBoundingClientRect();
              const scale =
                Math.min(rect.width / 700, rect.height / 560) * zoom;
              const x =
                  (e.clientX - rect.left - rect.width / 2 - offset.x) / scale +
                  350,
                y =
                  (e.clientY - rect.top - rect.height / 2 - offset.y) / scale +
                  280;
              const hit = nodes.find((n) => {
                const p = neuronPosition(n.id);
                return Math.hypot(p.x - x, p.y - y) < 20 + n.strength * 24;
              });
              setSelected(hit?.id ?? null);
            }
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        />
        <div className="life-form mt-4">
          <label>
            Показать меня в месяце
            <input
              type="month"
              min={months[0]}
              max={today.slice(0, 7)}
              value={month}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
            />
          </label>
          <input
            aria-label="История развития по месяцам"
            type="range"
            min="0"
            max={Math.max(0, months.length - 1)}
            value={Math.max(0, months.indexOf(month))}
            onChange={(e) => setMonth(months[Number(e.target.value)])}
            className="mt-3 w-full accent-brand"
          />
          <div className="flex justify-between text-xs text-muted">
            <span>{months[0]}</span>
            <strong>{month}</strong>
            <span>{months.at(-1)}</span>
          </div>
        </div>
      </Card>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {nodes.map((n) => (
          <button
            key={n.id}
            className={`rounded-2xl border p-4 text-left ${selected === n.id ? "border-brand bg-brand-soft" : "border-line bg-surface"}`}
            onClick={() => setSelected(n.id)}
          >
            <p className="font-bold">{n.name}</p>
            <p className="life-muted">
              {n.activeDays} активных дней · {Math.round(n.totalMinutes)} мин
            </p>
            <p className="life-muted">
              {n.finished
                ? "Завершено"
                : n.archived
                  ? "В истории"
                  : n.recent
                    ? "Сейчас активно"
                    : "Часть твоего пути"}
            </p>
            <div
              className="mt-2 flex flex-wrap gap-1"
              aria-label="Периоды активности"
            >
              {months.map((m) => (
                <span
                  key={m}
                  title={`${m}: ${n.dates.filter((d) => d.startsWith(m)).length} дней`}
                  className={`h-2 w-2 rounded-sm ${n.dates.some((d) => d.startsWith(m)) ? "bg-brand" : "bg-canvas"}`}
                />
              ))}
            </div>
          </button>
        ))}
      </div>
      {active && (
        <Card className="mt-4">
          <h3 className="font-extrabold">{active.name}</h3>
          <p className="life-muted">
            Начало: {active.createdAt.slice(0, 10)} · лучшая серия {active.best}{" "}
            дней
          </p>
          <p className="life-muted mt-2">
            Размер учитывает дни, длину истории, время, серии, регулярность и
            важность. Яркость отражает последние 28 дней.
          </p>
          {links
            .filter((l) => l.a === active.id || l.b === active.id)
            .map((l) => (
              <p key={l.a + l.b} className="mt-2 text-sm">
                ↔{" "}
                {
                  nodes.find((n) => n.id === (l.a === active.id ? l.b : l.a))
                    ?.name
                }
                : {l.reasons.join(", ")}
              </p>
            ))}
          <h4 className="mt-3 font-bold">История направления</h4>
          {state.life.directions
            .find((d) => d.id === active.id)
            ?.versions.filter((v) => v.at.slice(0, 10) <= end)
            .map((v, i) => (
              <p key={i} className="life-muted">
                {v.at.slice(0, 10)} · {v.name}
                {v.archived
                  ? " · сохранено в истории"
                  : v.finished
                    ? " · завершено"
                    : ""}
              </p>
            ))}
          <button
            className="mt-3 min-h-11 text-xs text-muted"
            onClick={() => {
              if (
                window.confirm(
                  "Полностью удалить историю этого направления из нейронной карты? Это нельзя отменить.",
                )
              ) {
                state.updateLife((l) => ({
                  ...l,
                  directions: l.directions.filter((d) => d.id !== active.id),
                  hiddenDirectionIds: [
                    ...(l.hiddenDirectionIds ?? []),
                    active.id,
                  ],
                }));
                setSelected(null);
              }
            }}
          >
            Удалить историю направления
          </button>
        </Card>
      )}
      <BottomSheet
        open={create}
        onClose={() => setCreate(false)}
        title="Длительное направление"
      >
        <div className="life-form space-y-3">
          <label>
            Название
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Связанная цель
            <select value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="">Без цели</option>
              {state.goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Теги через запятую
            <input value={tags} onChange={(e) => setTags(e.target.value)} />
          </label>
          <button
            className="life-button"
            disabled={!name.trim()}
            onClick={() => {
              state.updateLife((l) => ({
                ...l,
                directions: [
                  ...l.directions,
                  {
                    id: uid(),
                    habitIds: [],
                    createdAt: new Date().toISOString(),
                    versions: [
                      {
                        at: new Date().toISOString(),
                        name: name.trim(),
                        goalId: goal || undefined,
                        tags: tags
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      },
                    ],
                  },
                ],
              }));
              setCreate(false);
              setName("");
            }}
          >
            Добавить направление
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

import {
  LIFE_AREA_MAX_HABITS,
  LIFE_AREAS,
  lifeAreaHabitScore,
  type LifeArea,
  type LifeAreaId,
} from '../data/lifeMap'

type Props = {
  /** Оценка 0–8 = число привычек */
  scores: Record<LifeAreaId, number>
  /** Какие аспекты показывать (по умолчанию все) */
  areas?: LifeArea[]
  selectedId?: LifeAreaId | null
  onSelect: (id: LifeAreaId) => void
}

const CX = 200
const CY = 200
const R_MAX = 118
const R_RIM_INNER = 122
const R_RIM_OUTER = 138
const R_LABEL = 158
const SCALE = LIFE_AREA_MAX_HABITS
const RING_MARKS = [2, 4, 6, 8] as const

function polar(r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
}

function sectorPath(rInner: number, rOuter: number, a0: number, a1: number) {
  const p0 = polar(rOuter, a0)
  const p1 = polar(rOuter, a1)
  const p2 = polar(rInner, a1)
  const p3 = polar(rInner, a0)
  const large = a1 - a0 > 180 ? 1 : 0
  return [
    `M ${p0.x} ${p0.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${p3.x} ${p3.y}`,
    'Z',
  ].join(' ')
}

function wedgePath(r: number, a0: number, a1: number) {
  const p1 = polar(r, a0)
  const p2 = polar(r, a1)
  const large = a1 - a0 > 180 ? 1 : 0
  return [
    `M ${CX} ${CY}`,
    `L ${p1.x} ${p1.y}`,
    `A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`,
    'Z',
  ].join(' ')
}

export function LifeWheel({
  scores,
  areas = LIFE_AREAS,
  selectedId,
  onSelect,
}: Props) {
  const list = areas.length ? areas : LIFE_AREAS
  const n = list.length
  const step = 360 / n
  const scorePts = list.map((area, i) => {
    const score = lifeAreaHabitScore(scores[area.id] ?? 0)
    const angle = i * step
    return polar((score / SCALE) * R_MAX, angle)
  })
  const poly = scorePts.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <svg
      viewBox="0 0 400 400"
      className="mx-auto h-auto w-full max-w-[440px] select-none"
      role="img"
      aria-label="Колесо баланса жизни"
    >
      <circle cx={CX} cy={CY} r={R_RIM_OUTER + 4} fill="#fafafa" />
      <circle cx={CX} cy={CY} r={R_MAX} fill="#fff" stroke="#e5e7eb" strokeWidth={1} />

      {RING_MARKS.map((v) => (
        <circle
          key={v}
          cx={CX}
          cy={CY}
          r={(v / SCALE) * R_MAX}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={v === SCALE ? 1.2 : 0.8}
        />
      ))}

      {list.map((area, i) => {
        const a0 = i * step - step / 2
        const a1 = i * step + step / 2
        const angle = i * step
        const selected = selectedId === area.id
        const tip = polar(R_MAX, angle)
        const labelPos = polar(R_LABEL, angle)
        const score = lifeAreaHabitScore(scores[area.id] ?? 0)

        let labelRotate = angle
        if (angle > 90 && angle < 270) labelRotate = angle + 180

        return (
          <g key={area.id}>
            <path
              d={wedgePath(R_RIM_OUTER, a0, a1)}
              fill={selected ? `${area.color}22` : 'transparent'}
              className="cursor-pointer transition-opacity hover:opacity-90"
              onClick={() => onSelect(area.id)}
            >
              <title>
                {area.title} · {score}/{SCALE} привычек — нажми, чтобы добавить
              </title>
            </path>

            <path
              d={sectorPath(R_RIM_INNER, R_RIM_OUTER, a0, a1)}
              fill={area.color}
              className="pointer-events-none"
              opacity={selected ? 1 : 0.92}
            />

            <line
              x1={CX}
              y1={CY}
              x2={tip.x}
              y2={tip.y}
              stroke="#d1d5db"
              strokeWidth={1}
              className="pointer-events-none"
            />

            {RING_MARKS.map((v) => {
              const p = polar((v / SCALE) * R_MAX, angle)
              return (
                <text
                  key={v}
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none fill-muted"
                  style={{ fontSize: 7, fontWeight: 600 }}
                >
                  {v}
                </text>
              )
            })}

            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${labelRotate} ${labelPos.x} ${labelPos.y})`}
              className="pointer-events-none"
              style={{
                fontSize: area.rim.length > 18 ? 6.5 : 7.5,
                fontWeight: 800,
                fill: area.color,
                letterSpacing: '0.02em',
              }}
            >
              {area.rim}
            </text>

            {score > 0 && (
              <circle
                cx={scorePts[i].x}
                cy={scorePts[i].y}
                r={selected ? 5 : 3.5}
                fill={area.color}
                stroke="#fff"
                strokeWidth={1.5}
                className="pointer-events-none"
              />
            )}
          </g>
        )
      })}

      {n >= 3 && (
        <polygon
          points={poly}
          fill="rgba(123, 63, 228, 0.18)"
          stroke="#7b3fe4"
          strokeWidth={2}
          className="pointer-events-none"
        />
      )}

      <circle cx={CX} cy={CY} r={10} fill="#fff" stroke="#7b3fe4" strokeWidth={2} />
      <circle cx={CX} cy={CY} r={3} fill="#7b3fe4" />
    </svg>
  )
}

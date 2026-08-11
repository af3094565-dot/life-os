/** Матрица целей 9×9 (мандала): центр → 8 направлений → привычки */

export type MandalaMatrix = {
  /** Большая цель в центре */
  core: string
  /** 8 направлений вокруг центра: NW N NE W E SW S SE */
  pillars: string[]
  /** 8×8 привычек: для каждого направления — 8 ячеек вокруг него */
  habits: string[][]
}

/** Порядок направлений: NW, N, NE, W, E, SW, S, SE */
export const PILLAR_LABELS = [
  'СЗ',
  'С',
  'СВ',
  'З',
  'В',
  'ЮЗ',
  'Ю',
  'ЮВ',
] as const

/** Цвета аспектов — привычки окрашены по направлению */
export const PILLAR_COLORS: {
  bg: string
  soft: string
  text: string
  ring: string
  label: string
}[] = [
  { bg: '#fef3c7', soft: '#fffbeb', text: '#92400e', ring: '#fcd34d', label: 'янтарный' },
  { bg: '#dbeafe', soft: '#eff6ff', text: '#1e40af', ring: '#93c5fd', label: 'синий' },
  { bg: '#fce7f3', soft: '#fdf2f8', text: '#9d174d', ring: '#f9a8d4', label: 'розовый' },
  { bg: '#dcfce7', soft: '#f0fdf4', text: '#166534', ring: '#86efac', label: 'зелёный' },
  { bg: '#ede9fe', soft: '#f5f3ff', text: '#5b21b6', ring: '#c4b5fd', label: 'фиолетовый' },
  { bg: '#ffedd5', soft: '#fff7ed', text: '#9a3412', ring: '#fdba74', label: 'оранжевый' },
  { bg: '#e0e7ff', soft: '#eef2ff', text: '#3730a3', ring: '#a5b4fc', label: 'индиго' },
  { bg: '#ccfbf1', soft: '#f0fdfa', text: '#115e59', ring: '#5eead4', label: 'бирюзовый' },
]

export function pillarColor(index: number) {
  return PILLAR_COLORS[((index % 8) + 8) % 8]
}

export function emptyMatrix(): MandalaMatrix {
  return {
    core: '',
    pillars: Array.from({ length: 8 }, () => ''),
    habits: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => '')),
  }
}

export function normalizeMatrix(m?: Partial<MandalaMatrix> | null): MandalaMatrix {
  const base = emptyMatrix()
  if (!m) return base
  return {
    core: m.core ?? '',
    pillars: Array.from({ length: 8 }, (_, i) => m.pillars?.[i] ?? ''),
    habits: Array.from({ length: 8 }, (_, pi) =>
      Array.from({ length: 8 }, (_, hi) => m.habits?.[pi]?.[hi] ?? ''),
    ),
  }
}

/** Какой блок 3×3 на поле 9×9 соответствует направлению */
export function blockOrigin(pillarIndex: number): { row: number; col: number } {
  // 0 NW, 1 N, 2 NE, 3 W, 4 E, 5 SW, 6 S, 7 SE
  const map: [number, number][] = [
    [0, 0],
    [0, 3],
    [0, 6],
    [3, 0],
    [3, 6],
    [6, 0],
    [6, 3],
    [6, 6],
  ]
  const [row, col] = map[pillarIndex] ?? [0, 0]
  return { row, col }
}

/** В центре 3×3: локальные координаты направления (кроме 1,1 = core) */
export function centerRingLocal(pillarIndex: number): { lr: number; lc: number } {
  const map: [number, number][] = [
    [0, 0], // NW
    [0, 1], // N
    [0, 2], // NE
    [1, 0], // W
    [1, 2], // E
    [2, 0], // SW
    [2, 1], // S
    [2, 2], // SE
  ]
  const [lr, lc] = map[pillarIndex] ?? [0, 0]
  return { lr, lc }
}

/** 8 локальных позиций привычек вокруг центра блока (без центра) */
export const HABIT_LOCAL_SLOTS: { lr: number; lc: number }[] = [
  { lr: 0, lc: 0 },
  { lr: 0, lc: 1 },
  { lr: 0, lc: 2 },
  { lr: 1, lc: 0 },
  { lr: 1, lc: 2 },
  { lr: 2, lc: 0 },
  { lr: 2, lc: 1 },
  { lr: 2, lc: 2 },
]

export type MandalaCellKind =
  | { kind: 'core' }
  | { kind: 'pillar'; pillarIndex: number; inCenter: boolean }
  | { kind: 'habit'; pillarIndex: number; habitIndex: number }

export function cellAt(row: number, col: number): MandalaCellKind {
  // Center block 3..5
  if (row >= 3 && row <= 5 && col >= 3 && col <= 5) {
    const lr = row - 3
    const lc = col - 3
    if (lr === 1 && lc === 1) return { kind: 'core' }
    for (let i = 0; i < 8; i++) {
      const p = centerRingLocal(i)
      if (p.lr === lr && p.lc === lc) return { kind: 'pillar', pillarIndex: i, inCenter: true }
    }
  }

  for (let pi = 0; pi < 8; pi++) {
    const { row: br, col: bc } = blockOrigin(pi)
    if (row < br || row > br + 2 || col < bc || col > bc + 2) continue
    const lr = row - br
    const lc = col - bc
    if (lr === 1 && lc === 1) return { kind: 'pillar', pillarIndex: pi, inCenter: false }
    const hi = HABIT_LOCAL_SLOTS.findIndex((s) => s.lr === lr && s.lc === lc)
    if (hi >= 0) return { kind: 'habit', pillarIndex: pi, habitIndex: hi }
  }

  return { kind: 'core' }
}

export function habitSlotKey(pillarIndex: number, habitIndex: number): string {
  return `h-${pillarIndex}-${habitIndex}`
}

export function filledHabitTitles(matrix: MandalaMatrix): {
  title: string
  pillarIndex: number
  habitIndex: number
  pillarTitle: string
  slot: string
}[] {
  const out: {
    title: string
    pillarIndex: number
    habitIndex: number
    pillarTitle: string
    slot: string
  }[] = []
  for (let pi = 0; pi < 8; pi++) {
    const pillarTitle = matrix.pillars[pi]?.trim() || `Направление ${pi + 1}`
    for (let hi = 0; hi < 8; hi++) {
      const title = matrix.habits[pi]?.[hi]?.trim()
      if (title) {
        out.push({
          title,
          pillarIndex: pi,
          habitIndex: hi,
          pillarTitle,
          slot: habitSlotKey(pi, hi),
        })
      }
    }
  }
  return out
}

export function matrixProgress(matrix: MandalaMatrix): {
  pillarsFilled: number
  habitsFilled: number
  pct: number
} {
  const pillarsFilled = matrix.pillars.filter((p) => p.trim()).length
  const habitsFilled = filledHabitTitles(matrix).length
  // вес: ядро обязательно, направления и привычки
  const core = matrix.core.trim() ? 1 : 0
  const score = core * 20 + pillarsFilled * 5 + Math.min(habitsFilled, 24) * 1.5
  const pct = Math.min(100, Math.round(score))
  return { pillarsFilled, habitsFilled, pct }
}

export const MATRIX_EMOJIS = ['🎯', '💪', '🧠', '🏠', '📚', '💰', '❤️', '⚡']

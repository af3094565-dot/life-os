import type { DesktopMoodboardArrow, DesktopMoodboardSticker } from '../../../hooks/useLifeOS'

export const WORLD_EXTENT = 40000
export const WORLD_OFFSET = -20000

export const STICKER_BG_COLORS = ['#fde68a', '#fecaca', '#c7d2fe', '#bbf7d0', '#fbcfe8', '#bae6fd', '#e9d5ff', '#fef3c7']
export const STICKER_TEXT_COLORS = ['#1a1a2e', '#ffffff', '#374151', '#7c2d12', '#1e3a8a', '#14532d']

export const DEFAULT_STICKER_WIDTH = 160
export const DEFAULT_STICKER_HEIGHT = 100
export const MIN_STICKER_WIDTH = 80
export const MAX_STICKER_WIDTH = 480
export const MIN_STICKER_HEIGHT = 60
export const MAX_STICKER_HEIGHT = 360
export const RESIZE_STEP = 20

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function stickerCenter(s: DesktopMoodboardSticker) {
  return { x: s.x + s.width / 2, y: s.y + s.height / 2 }
}

/** Точка на границе прямоугольника стикера в направлении target. */
export function stickerEdgePoint(from: DesktopMoodboardSticker, target: { x: number; y: number }) {
  const cx = from.x + from.width / 2
  const cy = from.y + from.height / 2
  const dx = target.x - cx
  const dy = target.y - cy

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { x: cx, y: cy }
  }

  const hw = from.width / 2
  const hh = from.height / 2
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  const scale = absDx * hh > absDy * hw ? hw / absDx : hh / absDy
  return { x: cx + dx * scale, y: cy + dy * scale }
}

export function arrowEndpoints(from: DesktopMoodboardSticker, to: DesktopMoodboardSticker) {
  const toCenter = stickerCenter(to)
  const fromCenter = stickerCenter(from)
  return {
    from: stickerEdgePoint(from, toCenter),
    to: stickerEdgePoint(to, fromCenter),
  }
}

export function screenToWorld(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  panX: number,
  panY: number,
  zoom: number,
) {
  return {
    x: (clientX - rect.left - panX) / zoom,
    y: (clientY - rect.top - panY) / zoom,
  }
}

export function findGoalParentStickerId(
  stickerId: string,
  stickers: DesktopMoodboardSticker[],
  arrows: DesktopMoodboardArrow[],
): string | undefined {
  const stickerMap = new Map(stickers.map((s) => [s.id, s]))
  for (const ar of arrows) {
    if (ar.toStickerId !== stickerId) continue
    const from = stickerMap.get(ar.fromStickerId)
    if (from?.kind === 'goal' && from.goalId) return from.id
  }
  return undefined
}

/** Ищет goalId вверх по стрелкам: цель → привычка → привычка… */
export function resolveGoalIdAlongArrows(
  stickerId: string,
  stickers: DesktopMoodboardSticker[],
  arrows: DesktopMoodboardArrow[],
  habitGoalById?: Map<string, string | undefined>,
  visited: Set<string> = new Set(),
): string | undefined {
  if (visited.has(stickerId)) return undefined
  visited.add(stickerId)

  const stickerMap = new Map(stickers.map((s) => [s.id, s]))
  const st = stickerMap.get(stickerId)
  if (!st) return undefined

  if (st.kind === 'goal' && st.goalId) return st.goalId

  if (st.kind === 'habit' && st.habitId) {
    const fromHabit = habitGoalById?.get(st.habitId)
    if (fromHabit) return fromHabit
  }

  for (const ar of arrows) {
    if (ar.toStickerId !== stickerId) continue
    const found = resolveGoalIdAlongArrows(ar.fromStickerId, stickers, arrows, habitGoalById, visited)
    if (found) return found
  }
  return undefined
}

export function resolveGoalIdForHabitSticker(
  stickerId: string,
  stickers: DesktopMoodboardSticker[],
  arrows: DesktopMoodboardArrow[],
  parentStickerId?: string,
  habitGoalById?: Map<string, string | undefined>,
): string | undefined {
  if (parentStickerId) {
    const fromParent = resolveGoalIdAlongArrows(parentStickerId, stickers, arrows, habitGoalById)
    if (fromParent) return fromParent
    const parent = stickers.find((s) => s.id === parentStickerId)
    if (parent?.goalId) return parent.goalId
  }
  return resolveGoalIdAlongArrows(stickerId, stickers, arrows, habitGoalById)
}

export function childStickerIdsFromGoal(
  goalStickerId: string,
  arrows: DesktopMoodboardArrow[],
): string[] {
  return arrows.filter((ar) => ar.fromStickerId === goalStickerId).map((ar) => ar.toStickerId)
}

type Rect = { x: number; y: number; width: number; height: number }

function rectsOverlap(a: Rect, b: Rect, gap = 28) {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  )
}

/** Ищет свободное место на доске рядом с существующими стикерами / центром вида. */
export function findEmptyStickerSlot(
  stickers: Array<Pick<DesktopMoodboardSticker, 'x' | 'y' | 'width' | 'height'>>,
  width: number,
  height: number,
  preferredCenter?: { x: number; y: number },
  occupiedExtra: Rect[] = [],
): { x: number; y: number } {
  const occupied: Rect[] = [
    ...stickers.map((s) => ({ x: s.x, y: s.y, width: s.width, height: s.height })),
    ...occupiedExtra,
  ]

  let originX: number
  let originY: number

  if (preferredCenter) {
    originX = preferredCenter.x
    originY = preferredCenter.y
  } else if (occupied.length > 0) {
    const cx = occupied.reduce((sum, r) => sum + r.x + r.width / 2, 0) / occupied.length
    const cy = occupied.reduce((sum, r) => sum + r.y + r.height / 2, 0) / occupied.length
    originX = cx
    originY = cy
  } else {
    return { x: 400, y: 400 }
  }

  const candidate = (cx: number, cy: number) => ({
    x: cx - width / 2,
    y: cy - height / 2,
    width,
    height,
  })

  const fits = (rect: Rect) => !occupied.some((o) => rectsOverlap(rect, o))

  const first = candidate(originX, originY)
  if (fits(first)) return { x: first.x, y: first.y }

  // Спираль вокруг центра / ближайших стикеров
  const step = Math.max(width, height) + 36
  for (let ring = 1; ring <= 24; ring++) {
    for (let i = 0; i < ring * 8; i++) {
      const angle = (i / (ring * 8)) * Math.PI * 2
      const cx = originX + Math.cos(angle) * step * ring
      const cy = originY + Math.sin(angle) * step * ring
      const rect = candidate(cx, cy)
      if (fits(rect)) return { x: rect.x, y: rect.y }
    }
  }

  // Fallback: справа от самого правого стикера
  if (occupied.length > 0) {
    const right = Math.max(...occupied.map((r) => r.x + r.width))
    const top = Math.min(...occupied.map((r) => r.y))
    return { x: right + 48, y: top }
  }

  return { x: first.x, y: first.y }
}

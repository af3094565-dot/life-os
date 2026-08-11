import {
  Hand,
  Minus,
  MousePointer2,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  Type,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Goal, Habit } from '../../../data/seed'
import type {
  DesktopMoodboardArrow,
  DesktopMoodboardSticker,
  DesktopMoodboardStickerKind,
  DesktopMoodboardState,
  DesktopMoodboardView,
  DesktopWidgetSize,
  NewGoalInput,
  NewHabitInput,
} from '../../../hooks/useLifeOS'
import { GoalFormModal } from '../../GoalFormModal'
import { HabitFormModal } from '../../HabitFormModal'
import { LIFE_GOALS_MAP_ID, parseLifeMapGoalArea } from '../../../data/lifeMap'
import { todayKey } from '../../../lib/habitLogic'
import {
  WORLD_EXTENT,
  WORLD_OFFSET,
  STICKER_BG_COLORS,
  STICKER_TEXT_COLORS,
  RESIZE_STEP,
  MIN_STICKER_WIDTH,
  MAX_STICKER_WIDTH,
  MIN_STICKER_HEIGHT,
  MAX_STICKER_HEIGHT,
  arrowEndpoints,
  clamp,
  findEmptyStickerSlot,
  screenToWorld,
  stickerEdgePoint,
} from './moodboardUtils'
import { DeleteLinkedStickerModal } from './DeleteLinkedStickerModal'
import { StickerEditModal } from './StickerEditModal'

type CanvasMode = 'select' | 'pan' | 'place-note' | 'arrow'

type Props = {
  widgetSize: DesktopWidgetSize
  moodboard: DesktopMoodboardState
  addSticker: (input?: {
    x?: number
    y?: number
    text?: string
    color?: string
    textColor?: string
    width?: number
    height?: number
    kind?: DesktopMoodboardStickerKind
    goalId?: string
    habitId?: string
    emoji?: string
  }) => { ok: boolean; stickerId?: string; reason?: string }
  updateSticker: (stickerId: string, patch: Partial<DesktopMoodboardSticker>) => void
  deleteSticker: (stickerId: string) => void
  addArrow: (input: {
    fromStickerId: string
    toStickerId: string
    color?: string
  }) => { ok: boolean; arrowId?: string; reason?: string }
  updateArrow: (arrowId: string, patch: Partial<DesktopMoodboardArrow>) => void
  deleteArrow: (arrowId: string) => void
  updateView: (patch: Partial<DesktopMoodboardView>) => void
  habits: Habit[]
  goals: Goal[]
  diamonds: number
  addGoal: (input: NewGoalInput) => { ok: boolean; reason?: string; goalId?: string }
  addHabit: (input: NewHabitInput) => { ok: boolean; reason?: string; habitId?: string }
  convertStickerToGoal: (stickerId: string) => { ok: boolean; reason?: string }
  convertStickerToHabit: (
    stickerId: string,
    opts?: { parentStickerId?: string; emoji?: string },
  ) => { ok: boolean; reason?: string }
  convertGoalChildrenToHabits: (goalStickerId: string) => { ok: boolean; created: number; reason?: string }
  updateHabit: (
    habitId: string,
    input: {
      name: string
      emoji: string
      priority: Habit['priority']
      targetDays: Habit['targetDays']
      startDate: string
      timesPerWeek: number
      reminderTime?: string
    },
  ) => { ok: boolean; reason?: string }
  updateGoal: (goalId: string, patch: { title?: string }) => void
  deleteHabit: (habitId: string) => void
  deleteGoal: (goalId: string) => void
}

function moodboardHeight(size: DesktopWidgetSize) {
  switch (size) {
    case 'minimal':
      return 'h-[280px]'
    case 'medium':
      return 'h-[380px]'
    case 'large':
      return 'h-[520px]'
  }
}

function pickRandomColor(palette: string[]) {
  return palette[Math.floor(Math.random() * palette.length)] ?? palette[0] ?? '#fde68a'
}

function stickerAtPoint(
  stickers: DesktopMoodboardSticker[],
  world: { x: number; y: number },
): DesktopMoodboardSticker | null {
  for (let i = stickers.length - 1; i >= 0; i--) {
    const s = stickers[i]!
    if (world.x >= s.x && world.x <= s.x + s.width && world.y >= s.y && world.y <= s.y + s.height) {
      return s
    }
  }
  return null
}

export function MoodboardWidget({
  widgetSize,
  moodboard,
  addSticker,
  updateSticker,
  deleteSticker,
  addArrow,
  deleteArrow,
  updateView,
  habits,
  goals,
  diamonds,
  addGoal,
  addHabit,
  convertStickerToGoal,
  convertStickerToHabit,
  convertGoalChildrenToHabits,
  updateHabit,
  updateGoal,
  deleteHabit,
  deleteGoal,
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const viewPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [mode, setMode] = useState<CanvasMode>('select')
  const [view, setView] = useState<DesktopMoodboardView>(() => ({
    panX: moodboard.view?.panX ?? 0,
    panY: moodboard.view?.panY ?? 0,
    zoom: moodboard.view?.zoom ?? 1,
  }))

  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null)
  const [arrowFromId, setArrowFromId] = useState<string | null>(null)
  const [arrowDraftTo, setArrowDraftTo] = useState<{ x: number; y: number } | null>(null)
  const [arrowHoverStickerId, setArrowHoverStickerId] = useState<string | null>(null)
  const [placeError, setPlaceError] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [goalFormOpen, setGoalFormOpen] = useState(false)
  const [habitFormOpen, setHabitFormOpen] = useState(false)
  const [deleteConfirmStickerId, setDeleteConfirmStickerId] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [spaceHeld, setSpaceHeld] = useState(false)

  const panRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const dragRef = useRef<{
    stickerId: string
    offsetX: number
    offsetY: number
  } | null>(null)
  const arrowDragRef = useRef<{ fromId: string; pointerId: number } | null>(null)
  const viewRef = useRef(view)
  const stickersRef = useRef(moodboard.stickers)
  viewRef.current = view
  stickersRef.current = moodboard.stickers

  const stickerMap = useMemo(() => {
    const map = new Map<string, DesktopMoodboardSticker>()
    moodboard.stickers.forEach((s) => map.set(s.id, s))
    return map
  }, [moodboard.stickers])

  const habitMap = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits])
  const goalMap = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals])

  const selectedSticker = selectedStickerId ? stickerMap.get(selectedStickerId) : null

  const stickerLabel = (s: DesktopMoodboardSticker) => {
    if (s.text?.trim()) return s.text
    if (s.habitId) {
      const h = habitMap.get(s.habitId)
      if (h?.name) return h.name
    }
    if (s.goalId) {
      const g = goalMap.get(s.goalId)
      if (g?.title) return g.title
    }
    return s.kind === 'goal' ? 'Цель' : s.kind === 'habit' ? 'Привычка' : 'Стикер'
  }

  const handleStickerSave = (patch: {
    text: string
    color?: string
    textColor?: string
    emoji?: string
  }) => {
    if (!selectedSticker) return
    updateSticker(selectedSticker.id, {
      text: patch.text,
      color: patch.color,
      textColor: patch.textColor,
      emoji: patch.emoji,
    })
    if (selectedSticker.habitId) {
      const habit = habitMap.get(selectedSticker.habitId)
      if (habit) {
        updateHabit(selectedSticker.habitId, {
          name: patch.text,
          emoji: patch.emoji || habit.emoji,
          priority: habit.priority,
          targetDays: habit.targetDays,
          startDate: habit.startDate,
          timesPerWeek: habit.timesPerWeek,
          reminderTime: habit.reminderTime,
        })
      }
    }
    if (selectedSticker.goalId) {
      updateGoal(selectedSticker.goalId, { title: patch.text })
    }
  }

  const scheduleViewPersist = useCallback(
    (next: DesktopMoodboardView) => {
      if (viewPersistTimer.current) clearTimeout(viewPersistTimer.current)
      viewPersistTimer.current = setTimeout(() => {
        updateView(next)
      }, 400)
    },
    [updateView],
  )

  const applyView = useCallback(
    (patch: Partial<DesktopMoodboardView>) => {
      setView((prev) => {
        const next = {
          panX: patch.panX ?? prev.panX,
          panY: patch.panY ?? prev.panY,
          zoom: patch.zoom ?? prev.zoom,
        }
        scheduleViewPersist(next)
        return next
      })
    },
    [scheduleViewPersist],
  )

  useEffect(() => {
    return () => {
      if (viewPersistTimer.current) clearTimeout(viewPersistTimer.current)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setSpaceHeld(true)
      }
      if (e.key === 'Escape') {
        setArrowFromId(null)
        setArrowDraftTo(null)
        setArrowHoverStickerId(null)
        arrowDragRef.current = null
        setSearchOpen(false)
        setSearchQuery('')
        setMode('select')
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    const finishArrow = (e: PointerEvent) => {
      const drag = arrowDragRef.current
      if (!drag) {
        dragRef.current = null
        panRef.current = null
        return
      }

      const el = viewportRef.current
      const v = viewRef.current
      if (el) {
        const rect = el.getBoundingClientRect()
        const world = screenToWorld(e.clientX, e.clientY, rect, v.panX, v.panY, v.zoom)
        const target = stickerAtPoint(stickersRef.current, world)
        if (target && target.id !== drag.fromId) {
          addArrow({ fromStickerId: drag.fromId, toStickerId: target.id })
        }
      }

      arrowDragRef.current = null
      setArrowFromId(null)
      setArrowDraftTo(null)
      setArrowHoverStickerId(null)
      setMode('select')
      dragRef.current = null
      panRef.current = null
    }

    window.addEventListener('pointerup', finishArrow)
    return () => window.removeEventListener('pointerup', finishArrow)
  }, [addArrow])

  const isPanning = mode === 'pan' || spaceHeld
  const isPlacing = mode === 'place-note'

  const viewportCenterWorld = useCallback(() => {
    const el = viewportRef.current
    if (!el) return { x: 400, y: 400 }
    const rect = el.getBoundingClientRect()
    return screenToWorld(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      rect,
      view.panX,
      view.panY,
      view.zoom,
    )
  }, [view.panX, view.panY, view.zoom])

  const handleGoalFormSubmit = (
    input: NewGoalInput,
    attachedHabits?: Array<{ name: string; emoji: string }>,
  ) => {
    const goalResult = addGoal(input)
    if (!goalResult.ok || !goalResult.goalId) {
      return { ok: false, reason: goalResult.reason ?? 'Не удалось создать цель' }
    }

    const createdHabits: Array<{ habitId: string; name: string; emoji: string }> = []
    for (const h of attachedHabits ?? []) {
      const habitResult = addHabit({
        name: h.name,
        emoji: h.emoji || '⭐',
        priority: 'important',
        targetDays: 21,
        startDate: todayKey(),
        timesPerWeek: 7,
        goalId: goalResult.goalId,
      })
      if (habitResult.ok && habitResult.habitId) {
        createdHabits.push({
          habitId: habitResult.habitId,
          name: h.name,
          emoji: h.emoji || '⭐',
        })
      }
    }

    const center = viewportCenterWorld()
    const goalSize = { width: 180, height: 110 }
    const occupied: Array<{ x: number; y: number; width: number; height: number }> = []
    const goalPos = findEmptyStickerSlot(
      moodboard.stickers,
      goalSize.width,
      goalSize.height,
      center,
      occupied,
    )
    occupied.push({ ...goalPos, ...goalSize })

    const goalSticker = addSticker({
      x: goalPos.x,
      y: goalPos.y,
      text: input.title.trim(),
      color: '#c7d2fe',
      textColor: '#1a1a2e',
      kind: 'goal',
      goalId: goalResult.goalId,
      width: goalSize.width,
      height: goalSize.height,
    })

    if (!goalSticker.ok || !goalSticker.stickerId) {
      return { ok: false, reason: goalSticker.reason ?? 'Цель создана, но стикер не добавился' }
    }

    const goalStickerId = goalSticker.stickerId
    setSelectedStickerId(goalStickerId)

    for (const h of createdHabits) {
      const habitSize = { width: 150, height: 96 }
      const habitPos = findEmptyStickerSlot(
        moodboard.stickers,
        habitSize.width,
        habitSize.height,
        { x: goalPos.x + goalSize.width / 2, y: goalPos.y + goalSize.height / 2 },
        occupied,
      )
      occupied.push({ ...habitPos, ...habitSize })

      const habitSticker = addSticker({
        x: habitPos.x,
        y: habitPos.y,
        text: h.name,
        color: '#bbf7d0',
        textColor: '#1a1a2e',
        kind: 'habit',
        habitId: h.habitId,
        emoji: h.emoji,
        width: habitSize.width,
        height: habitSize.height,
      })
      if (habitSticker.ok && habitSticker.stickerId) {
        addArrow({ fromStickerId: goalStickerId, toStickerId: habitSticker.stickerId })
      }
    }

    setMode('select')
    return { ok: true }
  }

  const handleHabitFormSubmit = (input: NewHabitInput) => {
    const habitResult = addHabit(input)
    if (!habitResult.ok || !habitResult.habitId) {
      return { ok: false, reason: habitResult.reason ?? 'Не удалось создать привычку' }
    }

    const center = viewportCenterWorld()
    const size = { width: 150, height: 96 }
    const pos = findEmptyStickerSlot(moodboard.stickers, size.width, size.height, center)

    const sticker = addSticker({
      x: pos.x,
      y: pos.y,
      text: input.name.trim(),
      color: '#bbf7d0',
      textColor: '#1a1a2e',
      kind: 'habit',
      habitId: habitResult.habitId,
      emoji: input.emoji || '⭐',
      width: size.width,
      height: size.height,
    })

    if (sticker.ok && sticker.stickerId) {
      setSelectedStickerId(sticker.stickerId)

      if (input.goalId) {
        const goalSticker = moodboard.stickers.find(
          (s) => s.kind === 'goal' && s.goalId === input.goalId,
        )
        if (goalSticker) {
          addArrow({ fromStickerId: goalSticker.id, toStickerId: sticker.stickerId })
        }
      }
    }

    setMode('select')
    return { ok: true }
  }

  const pinchRef = useRef<{
    startDist: number
    startZoom: number
    midX: number
    midY: number
    worldX: number
    worldY: number
  } | null>(null)

  const touchDistance = (a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) => {
    const dx = a.clientX - b.clientX
    const dy = a.clientY - b.clientY
    return Math.hypot(dx, dy)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) {
      pinchRef.current = null
      return
    }
    const el = viewportRef.current
    if (!el) return
    const t0 = e.touches[0]!
    const t1 = e.touches[1]!
    const rect = el.getBoundingClientRect()
    const midX = (t0.clientX + t1.clientX) / 2 - rect.left
    const midY = (t0.clientY + t1.clientY) / 2 - rect.top
    const v = viewRef.current
    pinchRef.current = {
      startDist: Math.max(1, touchDistance(t0, t1)),
      startZoom: v.zoom,
      midX,
      midY,
      worldX: (midX - v.panX) / v.zoom,
      worldY: (midY - v.panY) / v.zoom,
    }
    // Не начинаем drag/pan стикера во время pinch
    dragRef.current = null
    panRef.current = null
    arrowDragRef.current = null
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchRef.current) return
    e.preventDefault()
    const t0 = e.touches[0]!
    const t1 = e.touches[1]!
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const midX = (t0.clientX + t1.clientX) / 2 - rect.left
    const midY = (t0.clientY + t1.clientY) / 2 - rect.top
    const dist = Math.max(1, touchDistance(t0, t1))
    const scale = dist / pinchRef.current.startDist
    const newZoom = clamp(pinchRef.current.startZoom * scale, 0.15, 3)
    applyView({
      zoom: newZoom,
      panX: midX - pinchRef.current.worldX * newZoom,
      panY: midY - pinchRef.current.worldY * newZoom,
    })
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null
  }

  /** Pinch на трекпаде приходит как wheel + ctrl/meta — обычное колесо не зумит. */
  const onViewportWheel = (e: React.WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return
    e.preventDefault()
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const midX = e.clientX - rect.left
    const midY = e.clientY - rect.top
    const v = viewRef.current
    const worldX = (midX - v.panX) / v.zoom
    const worldY = (midY - v.panY) / v.zoom
    const factor = Math.exp(-e.deltaY * 0.01)
    const newZoom = clamp(v.zoom * factor, 0.15, 3)
    applyView({
      zoom: newZoom,
      panX: midX - worldX * newZoom,
      panY: midY - worldY * newZoom,
    })
  }

  const placeKindFromMode = (): DesktopMoodboardStickerKind | null => {
    if (mode === 'place-note') return 'note'
    return null
  }

  const onViewportPointerDown = (e: React.PointerEvent) => {
    const isMiddle = e.button === 1
    const shouldPan = isPanning || isMiddle

    if (shouldPan) {
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        panX: view.panX,
        panY: view.panY,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }

    const placeKind = placeKindFromMode()
    if (placeKind) {
      const el = viewportRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const world = screenToWorld(e.clientX, e.clientY, rect, view.panX, view.panY, view.zoom)
      const result = addSticker({
        x: world.x - 80,
        y: world.y - 50,
        text: 'Стикер',
        color: pickRandomColor(STICKER_BG_COLORS),
        textColor: '#1a1a2e',
        kind: 'note',
      })
      if (!result.ok) {
        setPlaceError(result.reason ?? 'Не удалось создать')
        return
      }
      setPlaceError('')
      if (result.stickerId) setSelectedStickerId(result.stickerId)
      setMode('select')
      return
    }

    setSelectedStickerId(null)
    if (!arrowDragRef.current) {
      setArrowFromId(null)
      setArrowDraftTo(null)
    }
  }

  const onViewportPointerMove = (e: React.PointerEvent) => {
    if (panRef.current) {
      const dx = e.clientX - panRef.current.startX
      const dy = e.clientY - panRef.current.startY
      applyView({
        panX: panRef.current.panX + dx,
        panY: panRef.current.panY + dy,
      })
      return
    }

    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const world = screenToWorld(e.clientX, e.clientY, rect, view.panX, view.panY, view.zoom)

    if (arrowDragRef.current) {
      setArrowDraftTo(world)
      const hover = stickerAtPoint(moodboard.stickers, world)
      setArrowHoverStickerId(
        hover && hover.id !== arrowDragRef.current.fromId ? hover.id : null,
      )
      return
    }

    if (!dragRef.current) return
    updateSticker(dragRef.current.stickerId, {
      x: world.x - dragRef.current.offsetX,
      y: world.y - dragRef.current.offsetY,
    })
  }

  const onStickerPointerDown = (e: React.PointerEvent, sticker: DesktopMoodboardSticker) => {
    e.stopPropagation()

    if (mode === 'arrow') {
      arrowDragRef.current = { fromId: sticker.id, pointerId: e.pointerId }
      setArrowFromId(sticker.id)
      setSelectedStickerId(sticker.id)
      const el = viewportRef.current
      if (el) {
        const rect = el.getBoundingClientRect()
        setArrowDraftTo(screenToWorld(e.clientX, e.clientY, rect, view.panX, view.panY, view.zoom))
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }

    if (isPlacing) return

    setSelectedStickerId(sticker.id)
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const world = screenToWorld(e.clientX, e.clientY, rect, view.panX, view.panY, view.zoom)
    dragRef.current = {
      stickerId: sticker.id,
      offsetX: world.x - sticker.x,
      offsetY: world.y - sticker.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const resizeSticker = (delta: number) => {
    if (!selectedSticker) return
    updateSticker(selectedSticker.id, {
      width: clamp(selectedSticker.width + delta, MIN_STICKER_WIDTH, MAX_STICKER_WIDTH),
      height: clamp(selectedSticker.height + delta, MIN_STICKER_HEIGHT, MAX_STICKER_HEIGHT),
    })
  }

  const openEditModal = () => {
    if (!selectedStickerId) return
    setEditModalOpen(true)
  }

  const requestDeleteSelected = () => {
    if (!selectedSticker) return
    if (selectedSticker.kind === 'goal' || selectedSticker.kind === 'habit') {
      setDeleteConfirmStickerId(selectedSticker.id)
      return
    }
    deleteSticker(selectedSticker.id)
    setSelectedStickerId(null)
  }

  const deleteConfirmSticker = deleteConfirmStickerId
    ? stickerMap.get(deleteConfirmStickerId) ?? null
    : null

  const canDeleteEntityFully = (() => {
    if (!deleteConfirmSticker) return false
    if (deleteConfirmSticker.kind === 'habit' && deleteConfirmSticker.habitId) return true
    if (deleteConfirmSticker.kind === 'goal' && deleteConfirmSticker.goalId) {
      const id = deleteConfirmSticker.goalId
      if (id === LIFE_GOALS_MAP_ID || parseLifeMapGoalArea(id)) return false
      const goal = goalMap.get(id)
      if (goal?.fromLifeMap) return false
      return true
    }
    return false
  })()

  const handleDeleteStickerOnly = () => {
    if (!deleteConfirmSticker) return
    deleteSticker(deleteConfirmSticker.id)
    if (selectedStickerId === deleteConfirmSticker.id) setSelectedStickerId(null)
    setDeleteConfirmStickerId(null)
  }

  const handleDeleteFully = () => {
    if (!deleteConfirmSticker) return

    if (deleteConfirmSticker.kind === 'habit' && deleteConfirmSticker.habitId) {
      deleteHabit(deleteConfirmSticker.habitId)
      deleteSticker(deleteConfirmSticker.id)
    } else if (deleteConfirmSticker.kind === 'goal' && deleteConfirmSticker.goalId) {
      const goalId = deleteConfirmSticker.goalId
      // Стикеры привычек этой цели тоже убрать с доски
      const linkedHabitStickers = moodboard.stickers.filter((s) => {
        if (!s.habitId) return false
        const habit = habitMap.get(s.habitId)
        return habit?.goalId === goalId
      })
      deleteGoal(goalId)
      deleteSticker(deleteConfirmSticker.id)
      linkedHabitStickers.forEach((s) => deleteSticker(s.id))
    }

    if (selectedStickerId === deleteConfirmSticker.id) setSelectedStickerId(null)
    setDeleteConfirmStickerId(null)
  }

  const stickersSorted = useMemo(() => {
    const dragged = dragRef.current?.stickerId
    const selected = selectedStickerId
    const priority = new Set([dragged, selected].filter(Boolean) as string[])
    if (priority.size === 0) return moodboard.stickers
    return [
      ...moodboard.stickers.filter((s) => !priority.has(s.id)),
      ...moodboard.stickers.filter((s) => priority.has(s.id)),
    ]
  }, [moodboard.stickers, selectedStickerId])

  const searchableStickers = useMemo(() => {
    return moodboard.stickers
      .filter((s) => s.kind === 'goal' || s.kind === 'habit')
      .map((s) => ({
        id: s.id,
        kind: s.kind as 'goal' | 'habit',
        label: stickerLabel(s),
        emoji:
          s.kind === 'goal'
            ? '🎯'
            : s.emoji || (s.habitId ? habitMap.get(s.habitId)?.emoji : undefined) || '⭐',
      }))
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'goal' ? -1 : 1
        return a.label.localeCompare(b.label, 'ru')
      })
  }, [moodboard.stickers, habitMap, goalMap])

  const filteredSearch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return searchableStickers
    return searchableStickers.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.kind === 'goal' ? 'цель' : 'привычка').includes(q),
    )
  }, [searchableStickers, searchQuery])

  const focusSticker = (stickerId: string) => {
    const sticker = stickerMap.get(stickerId)
    const el = viewportRef.current
    if (!sticker || !el) return
    const rect = el.getBoundingClientRect()
    const zoom = viewRef.current.zoom
    const centerX = sticker.x + sticker.width / 2
    const centerY = sticker.y + sticker.height / 2
    applyView({
      zoom,
      panX: rect.width / 2 - centerX * zoom,
      panY: rect.height / 2 - centerY * zoom,
    })
    setSelectedStickerId(stickerId)
    setSearchOpen(false)
    setSearchQuery('')
    setMode('select')
  }

  const showFullToolbar = widgetSize !== 'minimal'

  const draftArrow = (() => {
    if (!arrowFromId || !arrowDraftTo) return null
    const from = stickerMap.get(arrowFromId)
    if (!from) return null
    const start = stickerEdgePoint(from, arrowDraftTo)
    return { from: start, to: arrowDraftTo }
  })()

  const hint =
    mode === 'arrow'
      ? arrowFromId
        ? 'Протяни стрелку к другому стикеру'
        : 'Зажми стикер и протяни стрелку'
      : mode === 'place-note'
        ? 'Кликни по доске — появится стикер'
            : isPanning
              ? 'Перетаскивай доску'
              : 'Зум — щипком двумя пальцами'

  return (
    <div className="rounded-xl bg-canvas/50 p-2 ring-1 ring-line">
      {showFullToolbar && (
        <div className="mb-2 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <ToolButton
              active={mode === 'place-note'}
              onClick={() => {
                setMode('place-note')
                setArrowFromId(null)
                setArrowDraftTo(null)
                setPlaceError('')
              }}
              title="Обычный стикер"
            >
              <Type size={14} /> Стикер
            </ToolButton>
            <ToolButton
              active={goalFormOpen}
              onClick={() => {
                setMode('select')
                setArrowFromId(null)
                setArrowDraftTo(null)
                setPlaceError('')
                setGoalFormOpen(true)
              }}
              title="Создать цель"
            >
              <Target size={14} /> Цель
            </ToolButton>
            <ToolButton
              active={habitFormOpen}
              onClick={() => {
                setMode('select')
                setArrowFromId(null)
                setArrowDraftTo(null)
                setPlaceError('')
                setHabitFormOpen(true)
              }}
              title="Создать привычку"
            >
              ⭐ Привычка
            </ToolButton>

            <div className="mx-1 h-5 w-px bg-line" />

            <ToolButton
              active={mode === 'arrow'}
              onClick={() => {
                setMode('arrow')
                setArrowFromId(null)
                setArrowDraftTo(null)
                setPlaceError('')
                setSearchOpen(false)
              }}
              title="Протянуть стрелку между стикерами"
            >
              → Стрелка
            </ToolButton>

            <div className="mx-1 h-5 w-px bg-line" />

            <div className="relative">
              <ToolButton
                active={searchOpen}
                onClick={() => {
                  setSearchOpen((v) => !v)
                  setSearchQuery('')
                  setMode('select')
                  setArrowFromId(null)
                  setArrowDraftTo(null)
                }}
                title="Найти цель или привычку"
              >
                <Search size={14} /> Поиск
              </ToolButton>

              {searchOpen && (
                <div className="absolute left-0 top-full z-30 mt-1 w-72 overflow-hidden rounded-xl bg-surface shadow-xl ring-1 ring-line sm:w-80">
                  <div className="border-b border-line p-2">
                    <input
                      type="search"
                      inputMode="search"
                      enterKeyHint="search"
                      autoComplete="off"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Найти на доске…"
                      className="w-full min-h-[44px] rounded-lg bg-canvas px-3 py-2.5 text-base font-semibold text-ink outline-none ring-1 ring-line focus:ring-brand/40"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1">
                    {filteredSearch.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs font-medium text-muted">
                        {searchableStickers.length === 0
                          ? 'На доске пока нет целей и привычек'
                          : 'Ничего не найдено'}
                      </p>
                    ) : (
                      <>
                        {filteredSearch.some((i) => i.kind === 'goal') && (
                          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                            Цели
                          </p>
                        )}
                        {filteredSearch
                          .filter((i) => i.kind === 'goal')
                          .map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => focusSticker(item.id)}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-ink hover:bg-canvas"
                            >
                              <span className="text-base">🎯</span>
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            </button>
                          ))}
                        {filteredSearch.some((i) => i.kind === 'habit') && (
                          <p className="mt-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                            Привычки
                          </p>
                        )}
                        {filteredSearch
                          .filter((i) => i.kind === 'habit')
                          .map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => focusSticker(item.id)}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-ink hover:bg-canvas"
                            >
                              <span className="text-base">{item.emoji}</span>
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            </button>
                          ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <ToolButton
                active={mode === 'select' && !spaceHeld}
                onClick={() => {
                  setMode('select')
                  setArrowFromId(null)
                  setArrowDraftTo(null)
                }}
                title="Выбор"
              >
                <MousePointer2 size={14} />
              </ToolButton>
              <ToolButton
                active={mode === 'pan' || spaceHeld}
                onClick={() => {
                  setMode('pan')
                  setArrowFromId(null)
                  setArrowDraftTo(null)
                }}
                title="Перемещение (или зажми Space)"
              >
                <Hand size={14} />
              </ToolButton>

              <div className="mx-1 h-5 w-px bg-line" />

              <ToolButton
                onClick={() => applyView({ zoom: clamp(view.zoom * 1.15, 0.15, 3) })}
                title="Приблизить"
              >
                <ZoomIn size={14} />
              </ToolButton>
              <ToolButton
                onClick={() => applyView({ zoom: clamp(view.zoom / 1.15, 0.15, 3) })}
                title="Отдалить"
              >
                <ZoomOut size={14} />
              </ToolButton>
              <span className="px-1 text-[11px] font-bold text-muted">{Math.round(view.zoom * 100)}%</span>
            </div>

            <div className="text-[11px] font-bold text-muted">{hint}</div>
          </div>

          {placeError && <p className="text-xs font-bold text-danger">{placeError}</p>}
        </div>
      )}

      {selectedSticker && showFullToolbar && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-surface/80 px-2 py-1.5 ring-1 ring-line">
          <span className="text-[11px] font-bold text-muted">
            {selectedSticker.kind === 'goal'
              ? 'Цель'
              : selectedSticker.kind === 'habit'
                ? 'Привычка'
                : 'Стикер'}
          </span>

          <ColorSwatches
            colors={STICKER_BG_COLORS}
            value={selectedSticker.color}
            onChange={(color) => updateSticker(selectedSticker.id, { color })}
            title="Цвет фона"
          />

          <ColorSwatches
            colors={STICKER_TEXT_COLORS}
            value={selectedSticker.textColor}
            onChange={(textColor) => updateSticker(selectedSticker.id, { textColor })}
            title="Цвет текста"
          />

          <div className="mx-1 h-5 w-px bg-line" />

          <ToolButton onClick={() => resizeSticker(-RESIZE_STEP)} title="Уменьшить">
            <Minus size={14} />
          </ToolButton>
          <ToolButton onClick={() => resizeSticker(RESIZE_STEP)} title="Увеличить">
            <Plus size={14} />
          </ToolButton>

          <ToolButton onClick={openEditModal} title="Редактировать">
            <Pencil size={14} />
          </ToolButton>

          <ToolButton onClick={requestDeleteSelected} title="Удалить стикер" danger>
            <Trash2 size={14} />
          </ToolButton>
        </div>
      )}

      <div
        ref={viewportRef}
        className={`relative overflow-hidden rounded-xl bg-[#f3f4f8] ring-1 ring-line ${moodboardHeight(widgetSize)} ${
          isPanning
            ? 'cursor-grab active:cursor-grabbing'
            : isPlacing || mode === 'arrow'
              ? 'cursor-crosshair'
              : 'cursor-default'
        }`}
        style={{ touchAction: 'none' }}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onWheel={onViewportWheel}
      >
        <div
          className="absolute left-0 top-0 will-change-transform"
          style={{
            transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <div
            className="pointer-events-none absolute"
            style={{
              left: WORLD_OFFSET,
              top: WORLD_OFFSET,
              width: WORLD_EXTENT,
              height: WORLD_EXTENT,
              backgroundImage: 'radial-gradient(circle, rgba(26,26,46,0.14) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <svg
            className="pointer-events-none absolute"
            style={{
              left: WORLD_OFFSET,
              top: WORLD_OFFSET,
              width: WORLD_EXTENT,
              height: WORLD_EXTENT,
              overflow: 'visible',
            }}
          >
            <defs>
              <marker id="mb-arrow-head" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="#a78bfa" />
              </marker>
              <marker id="mb-arrow-head-draft" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="#a78bfa" fillOpacity="0.35" />
              </marker>
            </defs>

            {moodboard.arrows.map((a) => {
              const from = stickerMap.get(a.fromStickerId)
              const to = stickerMap.get(a.toStickerId)
              if (!from || !to) return null
              const pts = arrowEndpoints(from, to)
              return (
                <g key={a.id} className="pointer-events-auto">
                  <line
                    x1={pts.from.x - WORLD_OFFSET}
                    y1={pts.from.y - WORLD_OFFSET}
                    x2={pts.to.x - WORLD_OFFSET}
                    y2={pts.to.y - WORLD_OFFSET}
                    stroke={a.color}
                    strokeWidth={a.width}
                    markerEnd="url(#mb-arrow-head)"
                    style={{ pointerEvents: 'stroke' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteArrow(a.id)
                    }}
                  />
                </g>
              )
            })}

            {draftArrow && (
              <line
                x1={draftArrow.from.x - WORLD_OFFSET}
                y1={draftArrow.from.y - WORLD_OFFSET}
                x2={draftArrow.to.x - WORLD_OFFSET}
                y2={draftArrow.to.y - WORLD_OFFSET}
                stroke="#a78bfa"
                strokeOpacity={0.35}
                strokeWidth={2.5}
                strokeDasharray="6 4"
                markerEnd="url(#mb-arrow-head-draft)"
              />
            )}
          </svg>

          {stickersSorted.map((s) => {
            const isSelected = selectedStickerId === s.id
            const isArrowSource = arrowFromId === s.id
            const isArrowTarget = arrowHoverStickerId === s.id
            const habit = s.habitId ? habitMap.get(s.habitId) : undefined
            const displayEmoji = s.emoji || habit?.emoji

            return (
              <div
                key={s.id}
                className="absolute select-none"
                style={{
                  left: s.x,
                  top: s.y,
                  width: s.width,
                  height: s.height,
                  background: s.color,
                  color: s.textColor,
                  borderRadius: 14,
                  boxShadow:
                    isSelected || isArrowSource || isArrowTarget
                      ? '0 0 0 2px #a78bfa, 0 8px 24px rgba(0,0,0,0.25)'
                      : '0 6px 20px rgba(0,0,0,0.18)',
                  padding: 10,
                  cursor: mode === 'arrow' ? 'crosshair' : isPanning ? 'grab' : 'grab',
                  transform: s.rotation ? `rotate(${s.rotation}deg)` : undefined,
                  zIndex: isSelected || isArrowSource ? 20 : 10,
                }}
                onPointerDown={(e) => onStickerPointerDown(e, s)}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  if (mode === 'arrow') return
                  setSelectedStickerId(s.id)
                  setEditModalOpen(true)
                }}
              >
                {(s.kind === 'goal' || s.kind === 'habit') && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-ink/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    {s.kind === 'goal' ? '🎯' : displayEmoji || '⭐'}
                  </span>
                )}
                <p className="break-words text-sm font-extrabold leading-snug">{stickerLabel(s)}</p>
                {s.kind === 'habit' && habit?.goalId && (
                  <p className="mt-1 text-[10px] font-bold opacity-70">
                    → {goalMap.get(habit.goalId)?.title ?? 'цель'}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {showFullToolbar && (
        <p className="mt-2 text-[11px] font-medium text-muted">
          Стрелка на обычный стикер — только связь. Привычки по цепочке цель → привычка → привычка
          закрепляются за одной целью.
        </p>
      )}

      <StickerEditModal
        open={editModalOpen}
        sticker={selectedSticker ?? null}
        stickers={moodboard.stickers}
        arrows={moodboard.arrows}
        habits={habits}
        goals={goals}
        diamonds={diamonds}
        onClose={() => setEditModalOpen(false)}
        onSave={handleStickerSave}
        onConvertToGoal={() => convertStickerToGoal(selectedSticker!.id)}
        onConvertToHabit={(opts) => convertStickerToHabit(selectedSticker!.id, opts)}
        onConvertChildrenToHabits={() => convertGoalChildrenToHabits(selectedSticker!.id)}
      />

      <DeleteLinkedStickerModal
        open={!!deleteConfirmSticker}
        sticker={deleteConfirmSticker}
        label={deleteConfirmSticker ? stickerLabel(deleteConfirmSticker) : ''}
        canDeleteEntity={canDeleteEntityFully}
        onClose={() => setDeleteConfirmStickerId(null)}
        onDeleteStickerOnly={handleDeleteStickerOnly}
        onDeleteFully={handleDeleteFully}
      />

      <GoalFormModal
        open={goalFormOpen}
        onClose={() => setGoalFormOpen(false)}
        onSubmit={handleGoalFormSubmit}
        diamonds={diamonds}
        allowAttachHabits
      />

      <HabitFormModal
        open={habitFormOpen}
        onClose={() => setHabitFormOpen(false)}
        onSubmit={handleHabitFormSubmit}
        goals={goals.filter((g) => g.status === 'active' && !g.fromLifeMap)}
        diamonds={diamonds}
      />
    </div>
  )
}

function ToolButton({
  children,
  active,
  danger,
  onClick,
  title,
}: {
  children: React.ReactNode
  active?: boolean
  danger?: boolean
  onClick: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 transition ${
        danger
          ? 'bg-canvas text-danger ring-line hover:bg-red-50'
          : active
            ? 'bg-brand-soft text-brand ring-brand/30'
            : 'bg-canvas text-muted ring-line hover:text-ink'
      }`}
    >
      <span className="inline-flex items-center gap-1">{children}</span>
    </button>
  )
}

function ColorSwatches({
  colors,
  value,
  onChange,
  title,
}: {
  colors: string[]
  value: string
  onChange: (color: string) => void
  title: string
}) {
  return (
    <div className="flex items-center gap-1" title={title}>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`h-5 w-5 rounded-full ring-2 transition ${
            value === c ? 'ring-brand scale-110' : 'ring-transparent hover:ring-line'
          }`}
          style={{ background: c }}
          aria-label={`${title}: ${c}`}
        />
      ))}
    </div>
  )
}

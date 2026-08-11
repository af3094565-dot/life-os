import { useEffect, useMemo, useState } from 'react'
import { Target, X } from 'lucide-react'
import type { Goal, Habit } from '../../../data/seed'
import type { DesktopMoodboardArrow, DesktopMoodboardSticker } from '../../../hooks/useLifeOS'
import { ECONOMY, canAfford, formatDiamonds } from '../../../lib/economy'
import {
  childStickerIdsFromGoal,
  findGoalParentStickerId,
  STICKER_BG_COLORS,
  STICKER_TEXT_COLORS,
} from './moodboardUtils'

const HABIT_EMOJIS = ['⭐', '🛌', '🚶', '📚', '💧', '🧘', '🥗', '✍️', '💪', '🧠', '🌅', '🪥']

type Props = {
  open: boolean
  sticker: DesktopMoodboardSticker | null
  stickers: DesktopMoodboardSticker[]
  arrows: DesktopMoodboardArrow[]
  habits: Habit[]
  goals: Goal[]
  diamonds: number
  onClose: () => void
  onSave: (patch: {
    text: string
    color?: string
    textColor?: string
    emoji?: string
  }) => void
  onConvertToGoal: () => { ok: boolean; reason?: string }
  onConvertToHabit: (opts?: { parentStickerId?: string; emoji?: string }) => { ok: boolean; reason?: string }
  onConvertChildrenToHabits: () => { ok: boolean; created: number; reason?: string }
}

export function StickerEditModal({
  open,
  sticker,
  stickers,
  arrows,
  habits,
  goals,
  diamonds,
  onClose,
  onSave,
  onConvertToGoal,
  onConvertToHabit,
  onConvertChildrenToHabits,
}: Props) {
  const [text, setText] = useState('')
  const [color, setColor] = useState('#fde68a')
  const [textColor, setTextColor] = useState('#1a1a2e')
  const [emoji, setEmoji] = useState('⭐')
  const [parentStickerId, setParentStickerId] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const linkedHabit = useMemo(
    () => (sticker?.habitId ? habits.find((h) => h.id === sticker.habitId) : undefined),
    [sticker, habits],
  )
  const linkedGoal = useMemo(
    () => (sticker?.goalId ? goals.find((g) => g.id === sticker.goalId) : undefined),
    [sticker, goals],
  )

  const goalParentId = sticker ? findGoalParentStickerId(sticker.id, stickers, arrows) : undefined
  const goalParent = goalParentId ? stickers.find((s) => s.id === goalParentId) : undefined

  const goalStickerOptions = useMemo(
    () => stickers.filter((s) => s.kind === 'goal' && s.goalId),
    [stickers],
  )

  const connectedChildCount = sticker?.kind === 'goal'
    ? childStickerIdsFromGoal(sticker.id, arrows).filter((id) => {
        const st = stickers.find((s) => s.id === id)
        return st && !st.habitId
      }).length
    : 0

  useEffect(() => {
    if (!open || !sticker) return
    setText(sticker.text || linkedHabit?.name || linkedGoal?.title || '')
    setColor(sticker.color)
    setTextColor(sticker.textColor)
    setEmoji(sticker.emoji || linkedHabit?.emoji || '⭐')
    setParentStickerId(goalParentId || '')
    setError('')
    setInfo('')
  }, [open, sticker, linkedHabit, linkedGoal, goalParentId])

  if (!open || !sticker) return null

  const handleSave = () => {
    const trimmed = text.trim()
    if (!trimmed) {
      setError('Укажи название')
      return
    }
    onSave({ text: trimmed, color, textColor, emoji })
    onClose()
  }

  const handleConvertGoal = () => {
    const result = onConvertToGoal()
    if (!result.ok) {
      setError(result.reason ?? 'Не удалось создать цель')
      return
    }
    setInfo('Цель добавлена в трекер целей')
    setError('')
  }

  const handleConvertHabit = () => {
    const result = onConvertToHabit({
      parentStickerId: parentStickerId || undefined,
      emoji,
    })
    if (!result.ok) {
      setError(result.reason ?? 'Не удалось создать привычку')
      return
    }
    setInfo('Привычка добавлена в трекер')
    setError('')
  }

  const handleConvertChildren = () => {
    const result = onConvertChildrenToHabits()
    if (!result.ok) {
      setError(result.reason ?? 'Не удалось создать привычки')
      return
    }
    setInfo(`Создано привычек: ${result.created}`)
    setError('')
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 sm:items-center sm:p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-surface p-4 shadow-xl ring-1 ring-line sm:rounded-2xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-extrabold text-ink">Редактировать стикер</p>
            <p className="mt-0.5 text-[11px] font-medium text-muted">
              {sticker.kind === 'goal'
                ? 'Стикер цели'
                : sticker.kind === 'habit'
                  ? 'Стикер привычки'
                  : 'Заметка'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">
          Название
        </label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mb-3 w-full rounded-xl bg-canvas px-3 py-2 text-sm font-semibold text-ink ring-1 ring-line outline-none focus:ring-brand/40"
          placeholder="Текст стикера"
        />

        <div className="mb-3 flex flex-wrap gap-3">
          <div>
            <p className="mb-1 text-[11px] font-bold text-muted">Фон</p>
            <div className="flex flex-wrap gap-1">
              {STICKER_BG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full ring-2 ${color === c ? 'ring-brand' : 'ring-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold text-muted">Текст</p>
            <div className="flex flex-wrap gap-1">
              {STICKER_TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setTextColor(c)}
                  className={`h-6 w-6 rounded-full ring-2 ${textColor === c ? 'ring-brand' : 'ring-transparent'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-canvas/80 p-3 ring-1 ring-line">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Связь с трекером</p>

          {sticker.kind === 'goal' && linkedGoal ? (
            <p className="text-sm font-semibold text-ink">
              <Target size={14} className="mr-1 inline text-brand" />
              В целях: {linkedGoal.title}
            </p>
          ) : sticker.kind === 'habit' && linkedHabit ? (
            <p className="text-sm font-semibold text-ink">
              {linkedHabit.emoji} В трекере: {linkedHabit.name}
              {linkedHabit.goalId && (
                <span className="ml-1 text-xs text-muted">
                  (цель: {goals.find((g) => g.id === linkedHabit.goalId)?.title ?? '—'})
                </span>
              )}
            </p>
          ) : (
            <p className="text-xs font-medium text-muted">Стикер ещё не связан с трекером</p>
          )}

          {goalParent && !sticker.habitId && (
            <p className="mt-2 text-xs font-medium text-brand">
              Стрелка от цели «{goalParent.text}» — если сделаешь привычкой, она привяжется к этой цели
            </p>
          )}

          <div className="mt-3 flex flex-col gap-2">
            {!sticker.goalId && (
              <button
                type="button"
                onClick={handleConvertGoal}
                disabled={!canAfford(diamonds, ECONOMY.GOAL_COST)}
                className="rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                Сделать целью (−{formatDiamonds(ECONOMY.GOAL_COST)})
              </button>
            )}

            {!sticker.habitId && (
              <>
                <div>
                  <p className="mb-1 text-[11px] font-bold text-muted">Эмодзи привычки</p>
                  <div className="flex flex-wrap gap-1">
                    {HABIT_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setEmoji(e)}
                        className={`rounded-lg px-2 py-1 text-sm ${emoji === e ? 'bg-brand-soft ring-1 ring-brand/30' : 'bg-surface ring-1 ring-line'}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                {goalStickerOptions.length > 0 && (
                  <label className="block">
                    <span className="mb-1 text-[11px] font-bold text-muted">Цель (опционально)</span>
                    <select
                      value={parentStickerId}
                      onChange={(e) => setParentStickerId(e.target.value)}
                      className="w-full rounded-xl bg-canvas px-3 py-2 text-sm font-semibold text-ink ring-1 ring-line"
                    >
                      <option value="">Без цели / авто из стрелки</option>
                      {goalStickerOptions.map((gs) => (
                        <option key={gs.id} value={gs.id}>
                          {gs.text || 'Цель'}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <button
                  type="button"
                  onClick={handleConvertHabit}
                  disabled={!canAfford(diamonds, ECONOMY.HABIT_COST)}
                  className="rounded-xl bg-canvas px-3 py-2 text-xs font-bold text-ink ring-1 ring-line hover:bg-surface disabled:opacity-50"
                >
                  Добавить в трекер привычек (−{formatDiamonds(ECONOMY.HABIT_COST)})
                </button>
              </>
            )}

            {sticker.kind === 'goal' && sticker.goalId && connectedChildCount > 0 && (
              <button
                type="button"
                onClick={handleConvertChildren}
                disabled={!canAfford(diamonds, connectedChildCount * ECONOMY.HABIT_COST)}
                className="rounded-xl bg-canvas px-3 py-2 text-xs font-bold text-ink ring-1 ring-line hover:bg-surface disabled:opacity-50"
              >
                Создать привычки из {connectedChildCount} связанных стикеров (−
                {formatDiamonds(connectedChildCount * ECONOMY.HABIT_COST)})
              </button>
            )}
          </div>
        </div>

        {error && <p className="mb-2 text-xs font-bold text-danger">{error}</p>}
        {info && <p className="mb-2 text-xs font-bold text-brand">{info}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-canvas px-3 py-2.5 text-sm font-bold text-muted ring-1 ring-line"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-xl bg-brand px-3 py-2.5 text-sm font-bold text-white"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}

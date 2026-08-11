import { useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'
import {
  QUEST_CATEGORY_LABELS,
  type QuestCategory,
  type QuestTemplateKind,
} from '../data/questCatalog'
import type { NewUserQuestInput } from '../hooks/useLifeOS'
import {
  DIAMOND,
  ECONOMY,
  formatDiamonds,
  questCreatorCut,
} from '../lib/economy'

const EMOJIS = ['⭐', '🔥', '💪', '🧠', '📚', '🧘', '🏃', '💧', '🎯', '🌙', '✍️', '🥗']
const COLORS = [
  '#fef3c7',
  '#e0f2fe',
  '#fce7f3',
  '#ecfccb',
  '#ede9fe',
  '#ffedd5',
  '#dbeafe',
  '#fee2e2',
  '#d1fae5',
  '#e0e7ff',
]
const DURATION_PRESETS = [7, 14, 21, 30, 66, 90, 100, 180, 365]

type Props = {
  open: boolean
  onClose: () => void
  onSubmit: (input: NewUserQuestInput) => { ok: boolean; reason?: string }
}

export function CreateUserQuestModal({ open, onClose, onSubmit }: Props) {
  const titleId = useId()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('⭐')
  const [category, setCategory] = useState<QuestCategory>('growth')
  const [kind, setKind] = useState<QuestTemplateKind>('streak')
  const [price, setPrice] = useState(30)
  const [reward, setReward] = useState(60)
  const [durationDays, setDurationDays] = useState(30)
  const [target, setTarget] = useState(30)
  const [timesPerWeek, setTimesPerWeek] = useState(7)
  const [listLabel, setListLabel] = useState('пункт')
  const [color, setColor] = useState(COLORS[0])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle('')
    setDescription('')
    setEmoji('⭐')
    setCategory('growth')
    setKind('streak')
    setPrice(30)
    setReward(60)
    setDurationDays(30)
    setTarget(30)
    setTimesPerWeek(7)
    setListLabel('пункт')
    setColor(COLORS[0])
    setError('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const creatorEarn = questCreatorCut(price)

  const submit = () => {
    setError('')
    const result = onSubmit({
      title,
      description,
      emoji,
      category,
      price,
      reward,
      kind,
      durationDays,
      timesPerWeek: kind === 'list' ? timesPerWeek : 7,
      target,
      listLabel: kind === 'list' ? listLabel : undefined,
      color,
    })
    if (!result.ok) {
      setError(result.reason ?? 'Не удалось создать квест')
      return
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl bg-surface shadow-xl ring-1 ring-line sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Свой квест
            </p>
            <h2 id={titleId} className="mt-1 text-lg font-extrabold text-ink">
              Создать и поделиться
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-canvas"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
              Название
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: 21 день без сладкого"
              inputMode="text"
              enterKeyHint="next"
              autoComplete="off"
              className="w-full min-h-[48px] rounded-xl border border-line bg-canvas px-4 py-3.5 text-base font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
              Описание
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Что нужно сделать другу"
              className="w-full resize-none rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
              Иконка
            </span>
            <div className="grid grid-cols-6 gap-1.5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`flex h-11 items-center justify-center rounded-xl text-xl transition ${
                    emoji === e ? 'bg-brand-soft ring-2 ring-brand' : 'bg-canvas ring-1 ring-line'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
              Категория
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(QUEST_CATEGORY_LABELS) as QuestCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    category === cat
                      ? 'bg-brand text-white'
                      : 'bg-canvas text-muted ring-1 ring-line'
                  }`}
                >
                  {QUEST_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
              Тип
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['streak', 'Серия дней'],
                  ['list', 'Список'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setKind(id)
                    if (id === 'streak') setTarget(durationDays)
                  }}
                  className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    kind === id
                      ? 'bg-ink text-white'
                      : 'bg-canvas text-muted ring-1 ring-line'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                Цена ({DIAMOND})
              </span>
              <input
                type="number"
                min={ECONOMY.USER_QUEST_PRICE_MIN}
                max={ECONOMY.USER_QUEST_PRICE_MAX}
                value={price}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  setPrice(next)
                  if (reward < next) setReward(next * 2)
                }}
                className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                Награда ({DIAMOND})
              </span>
              <input
                type="number"
                min={price}
                value={reward}
                onChange={(e) => setReward(Number(e.target.value))}
                className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
              />
            </label>
          </div>

          <div
            className="rounded-xl px-3 py-3 ring-1 ring-line"
            style={{ background: color }}
          >
            <p className="text-sm font-bold text-ink">
              Друг платит {formatDiamonds(price)} · за успех получает {formatDiamonds(reward)}
            </p>
            <p className="mt-1 text-xs font-semibold text-ink/70">
              Тебе с продажи — {formatDiamonds(creatorEarn)} (50%)
            </p>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
              Срок
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDurationDays(d)
                    if (kind === 'streak') setTarget(d)
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    durationDays === d
                      ? 'bg-brand text-white'
                      : 'bg-canvas text-muted ring-1 ring-line'
                  }`}
                >
                  {d} дн.
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                {kind === 'list' ? 'Пунктов' : 'Дней цели'}
              </span>
              <input
                type="number"
                min={1}
                max={365}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
              />
            </label>
            {kind === 'list' ? (
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                  Что в списке
                </span>
                <input
                  value={listLabel}
                  onChange={(e) => setListLabel(e.target.value)}
                  placeholder="книга"
                  className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
                />
              </label>
            ) : (
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                  Раз в неделю
                </span>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={timesPerWeek}
                  onChange={(e) => setTimesPerWeek(Number(e.target.value))}
                  className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
                />
              </label>
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
              Цвет карточки
            </span>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full ring-2 transition ${
                    color === c ? 'ring-ink' : 'ring-transparent'
                  }`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-danger">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-muted hover:bg-canvas"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={submit}
            className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-deep"
          >
            Создать квест
          </button>
        </div>
      </div>
    </div>
  )
}

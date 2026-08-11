/** Экономика алмазов — мягкий лимит на перегрузку */
export const ECONOMY = {
  /** Приветственные алмазы за регистрацию */
  START_DIAMONDS: 20,
  /** Создать привычку */
  HABIT_COST: 10,
  /** Привычка с карты жизни */
  LIFE_MAP_HABIT_COST: 5,
  /** Создать цель */
  GOAL_COST: 15,
  /** Создать матрицу целей 9×9 */
  MATRIX_COST: 20,
  /** Отметить выполнение дня */
  DAY_REWARD: 5,
  /** Бонус за 7 дней подряд захода в приложение */
  VISIT_STREAK_DAYS: 7,
  VISIT_STREAK_BONUS: 50,
  /** Цены квест-контрактов */
  QUEST_COSTS: [20, 30, 50] as const,
  /** Доля автора от цены продажи пользовательского квеста */
  QUEST_CREATOR_CUT: 0.5,
  /** Мин/макс цена своего квеста */
  USER_QUEST_PRICE_MIN: 10,
  USER_QUEST_PRICE_MAX: 200,
} as const

export type QuestCostTier = (typeof ECONOMY.QUEST_COSTS)[number]

/** Половина от продажи — автору квеста */
export function questCreatorCut(price: number): number {
  return Math.floor(Math.max(0, price) * ECONOMY.QUEST_CREATOR_CUT)
}

/** Эмодзи алмаза для компактных бейджей */
export const DIAMOND = '💎'

/** Склонение: 1 алмаз, 2 алмаза, 5 алмазов */
export function diamondsWord(n: number): string {
  const abs = Math.abs(Math.trunc(n)) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return 'алмазов'
  if (last === 1) return 'алмаз'
  if (last >= 2 && last <= 4) return 'алмаза'
  return 'алмазов'
}

export function formatDiamonds(n: number): string {
  return `${n} ${diamondsWord(n)}`
}

export function canAfford(balance: number, cost: number): boolean {
  return balance >= cost
}

/** Награда за выполнение контракта = ×2 от цены */
export function questContractReward(cost: number): number {
  return cost * 2
}

export function questCostHint(balance: number, cost: number): string {
  if (canAfford(balance, cost)) {
    return `−${formatDiamonds(cost)} · при успехе +${formatDiamonds(questContractReward(cost))}`
  }
  return `Нужно ${formatDiamonds(cost)} (сейчас ${formatDiamonds(balance)}). Отмечай дни и копи алмазы.`
}

export function habitCostHint(balance: number): string {
  if (canAfford(balance, ECONOMY.HABIT_COST)) {
    return `−${formatDiamonds(ECONOMY.HABIT_COST)} · за день +${formatDiamonds(ECONOMY.DAY_REWARD)}`
  }
  return `Нужно ${formatDiamonds(ECONOMY.HABIT_COST)} (сейчас ${formatDiamonds(balance)}). Войди в ритм — отмечай дни и копи алмазы.`
}

export function lifeMapHabitCostHint(balance: number): string {
  if (canAfford(balance, ECONOMY.LIFE_MAP_HABIT_COST)) {
    return `−${formatDiamonds(ECONOMY.LIFE_MAP_HABIT_COST)} · за день +${formatDiamonds(ECONOMY.DAY_REWARD)}`
  }
  return `Нужно ${formatDiamonds(ECONOMY.LIFE_MAP_HABIT_COST)} (сейчас ${formatDiamonds(balance)}). Отмечай дни и копи алмазы.`
}

export function goalCostHint(balance: number): string {
  if (canAfford(balance, ECONOMY.GOAL_COST)) {
    return `−${formatDiamonds(ECONOMY.GOAL_COST)} · сначала привычки, потом масштаб`
  }
  return `Нужно ${formatDiamonds(ECONOMY.GOAL_COST)} (сейчас ${formatDiamonds(balance)}). Не перегружай себя: заработай алмазы ритмом, потом ставь новые цели.`
}

export function matrixCostHint(balance: number): string {
  if (canAfford(balance, ECONOMY.MATRIX_COST)) {
    return `−${formatDiamonds(ECONOMY.MATRIX_COST)} · привычки на карте бесплатны`
  }
  return `Нужно ${formatDiamonds(ECONOMY.MATRIX_COST)} (сейчас ${formatDiamonds(balance)}). Карта цели — большая ставка: сначала накопи алмазы.`
}

/** Причина движения алмазов */
export type DiamondTxReason =
  | 'start'
  | 'day_mark'
  | 'day_unmark'
  | 'habit_create'
  | 'life_map_habit'
  | 'goal_create'
  | 'matrix_create'
  | 'quest_accept'
  | 'quest_win'
  | 'quest_creator_sale'
  | 'visit_streak'
  | 'friend_grant'
  | 'tester_grant'

export type DiamondTx = {
  id: string
  /** ISO timestamp */
  at: string
  /** + получение, − оплата */
  amount: number
  reason: DiamondTxReason
  /** Человекочитаемое описание */
  label: string
  balanceAfter: number
}

/** Сколько записей хранить в истории */
export const DIAMOND_HISTORY_LIMIT = 100

export function makeDiamondTx(input: {
  amount: number
  reason: DiamondTxReason
  label: string
  balanceAfter: number
  at?: string
}): DiamondTx {
  return {
    id: `dtx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: input.at ?? new Date().toISOString(),
    amount: input.amount,
    reason: input.reason,
    label: input.label,
    balanceAfter: input.balanceAfter,
  }
}

/** Добавить транзакции в начало списка (новые сверху) */
export function pushDiamondTx(
  history: DiamondTx[] | undefined,
  ...txs: DiamondTx[]
): DiamondTx[] {
  if (!txs.length) return history ?? []
  return [...txs, ...(history ?? [])].slice(0, DIAMOND_HISTORY_LIMIT)
}

export function formatTxAmount(amount: number): string {
  if (amount > 0) return `+${amount}`
  return String(amount)
}

export function formatTxTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

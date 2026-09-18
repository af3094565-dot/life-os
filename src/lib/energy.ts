/** Legacy field names remain compatible with saved accounts. There is one spendable battery. */
export const ENERGY = {
  START: 0, CAPACITY: 100, DEBT_LIMIT: 100, MIN_ACTIONS: 4,
  // Kept for legacy provisional transactions; the ledger alone calculates actual rewards.
  HABIT_REWARD: 0, DAILY_LIMIT: 100, GOAL_REWARD: 0,
  MIN_GOAL_DAYS: 7, MIN_ACTIVITY_DAYS: 3, CHALLENGE_COOLDOWN_DAYS: 7,
} as const

/** Small plans: 4 actions × 25. Large plans: 1/20 ≈ 13%, 50/100 = 85%. */
export function energyCurve(completed: number, planned: number): number {
  const target = Math.max(ENERGY.MIN_ACTIONS, Math.trunc(planned))
  const fraction = Math.min(1, Math.max(0, completed / target))
  const exponent = 1 + (Math.log(0.15) / Math.log(0.5) - 1) * Math.min(1, (target - 4) / 16)
  return 1 - Math.pow(1 - fraction, exponent)
}
export type EnergyDay = { ids: string[]; target: number; claimed: string[]; earned: number }
export type EnergyLedger = {
  version: 1 | 2; capacity: number; marks: Record<string, string[]>;
  goals: string[]; quests: string[]; daily: Record<string, number>;
  evidenceUsed: string[]; lastChallengeAt?: string;
  days?: Record<string, EnergyDay>; currentDate?: string; legacyBalance?: number;
}
type Habit = { id: string; createdAt: string; completions: Record<string, boolean> }
type Tx = { id: string; at: string; amount: number; reason: string; label: string; balanceAfter: number }
type EnergyStore = { diamonds: number; diamondHistory: Tx[]; habits: Habit[]; energy?: EnergyLedger }
const round = (value: number) => Math.round(value * 100) / 100
function dayKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }

export function migrateEnergy<T extends EnergyStore>(store: T, now = new Date(), planIds = store.habits.map(h => h.id)): T & { energy: EnergyLedger } {
  const date = dayKey(now)
  if (store.energy?.version === 2) {
    if (store.energy.currentDate === date) return store as T & { energy: EnergyLedger }
    // A new day's positive charge starts at zero. Debt cannot be escaped by waiting/reloading.
    const balance = Math.min(0, store.diamonds)
    return { ...store, diamonds: balance, energy: { ...store.energy, currentDate: date }, diamondHistory: balance === store.diamonds ? store.diamondHistory : [{ id: `energy-reset-${date}`, at: now.toISOString(), amount: -store.diamonds, reason: 'day_reset', label: 'Новый день · начинаем заряжаться заново', balanceAfter: balance }, ...store.diamondHistory].slice(0, 100) }
  }
  const ids = [...new Set(planIds)]
  const claimed = ids.filter(id => store.habits.find(h => h.id === id)?.completions[date])
  const balance = round(100 * energyCurve(claimed.length, ids.length))
  return { ...store, diamonds: balance, energy: {
    version: 2, capacity: 100, legacyBalance: store.diamonds, currentDate: date,
    marks: Object.fromEntries(store.habits.map(h => [h.id, Object.keys(h.completions).filter(key => h.completions[key])])),
    goals: store.energy?.goals ?? [], quests: store.energy?.quests ?? [], daily: {}, evidenceUsed: [],
    days: { [date]: { ids, target: Math.max(4, ids.length), claimed, earned: balance } },
  } }
}

export function applyEnergyTransition<T extends EnergyStore>(previous: T, proposed: T, now = new Date(), planIds = proposed.habits.map(h => h.id)): T {
  const base = migrateEnergy(previous, now, planIds)
  if (previous === proposed && base === previous) return previous
  const date = dayKey(now)
  const ledger: EnergyLedger = { ...base.energy, marks: { ...base.energy.marks }, daily: { ...base.energy.daily }, days: { ...base.energy.days } }
  const oldDay = ledger.days?.[date]
  const day: EnergyDay = oldDay ? { ...oldDay, ids: [...oldDay.ids], claimed: [...oldDay.claimed] } : { ids: [], target: 4, claimed: [], earned: 0 }
  // Fix the day's reward curve at the first action. Deleted tasks cannot shrink it.
  // Small plans may fill their four slots, but never create unlimited new reward slots.
  if (!day.claimed.length) {
    day.ids = [...new Set(planIds)]
    day.target = Math.max(4, day.ids.length)
  } else {
    for (const id of planIds) if (!day.ids.includes(id) && day.ids.length < day.target) day.ids.push(id)
  }
  const oldIds = new Set(previous.diamondHistory.map(tx => tx.id))
  const added = proposed.diamondHistory.filter(tx => !oldIds.has(tx.id)).reverse()
  const costs = added.filter(tx => tx.amount < 0 && tx.reason !== 'day_unmark' && tx.reason !== 'day_reset')
  let balance = base.diamonds
  const transactions: Tx[] = []
  for (const tx of costs) {
    if (!Number.isFinite(tx.amount) || balance + tx.amount < -ENERGY.DEBT_LIMIT) return base
    balance = round(balance + tx.amount)
    transactions.unshift({ ...tx, balanceAfter: balance })
  }
  const before = new Map(previous.habits.map(h => [h.id, h]))
  for (const habit of proposed.habits) {
    if (!habit.completions[date] || before.get(habit.id)?.completions[date] || ledger.marks[habit.id]?.includes(date)) continue
    ledger.marks[habit.id] = [...(ledger.marks[habit.id] ?? []), date]
    if (!day.ids.includes(habit.id) || day.claimed.includes(habit.id)) continue
    const count = day.claimed.length
    const from = energyCurve(count, day.target)
    const to = energyCurve(count + 1, day.target)
    day.claimed.push(habit.id)
    // Recover debt and fill exactly 100 by the last paid action. Late spending is real spending.
    const reward = from < 1 ? (100 - balance) * (to - from) / (1 - from) : 0
    const nextBalance = to >= 1 ? 100 : Math.min(99.99, round(balance + reward))
    const actual = round(nextBalance - balance)
    balance = nextBalance
    if (actual > 0) {
      day.earned = round(day.earned + actual)
      transactions.unshift({ id: `energy-${date}-${habit.id}`, at: now.toISOString(), amount: actual, reason: 'day_mark', label: `Выполнение ${count + 1} из ${day.target} · восстановление энергии`, balanceAfter: balance })
    }
  }
  ledger.days![date] = day
  ledger.daily[date] = day.earned
  return { ...proposed, diamonds: balance, energy: ledger, diamondHistory: [...transactions, ...base.diamondHistory].slice(0, 100) }
}

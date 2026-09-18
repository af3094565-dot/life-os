/** Checklist state and actual battery balance; percentages no longer come from done/total. */
export function dayCharge(done: number, total: number, balance: number) {
  const planned = Math.max(0, Math.trunc(total))
  const completed = Math.max(0, Math.min(planned, Math.trunc(done)))
  const complete = planned > 0 && completed === planned
  const percent = Math.round(balance * 100) / 100
  const title = balance < 0 ? 'Батарейка в долг. Начни с одного дела' : balance >= 100 ? 'Полный заряд. Ты это сделал!' : !planned ? 'Дай своему дню направление' : complete ? 'План выполнен. Хорошая работа!' : !completed ? 'Заряди день первым действием' : 'Каждое действие возвращает энергию'
  return { done: completed, total: planned, percent, complete, title }
}
export type DayCharge = ReturnType<typeof dayCharge>

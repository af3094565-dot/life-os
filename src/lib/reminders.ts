/** Время напоминания HH:mm — показывать на дашборде после этого момента */
export function isReminderDue(reminderTime: string, now = new Date()): boolean {
  const parts = reminderTime.split(':')
  if (parts.length < 2) return false
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (Number.isNaN(h) || Number.isNaN(m)) return false
  const nowM = now.getHours() * 60 + now.getMinutes()
  return nowM >= h * 60 + m
}

export function formatReminderTime(reminderTime: string): string {
  const parts = reminderTime.split(':')
  if (parts.length < 2) return reminderTime
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (Number.isNaN(h) || Number.isNaN(m)) return reminderTime
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

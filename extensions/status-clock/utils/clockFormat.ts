import type { ClockSettings } from '../types.ts'

export function formatTime(date: Date, fmt: ClockSettings): string {
  const h = date.getHours()
  const m = date.getMinutes()
  const s = date.getSeconds()
  const pad = (n: number) => String(n).padStart(2, '0')

  if (fmt.format === '12h') {
    const hour12 = h % 12 || 12
    const ampm = h < 12 ? 'AM' : 'PM'
    return fmt.showSeconds
      ? `${hour12}:${pad(m)}:${pad(s)} ${ampm}`
      : `${hour12}:${pad(m)} ${ampm}`
  }
  return fmt.showSeconds
    ? `${pad(h)}:${pad(m)}:${pad(s)}`
    : `${pad(h)}:${pad(m)}`
}

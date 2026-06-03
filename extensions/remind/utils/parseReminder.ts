import type { ParsedReminder } from '../types.ts'

/**
 * Supported input patterns:
 *   Ns / Nm / Nh / Nd   — relative offset  e.g. "20m meeting", "2h lunch", "30s test", "1d review"
 *   HH:MM message        — absolute time today
 *   HH:MM+1 message      — absolute time next day
 *
 * Returns null when the text cannot be parsed.
 */
export function parseReminder(text: string, now = Date.now()): ParsedReminder | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  // --- Relative: Ns / Nm / Nh / Nd ---
  const relMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*([smhd])\s*(.*)/i)
  if (relMatch) {
    const amount = parseFloat(relMatch[1])
    const unit = relMatch[2].toLowerCase()
    const label = relMatch[3].trim()
    if (isNaN(amount) || amount <= 0) return null

    const multipliers: Record<string, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    }
    const delayMs = Math.round(amount * multipliers[unit])
    const fireAt = now + delayMs
    return { label, fireAt, delayMs }
  }

  // --- Absolute: HH:MM[+days] message ---
  const absMatch = trimmed.match(/^(\d{1,2}):(\d{2})(\+\d+)?\s*(.*)/)
  if (absMatch) {
    const hours = parseInt(absMatch[1], 10)
    const minutes = parseInt(absMatch[2], 10)
    const dayOffset = absMatch[3] ? parseInt(absMatch[3].slice(1), 10) : 0
    const label = absMatch[4].trim()

    if (hours > 23 || minutes > 59) return null

    const base = new Date(now)
    base.setHours(hours, minutes, 0, 0)
    const fireAt = base.getTime() + dayOffset * 86_400_000

    // If no explicit day offset and the time has already passed today, push to tomorrow
    const resolvedFireAt = dayOffset === 0 && fireAt <= now ? fireAt + 86_400_000 : fireAt
    const delayMs = resolvedFireAt - now

    return { label, fireAt: resolvedFireAt, delayMs }
  }

  return null
}

/**
 * Returns true when the raw query string looks like a parseable reminder time token.
 * Used by the frontend to decide whether to show the "create" preview or the list.
 */
export function looksLikeReminder(text: string): boolean {
  const t = text.trim()
  return /^\d+(?:\.\d+)?[smhd]\b/i.test(t) || /^\d{1,2}:\d{2}/.test(t)
}

/**
 * Formats a remaining-time delta (ms) into a short human-readable string.
 * e.g. 1234567 → "20m", 90000 → "1m 30s", -5000 → "overdue"
 */
export function formatRemaining(deltaMs: number): string {
  if (deltaMs <= 0) return 'overdue'

  const totalSeconds = Math.floor(deltaMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  if (minutes > 0) {
    return seconds > 0 && minutes < 5 ? `${minutes}m ${seconds}s` : `${minutes}m`
  }
  return `${seconds}s`
}

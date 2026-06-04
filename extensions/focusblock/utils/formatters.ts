export function parseQuery(
  query: string,
  defaultDuration: number
): { duration: number; label: string } {
  const trimmed = query.trim()
  if (!trimmed) return { duration: defaultDuration, label: '' }
  const parts = trimmed.split(/\s+/)
  const firstNum = parseInt(parts[0], 10)
  if (!isNaN(firstNum) && firstNum > 0 && firstNum <= 480) {
    return { duration: firstNum, label: parts.slice(1).join(' ') }
  }
  return { duration: defaultDuration, label: trimmed }
}

export function formatMs(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000)
  return `${min}m`
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

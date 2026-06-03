export function deriveTitle(body: string): string {
  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return 'New Note'
  const firstLine = lines[0]
  if (firstLine.length > 40) {
    return firstLine.slice(0, 40) + '...'
  }
  return firstLine
}

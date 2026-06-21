function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/** Parse a direct width ratio (0–1): `1/4`, `0.25`, `25%`. */
export function parseRatio(val: string | null | undefined, fallback = 0.5): number {
  if (!val || val.trim() === '') return fallback
  const raw = val.trim().toLowerCase()

  if (raw.includes('/')) {
    const parts = raw.split('/')
    if (parts.length === 2) {
      const num = parseFloat(parts[0])
      const den = parseFloat(parts[1])
      if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
        return clamp01(num / den)
      }
    }
  }

  if (raw.endsWith('%')) {
    const pct = parseFloat(raw)
    if (Number.isFinite(pct)) return clamp01(pct / 100)
  }

  const n = parseFloat(raw)
  if (Number.isFinite(n)) return clamp01(n)

  return fallback
}

export function clampSplitRatio(ratio: number, minScale: number): number {
  const min = Math.min(Math.max(minScale, 0), 0.5)
  const max = 1 - min
  return Math.max(min, Math.min(max, ratio))
}

export function isSplitLocked(minScale: number): boolean {
  return minScale >= 0.5
}

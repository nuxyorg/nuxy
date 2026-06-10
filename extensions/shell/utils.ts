// fallow-ignore-file code-duplication
export const SHELL_EXT_ID = 'com.nuxy.shell'

export function parseCoordinate(
  val: string | null | undefined,
  displayLength: number,
  winLength: number
): number {
  if (!val) return Math.round((displayLength - winLength) / 2)
  val = val.trim().toLowerCase()
  if (val === 'center') return Math.round((displayLength - winLength) / 2)
  if (val.endsWith('px')) {
    const px = parseFloat(val)
    return isNaN(px) ? Math.round((displayLength - winLength) / 2) : Math.round(px)
  }
  if (val.endsWith('%')) {
    const pct = parseFloat(val)
    if (!isNaN(pct)) return Math.round(displayLength * (pct / 100) - winLength / 2)
  }
  if (val.includes('/')) {
    const parts = val.split('/')
    if (parts.length === 2) {
      const num = parseFloat(parts[0])
      const den = parseFloat(parts[1])
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        return Math.round(displayLength * (num / den) - winLength / 2)
      }
    }
  }
  const ratio = parseFloat(val)
  if (!isNaN(ratio)) {
    if (ratio >= 0 && ratio <= 1) return Math.round(displayLength * ratio - winLength / 2)
    return Math.round(ratio)
  }
  return Math.round((displayLength - winLength) / 2)
}

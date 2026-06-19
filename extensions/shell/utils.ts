// fallow-ignore-file code-duplication
export const SHELL_EXT_ID = 'com.nuxy.shell'

/** Converts a camelCase style record to a valid inline `style` attribute string. */
export function toInlineStyle(style: Record<string, string | undefined>): string {
  return Object.entries(style)
    .filter((entry): entry is [string, string] => entry[1] != null)
    .map(([key, value]) => {
      const prop = key.startsWith('--') ? key : key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
      return `${prop}:${value}`
    })
    .join(';')
}

function toLayoutPixels(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

/**
 * Width used for launch-position math. Prefers the configured/target width so
 * centering stays stable while CSS width transitions run; falls back to the
 * live box when settings are unavailable.
 */
export function resolveLayoutWidth(
  container: HTMLElement,
  settings: { windowWidth?: unknown },
  manualWidth: number | null | undefined,
  widthOverride?: number
): number {
  if (widthOverride !== undefined) return widthOverride
  if (manualWidth != null && manualWidth > 0) return manualWidth
  return toLayoutPixels(settings.windowWidth) ?? container.offsetWidth
}

export interface ResolveLayoutHeightOptions {
  manualHeight?: number | null
  heightOverride?: number
  springHeight?: number | null
  /** Shell is laid out at windowMaxHeight (tool open), not content height. */
  activeTool?: boolean
}

/**
 * Height used for launch-position math. When a tool is open the shell is sized to
 * windowMaxHeight — use that target so centering stays stable during CSS transitions.
 * On the home screen the box is content-sized, so use the live offsetHeight.
 */
export function resolveLayoutHeight(
  container: HTMLElement,
  settings: { windowMaxHeight?: unknown },
  opts: ResolveLayoutHeightOptions = {}
): number {
  const { manualHeight, heightOverride, springHeight, activeTool } = opts
  if (heightOverride !== undefined) return heightOverride
  if (springHeight != null) return springHeight
  if (manualHeight != null && manualHeight > 0) return manualHeight
  if (activeTool) return toLayoutPixels(settings.windowMaxHeight) ?? container.offsetHeight
  return container.offsetHeight
}

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

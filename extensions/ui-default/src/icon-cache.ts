import type { IconPackDefinition, IconPackMeta } from '@nuxyorg/core'

const svgCache = new Map<string, string>()
const metaCache = new Map<string, IconPackMeta>()
const pendingFetches = new Map<string, Promise<string | null>>()

let packExtId: string | null = null
let availableIcons: Set<string> | null = null

let _resolveReady: (() => void) | null = null
const _ready = new Promise<void>((resolve) => {
  _resolveReady = resolve
})

export function iconCacheReady(): Promise<void> {
  return _ready
}

/** PascalCase or mixed → kebab-case. 'ChevronDown' → 'chevron-down', 'close' stays 'close'. */
function toKebab(name: string): string {
  return name.replace(/([A-Z])/g, (c, l, i: number) => (i ? '-' : '') + l.toLowerCase())
}

export function getIconMeta(name: string): IconPackMeta | null {
  const key = toKebab(name)
  return metaCache.get(key) ?? metaCache.get(name) ?? null
}

export async function getIconSvg(name: string): Promise<string | null> {
  const key = toKebab(name)

  if (svgCache.has(key)) {
    const cached = svgCache.get(key)!
    return cached || null
  }

  if (!packExtId) {
    console.warn('[nuxy-icon] No icon pack loaded — cannot fetch', key)
    return null
  }
  if (availableIcons && !availableIcons.has(key)) return null

  // Deduplicate: concurrent callers share one in-flight fetch instead of racing.
  if (pendingFetches.has(key)) return pendingFetches.get(key)!

  const url = `nuxy-ext://${packExtId}/icons/${key}.svg`
  const promise = fetch(url)
    .then(async (res) => {
      if (!res.ok) {
        console.warn(`[nuxy-icon] fetch failed for ${key}: HTTP ${res.status}`)
        return null
      }
      const svg = await res.text()
      svgCache.set(key, svg)
      return svg
    })
    .catch((err: unknown) => {
      console.warn(`[nuxy-icon] fetch error for ${key}:`, err)
      return null
    })
    .finally(() => {
      pendingFetches.delete(key)
    })

  pendingFetches.set(key, promise)
  return promise
}

function prefetchAll(): void {
  if (!packExtId || !availableIcons) return
  for (const name of availableIcons) {
    void getIconSvg(name)
  }
}

export async function loadIconCache(packName?: string): Promise<void> {
  if (!window.core?.ipc?.invoke) {
    _resolveReady?.()
    return
  }

  const res = await window.core.ipc
    .invoke('kernel', 'getIconPack', packName ? { name: packName } : {})
    .catch((err: unknown) => {
      console.error('[nuxy-icon] getIconPack IPC failed:', err)
      return null
    })
  const r = res as { success: boolean; data?: IconPackDefinition } | null

  if (!r?.success) {
    console.warn('[nuxy-icon] getIconPack returned failure:', r)
  }

  if (r?.success && r.data) {
    svgCache.clear()
    metaCache.clear()
    pendingFetches.clear()

    if (Array.isArray(r.data.icons)) {
      packExtId = r.data.extId ?? null
      availableIcons = new Set(r.data.icons)
    } else {
      // v2 embedded fallback: wrap inner paths in a full SVG string
      packExtId = null
      availableIcons = null
      const SVG_OPEN =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
      for (const [name, paths] of Object.entries(r.data.icons)) {
        const key = toKebab(name)
        if (!svgCache.has(key)) {
          svgCache.set(key, SVG_OPEN + paths + '</svg>')
        }
      }
    }

    if (r.data.meta) {
      for (const [name, m] of Object.entries(r.data.meta)) {
        metaCache.set(toKebab(name), m)
      }
    }

    prefetchAll()
    document.dispatchEvent(new CustomEvent('nuxy-icons-updated'))
  }

  _resolveReady?.()
}

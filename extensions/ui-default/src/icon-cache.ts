import type { IconPackDefinition, IconPackMeta } from '@nuxy/core'

const cache = new Map<string, string>()
const metaCache = new Map<string, IconPackMeta>()

export function getIconPaths(name: string): string | null {
  return cache.get(name) ?? null
}

export function getIconMeta(name: string): IconPackMeta | null {
  return metaCache.get(name) ?? null
}

export async function loadIconCache(packName?: string): Promise<void> {
  if (!window.core?.ipc?.invoke) return
  const res = await window.core.ipc
    .invoke('kernel', 'getIconPack', packName ? { name: packName } : {})
    .catch(() => null)
  const r = res as { success: boolean; data?: IconPackDefinition } | null
  if (!r?.success || !r.data) return

  cache.clear()
  metaCache.clear()
  for (const [name, paths] of Object.entries(r.data.icons)) {
    cache.set(name, paths)
  }
  if (r.data.meta) {
    for (const [name, m] of Object.entries(r.data.meta)) {
      metaCache.set(name, m)
    }
  }

  document.dispatchEvent(new CustomEvent('nuxy-icons-updated'))
}

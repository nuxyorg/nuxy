/** Renderer-side typed event bus (preload). Replaces window CustomEvent coupling. */
export interface NuxyRendererEventMap {
  'shell-reset': undefined
  'locale-changed': undefined
  'settings-updated': Record<string, unknown>
  'settings-loaded': Record<string, unknown>
  'extension-settings-updated': { extId: string; values: Record<string, unknown> }
  'composition-ready': undefined
}

export type NuxyRendererEvent = keyof NuxyRendererEventMap

export interface CoreEvents {
  emit<K extends NuxyRendererEvent>(
    type: K,
    ...args: NuxyRendererEventMap[K] extends undefined ? [] : [detail: NuxyRendererEventMap[K]]
  ): void
  on<K extends NuxyRendererEvent>(
    type: K,
    handler: (detail: NuxyRendererEventMap[K]) => void
  ): () => void
}

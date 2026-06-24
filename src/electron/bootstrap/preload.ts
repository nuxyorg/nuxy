import { contextBridge, ipcRenderer } from 'electron'
import type { DeeplinkPayload } from '@nuxyorg/core'
import { DEEPLINK_OPEN_CHANNEL, DEEPLINK_DISPATCH_CHANNEL } from '@nuxyorg/core'
import { createCompositionBridge } from './composition-bridge.js'
import { createShellBridge } from './shell-bridge.js'
import { createEventsBridge } from './events-bridge.js'

contextBridge.exposeInMainWorld('core', {
  ipc: {
    invoke: (
      extId: string,
      channel: string,
      payload?: unknown,
      options?: { callerExtId?: string }
    ) =>
      options
        ? ipcRenderer.invoke('ext:invoke', extId, channel, payload, options)
        : ipcRenderer.invoke('ext:invoke', extId, channel, payload),
  },
  window: {
    ready: () => ipcRenderer.send('window:ready'),
    resize: (width: number, height: number) => ipcRenderer.send('window:resize', width, height),
    hide: () => ipcRenderer.send('window:hide'),
    esc: () => ipcRenderer.send('window:esc'),
    quit: () => ipcRenderer.send('window:quit'),
    center: () => ipcRenderer.send('window:center'),
    dragStart: () => ipcRenderer.send('window:drag-start'),
    dragMove: () => ipcRenderer.send('window:drag-move'),
    dragEnd: () => ipcRenderer.send('window:drag-end'),
    onShow: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('window:show', listener)
      return () => {
        ipcRenderer.off('window:show', listener)
      }
    },
    setBlurSuppressed: (suppressed: boolean, source?: 'manifest' | 'tool') =>
      ipcRenderer.send('window:set-blur-suppressed', { suppressed, source: source ?? 'tool' }),
    setBlurSuppressedSync: (suppressed: boolean, source?: 'manifest' | 'tool') =>
      ipcRenderer.invoke('window:set-blur-suppressed-sync', {
        suppressed,
        source: source ?? 'tool',
      }) as Promise<{ suppressed: boolean }>,
    clearBlurSuppressed: () => ipcRenderer.send('window:set-blur-suppressed', 'clear'),
  },
  icons: {
    get: (name: string, pack?: string) =>
      ipcRenderer.invoke('ext:invoke', 'kernel', 'getIcon', { name, pack }),
    listPacks: () => ipcRenderer.invoke('ext:invoke', 'kernel', 'listIconPacks', {}),
  },
  themes: {
    list: () => ipcRenderer.invoke('ext:invoke', 'kernel', 'listThemes', {}),
  },
  tools: {
    resolveElementTag: async (extId: string): Promise<string | null> => {
      const res = (await ipcRenderer.invoke('ext:invoke', 'kernel', 'getToolElementTag', {
        extId,
      })) as { success: boolean; data?: string | null }
      return res?.success ? (res.data ?? null) : null
    },
  },
  composition: createCompositionBridge(ipcRenderer),
  shell: createShellBridge(),
  events: createEventsBridge(),
  deeplink: {
    onOpen: (callback: (payload: DeeplinkPayload) => void) => {
      const listener = (_event: unknown, payload: DeeplinkPayload) => callback(payload)
      ipcRenderer.on(DEEPLINK_OPEN_CHANNEL, listener)
      return () => {
        ipcRenderer.off(DEEPLINK_OPEN_CHANNEL, listener)
      }
    },
    /**
     * Self-triggers the same `handleDeeplinkUrl` dispatch path used for
     * OS-delivered/cold-start/control-socket deeplinks, for a `nuxy://...`
     * URL constructed entirely within the renderer (e.g. a Ctrl+K
     * `caller.commands` entry). Resolves to `{ ok: true } | { ok: false, error }`.
     */
    dispatch: (url: string) => ipcRenderer.invoke(DEEPLINK_DISPATCH_CHANNEL, url),
  },
})

ipcRenderer
  .invoke('ext:invoke', 'kernel', 'getPreloads', {})
  .then(async (res: { success: boolean; data?: Array<{ id: string; url: string }> }) => {
    if (res?.success && Array.isArray(res.data)) {
      const promises = res.data.map((item: { id: string; url: string }) =>
        import(/* @vite-ignore */ item.url).catch((err) => {
          console.error(`[Preload] Failed to load extension preload for "${item.id}":`, err)
        })
      )
      await Promise.all(promises)
    }
  })
  .catch((err) => {
    console.error('[Preload] Failed to fetch extension preloads:', err)
  })
  .finally(() => {
    ipcRenderer.send('window:preloads-loaded')
  })

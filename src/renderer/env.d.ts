/// <reference types="vite/client" />

import type { CoreComposition, CoreShell, CoreEvents, DeeplinkPayload } from '@nuxyorg/core'

declare global {
  const __NUXY_DEV__: boolean
  interface Window {
    UI: typeof import('@nuxyorg/ui')
    __NUXY_DEV__: boolean
    core?: {
      ipc: {
        invoke: <R = unknown>(
          extId: string,
          channel: string,
          payload?: unknown
        ) => Promise<{
          success: boolean
          data?: R
          error?: string
          code?: string
        }>
      }
      window: {
        ready: () => void
        resize: (width: number, height: number) => void
        hide: () => void
        esc: () => void
        center: () => void
        dragStart: () => void
        dragMove: () => void
        dragEnd: () => void
        onShow: (callback: () => void) => () => void
        setBlurSuppressed: (suppressed: boolean, source?: 'manifest' | 'tool') => void
        clearBlurSuppressed: () => void
      }
      icons: {
        get: (name: string, pack?: string) => Promise<unknown>
        listPacks: () => Promise<unknown>
      }
      themes: {
        list: () => Promise<unknown>
      }
      tools: {
        resolveElementTag: (extId: string) => Promise<string | null>
      }
      composition: CoreComposition
      shell: CoreShell
      events: CoreEvents
      deeplink: {
        onOpen: (callback: (payload: DeeplinkPayload) => void) => () => void
        /** Self-triggers the main process's `handleDeeplinkUrl` for a `nuxy://...` URL. */
        dispatch: (
          url: string
        ) => Promise<
          { ok: true } | { ok: false; error: 'invalid-url' | 'unknown-extension' | 'no-window' }
        >
      }
    }
  }
}

export {}

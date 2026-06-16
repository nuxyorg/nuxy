/// <reference types="vite/client" />

import type { CoreComposition, CoreShell, CoreEvents } from '@nuxyorg/core'

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
        setBlurSuppressed: (suppressed: boolean) => void
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
    }
  }
}

export {}

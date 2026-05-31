/**
 * Global type declarations for Nuxy extension frontends.
 * Frontend files (.tsx) run inside the renderer process and access
 * React, the UI kit, and the core API exclusively through window globals.
 */

import type * as React from 'react'
import type * as UIKit from '@nuxy/ui'

declare global {
  interface Window {
    React: typeof React & { createElement: typeof React.createElement }
    /** Primary access path for the UI kit (window.UI). */
    UI: typeof UIKit
    /** Legacy alias kept for backwards compat — prefer window.UI. */
    ui: typeof UIKit
    core: {
      ipc: {
        invoke: (extId: string, channel: string, payload?: unknown) => Promise<unknown>
      }
      window: {
        resize: (width: number, height: number) => void
        hide: () => void
        esc: () => void
        center: () => void
        dragStart: () => void
        dragMove: () => void
        dragEnd: () => void
        onShow: (callback: () => void) => () => void
      }
      icons: {
        get: (name: string, pack?: string) => Promise<unknown>
        listPacks: () => Promise<unknown>
      }
      themes: {
        list: () => Promise<unknown>
      }
      /**
       * Kernel i18n helper — fetches translations for any extension.
       * Prefer using `useTranslation(extId)` from `window.UI` in component code.
       */
      i18n?: {
        getTranslations: (extId: string) => Promise<{
          locale: string
          dir: 'ltr' | 'rtl'
          translations: Record<string, string>
        }>
      }
    }
  }
}

export {}

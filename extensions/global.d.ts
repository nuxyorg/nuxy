import type { CoreShell, CoreEvents, CoreComposition } from '@nuxy/core'

declare global {
  interface CustomElementRegistry {
    registry: {
      clear: () => void
    }
  }

  interface Window {
    /** Primary access path for the UI kit (window.UI). Set by the active uikit extension at runtime. */
    UI: Record<string, any>
    /** Legacy alias kept for backwards compat — prefer window.UI. */
    ui: Record<string, any>
    core: {
      ipc: {
        invoke: (extId: string, channel: string, payload?: unknown) => Promise<unknown>
      }
      window: {
        ready: () => void
        resize: (width: number, height: number) => void
        hide: () => void
        esc: () => void
        quit: () => void
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
      tools?: {
        resolveElementTag: (extId: string) => Promise<string | null>
      }
      composition?: CoreComposition
      shell?: CoreShell
      events?: CoreEvents
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

/// <reference types="vite/client" />

declare const __NUXY_DEV__: boolean

interface Window {
  React: typeof import('react')
  UI: typeof import('@nuxy/ui')
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
    }
    icons: {
      get: (name: string, pack?: string) => Promise<unknown>
      listPacks: () => Promise<unknown>
    }
    themes: {
      list: () => Promise<unknown>
    }
  }
}

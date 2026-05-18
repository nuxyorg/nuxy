/// <reference types="vite/client" />

interface Window {
  core: {
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
      resize: (width: number, height: number) => void
      hide: () => void
      esc: () => void
      center: () => void
      dragStart: () => void
      dragMove: () => void
      dragEnd: () => void
      onShow: (callback: () => void) => () => void
    }
  }
}

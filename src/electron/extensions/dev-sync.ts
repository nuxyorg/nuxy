/// <reference types="vite/client" />
import { startExtensionDirectoryWatcher } from './extension-reload.js'
import { invokeRescan } from './rescan-hook.js'

export function startExtensionWatcher(): void {
  startExtensionDirectoryWatcher(import.meta.env.DEV, () => {
    void invokeRescan()
  })
}

import type { CoreContext } from '@nuxyorg/extension-sdk'

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'ipc-explorer', displayName: 'IPC Explorer' })
}

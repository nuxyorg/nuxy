import type { CoreContext } from '@nuxy/extension-sdk'

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'my-extension' })

  core.ipc.handle('ping', async () => ({ ok: true }))
}

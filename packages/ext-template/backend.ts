import type { CoreContext } from '@nuxyorg/extension-sdk'

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'my-extension' })

  core.ipc.handle('ping', async () => ({ ok: true }))
}

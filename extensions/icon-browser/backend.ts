import type { CoreContext } from '@nuxy/extension-sdk'

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'icon-browser' })
}

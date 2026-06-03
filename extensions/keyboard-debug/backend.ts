import type { CoreContext } from '@nuxy/extension-sdk'

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'keyboard-debug' })
  core.logger.info('keyboard-debug registered')
}

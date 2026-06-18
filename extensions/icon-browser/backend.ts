import type { CoreContext } from '@nuxyorg/extension-sdk'
import type { CopyIconNamePayload, CopyIconSvgPayload } from './types.ts'

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'icon-browser' })

  core.ipc.handle('copyIconName', async (payload: unknown): Promise<void> => {
    const { name } = payload as CopyIconNamePayload
    await core.clipboard.writeText(name)
    core.logger.info(`Copied icon name to clipboard: ${name}`)
  })

  core.ipc.handle('copyIconSvg', async (payload: unknown): Promise<void> => {
    const { svg } = payload as CopyIconSvgPayload
    await core.clipboard.writeText(svg)
    core.logger.info('Copied icon SVG markup to clipboard')
  })
}

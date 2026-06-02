import type { CoreContext } from '@nuxy/extension-sdk'
import type { SoundSettings } from './types.ts'

export async function register(core: CoreContext): Promise<void> {
  core.ipc.handle('getSettings', async (): Promise<SoundSettings> => {
    const enabled = (await core.settings.read<boolean>('enabled')) ?? true
    const volume = (await core.settings.read<number>('volume')) ?? 0.2
    const style = (await core.settings.read<string>('style')) ?? 'click'
    return { enabled, volume, style: style as SoundSettings['style'] }
  })

  core.logger.info('Ambient Sound registered')
}

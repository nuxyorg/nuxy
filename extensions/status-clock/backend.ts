import type { CoreContext } from '@nuxy/extension-sdk'
import type { ClockSettings } from './types.ts'

export async function register(core: CoreContext): Promise<void> {
  core.ipc.handle('getSettings', async (): Promise<ClockSettings> => {
    const format = (await core.settings.read<string>('format')) ?? '24h'
    const showSeconds = (await core.settings.read<boolean>('showSeconds')) ?? true
    return { format: format as '12h' | '24h', showSeconds }
  })

  core.logger.info('Status Clock registered')
}

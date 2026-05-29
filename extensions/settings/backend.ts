import type { CoreContext } from '@nuxy/extension-sdk'
import type { NuxySettings, SaveSettingsPayload } from './types.ts'

const DEFAULT: NuxySettings = {
  // Appearance
  theme: 'dark',
  iconPack: '',
  zoom: '100%',
  font: 'system',
  // Window behaviour (formerly nuxyconfig)
  escAction: 'hide',
  blurAction: 'hide',
  windowWidth: 800,
  windowMaxHeight: 600,
  alwaysOnTop: false,
  opacity: 1,
  showInTaskbar: false,
  showOnStartup: false,
  windowPosition: '1/2, 1/3',
}

export function register(core: CoreContext): void {
  core.ipc.handle('getSettings', async (): Promise<NuxySettings> => {
    const saved = await core.storage.read<Partial<NuxySettings>>('settings.json')
    return { ...DEFAULT, ...(saved || {}) }
  })

  core.ipc.handle('saveSettings', async (data: SaveSettingsPayload): Promise<NuxySettings> => {
    const next: NuxySettings = { ...DEFAULT, ...data }
    await core.storage.write('settings.json', next)
    return next
  })
}

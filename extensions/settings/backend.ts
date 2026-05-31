import type { CoreContext } from '@nuxy/extension-sdk'
import type { NuxySettings } from './types.ts'

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
  // Language
  preferredLanguages: [],
}

export function register(core: CoreContext): void {
  core.ipc.handle('getSettings', async (): Promise<NuxySettings> => {
    const saved = await core.storage.read<Partial<NuxySettings>>('settings.json')
    return { ...DEFAULT, ...(saved || {}) }
  })

  core.ipc.handle('saveSettings', async (payload: unknown): Promise<NuxySettings> => {
    const next: NuxySettings = { ...DEFAULT, ...(payload as Partial<NuxySettings>) }
    await core.storage.write('settings.json', next)
    return next
  })

  core.ipc.handle(
    'getExtensionSettingValues',
    async (payload: unknown): Promise<Record<string, unknown>> => {
      if (!core.settings.readAllExtension) return {}
      return core.settings.readAllExtension(payload as string)
    }
  )

  core.ipc.handle(
    'saveExtensionSettingValues',
    async (payload: unknown): Promise<Record<string, unknown>> => {
      const { extId, values } = payload as { extId: string; values: Record<string, unknown> }
      if (!core.settings.writeAllExtension) return values
      await core.settings.writeAllExtension(extId, values)
      return values
    }
  )
}

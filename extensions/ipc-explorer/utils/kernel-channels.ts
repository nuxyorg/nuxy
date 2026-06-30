/** Example payloads for kernel channels that accept arguments. */
export const KERNEL_IPC_SAMPLES: Record<string, unknown> = {
  getExtensionTranslations: { extId: 'com.nuxy.shell' },
  getIcon: { name: 'download' },
  getIconPack: { name: 'lucide' },
  getThemeByName: { name: 'dark' },
  getToolElementTag: { extId: 'com.nuxy.clipboard' },
  installExtension: {
    extId: 'com.nuxy.example',
    downloadUrl: 'https://example.com/com.nuxy.example.zip',
  },
  setExtensionEnabled: { extId: 'com.nuxy.example', enabled: true },
  uninstallExtension: { extId: 'com.nuxy.example' },
  validateCompositionClaim: { extId: 'com.nuxy.example', slotName: 'header' },
}

/** Mirrors `KERNEL_CHANNELS` in `src/electron/ipc/validate.ts`. */
export const KERNEL_IPC_CHANNELS = [
  'applyWindowSettings',
  'getConfig',
  'getDefaultThemeName',
  'getExtensionSettingsSchemas',
  'getExtensionTranslations',
  'getIcon',
  'getIconPack',
  'getPreloads',
  'getTheme',
  'getThemeByName',
  'getToolElementTag',
  'installExtension',
  'listCompositionSlots',
  'listIconPacks',
  'listInstalledExtensions',
  'listOrchestrators',
  'listProviders',
  'listSystemFonts',
  'listThemes',
  'listTools',
  'listUikitExtensions',
  'setExtensionEnabled',
  'uninstallExtension',
  'validateCompositionClaim',
] as const

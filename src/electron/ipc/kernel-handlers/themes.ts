import { loadTheme } from '../../themes/install.js'
import { listExtensionThemeNames, getDefaultThemeName } from '../../themes/extension-themes.js'
import { getIcon, getIconPack, listIconPacks } from '../../icons/registry.js'
import type { IpcResult } from '@nuxyorg/core'

type Handler = (payload: unknown) => IpcResult | Promise<IpcResult>

export const themeHandlers: Record<string, Handler> = {
  getTheme: () => ({ success: true, data: loadTheme(getDefaultThemeName() ?? '') }),

  getThemeByName: (payload) => {
    const args = payload as { name?: string } | undefined
    const name = args?.name
    // Empty/missing name → return default theme
    if (!name || typeof name !== 'string') {
      return { success: true, data: loadTheme(getDefaultThemeName() ?? '') }
    }
    return { success: true, data: loadTheme(name) }
  },

  getDefaultThemeName: () => {
    const name = getDefaultThemeName()
    if (!name) return { success: false, error: 'No themes registered', code: 'NOT_FOUND' }
    return { success: true, data: name }
  },

  listThemes: () => {
    return { success: true, data: listExtensionThemeNames() }
  },

  getIcon: (payload) => {
    const args = payload as { name?: string; pack?: string } | undefined
    const name = args?.name
    if (!name || typeof name !== 'string') {
      return { success: false, error: 'Missing icon name', code: 'INVALID_ARGS' }
    }
    const svg = getIcon(name, args?.pack)
    if (!svg) {
      return { success: false, error: `Icon not found: ${name}`, code: 'NOT_FOUND' }
    }
    return { success: true, data: svg }
  },

  listIconPacks: () => ({ success: true, data: listIconPacks() }),

  getIconPack: (payload) => {
    const args = payload as { name?: string } | undefined
    const pack = getIconPack(args?.name)
    if (!pack) return { success: false, error: 'No icon pack loaded', code: 'NOT_FOUND' }
    return { success: true, data: pack }
  },
}

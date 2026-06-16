import { kernelLogger } from '@nuxyorg/core'
import type { ThemeDefinition } from '@nuxyorg/core'
import { getExtensionTheme } from './extension-themes.js'
import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME } from './defaults.js'

const log = kernelLogger.child('Themes')

export { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME } from './defaults.js'

export function loadTheme(name: string): ThemeDefinition {
  const extTheme = getExtensionTheme(name)
  if (extTheme) return extTheme

  if (name === 'light') return DEFAULT_LIGHT_THEME
  return DEFAULT_DARK_THEME
}

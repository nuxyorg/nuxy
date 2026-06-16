import { kernelLogger } from '@nuxyorg/core'
import type { ThemeDefinition } from '@nuxyorg/core'
import {
  getExtensionTheme,
  getDefaultTheme,
  getDefaultThemeName,
} from './extension-themes.js'

const log = kernelLogger.child('Themes')

/**
 * Load a theme by name from the extension registry.
 * Falls back to the default theme (first registered) if the named theme is not found.
 */
export function loadTheme(name: string): ThemeDefinition {
  const theme = getExtensionTheme(name) ?? getDefaultTheme()
  if (!theme) {
    log.warn(`Theme "${name}" not found and no default theme registered — returning empty shell`)
    return { version: 1, name, colors: {}, tokens: {} }
  }
  if (!getExtensionTheme(name)) {
    log.warn(`Theme "${name}" not found — falling back to default: "${getDefaultThemeName()}"`)
  }
  return theme
}

import fs from 'fs'
import path from 'path'
import { THEMES_DIR } from '../paths.js'
import { kernelLogger } from '@nuxy/core'
import type { ThemeDefinition } from '@nuxy/core'
import darkBundled from '../../themes/default-dark.json'
import lightBundled from '../../themes/default-light.json'

const log = kernelLogger.child('Themes')

export const DEFAULT_DARK_THEME = darkBundled as ThemeDefinition
export const DEFAULT_LIGHT_THEME = lightBundled as ThemeDefinition

function shouldRewriteUserTheme(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return true
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ThemeDefinition
    return !parsed.version || parsed.version < 1
  } catch {
    return true
  }
}

/** Copy bundled defaults into ~/.nuxy/themes/ when missing or outdated. */
export function ensureUserThemes(): void {
  if (!fs.existsSync(THEMES_DIR)) {
    fs.mkdirSync(THEMES_DIR, { recursive: true })
  }

  const pairs: Array<{ file: string; theme: ThemeDefinition }> = [
    { file: 'dark.json', theme: DEFAULT_DARK_THEME },
    { file: 'light.json', theme: DEFAULT_LIGHT_THEME }
  ]

  for (const { file, theme } of pairs) {
    const dest = path.join(THEMES_DIR, file)
    if (shouldRewriteUserTheme(dest)) {
      fs.writeFileSync(dest, JSON.stringify(theme, null, 2), 'utf8')
      log.info(`Initialized/updated user theme: ${dest}`)
    }
  }
}

export function loadTheme(name: string): ThemeDefinition {
  const themePath = path.join(THEMES_DIR, `${name}.json`)
  if (fs.existsSync(themePath)) {
    try {
      return JSON.parse(fs.readFileSync(themePath, 'utf8')) as ThemeDefinition
    } catch (e) {
      log.error(`Failed to parse theme ${themePath}`, e)
    }
  }
  if (name === 'light') return DEFAULT_LIGHT_THEME
  return DEFAULT_DARK_THEME
}

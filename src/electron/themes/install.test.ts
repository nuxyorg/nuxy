import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

// vi.hoisted runs before vi.mock factories, so tmpDir is available when the mock is evaluated
const { tmpDir } = vi.hoisted(() => {
  const fsSync = require('fs') as typeof import('fs')
  const pathMod = require('path') as typeof import('path')
  const osMod = require('os') as typeof import('os')
  const dir = fsSync.mkdtempSync(pathMod.join(osMod.tmpdir(), 'nuxy-themes-'))
  return { tmpDir: dir }
})

vi.mock('../config/paths.js', () => ({
  THEMES_DIR: tmpDir,
  NUXY_HOME: require('os').tmpdir(),
  CONFIG_DIR: require('os').tmpdir(),
  DATA_DIR: require('os').tmpdir(),
  EXTENSION_DIR: require('os').tmpdir(),
  LEGACY_DATA_DIR: require('os').tmpdir(),
}))

vi.mock('./extension-themes.js', () => ({
  getExtensionTheme: vi.fn(() => undefined),
  registerExtensionTheme: vi.fn(),
  listExtensionThemeNames: vi.fn(() => []),
  clearExtensionThemes: vi.fn(),
}))

import {
  loadTheme,
  ensureUserThemes,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  listFileThemeNames,
} from './install.js'
import { getExtensionTheme } from './extension-themes.js'

afterEach(() => {
  vi.mocked(getExtensionTheme).mockReturnValue(undefined)
  try {
    const files = fs.readdirSync(tmpDir)
    for (const f of files) fs.rmSync(path.join(tmpDir, f))
  } catch {}
})

describe('ensureUserThemes', () => {
  it('creates the themes directory if missing', () => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    expect(fs.existsSync(tmpDir)).toBe(false)
    ensureUserThemes()
    expect(fs.existsSync(tmpDir)).toBe(true)
    fs.mkdirSync(tmpDir, { recursive: true })
  })

  it('writes dark.json', () => {
    ensureUserThemes()
    expect(fs.existsSync(path.join(tmpDir, 'dark.json'))).toBe(true)
  })

  it('writes light.json', () => {
    ensureUserThemes()
    expect(fs.existsSync(path.join(tmpDir, 'light.json'))).toBe(true)
  })

  it('dark.json content matches DEFAULT_DARK_THEME', () => {
    ensureUserThemes()
    const content = JSON.parse(fs.readFileSync(path.join(tmpDir, 'dark.json'), 'utf8'))
    expect(content).toEqual(DEFAULT_DARK_THEME)
  })

  it('light.json content matches DEFAULT_LIGHT_THEME', () => {
    ensureUserThemes()
    const content = JSON.parse(fs.readFileSync(path.join(tmpDir, 'light.json'), 'utf8'))
    expect(content).toEqual(DEFAULT_LIGHT_THEME)
  })

  it('overwrites a theme missing version field', () => {
    fs.writeFileSync(path.join(tmpDir, 'dark.json'), JSON.stringify({ name: 'dark' }))
    ensureUserThemes()
    const content = JSON.parse(fs.readFileSync(path.join(tmpDir, 'dark.json'), 'utf8'))
    expect(content).toEqual(DEFAULT_DARK_THEME)
  })

  it('overwrites a theme with version < 1', () => {
    fs.writeFileSync(path.join(tmpDir, 'dark.json'), JSON.stringify({ name: 'dark', version: 0 }))
    ensureUserThemes()
    const content = JSON.parse(fs.readFileSync(path.join(tmpDir, 'dark.json'), 'utf8'))
    expect(content).toEqual(DEFAULT_DARK_THEME)
  })

  it('preserves an up-to-date theme (version >= 1)', () => {
    const custom = { ...DEFAULT_DARK_THEME, version: 1, extra: 'custom' }
    fs.writeFileSync(path.join(tmpDir, 'dark.json'), JSON.stringify(custom))
    ensureUserThemes()
    const content = JSON.parse(fs.readFileSync(path.join(tmpDir, 'dark.json'), 'utf8'))
    expect(content).toEqual(custom)
  })
})

describe('loadTheme', () => {
  beforeEach(() => ensureUserThemes())

  it('returns DEFAULT_DARK_THEME for "dark"', () => {
    expect(loadTheme('dark')).toEqual(DEFAULT_DARK_THEME)
  })

  it('returns DEFAULT_LIGHT_THEME for "light"', () => {
    expect(loadTheme('light')).toEqual(DEFAULT_LIGHT_THEME)
  })

  it('falls back to DEFAULT_DARK_THEME for unknown name', () => {
    expect(loadTheme('does-not-exist-xyz')).toEqual(DEFAULT_DARK_THEME)
  })

  it('falls back to DEFAULT_LIGHT_THEME when light file is missing', () => {
    fs.rmSync(path.join(tmpDir, 'light.json'))
    expect(loadTheme('light')).toEqual(DEFAULT_LIGHT_THEME)
  })

  it('loads a custom theme file', () => {
    const custom = { name: 'ocean', version: 1, vars: { '--bg': '#001122' } }
    fs.writeFileSync(path.join(tmpDir, 'ocean.json'), JSON.stringify(custom))
    expect(loadTheme('ocean')).toEqual(custom)
  })

  it('falls back to dark when custom theme JSON is invalid', () => {
    fs.writeFileSync(path.join(tmpDir, 'broken.json'), '{ not valid json }}}')
    expect(loadTheme('broken')).toEqual(DEFAULT_DARK_THEME)
  })

  it('returns extension theme when registered', () => {
    const extTheme = { name: 'ext-ocean', version: 1, vars: {} } as any
    vi.mocked(getExtensionTheme).mockReturnValue(extTheme)
    expect(loadTheme('ext-ocean')).toBe(extTheme)
  })

  it('prefers extension theme over file theme', () => {
    const fileTheme = { name: 'dark', version: 1, vars: { '--bg': '#from-file' } } as any
    const extTheme = { name: 'dark', version: 1, vars: { '--bg': '#from-ext' } } as any
    fs.writeFileSync(path.join(tmpDir, 'dark.json'), JSON.stringify(fileTheme))
    vi.mocked(getExtensionTheme).mockReturnValue(extTheme)
    expect(loadTheme('dark')).toBe(extTheme)
  })
})

describe('listFileThemeNames', () => {
  it('returns ["dark", "light"] when themes dir is missing', () => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    expect(listFileThemeNames()).toEqual(['dark', 'light'])
    fs.mkdirSync(tmpDir, { recursive: true })
  })

  it('returns theme names from JSON files', () => {
    ensureUserThemes()
    const names = listFileThemeNames()
    expect(names).toContain('dark')
    expect(names).toContain('light')
  })

  it('strips .json extension', () => {
    ensureUserThemes()
    const names = listFileThemeNames()
    expect(names.every((n) => !n.endsWith('.json'))).toBe(true)
  })

  it('ignores non-json files', () => {
    ensureUserThemes()
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '')
    const names = listFileThemeNames()
    expect(names).not.toContain('README')
    expect(names).not.toContain('README.md')
  })
})

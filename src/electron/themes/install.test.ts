import { describe, it, expect, vi, afterEach } from 'vitest'
import { loadTheme, DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME } from './install.js'
import { getExtensionTheme } from './extension-themes.js'

vi.mock('./extension-themes.js', () => ({
  getExtensionTheme: vi.fn(() => undefined),
  registerExtensionTheme: vi.fn(),
  listExtensionThemeNames: vi.fn(() => []),
  clearExtensionThemes: vi.fn(),
}))

afterEach(() => {
  vi.mocked(getExtensionTheme).mockReturnValue(undefined)
})

describe('loadTheme', () => {
  it('returns DEFAULT_DARK_THEME for "dark"', () => {
    expect(loadTheme('dark')).toEqual(DEFAULT_DARK_THEME)
  })

  it('returns DEFAULT_LIGHT_THEME for "light"', () => {
    expect(loadTheme('light')).toEqual(DEFAULT_LIGHT_THEME)
  })

  it('falls back to DEFAULT_DARK_THEME for unknown name', () => {
    expect(loadTheme('does-not-exist-xyz')).toEqual(DEFAULT_DARK_THEME)
  })

  it('returns extension theme when registered', () => {
    const extTheme = { name: 'ext-ocean', version: 1, vars: {} } as any
    vi.mocked(getExtensionTheme).mockReturnValue(extTheme)
    expect(loadTheme('ext-ocean')).toBe(extTheme)
  })
})

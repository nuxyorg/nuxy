import { describe, it, expect, vi, afterEach } from 'vitest'
import { loadTheme } from './install.js'
import { getExtensionTheme, getDefaultTheme } from './extension-themes.js'

const mockDark = { name: 'dark', version: 1, colors: { 'bg-base': '#141414' }, tokens: {} }
const mockLight = { name: 'light', version: 1, colors: { 'bg-base': '#F4F4F5' }, tokens: {} }

vi.mock('./extension-themes.js', () => ({
  getExtensionTheme: vi.fn(() => undefined),
  getDefaultTheme: vi.fn(() => mockDark),
  getDefaultThemeName: vi.fn(() => 'dark'),
  registerExtensionTheme: vi.fn(),
  listExtensionThemeNames: vi.fn(() => []),
  clearExtensionThemes: vi.fn(),
}))

afterEach(() => {
  vi.mocked(getExtensionTheme).mockReturnValue(undefined)
  vi.mocked(getDefaultTheme).mockReturnValue(mockDark as any)
})

describe('loadTheme', () => {
  it('returns the named theme when found in registry', () => {
    vi.mocked(getExtensionTheme).mockReturnValue(mockLight as any)
    expect(loadTheme('light')).toBe(mockLight)
  })

  it('falls back to default theme for unknown name', () => {
    expect(loadTheme('does-not-exist-xyz')).toBe(mockDark)
  })

  it('falls back to default when registry returns undefined', () => {
    vi.mocked(getDefaultTheme).mockReturnValue(mockDark as any)
    expect(loadTheme('nonexistent')).toBe(mockDark)
  })

  it('returns empty shell when no themes are registered at all', () => {
    vi.mocked(getDefaultTheme).mockReturnValue(undefined)
    const result = loadTheme('missing')
    expect(result.name).toBe('missing')
    expect(result.colors).toEqual({})
    expect(result.tokens).toEqual({})
  })

  it('returns extension theme when registered', () => {
    const extTheme = { name: 'ext-ocean', version: 1, colors: {}, tokens: {} } as any
    vi.mocked(getExtensionTheme).mockReturnValue(extTheme)
    expect(loadTheme('ext-ocean')).toBe(extTheme)
  })
})

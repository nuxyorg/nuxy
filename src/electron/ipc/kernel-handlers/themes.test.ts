import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../themes/install.js', () => ({
  loadTheme: vi.fn(),
}))

vi.mock('../../themes/extension-themes.js', () => ({
  listExtensionThemeNames: vi.fn(),
  getDefaultThemeName: vi.fn(),
}))

vi.mock('../../icons/registry.js', () => ({
  getIcon: vi.fn(),
  getIconPack: vi.fn(),
  listIconPacks: vi.fn(),
}))

import { themeHandlers } from './themes.js'
import { loadTheme } from '../../themes/install.js'
import { listExtensionThemeNames, getDefaultThemeName } from '../../themes/extension-themes.js'
import { getIcon, getIconPack, listIconPacks } from '../../icons/registry.js'

describe('themeHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTheme', () => {
    it('loads the default theme', () => {
      vi.mocked(getDefaultThemeName).mockReturnValue('dark')
      vi.mocked(loadTheme).mockReturnValue({ name: 'dark' } as any)
      const result = themeHandlers.getTheme(undefined)
      expect(loadTheme).toHaveBeenCalledWith('dark')
      expect(result).toEqual({ success: true, data: { name: 'dark' } })
    })

    it('falls back to empty string when no default theme name is registered', () => {
      vi.mocked(getDefaultThemeName).mockReturnValue(undefined as any)
      vi.mocked(loadTheme).mockReturnValue(null as any)
      const result = themeHandlers.getTheme(undefined)
      expect(loadTheme).toHaveBeenCalledWith('')
      expect(result).toEqual({ success: true, data: null })
    })
  })

  describe('getThemeByName', () => {
    it('loads theme by name when provided', () => {
      vi.mocked(loadTheme).mockReturnValue({ name: 'ocean' } as any)
      const result = themeHandlers.getThemeByName({ name: 'ocean' })
      expect(loadTheme).toHaveBeenCalledWith('ocean')
      expect(result).toEqual({ success: true, data: { name: 'ocean' } })
    })

    it('returns default theme when name is missing', () => {
      vi.mocked(getDefaultThemeName).mockReturnValue('dark')
      vi.mocked(loadTheme).mockReturnValue({ name: 'dark' } as any)
      const result = themeHandlers.getThemeByName(undefined)
      expect(loadTheme).toHaveBeenCalledWith('dark')
      expect(result).toEqual({ success: true, data: { name: 'dark' } })
    })

    it('returns default theme when payload is malformed (non-string name)', () => {
      vi.mocked(getDefaultThemeName).mockReturnValue('dark')
      vi.mocked(loadTheme).mockReturnValue({ name: 'dark' } as any)
      const result = themeHandlers.getThemeByName({ name: 123 } as any)
      expect(loadTheme).toHaveBeenCalledWith('dark')
      expect(result).toEqual({ success: true, data: { name: 'dark' } })
    })
  })

  describe('getDefaultThemeName', () => {
    it('returns the default theme name', () => {
      vi.mocked(getDefaultThemeName).mockReturnValue('dark')
      const result = themeHandlers.getDefaultThemeName(undefined)
      expect(result).toEqual({ success: true, data: 'dark' })
    })

    it('returns NOT_FOUND when no theme is registered', () => {
      vi.mocked(getDefaultThemeName).mockReturnValue(undefined as any)
      const result = themeHandlers.getDefaultThemeName(undefined)
      expect(result).toEqual({ success: false, error: 'No themes registered', code: 'NOT_FOUND' })
    })
  })

  describe('listThemes', () => {
    it('returns list of extension theme names', () => {
      vi.mocked(listExtensionThemeNames).mockReturnValue(['dark', 'light'])
      const result = themeHandlers.listThemes(undefined)
      expect(result).toEqual({ success: true, data: ['dark', 'light'] })
    })

    it('returns empty array when no themes registered', () => {
      vi.mocked(listExtensionThemeNames).mockReturnValue([])
      const result = themeHandlers.listThemes(undefined)
      expect(result).toEqual({ success: true, data: [] })
    })
  })

  describe('getIcon', () => {
    it('rejects missing icon name', () => {
      const result = themeHandlers.getIcon(undefined)
      expect(result).toEqual({ success: false, error: 'Missing icon name', code: 'INVALID_ARGS' })
    })

    it('rejects malformed payload (non-string name)', () => {
      const result = themeHandlers.getIcon({ name: 42 } as any)
      expect((result as any).code).toBe('INVALID_ARGS')
    })

    it('returns icon svg for a valid name/pack', () => {
      vi.mocked(getIcon).mockReturnValue('<svg></svg>')
      const result = themeHandlers.getIcon({ name: 'search', pack: 'default' })
      expect(getIcon).toHaveBeenCalledWith('search', 'default')
      expect(result).toEqual({ success: true, data: '<svg></svg>' })
    })
  })

  describe('listIconPacks', () => {
    it('returns list of icon pack names', () => {
      vi.mocked(listIconPacks).mockReturnValue(['default', 'mono'])
      const result = themeHandlers.listIconPacks(undefined)
      expect(result).toEqual({ success: true, data: ['default', 'mono'] })
    })
  })

  describe('getIconPack', () => {
    it('returns icon pack data when found', () => {
      vi.mocked(getIconPack).mockReturnValue({ version: 1, name: 'default', icons: {} } as any)
      const result = themeHandlers.getIconPack({ name: 'default' })
      expect(getIconPack).toHaveBeenCalledWith('default')
      expect(result).toEqual({
        success: true,
        data: { version: 1, name: 'default', icons: {} },
      })
    })

    it('returns NOT_FOUND when no icon pack is loaded', () => {
      vi.mocked(getIconPack).mockReturnValue(undefined as any)
      const result = themeHandlers.getIconPack({ name: 'missing' })
      expect(result).toEqual({ success: false, error: 'No icon pack loaded', code: 'NOT_FOUND' })
    })

    it('handles missing payload', () => {
      vi.mocked(getIconPack).mockReturnValue(undefined as any)
      const result = themeHandlers.getIconPack(undefined)
      expect(getIconPack).toHaveBeenCalledWith(undefined)
      expect(result).toEqual({ success: false, error: 'No icon pack loaded', code: 'NOT_FOUND' })
    })
  })
})

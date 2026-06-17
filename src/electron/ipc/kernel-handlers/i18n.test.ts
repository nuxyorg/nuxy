import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LoadedExtension } from '@nuxyorg/core'

const loadedExtensions: LoadedExtension[] = vi.hoisted(() => [])

vi.mock('../../extensions/scanner.js', () => ({
  loadedExtensions,
}))

vi.mock('../../extensions/registry.js', () => ({
  getExtensionById: vi.fn(),
  getDisplayName: vi.fn((ext: LoadedExtension) => ext.manifest.name),
  getPreferredLocale: vi.fn(() => 'en'),
}))

vi.mock('../../config/paths.js', () => ({
  EXTRACTED_DIR: '/extracted',
  DATA_DIR: '/data',
}))

vi.mock('electron', () => ({
  app: {
    getLocale: vi.fn(() => 'en-US'),
  },
}))

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => {
      throw new Error('ENOENT')
    }),
  },
}))

vi.mock('@nuxyorg/core', async () => {
  const actual = await vi.importActual<any>('@nuxyorg/core')
  return {
    ...actual,
    resolveLocale: vi.fn(() => 'en'),
    flattenTranslations: vi.fn((obj: unknown) => obj as Record<string, string>),
    getTextDirection: vi.fn(() => 'ltr'),
  }
})

import fs from 'fs'
import { i18nHandlers } from './i18n.js'
import { getExtensionById } from '../../extensions/registry.js'
import { resolveLocale, flattenTranslations } from '@nuxyorg/core'

function makeExt(overrides: Partial<LoadedExtension> = {}): LoadedExtension {
  return {
    id: 'com.example.ext',
    folderName: 'ext',
    manifest: { id: 'com.example.ext', name: 'Ext', version: '1.0.0', type: 'tool' },
    ...overrides,
  } as LoadedExtension
}

describe('i18nHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadedExtensions.length = 0
    vi.mocked(fs.existsSync).mockReturnValue(false)
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('ENOENT')
    })
  })

  describe('getExtensionSettingsSchemas', () => {
    it('returns empty array when no extension has a settingsSchema', () => {
      loadedExtensions.push(makeExt())
      const result = i18nHandlers.getExtensionSettingsSchemas(undefined)
      expect(result).toEqual({ success: true, data: [] })
    })

    it('returns schema for extensions that declare settingsSchema (no locales)', () => {
      const ext = makeExt({
        settingsSchema: { fields: [{ key: 'foo', label: 'Foo' }] },
      } as any)
      loadedExtensions.push(ext)
      const result = i18nHandlers.getExtensionSettingsSchemas(undefined)
      expect(result).toEqual({
        success: true,
        data: [
          {
            extId: 'com.example.ext',
            name: 'Ext',
            schema: { fields: [{ key: 'foo', label: 'Foo' }] },
          },
        ],
      })
    })

    it('translates schema fields when a matching locale file exists', () => {
      const ext = makeExt({
        manifest: {
          id: 'com.example.ext',
          name: 'Ext',
          version: '1.0.0',
          type: 'tool',
          locales: { default: 'en', supported: ['en'] },
        },
        settingsSchema: { fields: [{ key: 'foo', label: 'Foo' }] },
      } as any)
      loadedExtensions.push(ext)
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ settings: { foo: { label: 'Translated Foo' } } })
      )
      const result = i18nHandlers.getExtensionSettingsSchemas(undefined)
      expect((result as any).data[0].schema.fields[0].label).toBe('Translated Foo')
    })
  })

  describe('getExtensionTranslations', () => {
    it('rejects missing extId', () => {
      const result = i18nHandlers.getExtensionTranslations(undefined)
      expect(result).toEqual({ success: false, error: 'Missing extId', code: 'INVALID_ARGS' })
    })

    it('rejects malformed payload (non-string extId)', () => {
      const result = i18nHandlers.getExtensionTranslations({ extId: 123 })
      expect((result as any).code).toBe('INVALID_ARGS')
    })

    it('returns NOT_FOUND when extension is not registered', () => {
      vi.mocked(getExtensionById).mockReturnValue(undefined)
      const result = i18nHandlers.getExtensionTranslations({ extId: 'com.missing.ext' })
      expect(result).toEqual({
        success: false,
        error: 'Extension not registered yet',
        code: 'NOT_FOUND',
      })
    })

    it('returns default empty translations when extension has no locales config', () => {
      vi.mocked(getExtensionById).mockReturnValue(makeExt())
      const result = i18nHandlers.getExtensionTranslations({ extId: 'com.example.ext' })
      expect(result).toEqual({
        success: true,
        data: { locale: 'en', dir: 'ltr', translations: {} },
      })
    })

    it('resolves locale and loads translations when locales config is present', () => {
      const ext = makeExt({
        manifest: {
          id: 'com.example.ext',
          name: 'Ext',
          version: '1.0.0',
          type: 'tool',
          locales: { supported: ['en', 'tr'], default: 'en' },
        },
      } as any)
      vi.mocked(getExtensionById).mockReturnValue(ext)
      vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
        if (String(p).includes('settings.json')) return JSON.stringify({ preferredLanguages: [] })
        return JSON.stringify({ hello: 'world' })
      })
      vi.mocked(flattenTranslations).mockReturnValue({ hello: 'world' })

      const result = i18nHandlers.getExtensionTranslations({ extId: 'com.example.ext' })
      expect(resolveLocale).toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
        data: { locale: 'en', dir: 'ltr', translations: { hello: 'world' } },
      })
    })

    it('falls back to empty translations when locale files cannot be read', () => {
      const ext = makeExt({
        manifest: {
          id: 'com.example.ext',
          name: 'Ext',
          version: '1.0.0',
          type: 'tool',
          locales: { supported: ['en'], default: 'en' },
        },
      } as any)
      vi.mocked(getExtensionById).mockReturnValue(ext)
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT')
      })
      const result = i18nHandlers.getExtensionTranslations({ extId: 'com.example.ext' })
      expect((result as any).data.translations).toEqual({})
    })
  })
})

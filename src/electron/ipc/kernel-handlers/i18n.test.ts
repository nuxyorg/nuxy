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
    mergeTranslations: vi.fn((base: Record<string, string>, overrides: Record<string, string>) => ({
      ...base,
      ...overrides,
    })),
    getTextDirection: vi.fn(() => 'ltr'),
  }
})

import fs from 'fs'
import { i18nHandlers, readSettingsSchemaFromDisk } from './i18n.js'
import { getExtensionById } from '../../extensions/registry.js'
import { resolveLocale, flattenTranslations, mergeTranslations } from '@nuxyorg/core'

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

    it('reads fresh settings.json from disk and preserves labels for untranslated select options', () => {
      const ext = makeExt({
        id: 'com.nuxy.nyaa',
        folderName: 'com.nuxy.nyaa-1.0.0',
        manifest: {
          id: 'com.nuxy.nyaa',
          name: 'Nyaa',
          version: '1.0.0',
          type: 'tool',
          entry: { settings: 'settings.json' },
          locales: { default: 'en', supported: ['en', 'tr'] },
        },
        settingsSchema: {
          fields: [
            {
              key: 'enterAction',
              label: 'Enter Key Action',
              type: 'select',
              options: [
                { value: 'copyMagnet', label: 'Copy Magnet Link' },
                { value: 'downloadTorrent', label: 'Save Torrent File' },
              ],
            },
          ],
        },
      } as any)
      loadedExtensions.push(ext)
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        const filePath = String(p)
        if (filePath.endsWith('/com.nuxy.nyaa-1.0.0/settings.json')) {
          return JSON.stringify({
            fields: [
              {
                key: 'enterAction',
                label: 'Enter Key Action',
                type: 'select',
                options: [
                  { value: 'copyMagnet', label: 'Copy Magnet Link' },
                  { value: 'downloadTorrent', label: 'Save Torrent File' },
                  { value: 'torrentClient', label: 'Add via qBittorrent' },
                ],
              },
            ],
          })
        }
        if (filePath.endsWith('/com.nuxy.nyaa-1.0.0/locales/en.json')) {
          return JSON.stringify({
            settings: {
              enterAction: {
                label: 'Enter Key Action',
                options: {
                  copyMagnet: 'Copy Magnet Link',
                  downloadTorrent: 'Save Torrent File',
                },
              },
            },
          })
        }
        throw new Error(`unexpected read: ${filePath}`)
      })

      const result = i18nHandlers.getExtensionSettingsSchemas(undefined)
      const enterField = (result as any).data[0].schema.fields[0]
      expect(enterField.options.map((o: { value: string; label: string }) => o.label)).toEqual([
        'Copy Magnet Link',
        'Save Torrent File',
        'Add via qBittorrent',
      ])
    })

    it('readSettingsSchemaFromDisk prefers the extracted settings.json over cached schema', () => {
      const ext = makeExt({
        folderName: 'com.nuxy.nyaa-1.0.0',
        manifest: {
          id: 'com.nuxy.nyaa',
          name: 'Nyaa',
          version: '1.0.0',
          type: 'tool',
          entry: { settings: 'settings.json' },
        },
        settingsSchema: {
          fields: [{ key: 'enterAction', label: 'Stale', type: 'select', options: [] }],
        },
      } as any)
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          fields: [
            {
              key: 'enterAction',
              type: 'select',
              options: [{ value: 'torrentClient', label: 'Add via qBittorrent' }],
            },
          ],
        })
      )

      const schema = readSettingsSchemaFromDisk(ext)
      expect(schema?.fields[0]?.options).toEqual([
        { value: 'torrentClient', label: 'Add via qBittorrent' },
      ])
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

    it('merges default-locale keys missing from the resolved locale', () => {
      const ext = makeExt({
        manifest: {
          id: 'com.nuxy.settings',
          name: 'Settings',
          version: '1.0.0',
          type: 'tool',
          locales: { supported: ['en', 'tr'], default: 'en' },
        },
      } as any)
      vi.mocked(getExtensionById).mockReturnValue(ext)
      vi.mocked(resolveLocale).mockReturnValue('tr')
      vi.mocked(flattenTranslations).mockImplementation((obj: unknown) => {
        const raw = obj as Record<string, unknown>
        if ('actions' in raw) {
          const actions = raw.actions as Record<string, string>
          return Object.fromEntries(Object.entries(actions).map(([k, v]) => [`actions.${k}`, v]))
        }
        return {}
      })
      vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
        const filePath = String(p)
        if (filePath.includes('settings.json'))
          return JSON.stringify({ preferredLanguages: ['tr'] })
        if (filePath.endsWith('/tr.json')) {
          return JSON.stringify({ actions: { closeSetting: 'Ayarı kapat' } })
        }
        if (filePath.endsWith('/en.json')) {
          return JSON.stringify({
            actions: {
              closeSetting: 'Close setting',
              reorderPriority: 'Reorder',
            },
          })
        }
        throw new Error(`unexpected read: ${filePath}`)
      })

      const result = i18nHandlers.getExtensionTranslations({ extId: 'com.nuxy.settings' })
      expect(mergeTranslations).toHaveBeenCalled()
      expect((result as any).data.translations).toEqual({
        'actions.closeSetting': 'Ayarı kapat',
        'actions.reorderPriority': 'Reorder',
      })
    })
  })
})

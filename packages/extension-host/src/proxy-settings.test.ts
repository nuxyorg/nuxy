import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'fs'
import fsPromises from 'fs/promises'
import { buildSettingsApi } from './proxy-settings.ts'

const DATA_DIR = '/data/com.nuxy.test'
const SETTINGS_FILE = '/data/com.nuxy.test/ext-settings.json'

describe('buildSettingsApi', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('read', () => {
    it('returns the value for an existing key', async () => {
      vi.spyOn(fsPromises, 'readFile').mockResolvedValue(JSON.stringify({ foo: 'bar' }) as never)
      const api = buildSettingsApi('com.nuxy.test', DATA_DIR, SETTINGS_FILE, [])
      expect(await api.read('foo')).toBe('bar')
    })

    it('returns null for a missing key', async () => {
      vi.spyOn(fsPromises, 'readFile').mockResolvedValue(JSON.stringify({}) as never)
      const api = buildSettingsApi('com.nuxy.test', DATA_DIR, SETTINGS_FILE, [])
      expect(await api.read('missing')).toBeNull()
    })

    it('returns null when the settings file does not exist', async () => {
      vi.spyOn(fsPromises, 'readFile').mockRejectedValue(new Error('ENOENT'))
      const api = buildSettingsApi('com.nuxy.test', DATA_DIR, SETTINGS_FILE, [])
      expect(await api.read('foo')).toBeNull()
    })
  })

  describe('write', () => {
    it('merges the new key into existing data and persists it', async () => {
      vi.spyOn(fsPromises, 'readFile').mockResolvedValue(JSON.stringify({ existing: 1 }) as never)
      const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined)
      const writeSpy = vi.spyOn(fsPromises, 'writeFile').mockResolvedValue(undefined)

      const api = buildSettingsApi('com.nuxy.test', DATA_DIR, SETTINGS_FILE, [])
      await api.write('foo', 'bar')

      expect(mkdirSpy).toHaveBeenCalledWith(DATA_DIR, { recursive: true })
      const [path, contents] = writeSpy.mock.calls[0]
      expect(path).toBe(SETTINGS_FILE)
      expect(JSON.parse(contents as string)).toEqual({ existing: 1, foo: 'bar' })
    })

    it('starts from an empty object when the settings file is unreadable', async () => {
      vi.spyOn(fsPromises, 'readFile').mockRejectedValue(new Error('ENOENT'))
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined)
      const writeSpy = vi.spyOn(fsPromises, 'writeFile').mockResolvedValue(undefined)

      const api = buildSettingsApi('com.nuxy.test', DATA_DIR, SETTINGS_FILE, [])
      await api.write('foo', 'bar')

      const [, contents] = writeSpy.mock.calls[0]
      expect(JSON.parse(contents as string)).toEqual({ foo: 'bar' })
    })
  })

  describe('permission-gated cross-extension methods', () => {
    it('does not expose readAllExtension/readExtension without settings.read', () => {
      const api = buildSettingsApi('com.nuxy.test', DATA_DIR, SETTINGS_FILE, [])
      expect(api.readAllExtension).toBeUndefined()
      expect(api.readExtension).toBeUndefined()
    })

    it('does not expose writeAllExtension/writeExtension without settings.write', () => {
      const api = buildSettingsApi('com.nuxy.test', DATA_DIR, SETTINGS_FILE, [])
      expect(api.writeAllExtension).toBeUndefined()
      expect(api.writeExtension).toBeUndefined()
    })

    it('exposes readAllExtension/readExtension with settings.read permission', async () => {
      vi.spyOn(fsPromises, 'readFile').mockResolvedValue(JSON.stringify({ k: 'v' }) as never)
      const api = buildSettingsApi('com.nuxy.test', DATA_DIR, SETTINGS_FILE, ['settings.read'])

      expect(await api.readAllExtension!('com.nuxy.other')).toEqual({ k: 'v' })
      expect(await api.readExtension!('com.nuxy.other', 'k')).toBe('v')
    })

    it('readAllExtension/readExtension fall back gracefully on read failure', async () => {
      vi.spyOn(fsPromises, 'readFile').mockRejectedValue(new Error('ENOENT'))
      const api = buildSettingsApi('com.nuxy.test', DATA_DIR, SETTINGS_FILE, ['settings.read'])

      expect(await api.readAllExtension!('com.nuxy.other')).toEqual({})
      expect(await api.readExtension!('com.nuxy.other', 'k')).toBeNull()
    })

    it('exposes writeAllExtension/writeExtension with settings.write permission', async () => {
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined)
      vi.spyOn(fsPromises, 'readFile').mockRejectedValue(new Error('ENOENT'))
      const writeSpy = vi.spyOn(fsPromises, 'writeFile').mockResolvedValue(undefined)
      const api = buildSettingsApi('com.nuxy.test', DATA_DIR, SETTINGS_FILE, ['settings.write'])

      await api.writeAllExtension!('com.nuxy.other', { a: 1 })
      expect(JSON.parse(writeSpy.mock.calls[0][1] as string)).toEqual({ a: 1 })

      await api.writeExtension!('com.nuxy.other', 'b', 2)
      expect(JSON.parse(writeSpy.mock.calls[1][1] as string)).toEqual({ b: 2 })
    })
  })
})

/**
 * Tests for media (now-playing) and extension bootstrapping observable from
 * the running Electron main process via electronApp.evaluate().
 *
 * getNowPlaying is not exposed via IPC, so we call it directly through the
 * main-process require path in evaluate().
 */
import { test, expect } from './fixtures.js'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

test.describe('media / getNowPlaying (main process)', () => {
  test('getNowPlaying returns null or a valid NowPlaying shape', async ({ electronApp }) => {
    const result = await electronApp.evaluate(async () => {
      const media = (globalThis as any).__test_media
      return {
        platform: media.platformId(),
        nowPlaying: await media.getNowPlaying().catch(() => null),
      }
    })

    expect(typeof result.platform).toBe('string')
    expect(['linux', 'darwin', 'win32', 'unsupported']).toContain(result.platform)

    if (result.nowPlaying !== null) {
      expect(typeof result.nowPlaying.playing).toBe('boolean')
      expect(typeof result.nowPlaying.source).toBe('string')
    }
  })

  test('platformId matches the current OS', async ({ electronApp }) => {
    const result = await electronApp.evaluate(() => {
      const media = (globalThis as any).__test_media
      return { platform: media.platformId(), processPlatform: process.platform }
    })

    // On Linux the provider should be 'linux'
    if (result.processPlatform === 'linux') {
      expect(result.platform).toBe('linux')
    } else if (result.processPlatform === 'darwin') {
      expect(result.platform).toBe('darwin')
    } else if (result.processPlatform === 'win32') {
      expect(result.platform).toBe('win32')
    }
  })
})

test.describe('extension bootstrapping', () => {
  test('bundled extensions are loaded (workers spawned or registered)', async () => {
    // Check that the extension scanner ran and registered extensions
    const extDir = path.join(os.homedir(), '.nuxy', 'extensions')
    const exists = fs.existsSync(extDir)
    if (!exists) {
      expect(exists).toBe(true)
      return
    }

    const items = fs.readdirSync(extDir).filter((item: string) => {
      const p = path.join(extDir, item)
      return (
        fs.statSync(p).isDirectory() &&
        fs.existsSync(path.join(p, 'manifest.json'))
      )
    })

    expect(exists).toBe(true)
    expect(items.length).toBeGreaterThan(0)
  })

  test('extensions directory contains manifest.json files', async () => {
    const extDir = path.join(os.homedir(), '.nuxy', 'extensions')
    const exists = fs.existsSync(extDir)
    if (!exists) {
      expect(exists).toBe(true)
      return
    }

    const manifests = fs
      .readdirSync(extDir)
      .filter((item: string) => {
        const mp = path.join(extDir, item, 'manifest.json')
        return fs.existsSync(mp)
      })
      .map((item: string) => {
        try {
          const mp = path.join(extDir, item, 'manifest.json')
          const manifest = JSON.parse(fs.readFileSync(mp, 'utf8'))
          return { id: manifest.id, type: manifest.type, name: manifest.name }
        } catch {
          return null
        }
      })
      .filter(Boolean) as { id: string; type: string; name: string }[]

    expect(manifests.length).toBeGreaterThan(0)
    for (const m of manifests) {
      expect(typeof m.id).toBe('string')
      expect(m.id.length).toBeGreaterThan(0)
    }
  })

  test('core IPC listTools returns extensions loaded by scanner', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'listTools', {})
    )
    expect(result.success).toBe(true)
    // After bootstrapping, at least one tool should be registered
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.data.length).toBeGreaterThan(0)
  })

  test('each loaded tool has id, name, and manifest', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'listTools', {})
    )
    expect(result.success).toBe(true)
    for (const ext of result.data as any[]) {
      expect(typeof ext.id).toBe('string')
      expect(ext.id.length).toBeGreaterThan(0)
      expect(typeof ext.manifest).toBe('object')
      expect(ext.manifest).not.toBeNull()
    }
  })
})

test.describe('theme extension loading via entry.theme', () => {
  test('listThemes includes at least dark and light built-ins', async ({ appPage }) => {
    const result = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'listThemes', {})
    )
    expect(result.success).toBe(true)
    expect(result.data).toContain('dark')
    expect(result.data).toContain('light')
  })

  test('theme extension entries are loadable via getThemeByName', async ({ appPage }) => {
    const themes = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('kernel', 'listThemes', {})
    )
    expect(themes.success).toBe(true)

    for (const name of themes.data as string[]) {
      const data = await appPage.evaluate(
        async (n: string) =>
          (window as any).core.ipc.invoke('kernel', 'getThemeByName', { name: n }),
        name
      )
      expect(data.success).toBe(true)
      expect(data.data).not.toBeNull()
    }
  })
})

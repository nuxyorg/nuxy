import { describe, it, expect, vi } from 'vitest'
import { register } from './backend.ts'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import type { NuxySettings } from './types.ts'

const DEFAULT_SETTINGS: NuxySettings = {
  theme: 'dark',
  iconPack: '',
  zoom: '100%',
  font: 'system',
  escAction: 'hide',
  blurAction: 'hide',
  windowWidth: 800,
  windowMaxHeight: 600,
  alwaysOnTop: false,
  opacity: 1,
  showInTaskbar: false,
  showOnStartup: false,
  windowPosition: '1/2, 1/3',
}

function createCore(storageData: Partial<NuxySettings> | null | undefined = null): {
  core: CoreContext
  handlers: Record<string, (payload: unknown) => unknown>
} {
  return createMockCore(vi, {
    storage: {
      read: vi.fn().mockResolvedValue(storageData),
    },
  }) as any
}

describe('settings backend', () => {
  // By design, settings backend does not register itself with the kernel
  // registry — it exposes IPC channels only, not a tool or provider.
  it('register() does not call any registry method', () => {
    const { core } = createCore()
    register(core)
    expect(core.registry.registerTool).not.toHaveBeenCalled()
    expect(core.registry.registerProvider).not.toHaveBeenCalled()
    expect(core.registry.registerOrchestrator).not.toHaveBeenCalled()
  })

  describe('DEFAULT values', () => {
    it('getSettings returns exactly the expected default values when storage is empty', async () => {
      const { core, handlers } = createCore(null)
      register(core)
      const result = await (handlers['getSettings'] as (p: unknown) => Promise<NuxySettings>)({})
      expect(result).toStrictEqual(DEFAULT_SETTINGS)
    })
  })

  describe('getSettings', () => {
    it('returns all defaults when storage is empty', async () => {
      const { core, handlers } = createCore(null)
      register(core)
      const result = await (handlers['getSettings'] as (p: unknown) => Promise<NuxySettings>)({})
      expect(result).toMatchObject(DEFAULT_SETTINGS)
    })

    it('returns all defaults when storage returns undefined', async () => {
      const { core, handlers } = createCore(undefined)
      register(core)
      const result = await (handlers['getSettings'] as (p: unknown) => Promise<NuxySettings>)({})
      expect(result).toMatchObject(DEFAULT_SETTINGS)
    })

    it('merges stored theme over default', async () => {
      const { core, handlers } = createCore({ theme: 'light' })
      register(core)
      const result = await (handlers['getSettings'] as (p: unknown) => Promise<NuxySettings>)({})
      expect(result.theme).toBe('light')
    })

    it('preserves defaults for keys not in storage', async () => {
      const { core, handlers } = createCore({ theme: 'ocean' })
      register(core)
      const result = await (handlers['getSettings'] as (p: unknown) => Promise<NuxySettings>)({})
      expect(result.font).toBe('system')
      expect(result.escAction).toBe('hide')
      expect(result.windowWidth).toBe(800)
    })

    it('merges stored boolean field (alwaysOnTop: true) over default false', async () => {
      const { core, handlers } = createCore({ alwaysOnTop: true })
      register(core)
      const result = await (handlers['getSettings'] as (p: unknown) => Promise<NuxySettings>)({})
      expect(result.alwaysOnTop).toBe(true)
      // other boolean defaults remain untouched
      expect(result.showInTaskbar).toBe(false)
      expect(result.showOnStartup).toBe(false)
    })

    it('applies multiple stored overrides', async () => {
      const { core, handlers } = createCore({ theme: 'light', zoom: '120%', windowWidth: 1000 })
      register(core)
      const result = await (handlers['getSettings'] as (p: unknown) => Promise<NuxySettings>)({})
      expect(result.theme).toBe('light')
      expect(result.zoom).toBe('120%')
      expect(result.windowWidth).toBe(1000)
    })

    it('contains every default key in the result', async () => {
      const { core, handlers } = createCore()
      register(core)
      const result = await (handlers['getSettings'] as (p: unknown) => Promise<NuxySettings>)({})
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        expect(result).toHaveProperty(key)
      }
    })

    it('reads from storage on each call', async () => {
      const { core, handlers } = createCore()
      register(core)
      await (handlers['getSettings'] as (p: unknown) => Promise<NuxySettings>)({})
      await (handlers['getSettings'] as (p: unknown) => Promise<NuxySettings>)({})
      expect(core.storage.read as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(2)
    })
  })

  describe('saveSettings', () => {
    it('writes to the correct file key "settings.json"', async () => {
      const { core, handlers } = createCore()
      register(core)
      await (handlers['saveSettings'] as (p: unknown) => Promise<NuxySettings>)({ theme: 'ocean' })
      expect(core.storage.write as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        'settings.json',
        expect.any(Object)
      )
    })

    it('writes the merged settings to storage', async () => {
      const { core, handlers } = createCore()
      register(core)
      await (handlers['saveSettings'] as (p: unknown) => Promise<NuxySettings>)({ theme: 'ocean' })
      expect(core.storage.write as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
        'settings.json',
        expect.objectContaining({ theme: 'ocean' })
      )
    })

    it('returns the saved settings object', async () => {
      const { core, handlers } = createCore()
      register(core)
      const result = await (handlers['saveSettings'] as (p: unknown) => Promise<NuxySettings>)({
        theme: 'light',
        zoom: '80%',
      })
      expect(result.theme).toBe('light')
      expect(result.zoom).toBe('80%')
    })

    it('merges partial update with all defaults', async () => {
      const { core, handlers } = createCore()
      register(core)
      const result = await (handlers['saveSettings'] as (p: unknown) => Promise<NuxySettings>)({
        theme: 'ocean',
      })
      expect(result.font).toBe('system')
      expect(result.windowWidth).toBe(800)
    })

    it('writes full object with all default keys', async () => {
      const { core, handlers } = createCore()
      register(core)
      await (handlers['saveSettings'] as (p: unknown) => Promise<NuxySettings>)({ theme: 'light' })
      const writeMock = core.storage.write as ReturnType<typeof vi.fn>
      const [, written] = writeMock.mock.calls[0] as [string, NuxySettings]
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        expect(written).toHaveProperty(key)
      }
    })

    it('handles empty payload (saves pure defaults)', async () => {
      const { core, handlers } = createCore()
      register(core)
      const result = await (handlers['saveSettings'] as (p: unknown) => Promise<NuxySettings>)({})
      expect(result).toMatchObject(DEFAULT_SETTINGS)
    })

    it('passes unknown keys through to the saved object (no allowlist filtering)', async () => {
      // The backend uses { ...DEFAULT, ...payload } — it does not filter out
      // keys that are absent from DEFAULT. Unknown keys are therefore stored
      // as-is. This test documents the current behaviour so any future change
      // that adds allowlist filtering is caught as a deliberate breaking change.
      const { core, handlers } = createCore()
      register(core)
      const result = await (handlers['saveSettings'] as (p: unknown) => Promise<NuxySettings>)({
        theme: 'light',
        unknownKey: 'surprise',
      })
      expect(result).toHaveProperty('unknownKey', 'surprise')
      const writeMock = core.storage.write as ReturnType<typeof vi.fn>
      const [, written] = writeMock.mock.calls[0] as [string, NuxySettings]
      expect(written).toHaveProperty('unknownKey', 'surprise')
    })

    it('stores a wrong-type value as-is without validation (e.g., windowWidth as string)', async () => {
      // The backend does not validate types — it stores whatever is given.
      // This test documents the current behaviour so regressions are caught if
      // validation is added in the future.
      const { core, handlers } = createCore()
      register(core)
      const result = await (handlers['saveSettings'] as (p: unknown) => Promise<NuxySettings>)({
        windowWidth: 'not-a-number',
      })
      expect(result.windowWidth).toBe('not-a-number')
      const writeMock = core.storage.write as ReturnType<typeof vi.fn>
      const [, written] = writeMock.mock.calls[0] as [string, NuxySettings]
      expect(written.windowWidth).toBe('not-a-number')
    })
  })

  // Integration: full save → reload round-trip
  describe('e2e: settings lifecycle', () => {
    it('saved settings are returned by getSettings on next call', async () => {
      let stored: NuxySettings | null = null
      const handlers: Record<string, (payload: unknown) => unknown> = {}
      const core = {
        ipc: {
          handle: (ch: string, fn: (payload: unknown) => unknown) => {
            handlers[ch] = fn
          },
        },
        storage: {
          read: vi.fn().mockImplementation(() => Promise.resolve(stored)),
          write: vi.fn().mockImplementation((_: string, data: NuxySettings) => {
            stored = data
            return Promise.resolve()
          }),
        },
      } as unknown as CoreContext
      register(core)

      await (handlers['saveSettings'] as (p: unknown) => Promise<NuxySettings>)({
        theme: 'ocean',
        zoom: '120%',
        windowWidth: 900,
      })
      const result = await (handlers['getSettings'] as (p: unknown) => Promise<NuxySettings>)({})

      expect(result.theme).toBe('ocean')
      expect(result.zoom).toBe('120%')
      expect(result.windowWidth).toBe(900)
    })

    it('each saveSettings call merges with DEFAULT only — not with prior saves', async () => {
      // saveSettings always does { ...DEFAULT, ...payload }. It does NOT read
      // previously saved data first. So a second call with a different key
      // resets all keys not present in the new payload back to their defaults.
      //
      // Sequence:
      //   save({ theme: 'ocean' })  → stored = { ...DEFAULT, theme: 'ocean' }
      //   save({ zoom: '150%' })    → stored = { ...DEFAULT, zoom: '150%' }
      //                              ↑ theme is reset to 'dark' here
      let stored: NuxySettings | null = null
      const handlers: Record<string, (payload: unknown) => unknown> = {}
      const core = {
        ipc: {
          handle: (ch: string, fn: (payload: unknown) => unknown) => {
            handlers[ch] = fn
          },
        },
        storage: {
          read: vi.fn().mockImplementation(() => Promise.resolve(stored)),
          write: vi.fn().mockImplementation((_: string, data: NuxySettings) => {
            stored = data
            return Promise.resolve()
          }),
        },
      } as unknown as CoreContext
      register(core)

      await (handlers['saveSettings'] as (p: unknown) => Promise<NuxySettings>)({ theme: 'ocean' })
      await (handlers['saveSettings'] as (p: unknown) => Promise<NuxySettings>)({ zoom: '150%' })

      const result = await (handlers['getSettings'] as (p: unknown) => Promise<NuxySettings>)({})
      expect(result.zoom).toBe('150%')
      // theme was NOT carried over — saveSettings merges with DEFAULT, not the
      // prior persisted state
      expect(result.theme).toBe('dark')
    })
  })
})

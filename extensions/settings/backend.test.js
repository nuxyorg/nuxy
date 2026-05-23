import { describe, it, expect, vi } from 'vitest'
import { register } from './backend.js'

const DEFAULT_SETTINGS = {
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

function createCore(storageData = null) {
  const handlers = {}
  const core = {
    ipc: { handle: (ch, fn) => { handlers[ch] = fn } },
    storage: {
      read: vi.fn().mockResolvedValue(storageData),
      write: vi.fn().mockResolvedValue(undefined),
    },
    // settings backend intentionally does not call core.registry
    registry: {
      registerTool: vi.fn(),
      registerProvider: vi.fn(),
      registerOrchestrator: vi.fn(),
    },
  }
  return { core, handlers }
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
      const result = await handlers.getSettings()
      expect(result).toStrictEqual(DEFAULT_SETTINGS)
    })
  })

  describe('getSettings', () => {
    it('returns all defaults when storage is empty', async () => {
      const { core, handlers } = createCore(null)
      register(core)
      const result = await handlers.getSettings()
      expect(result).toMatchObject(DEFAULT_SETTINGS)
    })

    it('returns all defaults when storage returns undefined', async () => {
      const { core, handlers } = createCore(undefined)
      register(core)
      const result = await handlers.getSettings()
      expect(result).toMatchObject(DEFAULT_SETTINGS)
    })

    it('merges stored theme over default', async () => {
      const { core, handlers } = createCore({ theme: 'light' })
      register(core)
      const result = await handlers.getSettings()
      expect(result.theme).toBe('light')
    })

    it('preserves defaults for keys not in storage', async () => {
      const { core, handlers } = createCore({ theme: 'ocean' })
      register(core)
      const result = await handlers.getSettings()
      expect(result.font).toBe('system')
      expect(result.escAction).toBe('hide')
      expect(result.windowWidth).toBe(800)
    })

    it('merges stored boolean field (alwaysOnTop: true) over default false', async () => {
      const { core, handlers } = createCore({ alwaysOnTop: true })
      register(core)
      const result = await handlers.getSettings()
      expect(result.alwaysOnTop).toBe(true)
      // other boolean defaults remain untouched
      expect(result.showInTaskbar).toBe(false)
      expect(result.showOnStartup).toBe(false)
    })

    it('applies multiple stored overrides', async () => {
      const { core, handlers } = createCore({ theme: 'light', zoom: '120%', windowWidth: 1000 })
      register(core)
      const result = await handlers.getSettings()
      expect(result.theme).toBe('light')
      expect(result.zoom).toBe('120%')
      expect(result.windowWidth).toBe(1000)
    })

    it('contains every default key in the result', async () => {
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.getSettings()
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        expect(result).toHaveProperty(key)
      }
    })

    it('reads from storage on each call', async () => {
      const { core, handlers } = createCore()
      register(core)
      await handlers.getSettings()
      await handlers.getSettings()
      expect(core.storage.read).toHaveBeenCalledTimes(2)
    })
  })

  describe('saveSettings', () => {
    it('writes to the correct file key "settings.json"', async () => {
      const { core, handlers } = createCore()
      register(core)
      await handlers.saveSettings({ theme: 'ocean' })
      expect(core.storage.write).toHaveBeenCalledWith(
        'settings.json',
        expect.any(Object)
      )
    })

    it('writes the merged settings to storage', async () => {
      const { core, handlers } = createCore()
      register(core)
      await handlers.saveSettings({ theme: 'ocean' })
      expect(core.storage.write).toHaveBeenCalledWith(
        'settings.json',
        expect.objectContaining({ theme: 'ocean' })
      )
    })

    it('returns the saved settings object', async () => {
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.saveSettings({ theme: 'light', zoom: '80%' })
      expect(result.theme).toBe('light')
      expect(result.zoom).toBe('80%')
    })

    it('merges partial update with all defaults', async () => {
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.saveSettings({ theme: 'ocean' })
      expect(result.font).toBe('system')
      expect(result.windowWidth).toBe(800)
    })

    it('writes full object with all default keys', async () => {
      const { core, handlers } = createCore()
      register(core)
      await handlers.saveSettings({ theme: 'light' })
      const [, written] = core.storage.write.mock.calls[0]
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        expect(written).toHaveProperty(key)
      }
    })

    it('handles empty payload (saves pure defaults)', async () => {
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.saveSettings({})
      expect(result).toMatchObject(DEFAULT_SETTINGS)
    })

    it('passes unknown keys through to the saved object (no allowlist filtering)', async () => {
      // The backend uses { ...DEFAULT, ...payload } — it does not filter out
      // keys that are absent from DEFAULT. Unknown keys are therefore stored
      // as-is. This test documents the current behaviour so any future change
      // that adds allowlist filtering is caught as a deliberate breaking change.
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.saveSettings({ theme: 'light', unknownKey: 'surprise' })
      expect(result).toHaveProperty('unknownKey', 'surprise')
      const [, written] = core.storage.write.mock.calls[0]
      expect(written).toHaveProperty('unknownKey', 'surprise')
    })

    it('stores a wrong-type value as-is without validation (e.g., windowWidth as string)', async () => {
      // The backend does not validate types — it stores whatever is given.
      // This test documents the current behaviour so regressions are caught if
      // validation is added in the future.
      const { core, handlers } = createCore()
      register(core)
      const result = await handlers.saveSettings({ windowWidth: 'not-a-number' })
      expect(result.windowWidth).toBe('not-a-number')
      const [, written] = core.storage.write.mock.calls[0]
      expect(written.windowWidth).toBe('not-a-number')
    })
  })

  // Integration: full save → reload round-trip
  describe('e2e: settings lifecycle', () => {
    it('saved settings are returned by getSettings on next call', async () => {
      let stored = null
      const handlers = {}
      const core = {
        ipc: { handle: (ch, fn) => { handlers[ch] = fn } },
        storage: {
          read: vi.fn().mockImplementation(() => Promise.resolve(stored)),
          write: vi.fn().mockImplementation((_, data) => {
            stored = data
            return Promise.resolve()
          }),
        },
      }
      register(core)

      await handlers.saveSettings({ theme: 'ocean', zoom: '120%', windowWidth: 900 })
      const result = await handlers.getSettings()

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
      let stored = null
      const handlers = {}
      const core = {
        ipc: { handle: (ch, fn) => { handlers[ch] = fn } },
        storage: {
          read: vi.fn().mockImplementation(() => Promise.resolve(stored)),
          write: vi.fn().mockImplementation((_, data) => {
            stored = data
            return Promise.resolve()
          }),
        },
      }
      register(core)

      await handlers.saveSettings({ theme: 'ocean' })
      await handlers.saveSettings({ zoom: '150%' })

      const result = await handlers.getSettings()
      expect(result.zoom).toBe('150%')
      // theme was NOT carried over — saveSettings merges with DEFAULT, not the
      // prior persisted state
      expect(result.theme).toBe('dark')
    })
  })
})

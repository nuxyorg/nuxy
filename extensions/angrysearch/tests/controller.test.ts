import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const hoisted = vi.hoisted(async () => {
  const h = await import('@nuxyorg/extension-sdk/testing')
  h.setupDomGlobals({
    ipc: { invoke: vi.fn() },
    shell: {
      registerShellActions: vi.fn(),
      refreshShellActions: vi.fn(),
      setSearchPlaceholder: vi.fn(),
    },
    window: { hide: vi.fn() },
    events: { on: vi.fn(() => () => {}) },
  })
  return h
})

vi.mock('@nuxyorg/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxyorg/core')>('@nuxyorg/core')
  return (await hoisted).createNuxyCoreMock(actual as Record<string, unknown>)
})

import { flattenTranslations } from '@nuxyorg/core'
import { AngrysearchController } from '../controller.ts'
import enLocale from '../locales/en.json'
import type { AngrysearchItem } from '../types.ts'

const enTranslations = flattenTranslations(enLocale)

function makeItem(overrides: Partial<AngrysearchItem> = {}): AngrysearchItem {
  return {
    id: 'angry-/home/user/file.txt',
    title: 'file.txt',
    subtitle: '/home/user/file.txt',
    value: '/home/user/file.txt',
    isDir: false,
    ...overrides,
  }
}

describe('AngrysearchController', () => {
  let ipcInvoke: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    await hoisted
    ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    ipcInvoke.mockReset()
    ipcInvoke.mockImplementation(async (_extId: string, channel: string) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'getStatus') {
        return { success: true, data: { isUpdating: false, lastUpdate: null, exists: false } }
      }
      return { success: true, data: undefined }
    })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads initial db status on connect', async () => {
    const controller = new AngrysearchController(() => {})
    controller.connect()
    await vi.runAllTimersAsync()
    expect(controller.state.status).toEqual({
      isUpdating: false,
      lastUpdate: null,
      exists: false,
    })
    controller.disconnect()
  })

  describe('setQuery', () => {
    it('does not search when query is shorter than 3 characters', async () => {
      const controller = new AngrysearchController(() => {})
      controller.connect()
      await vi.runAllTimersAsync()
      ipcInvoke.mockClear()

      controller.setQuery('ab')
      await vi.runAllTimersAsync()

      expect(ipcInvoke).not.toHaveBeenCalledWith(
        'com.nuxy.angrysearch',
        'search',
        expect.anything()
      )
      expect(controller.state.items).toEqual([])
      controller.disconnect()
    })

    it('debounces and searches for queries >= 3 characters', async () => {
      const controller = new AngrysearchController(() => {})
      controller.connect()
      await vi.runAllTimersAsync()
      ipcInvoke.mockClear()
      ipcInvoke.mockImplementation(async (_extId: string, channel: string) => {
        if (channel === 'search') {
          return { success: true, data: { items: [makeItem()] } }
        }
        return { success: true, data: undefined }
      })

      controller.setQuery('foo')
      await vi.runAllTimersAsync()

      expect(ipcInvoke).toHaveBeenCalledWith('com.nuxy.angrysearch', 'search', {
        query: 'foo',
        regex: false,
      })
      expect(controller.state.items).toEqual([makeItem()])
      expect(controller.state.selectedIndex).toBe(0)
      controller.disconnect()
    })

    it('resets items to empty on a failed search', async () => {
      const controller = new AngrysearchController(() => {})
      controller.connect()
      await vi.runAllTimersAsync()
      ipcInvoke.mockImplementation(async (_extId: string, channel: string) => {
        if (channel === 'search') {
          return { success: false, error: 'boom' }
        }
        return { success: true, data: undefined }
      })

      controller.setQuery('foo')
      await vi.runAllTimersAsync()

      expect(controller.state.items).toEqual([])
      controller.disconnect()
    })
  })

  describe('setRegexMode', () => {
    it('re-runs the search with regex: true when toggled on', async () => {
      const controller = new AngrysearchController(() => {})
      controller.connect()
      await vi.runAllTimersAsync()
      controller.setQuery('foo')
      await vi.runAllTimersAsync()
      ipcInvoke.mockClear()

      controller.setRegexMode(true)
      await vi.runAllTimersAsync()

      expect(controller.state.regexMode).toBe(true)
      expect(ipcInvoke).toHaveBeenCalledWith('com.nuxy.angrysearch', 'search', {
        query: 'foo',
        regex: true,
      })
      controller.disconnect()
    })
  })

  describe('handleOpen / handleOpenLocation', () => {
    it('invokes openFile and hides the window', async () => {
      const controller = new AngrysearchController(() => {})
      controller.connect()
      await vi.runAllTimersAsync()
      ipcInvoke.mockClear()

      controller.handleOpen(makeItem())
      await vi.runAllTimersAsync()

      expect(ipcInvoke).toHaveBeenCalledWith(
        'com.nuxy.angrysearch',
        'openFile',
        '/home/user/file.txt'
      )
      expect(window.core!.window!.hide).toHaveBeenCalled()
      controller.disconnect()
    })

    it('invokes openLocation and hides the window', async () => {
      const controller = new AngrysearchController(() => {})
      controller.connect()
      await vi.runAllTimersAsync()
      ipcInvoke.mockClear()

      controller.handleOpenLocation(makeItem())
      await vi.runAllTimersAsync()

      expect(ipcInvoke).toHaveBeenCalledWith(
        'com.nuxy.angrysearch',
        'openLocation',
        '/home/user/file.txt'
      )
      expect(window.core!.window!.hide).toHaveBeenCalled()
      controller.disconnect()
    })
  })

  describe('triggerUpdate', () => {
    it('invokes updateDatabase and marks status as updating', async () => {
      const controller = new AngrysearchController(() => {})
      controller.connect()
      await vi.runAllTimersAsync()

      controller.triggerUpdate()
      await vi.runAllTimersAsync()

      expect(ipcInvoke).toHaveBeenCalledWith('com.nuxy.angrysearch', 'updateDatabase', undefined)
      expect(controller.state.status?.isUpdating).toBe(true)
      controller.disconnect()
    })
  })

  describe('getKeyActions', () => {
    it('registers navigate, open, openLocation, toggleRegex and updateDatabase actions', async () => {
      const controller = new AngrysearchController(() => {})
      controller.connect()
      await vi.runAllTimersAsync()

      const actions = controller.getKeyActions()
      const ids = actions.map((a) => a.id)
      expect(ids).toEqual(
        expect.arrayContaining([
          'angrysearch-navigate-up',
          'angrysearch-navigate-down',
          'angrysearch-open',
          'angrysearch-open-location',
          'angrysearch-toggle-regex',
          'angrysearch-update-database',
        ])
      )
      controller.disconnect()
    })

    it('open and openLocation are inactive when nothing is selected', async () => {
      const controller = new AngrysearchController(() => {})
      controller.connect()
      await vi.runAllTimersAsync()

      const actions = controller.getKeyActions()
      const open = actions.find((a) => a.id === 'angrysearch-open')
      const openLocation = actions.find((a) => a.id === 'angrysearch-open-location')
      expect(open?.activeOn?.()).toBe(false)
      expect(openLocation?.activeOn?.()).toBe(false)
      controller.disconnect()
    })
  })

  it('clears keyboard registration on disconnect', async () => {
    const controller = new AngrysearchController(() => {})
    controller.connect()
    await vi.runAllTimersAsync()
    controller.disconnect()
    expect(window.core!.shell!.registerShellActions).toHaveBeenCalledWith(null)
  })
})

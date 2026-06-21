import { describe, it, expect, vi, beforeEach } from 'vitest'

const hoisted = vi.hoisted(async () => {
  const h = await import('@nuxyorg/extension-sdk/testing')
  h.setupDomGlobals({
    ipc: { invoke: vi.fn() },
    shell: {
      registerShellActions: vi.fn(),
      refreshShellActions: vi.fn(),
      setSearchPlaceholder: vi.fn(),
    },
    events: { on: vi.fn(() => () => {}) },
  })
  return h
})

vi.mock('@nuxyorg/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxyorg/core')>('@nuxyorg/core')
  return (await hoisted).createNuxyCoreMock(actual as Record<string, unknown>)
})

import { flattenTranslations } from '@nuxyorg/core'
import { StoreController } from '../controller.ts'
import enLocale from '../locales/en.json'
import type { ExtensionListItem } from '../types.ts'

const enTranslations = flattenTranslations(enLocale)

function makeExt(overrides: Partial<ExtensionListItem> = {}): ExtensionListItem {
  return {
    id: 'com.test.ext',
    name: 'Test Extension',
    description: 'A test extension',
    version: '1.0.0',
    type: 'tool',
    author: 'Test Author',
    downloadUrl: 'https://example.com/ext.nuxyext',
    permissions: [],
    installed: false,
    installedVersion: undefined,
    canUpdate: false,
    isSystem: false,
    ...overrides,
  }
}

describe('StoreController', () => {
  let getter: (() => ReturnType<StoreController['getKeyActions']>) | null = null
  let ipcInvoke: ReturnType<typeof vi.fn>

  beforeEach(() => {
    getter = null
    ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    ipcInvoke.mockReset()
    ipcInvoke.mockImplementation(async (_extId: string, channel: string) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'getExtensions') {
        return { success: true, data: [] }
      }
      return { success: true, data: undefined }
    })
    vi.mocked(window.core!.shell!.registerShellActions).mockImplementation((fn) => {
      getter = fn as typeof getter
    })
  })

  it('loads the catalog on connect', async () => {
    const extensions = [makeExt({ id: 'com.test.a' }), makeExt({ id: 'com.test.b' })]
    ipcInvoke.mockImplementation(async (_extId: string, channel: string) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'getExtensions') {
        return { success: true, data: extensions }
      }
      return { success: true, data: undefined }
    })

    const controller = new StoreController(() => {})
    controller.connect()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(controller.state.extensions).toHaveLength(2)
    expect(controller.state.loading).toBe(false)
    controller.disconnect()
  })

  it('sets an error when getExtensions IPC fails', async () => {
    ipcInvoke.mockImplementation(async (_extId: string, channel: string) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'getExtensions') {
        return { success: false, error: 'boom' }
      }
      return { success: true, data: undefined }
    })

    const controller = new StoreController(() => {})
    controller.connect()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(controller.state.error).toBe('boom')
    expect(controller.state.loading).toBe(false)
    controller.disconnect()
  })

  it('filteredExtensions reflects the active tab and query', () => {
    const controller = new StoreController(() => {})
    controller.store.setState({
      extensions: [
        makeExt({ id: 'com.test.tool', type: 'tool' }),
        makeExt({ id: 'com.test.theme', type: 'theme' }),
      ],
    })

    controller.setActiveTab('theme')
    expect(controller.filteredExtensions).toHaveLength(1)
    expect(controller.filteredExtensions[0].id).toBe('com.test.theme')
  })

  it('setSelectedIndex updates state and refreshes shell actions', () => {
    const controller = new StoreController(() => {})
    controller.setSelectedIndex(2)
    expect(controller.state.selectedIndex).toBe(2)
    expect(window.core!.shell!.refreshShellActions).toHaveBeenCalled()
  })

  it('selectedExtension resolves from filteredExtensions by selectedIndex', () => {
    const controller = new StoreController(() => {})
    const ext = makeExt({ id: 'com.test.selected' })
    controller.store.setState({ extensions: [ext] })
    controller.setSelectedIndex(0)

    expect(controller.selectedExtension?.id).toBe('com.test.selected')
  })

  it('handleInstall proxies to the installExtension IPC channel and reloads the catalog', async () => {
    const ext = makeExt({ id: 'com.test.install', downloadUrl: 'https://x/y.nuxyext' })
    ipcInvoke.mockImplementation(async (_extId: string, channel: string, payload?: unknown) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'installExtension') {
        expect(payload).toEqual({ extId: 'com.test.install', downloadUrl: 'https://x/y.nuxyext' })
        return { success: true, data: { success: true } }
      }
      if (channel === 'getExtensions') {
        return { success: true, data: [] }
      }
      return { success: true, data: undefined }
    })

    const controller = new StoreController(() => {})
    await controller.handleInstall(ext)

    expect(controller.state.loading).toBe(false)
    expect(ipcInvoke.mock.calls.some((call: unknown[]) => call[1] === 'installExtension')).toBe(
      true
    )
  })

  it('handleUninstall is a no-op for system extensions', async () => {
    const ext = makeExt({ id: 'com.nuxy.shell', isSystem: true })
    const controller = new StoreController(() => {})

    await controller.handleUninstall(ext)

    expect(ipcInvoke.mock.calls.some((call: unknown[]) => call[1] === 'uninstallExtension')).toBe(
      false
    )
  })

  it('handleUninstall proxies to the uninstallExtension IPC channel', async () => {
    const ext = makeExt({ id: 'com.test.uninstall', installed: true, isSystem: false })
    ipcInvoke.mockImplementation(async (_extId: string, channel: string, payload?: unknown) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'uninstallExtension') {
        expect(payload).toEqual({ extId: 'com.test.uninstall' })
        return { success: true, data: { success: true } }
      }
      if (channel === 'getExtensions') {
        return { success: true, data: [] }
      }
      return { success: true, data: undefined }
    })

    const controller = new StoreController(() => {})
    await controller.handleUninstall(ext)

    expect(controller.state.loading).toBe(false)
  })

  describe('keyboard actions', () => {
    function actionByKey(controller: StoreController, key: string) {
      return controller.getKeyActions().find((a) => a.key === key && !a.modifiers?.length)
    }

    it('exposes install action active only when item not installed or updatable', () => {
      const controller = new StoreController(() => {})
      controller.connect()
      controller.store.setState({
        extensions: [makeExt({ id: 'com.test.a', installed: false })],
        selectedIndex: 0,
      })

      const install = getter!().find((a) => a.id === 'store-install')
      expect(install?.activeOn?.()).toBe(true)
      controller.disconnect()
    })

    it('exposes uninstall action active only for installed, non-system items', () => {
      const controller = new StoreController(() => {})
      controller.connect()
      controller.store.setState({
        extensions: [makeExt({ id: 'com.test.a', installed: true, isSystem: true })],
        selectedIndex: 0,
      })

      const uninstall = getter!().find((a) => a.id === 'store-uninstall')
      expect(uninstall?.activeOn?.()).toBe(false)
      controller.disconnect()
    })

    it('Tab cycles to the next category', () => {
      const controller = new StoreController(() => {})
      controller.connect()
      expect(controller.state.activeTab).toBe('all')

      const tabAction = getter!().find((a) => a.id === 'store-next-category')
      tabAction?.handler()

      expect(controller.state.activeTab).toBe('tool')
      controller.disconnect()
    })

    it('ArrowLeft focuses the sidebar and clears list selection', () => {
      const controller = new StoreController(() => {})
      controller.connect()
      controller.store.setState({ selectedIndex: 2 })
      actionByKey(controller, 'ArrowLeft')?.handler()

      expect(controller.state.focusArea).toBe('left')
      expect(controller.state.selectedIndex).toBe(-1)
      controller.disconnect()
    })

    it('keeps focus on the left panel when navigating categories with arrow keys', () => {
      const controller = new StoreController(() => {})
      controller.connect()
      controller.store.setState({ activeTab: 'tool', focusArea: 'left', selectedIndex: -1 })

      actionByKey(controller, 'ArrowUp')?.handler()
      expect(controller.state.activeTab).toBe('all')
      expect(controller.state.focusArea).toBe('left')

      actionByKey(controller, 'ArrowDown')?.handler()
      expect(controller.state.activeTab).toBe('tool')
      expect(controller.state.focusArea).toBe('left')
      controller.disconnect()
    })

    it('moves focus to the extension list when Enter is pressed on the left panel', () => {
      const controller = new StoreController(() => {})
      controller.connect()
      controller.store.setState({
        extensions: [makeExt({ id: 'com.test.a' }), makeExt({ id: 'com.test.b' })],
        focusArea: 'left',
        selectedIndex: -1,
      })

      actionByKey(controller, 'Enter')?.handler()

      expect(controller.state.focusArea).toBe('right')
      expect(controller.state.selectedIndex).toBe(0)
      controller.disconnect()
    })

    it('returns focus to the left panel from the first list row with ArrowUp', () => {
      const controller = new StoreController(() => {})
      controller.connect()
      controller.store.setState({
        extensions: [makeExt({ id: 'com.test.a' })],
        selectedIndex: 0,
        focusArea: 'right',
      })

      actionByKey(controller, 'ArrowUp')?.handler()

      expect(controller.state.focusArea).toBe('left')
      expect(controller.state.selectedIndex).toBe(-1)
      controller.disconnect()
    })
  })
})

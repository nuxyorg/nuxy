import { describe, it, expect, vi, beforeEach } from 'vitest'

const hoisted = vi.hoisted(async () => {
  const h = await import('@nuxyorg/extension-sdk/testing')
  h.setupDomGlobals({
    ipc: { invoke: vi.fn() },
    shell: {
      registerShellActions: vi.fn(),
      refreshShellActions: vi.fn(),
      controlOmniBar: vi.fn(),
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
import { ClipboardController } from '../controller.ts'
import enLocale from '../locales/en.json'
import type { ClipboardItem } from '../types.ts'

const EXT_ID = 'com.nuxy.clipboard'
const IPC_OPTS = { callerExtId: EXT_ID }
const enTranslations = flattenTranslations(enLocale)

async function flush(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}

function makeItem(overrides: Partial<ClipboardItem> = {}): ClipboardItem {
  return {
    id: `id-${Math.random()}`,
    text: 'hello',
    image: null,
    copiedAt: new Date().toISOString(),
    pinned: false,
    ...overrides,
  }
}

describe('ClipboardController', () => {
  let invokeMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    invokeMock = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    invokeMock.mockReset()
    invokeMock.mockImplementation(async (_ext: string, channel: string) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'getHistory') {
        return { success: true, data: [] }
      }
      return { success: true, data: undefined }
    })
    vi.mocked(window.core!.shell!.registerShellActions).mockReset()
    vi.mocked(window.core!.shell!.controlOmniBar).mockReset()
  })

  it('loads history on connect', async () => {
    const items = [makeItem({ id: 'a' })]
    invokeMock.mockImplementation(async (_ext: string, channel: string) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'getHistory') return { success: true, data: items }
      return { success: true, data: undefined }
    })

    const controller = new ClipboardController(() => {})
    controller.connect()
    await Promise.resolve()
    await Promise.resolve()

    expect(controller.state.items).toEqual(items)
    controller.disconnect()
  })

  it('filters items by query', () => {
    const controller = new ClipboardController(() => {})
    controller.store.setState({
      items: [makeItem({ id: 'a', text: 'apple' }), makeItem({ id: 'b', text: 'banana' })],
    })
    controller.setQuery('app')
    expect(controller.filteredItems.map((i) => i.id)).toEqual(['a'])
  })

  it('resets selectedIndex when query changes', () => {
    const controller = new ClipboardController(() => {})
    controller.store.setState({ selectedIndex: 2 })
    controller.setQuery('x')
    expect(controller.state.selectedIndex).toBe(-1)
  })

  it('hides the omnibar when an item is selected and shows it again on deselect', () => {
    const controller = new ClipboardController(() => {})
    controller.store.setState({ items: [makeItem({ id: 'a' })] })

    controller.setSelectedIndex(0)
    expect(window.core!.shell!.controlOmniBar).toHaveBeenLastCalledWith('hide')

    controller.setSelectedIndex(-1)
    expect(window.core!.shell!.controlOmniBar).toHaveBeenLastCalledWith('show')
  })

  it('handleCopy invokes copyItem and marks the item as copied', async () => {
    invokeMock.mockImplementation(async (_ext: string, channel: string, payload?: unknown) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'copyItem') {
        return { success: true, data: [makeItem({ id: payload as string })] }
      }
      return { success: true, data: undefined }
    })

    const controller = new ClipboardController(() => {})
    controller.handleCopy('a')
    await flush()

    expect(invokeMock).toHaveBeenCalledWith(EXT_ID, 'copyItem', 'a', IPC_OPTS)
    expect(controller.state.copiedId).toBe('a')
  })

  it('handleDelete invokes deleteItem and clamps selectedIndex', async () => {
    const remaining = [makeItem({ id: 'a' })]
    invokeMock.mockImplementation(async (_ext: string, channel: string) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'deleteItem') return { success: true, data: remaining }
      return { success: true, data: undefined }
    })

    const controller = new ClipboardController(() => {})
    controller.store.setState({
      items: [makeItem({ id: 'a' }), makeItem({ id: 'b' })],
      selectedIndex: 1,
    })

    controller.handleDelete('b')
    await flush()

    expect(invokeMock).toHaveBeenCalledWith(EXT_ID, 'deleteItem', 'b', IPC_OPTS)
    expect(controller.state.selectedIndex).toBe(0)
  })

  describe('refresh interval', () => {
    it('polls getHistory at the default 1000ms cadence before the backend interval resolves', async () => {
      const controller = new ClipboardController(() => {})
      controller.connect()
      await flush()
      invokeMock.mockClear()

      await vi.advanceTimersByTimeAsync(1000)
      expect(invokeMock).toHaveBeenCalledWith(EXT_ID, 'getHistory', undefined, IPC_OPTS)

      controller.disconnect()
    })

    it('switches to the backend pollIntervalMs once it resolves, never polling faster than it', async () => {
      invokeMock.mockImplementation(async (_ext: string, channel: string) => {
        if (channel === 'getExtensionTranslations') {
          return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
        }
        if (channel === 'getHistory') return { success: true, data: [] }
        if (channel === 'getPollIntervalMs') return { success: true, data: 5000 }
        return { success: true, data: undefined }
      })

      const controller = new ClipboardController(() => {})
      controller.connect()
      await flush()
      invokeMock.mockClear()

      await vi.advanceTimersByTimeAsync(1000)
      expect(invokeMock).not.toHaveBeenCalledWith(EXT_ID, 'getHistory', undefined, IPC_OPTS)

      await vi.advanceTimersByTimeAsync(4000)
      expect(invokeMock).toHaveBeenCalledWith(EXT_ID, 'getHistory', undefined, IPC_OPTS)

      controller.disconnect()
    })

    it('floors a backend interval below 1000ms at 1000ms', async () => {
      invokeMock.mockImplementation(async (_ext: string, channel: string) => {
        if (channel === 'getExtensionTranslations') {
          return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
        }
        if (channel === 'getHistory') return { success: true, data: [] }
        if (channel === 'getPollIntervalMs') return { success: true, data: 250 }
        return { success: true, data: undefined }
      })

      const controller = new ClipboardController(() => {})
      controller.connect()
      await flush()
      invokeMock.mockClear()

      await vi.advanceTimersByTimeAsync(250)
      expect(invokeMock).not.toHaveBeenCalledWith(EXT_ID, 'getHistory', undefined, IPC_OPTS)

      await vi.advanceTimersByTimeAsync(750)
      expect(invokeMock).toHaveBeenCalledWith(EXT_ID, 'getHistory', undefined, IPC_OPTS)

      controller.disconnect()
    })
  })

  describe('keyboard actions', () => {
    let getter: (() => ReturnType<ClipboardController['getKeyActions']>) | null = null

    beforeEach(() => {
      getter = null
      vi.mocked(window.core!.shell!.registerShellActions).mockImplementation((fn) => {
        getter = fn as typeof getter
      })
    })

    it('Enter copies the selected item', () => {
      const controller = new ClipboardController(() => {})
      controller.connect()
      controller.store.setState({ items: [makeItem({ id: 'a' })], selectedIndex: 0 })

      const enter = getter!().find((a) => a.id === 'clipboard-copy')
      expect(enter?.activeOn?.()).toBe(true)

      controller.disconnect()
    })

    it('Delete is only active when an item is selected', () => {
      const controller = new ClipboardController(() => {})
      controller.connect()

      const del = getter!().find((a) => a.id === 'clipboard-delete')
      expect(del?.activeOn?.()).toBe(false)

      controller.store.setState({ items: [makeItem({ id: 'a' })], selectedIndex: 0 })
      const delActive = getter!().find((a) => a.id === 'clipboard-delete')
      expect(delActive?.activeOn?.()).toBe(true)

      controller.disconnect()
    })
  })
})

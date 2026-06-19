import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const hoisted = vi.hoisted(async () => {
  const h = await import('@nuxyorg/extension-sdk/testing')
  h.setupDomGlobals({
    ipc: { invoke: vi.fn() },
    shell: {
      registerKeyActions: vi.fn(),
      registerActions: vi.fn(),
      refreshKeyHints: vi.fn(),
      controlOmniBar: vi.fn(),
      setSearchPlaceholder: vi.fn(),
      setShellResetPaused: vi.fn(),
    },
    window: {
      setBlurSuppressed: vi.fn(),
      setBlurSuppressedSync: vi.fn().mockResolvedValue({ suppressed: true }),
      clearBlurSuppressed: vi.fn(),
    },
    events: { on: vi.fn(() => () => {}) },
  })
  return h
})

vi.mock('@nuxyorg/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxyorg/core')>('@nuxyorg/core')
  return (await hoisted).createNuxyCoreMock(actual as Record<string, unknown>)
})

import type { DownloadItem } from '../types.ts'
import { DownloadManagerController } from '../controller.ts'

function makeItem(overrides: Partial<DownloadItem> = {}): DownloadItem {
  return {
    id: 'd1',
    url: 'https://example.com/file.iso',
    fileName: 'file.iso',
    filePath: '/home/user/Downloads/file.iso',
    status: 'downloading',
    bytesDownloaded: 0,
    totalBytes: null,
    speedBps: 0,
    error: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function mockInvoke(impl: (channel: string, payload?: unknown) => unknown): void {
  const ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
  ipcInvoke.mockImplementation(async (_extId: string, channel: string, payload?: unknown) => {
    // BaseExtensionController's translator fetches its own i18n data on
    // construction via kernel.getExtensionTranslations — stub it as resolved
    // immediately so it doesn't keep scheduling unrelated retry timers that
    // would otherwise interfere with assertions about this extension's own
    // polling interval.
    if (channel === 'getExtensionTranslations') {
      return { success: true, data: { locale: 'en', dir: 'ltr', translations: {} } }
    }
    try {
      return { success: true, data: await impl(channel, payload) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}

describe('DownloadManagerController', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    ;(window.core!.ipc!.invoke as ReturnType<typeof vi.fn>).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the list on connect', async () => {
    mockInvoke((channel) => (channel === 'list' ? [makeItem()] : null))

    const controller = new DownloadManagerController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    expect(controller.state.items).toHaveLength(1)
    expect(controller.state.items[0].id).toBe('d1')
    controller.disconnect()
  })

  it('refreshes the list on a polling interval while connected', async () => {
    let calls = 0
    mockInvoke((channel) => {
      if (channel !== 'list') return null
      calls += 1
      return calls === 1 ? [] : [makeItem()]
    })

    const controller = new DownloadManagerController(() => {})
    controller.connect()
    // Flush only the immediate refresh()'s microtasks here, not the full
    // 1000ms interval — vi.runOnlyPendingTimersAsync() would also fire the
    // freshly-registered poll interval's first tick in this same flush.
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.state.items).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(1000)
    expect(controller.state.items).toHaveLength(1)

    controller.disconnect()
  })

  it('stops polling after disconnect', async () => {
    const ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    mockInvoke((channel) => (channel === 'list' ? [] : null))

    const controller = new DownloadManagerController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()
    controller.disconnect()

    ipcInvoke.mockClear()
    await vi.advanceTimersByTimeAsync(5000)
    expect(ipcInvoke).not.toHaveBeenCalled()
  })

  it('addUrl propagates errors from the backend without crashing', async () => {
    mockInvoke((channel) => {
      if (channel === 'add') throw new Error('Invalid URL')
      return channel === 'list' ? [] : null
    })

    const controller = new DownloadManagerController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    await expect(controller.addUrl('not-a-url')).rejects.toThrow('Invalid URL')
    controller.disconnect()
  })

  it('addUrl calls the add channel and refreshes the list', async () => {
    let added: DownloadItem | null = null
    mockInvoke((channel, payload) => {
      if (channel === 'add') {
        added = makeItem({ url: (payload as { url: string }).url })
        return added
      }
      return added ? [added] : []
    })

    const controller = new DownloadManagerController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    await controller.addUrl('https://example.com/file.iso')
    expect(controller.state.items).toHaveLength(1)
    controller.disconnect()
  })

  it('pause/resume/cancel/remove call their respective channels with the item id', async () => {
    const calledChannels: string[] = []
    mockInvoke((channel) => {
      calledChannels.push(channel)
      return channel === 'list' ? [makeItem()] : null
    })

    const controller = new DownloadManagerController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    await controller.pause('d1')
    await controller.resume('d1')
    await controller.cancel('d1')
    await controller.remove('d1')

    expect(calledChannels).toContain('pause')
    expect(calledChannels).toContain('resume')
    expect(calledChannels).toContain('cancel')
    expect(calledChannels).toContain('remove')
    controller.disconnect()
  })

  describe('applyDeeplinkPath', () => {
    it('queues a download from an "add?url=..." path and reports success', async () => {
      mockInvoke((channel) => (channel === 'add' ? makeItem() : channel === 'list' ? [] : null))

      const controller = new DownloadManagerController(() => {})
      const applied = await controller.applyDeeplinkPath(
        'add?url=https%3A%2F%2Fexample.com%2Ffile.iso'
      )
      expect(applied).toBe(true)
    })

    it('returns false for a path that is not the "add" shape, without calling add', async () => {
      const ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
      mockInvoke(() => null)

      const controller = new DownloadManagerController(() => {})
      const applied = await controller.applyDeeplinkPath('not-add')

      expect(applied).toBe(false)
      expect(ipcInvoke).not.toHaveBeenCalledWith(
        'com.nuxy.download-manager',
        'add',
        expect.anything()
      )
    })

    it('is idempotent — calling twice with the same path only queues once', async () => {
      let addCalls = 0
      mockInvoke((channel) => {
        if (channel === 'add') {
          addCalls += 1
          return makeItem()
        }
        return channel === 'list' ? [] : null
      })

      const controller = new DownloadManagerController(() => {})
      await controller.applyDeeplinkPath('add?url=https://example.com/file.iso')
      await controller.applyDeeplinkPath('add?url=https://example.com/file.iso')

      expect(addCalls).toBe(1)
    })
  })
})

describe('DownloadManagerController keyboard actions', () => {
  let controlOmniBarMock: ReturnType<typeof vi.fn>
  let getter: (() => ReturnType<DownloadManagerController['getKeyActions']>) | null = null

  beforeEach(() => {
    controlOmniBarMock = window.core!.shell!.controlOmniBar as ReturnType<typeof vi.fn>
    controlOmniBarMock.mockReset()
    vi.mocked(window.core!.shell!.registerKeyActions).mockImplementation((fn) => {
      getter = fn as typeof getter
    })
    mockInvoke((channel) => (channel === 'list' ? [makeItem()] : null))
  })

  it('hides the omnibar when navigating down into the list', () => {
    const controller = new DownloadManagerController(() => {})
    controller.connect()
    controller.store.setState({ items: [makeItem()], selectedIndex: -1 })

    const down = getter!().find((a) => a.key === 'ArrowDown')
    down?.handler()

    expect(controlOmniBarMock).toHaveBeenCalledWith('hide')
    expect(controller.state.selectedIndex).toBe(0)
    controller.disconnect()
  })

  it('shows the omnibar when navigating up past the first item', () => {
    const controller = new DownloadManagerController(() => {})
    controller.connect()
    controller.store.setState({ items: [makeItem()], selectedIndex: 0 })

    const up = getter!().find((a) => a.key === 'ArrowUp')
    up?.handler()

    expect(controlOmniBarMock).toHaveBeenCalledWith('show')
    expect(controller.state.selectedIndex).toBe(-1)
    controller.disconnect()
  })

  it('exposes Enter, Shift+Enter, and hold Delete when an item is selected', () => {
    const controller = new DownloadManagerController(() => {})
    controller.connect()
    controller.store.setState({ items: [makeItem({ status: 'completed' })], selectedIndex: 0 })

    const actions = getter!()
    const enter = actions.find((a) => a.key === 'Enter' && !a.modifiers?.length)
    const shiftEnter = actions.find((a) => a.key === 'Enter' && a.modifiers?.includes('shift'))
    const del = actions.find((a) => a.key === 'Delete')

    expect(enter?.activeOn?.()).toBe(true)
    expect(shiftEnter?.activeOn?.()).toBe(true)
    expect(del?.trigger).toBe('hold')
    expect(del?.holdCancelToast).toBe('Hold Del to remove')
    controller.disconnect()
  })

  it('retries failed downloads on Enter and hides Shift+Enter', async () => {
    const resumed: string[] = []
    mockInvoke((channel, payload) => {
      if (channel === 'resume') resumed.push((payload as { id: string }).id)
      return channel === 'list' ? [makeItem({ status: 'failed' })] : null
    })

    const controller = new DownloadManagerController(() => {})
    controller.connect()
    controller.store.setState({ items: [makeItem({ status: 'failed' })], selectedIndex: 0 })

    const actions = getter!()
    const enter = actions.find((a) => a.key === 'Enter' && !a.modifiers?.length)
    const shiftEnter = actions.find((a) => a.key === 'Enter' && a.modifiers?.includes('shift'))

    expect(enter?.activeOn?.()).toBe(true)
    expect(shiftEnter?.activeOn?.()).toBe(false)
    enter?.handler()
    await Promise.resolve()
    expect(resumed).toEqual(['d1'])
    controller.disconnect()
  })

  it('registers shell actions for multi-select and bulk remove', () => {
    let lastActions: Array<{ id: string; label: string }> = []
    vi.mocked(window.core!.shell!.registerActions).mockImplementation((actions) => {
      lastActions = actions as typeof lastActions
    })

    const controller = new DownloadManagerController(() => {})
    controller.connect()
    controller.store.setState({
      items: [makeItem({ id: 'd1' }), makeItem({ id: 'd2', fileName: 'two.iso' })],
      selectedIndex: 0,
    })

    expect(lastActions.some((a) => a.id === 'dm-select-multiple')).toBe(true)

    controller.setMultiSelectMode(true)
    controller.toggleCheck('d1')
    expect(lastActions.some((a) => a.id === 'dm-exit-select')).toBe(true)
    expect(lastActions.some((a) => a.id === 'dm-remove-selected')).toBe(true)

    controller.disconnect()
  })

  it('removes all checked downloads after cancelling active ones', async () => {
    const removed: string[] = []
    const cancelled: string[] = []
    let items = [
      makeItem({ id: 'd1', status: 'downloading' }),
      makeItem({ id: 'd2', fileName: 'two.iso', status: 'completed' }),
    ]
    mockInvoke((channel, payload) => {
      if (channel === 'list') return items
      if (channel === 'cancel') {
        cancelled.push((payload as { id: string }).id)
        return null
      }
      if (channel === 'remove') {
        removed.push((payload as { id: string }).id)
        items = items.filter((item) => item.id !== (payload as { id: string }).id)
        return null
      }
      return null
    })

    const controller = new DownloadManagerController(() => {})
    controller.connect()
    controller.store.setState({
      items,
      selectedIndex: 0,
      multiSelectMode: true,
      checkedIds: new Set(['d1', 'd2']),
    })

    await controller.handleRemoveSelected()

    expect(cancelled).toEqual(['d1'])
    expect(removed).toEqual(['d1', 'd2'])
    expect(controller.state.multiSelectMode).toBe(false)
    expect(controller.state.checkedIds.size).toBe(0)
    controller.disconnect()
  })

  it('shows the omnibar after removing the only download', async () => {
    mockInvoke((channel, payload) => {
      if (channel === 'list') return []
      if (channel === 'remove') return null
      return null
    })

    const controller = new DownloadManagerController(() => {})
    controller.connect()
    controller.store.setState({ items: [makeItem()], selectedIndex: 0 })

    await controller.handleRemove()

    expect(controller.state.selectedIndex).toBe(-1)
    expect(controlOmniBarMock).toHaveBeenCalledWith('show')
    controller.disconnect()
  })
})

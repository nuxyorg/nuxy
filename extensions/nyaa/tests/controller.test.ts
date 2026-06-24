import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const hoisted = vi.hoisted(async () => {
  const h = await import('@nuxyorg/extension-sdk/testing')
  h.setupDomGlobals({
    ipc: { invoke: vi.fn() },
    shell: {
      registerShellActions: vi.fn(),
      refreshShellActions: vi.fn(),
      setOmniBarPortal: vi.fn(),
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
import { NyaaController } from '../controller.ts'
import enLocale from '../locales/en.json'
import type { NyaaResult } from '../types.ts'
import { DEFAULT_ENTER_ACTION_PRIORITY } from '../utils/enter-action-priority.ts'

const enTranslations = flattenTranslations(enLocale)

function makeResult(overrides: Partial<NyaaResult> = {}): NyaaResult {
  return {
    id: 'r1',
    title: 'Some Torrent',
    magnet: 'magnet:?xt=urn:btih:abc',
    category: 'Anime',
    size: '1.0 GiB',
    seeds: 10,
    leeches: 1,
    status: 'default',
    date: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('NyaaController keyboard actions', () => {
  let getter: (() => ReturnType<NyaaController['getKeyActions']>) | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    getter = null
    const ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    ipcInvoke.mockReset()
    ipcInvoke.mockImplementation(async (_extId: string, channel: string) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'getActionSettings') {
        return {
          success: true,
          data: { enterActionPriority: [...DEFAULT_ENTER_ACTION_PRIORITY] },
        }
      }
      if (channel === 'getStatus') {
        return { success: true, data: { state: 'unreachable' } }
      }
      return { success: true, data: undefined }
    })
    vi.mocked(window.core!.shell!.registerShellActions).mockImplementation((fn) => {
      getter = fn as typeof getter
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('exposes Ctrl+A to enter multi-select, shown in the menu only outside multi-select', () => {
    const controller = new NyaaController(() => {})
    controller.connect()
    controller.store.setState({ results: [makeResult()] })

    const selectMultiple = getter!().find((a) => a.id === 'nyaa-select-multiple')
    expect(selectMultiple).toMatchObject({ key: 'a', modifiers: ['ctrl'], showInMenu: true })

    selectMultiple?.handler()
    expect(controller.state.multiSelectMode).toBe(true)

    const afterToggle = getter!().find((a) => a.id === 'nyaa-select-multiple')
    expect(afterToggle?.showInMenu).toBe(false)

    controller.disconnect()
  })

  it('exposes Escape to exit multi-select only while it is active', () => {
    const controller = new NyaaController(() => {})
    controller.connect()
    controller.store.setState({ results: [makeResult()] })

    const exitInactive = getter!().find((a) => a.id === 'nyaa-exit-select')
    expect(exitInactive?.activeOn?.()).toBe(false)

    controller.setMultiSelectMode(true)
    const exitActive = getter!().find((a) => a.id === 'nyaa-exit-select')
    expect(exitActive?.activeOn?.()).toBe(true)
    exitActive?.handler()
    expect(controller.state.multiSelectMode).toBe(false)

    controller.disconnect()
  })

  it('exposes Ctrl+C / Ctrl+D for bulk copy and download once items are checked', () => {
    const controller = new NyaaController(() => {})
    controller.connect()
    controller.store.setState({
      results: [makeResult({ id: 'r1' }), makeResult({ id: 'r2' })],
      multiSelectMode: true,
      checkedIds: new Set(['r1', 'r2']),
    })

    const copyAll = getter!().find((a) => a.id === 'nyaa-copy-all')
    const downloadAll = getter!().find((a) => a.id === 'nyaa-download-all')
    expect(copyAll).toMatchObject({ key: 'c', modifiers: ['ctrl'], showInMenu: true })
    expect(downloadAll).toMatchObject({ key: 'd', modifiers: ['ctrl'], showInMenu: true })

    copyAll?.handler()
    expect(window.core!.ipc!.invoke).toHaveBeenCalledWith(
      'com.nuxy.nyaa',
      'copyMagnets',
      expect.objectContaining({ magnets: expect.arrayContaining([makeResult().magnet]) }),
      { callerExtId: 'com.nuxy.nyaa' }
    )

    controller.disconnect()
  })

  it('binds Enter to copy magnet and Shift+Enter to download when qBittorrent is unavailable', async () => {
    const controller = new NyaaController(() => {})
    controller.connect()
    await Promise.resolve()
    await Promise.resolve()
    controller.store.setState({
      results: [makeResult()],
      selectedIndex: 0,
      enterActionPriority: [...DEFAULT_ENTER_ACTION_PRIORITY],
      torrentClientReady: false,
    })

    const enter = getter!().find((a) => a.id === 'nyaa-enter')
    const shiftEnter = getter!().find((a) => a.id === 'nyaa-shift-enter')
    expect(enter?.label).toBe('Copy Magnet')
    expect(shiftEnter?.label).toBe('Save Torrent')
    expect(enter?.trigger).toBeUndefined()

    controller.disconnect()
  })

  it('binds Enter to qBittorrent and Shift+Enter to copy magnet when client is ready', async () => {
    const controller = new NyaaController(() => {})
    controller.connect()
    await Promise.resolve()
    await Promise.resolve()
    controller.store.setState({
      results: [makeResult()],
      selectedIndex: 0,
      enterActionPriority: [...DEFAULT_ENTER_ACTION_PRIORITY],
      torrentClientReady: true,
    })

    const enter = getter!().find((a) => a.id === 'nyaa-enter')
    const shiftEnter = getter!().find((a) => a.id === 'nyaa-shift-enter')
    expect(enter?.label).toBe('Add via qBittorrent')
    expect(shiftEnter?.label).toBe('Copy Magnet')

    controller.disconnect()
  })

  it('updates Enter and Shift+Enter labels when polling detects qBittorrent became ready', async () => {
    let statusState = 'unreachable'
    const ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    ipcInvoke.mockImplementation(async (_extId: string, channel: string) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'getActionSettings') {
        return {
          success: true,
          data: { enterActionPriority: [...DEFAULT_ENTER_ACTION_PRIORITY] },
        }
      }
      if (channel === 'getStatus') {
        return { success: true, data: { state: statusState } }
      }
      return { success: true, data: undefined }
    })

    const controller = new NyaaController(() => {})
    controller.connect()
    await Promise.resolve()
    await Promise.resolve()

    expect(getter!().find((a) => a.id === 'nyaa-enter')?.label).toBe('Copy Magnet')

    statusState = 'ready'
    await vi.advanceTimersByTimeAsync(2000)
    await Promise.resolve()

    expect(controller.state.torrentClientReady).toBe(true)
    expect(getter!().find((a) => a.id === 'nyaa-enter')?.label).toBe('Add via qBittorrent')
    expect(getter!().find((a) => a.id === 'nyaa-shift-enter')?.label).toBe('Copy Magnet')

    controller.disconnect()
  })

  it('reloads enterActionPriority when extension-settings-updated fires for nyaa', async () => {
    let settingsHandler:
      | ((detail: { extId: string; values: Record<string, unknown> }) => void)
      | null = null
    vi.mocked(window.core!.events!.on).mockImplementation((type, handler) => {
      if (type === 'extension-settings-updated') {
        settingsHandler = handler as typeof settingsHandler
      }
      return () => {}
    })
    const ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    ipcInvoke.mockImplementation(async (_extId: string, channel: string) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'getActionSettings') {
        return {
          success: true,
          data: {
            enterActionPriority: ['copyMagnet', 'downloadTorrent', 'torrentClient'],
          },
        }
      }
      if (channel === 'getStatus') {
        return { success: true, data: { state: 'ready' } }
      }
      return { success: true, data: undefined }
    })

    const controller = new NyaaController(() => {})
    controller.connect()
    await Promise.resolve()
    await Promise.resolve()

    expect(settingsHandler).not.toBeNull()
    settingsHandler!({ extId: 'com.nuxy.nyaa', values: { enterActionPriority: ['copyMagnet'] } })
    await Promise.resolve()
    await Promise.resolve()

    expect(controller.state.enterActionPriority).toEqual([
      'copyMagnet',
      'downloadTorrent',
      'torrentClient',
    ])
    const enter = getter!().find((a) => a.id === 'nyaa-enter')
    expect(enter?.label).toBe('Copy Magnet')

    controller.disconnect()
  })

  it('merges the single-item copy/download action into the Enter key entry, footer-only since it already has a chip', () => {
    const controller = new NyaaController(() => {})
    controller.connect()
    controller.store.setState({ results: [makeResult()], selectedIndex: 0 })

    const enter = getter!().find((a) => a.id === 'nyaa-enter')
    expect(enter?.hint).toBe('↵')
    expect(enter?.showInMenu).toBeUndefined()

    controller.disconnect()
  })

  it('stops polling after disconnect', async () => {
    const controller = new NyaaController(() => {})
    controller.connect()
    await Promise.resolve()
    await Promise.resolve()

    const invokeBefore = vi.mocked(window.core!.ipc!.invoke).mock.calls.length
    controller.disconnect()
    await vi.advanceTimersByTimeAsync(4000)
    await Promise.resolve()

    expect(vi.mocked(window.core!.ipc!.invoke).mock.calls.length).toBe(invokeBefore)
  })
})

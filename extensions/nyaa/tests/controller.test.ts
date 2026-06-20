import { describe, it, expect, vi, beforeEach } from 'vitest'

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
    getter = null
    const ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    ipcInvoke.mockReset()
    ipcInvoke.mockImplementation(async (_extId: string, channel: string) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'getEnterAction') {
        return { success: true, data: 'copyMagnet' }
      }
      return { success: true, data: undefined }
    })
    vi.mocked(window.core!.shell!.registerShellActions).mockImplementation((fn) => {
      getter = fn as typeof getter
    })
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
      expect.objectContaining({ magnets: expect.arrayContaining([makeResult().magnet]) })
    )

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
})

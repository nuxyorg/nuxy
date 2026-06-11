import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ReactiveControllerHost } from '@nuxy/core'
import type { Provider, Tool, ProviderState } from '../types.ts'

function makeHost(): ReactiveControllerHost & { requestUpdate: ReturnType<typeof vi.fn> } {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  }
}

function makeProvider(id: string, type: ProviderState['type'] = 'list'): Provider {
  return {
    id,
    manifest: { id, name: id, version: '1', type: 'provider', providerType: type },
  } as Provider
}

function makeTool(id: string): Tool {
  return { id, manifest: { id, name: id, version: '1', type: 'tool' } } as Tool
}

describe('ProviderController', () => {
  let ProviderController: typeof import('../controllers/provider-controller.ts').ProviderController
  let coreInvokeMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()
    coreInvokeMock = vi.fn()
    Object.defineProperty(globalThis, 'window', {
      value: {
        core: { ipc: { invoke: coreInvokeMock } },
      },
      writable: true,
      configurable: true,
    })
    ;({ ProviderController } = await import('../controllers/provider-controller.ts'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('registers itself with the host', () => {
    const host = makeHost()
    new ProviderController(host)
    expect(host.addController).toHaveBeenCalledWith(expect.any(Object))
  })

  it('initializes with empty state', () => {
    const host = makeHost()
    const ctrl = new ProviderController(host)
    expect(ctrl.providers).toEqual([])
    expect(ctrl.providerStates).toEqual({})
    expect(ctrl.listResults).toEqual([])
    expect(ctrl.omnibarSections).toEqual([])
    expect(ctrl.isAnyListProviderLoading).toBe(false)
  })

  it('setProviders updates providers and calls requestUpdate', () => {
    const host = makeHost()
    const ctrl = new ProviderController(host)
    const providers = [makeProvider('p1')]
    ctrl.setProviders(providers)
    expect(ctrl.providers).toEqual(providers)
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('clearProviderStates empties providerStates and calls requestUpdate', () => {
    const host = makeHost()
    const ctrl = new ProviderController(host)
    ctrl.clearProviderStates()
    expect(ctrl.providerStates).toEqual({})
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('sync does nothing when activeTool is set', () => {
    const host = makeHost()
    const ctrl = new ProviderController(host)
    ctrl.setProviders([makeProvider('p1')])
    host.requestUpdate.mockClear()
    ctrl.sync('hello', 'some-tool', [], [])
    vi.runAllTimers()
    expect(coreInvokeMock).not.toHaveBeenCalled()
  })

  it('sync does nothing when query is empty', () => {
    const host = makeHost()
    const ctrl = new ProviderController(host)
    ctrl.setProviders([makeProvider('p1')])
    host.requestUpdate.mockClear()
    ctrl.sync('', null, [], [])
    vi.runAllTimers()
    expect(coreInvokeMock).not.toHaveBeenCalled()
  })

  it('sync debounces and calls ipc.invoke for each provider', async () => {
    const host = makeHost()
    const ctrl = new ProviderController(host)
    const providers = [makeProvider('p1'), makeProvider('p2')]
    ctrl.setProviders(providers)
    coreInvokeMock.mockResolvedValue({ success: true, data: { items: [] } })

    ctrl.sync('hello', null, [], [])
    expect(coreInvokeMock).not.toHaveBeenCalled()

    vi.runAllTimers()
    await Promise.resolve()

    expect(coreInvokeMock).toHaveBeenCalledWith('p1', 'eval', { text: 'hello' })
    expect(coreInvokeMock).toHaveBeenCalledWith('p2', 'eval', { text: 'hello' })
  })

  it('syncActions clears action provider state without invoking when query is empty', async () => {
    const host = makeHost()
    const ctrl = new ProviderController(host)
    ctrl.setProviders([
      {
        id: 'com.nuxy.notes',
        manifest: {
          id: 'com.nuxy.notes',
          name: 'Notes',
          version: '1',
          type: 'provider',
          providerGroup: 'actions',
        },
      } as Provider,
    ])
    coreInvokeMock.mockResolvedValue({
      success: true,
      data: { items: [{ id: 'note-action', title: 'Save as note' }] },
    })

    ctrl.syncActions('hello', null, [], [])
    await Promise.resolve()
    await Promise.resolve()
    expect(ctrl.providerStates['com.nuxy.notes']?.items).toHaveLength(1)

    coreInvokeMock.mockClear()
    ctrl.syncActions('', null, [], [])
    expect(coreInvokeMock).not.toHaveBeenCalled()
    expect(ctrl.providerStates['com.nuxy.notes']).toBeUndefined()
    expect(ctrl.omnibarSections).toEqual([])
  })

  it('syncActions invokes action providers immediately without debounce', async () => {
    const host = makeHost()
    const ctrl = new ProviderController(host)
    ctrl.setProviders([
      {
        id: 'com.nuxy.notes',
        manifest: {
          id: 'com.nuxy.notes',
          name: 'Notes',
          version: '1',
          type: 'provider',
          providerGroup: 'actions',
        },
      } as Provider,
      makeProvider('p2'),
    ])
    coreInvokeMock.mockResolvedValue({ success: true, data: { items: [] } })

    ctrl.syncActions('hello', null, [], [])
    expect(coreInvokeMock).toHaveBeenCalledWith('com.nuxy.notes', 'eval', { text: 'hello' })
    expect(coreInvokeMock).not.toHaveBeenCalledWith('p2', 'eval', expect.anything())

    await Promise.resolve()
    await Promise.resolve()
  })

  it('sync with skipActionProviders ignores action providers', async () => {
    const host = makeHost()
    const ctrl = new ProviderController(host)
    ctrl.setProviders([
      {
        id: 'com.nuxy.notes',
        manifest: {
          id: 'com.nuxy.notes',
          name: 'Notes',
          version: '1',
          type: 'provider',
          providerGroup: 'actions',
        },
      } as Provider,
      makeProvider('p2'),
    ])
    coreInvokeMock.mockResolvedValue({ success: true, data: { items: [] } })

    ctrl.sync('hello', null, [], [], {}, { skipActionProviders: true })
    vi.runAllTimers()
    await Promise.resolve()

    expect(coreInvokeMock).toHaveBeenCalledWith('p2', 'eval', { text: 'hello' })
    expect(coreInvokeMock).not.toHaveBeenCalledWith('com.nuxy.notes', 'eval', expect.anything())
  })

  it('sync sets loading state before IPC resolves', () => {
    const host = makeHost()
    const ctrl = new ProviderController(host)
    ctrl.setProviders([makeProvider('p1')])
    coreInvokeMock.mockReturnValue(new Promise(() => {}))

    ctrl.sync('hello', null, [], [])
    vi.runAllTimers()

    expect(ctrl.providerStates['p1']?.loading).toBe(true)
    expect(ctrl.isAnyListProviderLoading).toBe(true)
  })

  it('sync updates providerStates with results after IPC resolves', async () => {
    const host = makeHost()
    const ctrl = new ProviderController(host)
    ctrl.setProviders([makeProvider('p1')])
    const items = [{ id: 'r1', title: 'Result 1' }]
    coreInvokeMock.mockResolvedValue({ success: true, data: { items } })

    ctrl.sync('hello', null, [], [])
    vi.runAllTimers()
    await Promise.resolve()
    await Promise.resolve()

    expect(ctrl.providerStates['p1']?.loading).toBe(false)
    expect(ctrl.providerStates['p1']?.items).toEqual(items)
    expect(ctrl.isAnyListProviderLoading).toBe(false)
  })

  it('sync keeps stale provider items visible while fetching new results', async () => {
    const host = makeHost()
    const ctrl = new ProviderController(host)
    ctrl.setProviders([makeProvider('p1')])
    const staleItems = [{ id: 'r1', title: 'Result 1' }]
    coreInvokeMock.mockResolvedValue({ success: true, data: { items: staleItems } })

    ctrl.sync('hello', null, [], [])
    vi.runAllTimers()
    await Promise.resolve()
    await Promise.resolve()
    expect(ctrl.providerStates['p1']?.items).toEqual(staleItems)

    coreInvokeMock.mockReturnValue(new Promise(() => {}))
    ctrl.sync('hello2', null, [], [])
    vi.advanceTimersByTime(50)

    expect(ctrl.providerStates['p1']?.loading).toBe(true)
    expect(ctrl.providerStates['p1']?.items).toEqual(staleItems)
    expect(ctrl.listResults).toEqual(staleItems)
  })

  it('sync ignores stale responses when a newer query is issued', async () => {
    const host = makeHost()
    const ctrl = new ProviderController(host)
    ctrl.setProviders([makeProvider('p1')])

    let resolveFirst!: (v: unknown) => void
    coreInvokeMock
      .mockReturnValueOnce(
        new Promise((r) => {
          resolveFirst = r
        })
      )
      .mockResolvedValue({ success: true, data: { items: [] } })

    ctrl.sync('first', null, [], [])
    vi.runAllTimers()
    ctrl.sync('second', null, [], [])
    vi.runAllTimers()
    await Promise.resolve()
    await Promise.resolve()

    resolveFirst({ success: true, data: { items: [{ id: 'stale', title: 'Stale' }] } })
    await Promise.resolve()

    expect(ctrl.providerStates['p1']?.items).toEqual([])
  })
})

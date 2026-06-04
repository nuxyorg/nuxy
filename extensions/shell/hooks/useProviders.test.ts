import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.hoisted(() => {
  ;(globalThis as any).window = {
    React: {
      useEffect: (fn: () => void | (() => void)) => {
        const cleanup = fn()
        ;(globalThis as any).__lastEffectCleanup = cleanup
      },
      useMemo: (fn: () => unknown) => fn(),
    },
    core: {
      ipc: {
        invoke: vi.fn().mockResolvedValue({ success: true, data: { items: [] } }),
      },
    },
  }
})

import { useProviders } from '../hooks.tsx'

describe('useProviders', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(window.core.ipc.invoke).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    const cleanup = (globalThis as any).__lastEffectCleanup
    if (typeof cleanup === 'function') cleanup()
  })

  it('debounces provider eval calls until query settles', () => {
    const queryGeneration = { current: 0 }
    const setProviderStates = vi.fn()

    useProviders({
      activeTool: null,
      savedQuery: '2+2',
      providers: [
        { id: 'com.nuxy.calculator', manifest: { name: 'Calc', providerType: 'result' } },
      ] as any,
      providerStates: {},
      setProviderStates,
      queryGeneration,
    })

    expect(window.core.ipc.invoke).not.toHaveBeenCalled()
    vi.advanceTimersByTime(50)
    expect(window.core.ipc.invoke).toHaveBeenCalledWith('com.nuxy.calculator', 'eval', {
      text: '2+2',
    })
  })

  it('cancels pending debounce when query changes before it fires', () => {
    const queryGeneration = { current: 0 }
    const setProviderStates = vi.fn()

    useProviders({
      activeTool: null,
      savedQuery: 'ab',
      providers: [
        { id: 'com.nuxy.calculator', manifest: { name: 'Calc', providerType: 'result' } },
      ] as any,
      providerStates: {},
      setProviderStates,
      queryGeneration,
    })

    vi.advanceTimersByTime(30)
    const cleanup = (globalThis as any).__lastEffectCleanup
    if (typeof cleanup === 'function') cleanup()

    useProviders({
      activeTool: null,
      savedQuery: 'abc',
      providers: [
        { id: 'com.nuxy.calculator', manifest: { name: 'Calc', providerType: 'result' } },
      ] as any,
      providerStates: {},
      setProviderStates,
      queryGeneration,
    })

    vi.advanceTimersByTime(50)
    expect(window.core.ipc.invoke).toHaveBeenCalledTimes(1)
    expect(window.core.ipc.invoke).toHaveBeenCalledWith('com.nuxy.calculator', 'eval', {
      text: 'abc',
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  ;(globalThis as any).window = {
    React: {
      useState: (initial: unknown) => {
        let state = initial
        const setState = (v: unknown) => {
          state = typeof v === 'function' ? (v as (prev: unknown) => unknown)(state) : v
        }
        return [state, setState]
      },
    },
    core: {
      ipc: {
        invoke: vi.fn(),
      },
    },
  }
})

import { useShellActions } from './useShellActions.ts'

describe('useShellActions tryOrchestratorRoute', () => {
  const orchestrators = [{ id: 'com.nuxy.ai-orchestrator', manifest: { name: 'AI' } }]

  beforeEach(() => {
    vi.mocked(window.core.ipc.invoke).mockReset()
  })

  it('unwraps ext:invoke success wrapper and opens routed tool', async () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({
      success: true,
      data: { ok: true, data: { toolCalled: 'com.nuxy.calculator', initialQuery: '2+2' } },
    })
    const setActiveTool = vi.fn()
    const { tryOrchestratorRoute } = useShellActions({
      orchestrators: orchestrators as any,
      savedQuery: 'what is 2+2',
      setActiveTool,
      setProviderStates: vi.fn(),
      setQuery: vi.fn(),
      setSavedQuery: vi.fn(),
      recordToolUsed: vi.fn(),
      setToolComponent: vi.fn(),
    })
    await tryOrchestratorRoute()
    expect(window.core.ipc.invoke).toHaveBeenCalledWith('com.nuxy.ai-orchestrator', 'route', {
      text: 'what is 2+2',
    })
    expect(setActiveTool).toHaveBeenCalledWith('com.nuxy.calculator')
  })

  it('does nothing when ipc returns success without routed tool', async () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({
      success: true,
      data: { ok: true, data: null },
    })
    const setActiveTool = vi.fn()
    const { tryOrchestratorRoute } = useShellActions({
      orchestrators: orchestrators as any,
      savedQuery: 'hello',
      setActiveTool,
      setProviderStates: vi.fn(),
      setQuery: vi.fn(),
      setSavedQuery: vi.fn(),
      recordToolUsed: vi.fn(),
      setToolComponent: vi.fn(),
    })
    await tryOrchestratorRoute()
    expect(setActiveTool).not.toHaveBeenCalled()
  })

  it('does nothing when orchestrators list is empty', async () => {
    const { tryOrchestratorRoute } = useShellActions({
      orchestrators: [],
      savedQuery: 'hello',
      setActiveTool: vi.fn(),
      setProviderStates: vi.fn(),
      setQuery: vi.fn(),
      setSavedQuery: vi.fn(),
      recordToolUsed: vi.fn(),
      setToolComponent: vi.fn(),
    })
    await tryOrchestratorRoute()
    expect(window.core.ipc.invoke).not.toHaveBeenCalled()
  })
})

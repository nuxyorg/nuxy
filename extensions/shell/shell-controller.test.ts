import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ShellController } from './shell-controller.ts'

vi.hoisted(() => {
  ;(globalThis as any).window = {
    innerWidth: 1920,
    innerHeight: 1080,
    core: {
      ipc: { invoke: vi.fn() },
      shell: { registerKeyActions: vi.fn(), refreshKeyHints: vi.fn(), resetToolState: vi.fn() },
      events: { on: vi.fn(() => () => {}) },
    },
  }
  ;(globalThis as any).document = {
    documentElement: { style: { zoom: '' } },
  }
})

describe('ShellController tryOrchestratorRoute', () => {
  const orchestrators = [{ id: 'com.nuxy.ai-orchestrator', manifest: { name: 'AI' } }]

  beforeEach(() => {
    vi.mocked(window.core!.ipc.invoke).mockReset()
  })

  it('unwraps ext:invoke success wrapper and opens routed tool', async () => {
    vi.mocked(window.core!.ipc.invoke).mockResolvedValue({
      success: true,
      data: { ok: true, data: { toolCalled: 'com.nuxy.calculator', initialQuery: '2+2' } },
    })
    const ctrl = new ShellController(() => {})
    ctrl.store.setState({ savedQuery: 'what is 2+2', orchestrators: orchestrators as never[] })
    await ctrl.tryOrchestratorRoute()
    expect(window.core!.ipc.invoke).toHaveBeenCalledWith('com.nuxy.ai-orchestrator', 'route', {
      text: 'what is 2+2',
    })
    expect(ctrl.state.activeTool).toBe('com.nuxy.calculator')
    expect(ctrl.state.query).toBe('2+2')
  })

  it('does nothing when ipc returns success without routed tool', async () => {
    vi.mocked(window.core!.ipc.invoke).mockResolvedValue({
      success: true,
      data: { ok: true, data: null },
    })
    const ctrl = new ShellController(() => {})
    ctrl.store.setState({ savedQuery: 'hello', orchestrators: orchestrators as never[] })
    await ctrl.tryOrchestratorRoute()
    expect(ctrl.state.activeTool).toBeNull()
  })

  it('does nothing when orchestrators list is empty', async () => {
    const ctrl = new ShellController(() => {})
    ctrl.store.setState({ savedQuery: 'hello', orchestrators: [] })
    vi.mocked(window.core!.ipc.invoke).mockClear()
    await ctrl.tryOrchestratorRoute()
    expect(window.core!.ipc.invoke).not.toHaveBeenCalled()
  })
})

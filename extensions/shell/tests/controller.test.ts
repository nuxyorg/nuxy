import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ShellController } from '../controller.ts'

vi.hoisted(() => {
  ;(globalThis as any).window = {
    innerWidth: 1920,
    innerHeight: 1080,
    core: {
      ipc: { invoke: vi.fn() },
      shell: {
        registerKeyActions: vi.fn(),
        refreshKeyHints: vi.fn(),
        resetToolState: vi.fn(),
        setSearchPlaceholder: vi.fn(),
      },
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
    ctrl.store.setState({ savedQuery: 'what is 2+2' })
    ctrl.tools.setOrchestrators(orchestrators as never[])
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
    ctrl.store.setState({ savedQuery: 'hello' })
    ctrl.tools.setOrchestrators(orchestrators as never[])
    await ctrl.tryOrchestratorRoute()
    expect(ctrl.state.activeTool).toBeNull()
  })

  it('does nothing when orchestrators list is empty', async () => {
    const ctrl = new ShellController(() => {})
    ctrl.store.setState({ savedQuery: 'hello' })
    vi.mocked(window.core!.ipc.invoke).mockClear()
    await ctrl.tryOrchestratorRoute()
    expect(window.core!.ipc.invoke).not.toHaveBeenCalled()
  })
})

describe('ShellController tool search placeholder', () => {
  beforeEach(() => {
    vi.mocked(window.core!.ipc.invoke).mockReset()
    vi.mocked(window.core!.shell.resetToolState).mockClear()
    vi.mocked(window.core!.shell.setSearchPlaceholder).mockClear()
  })

  it('loads placeholder from kernel when a tool becomes active', async () => {
    vi.mocked(window.core!.ipc.invoke).mockResolvedValue({
      success: true,
      data: { translations: { 'search.placeholder': 'Search through Nyaa' } },
    })
    const ctrl = new ShellController(() => {})
    ctrl.tools.setActiveTool('com.nuxy.nyaa')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(window.core!.shell.resetToolState).toHaveBeenCalledWith({
      clearSearchPlaceholder: false,
    })
    expect(window.core!.ipc.invoke).toHaveBeenCalledWith('kernel', 'getExtensionTranslations', {
      extId: 'com.nuxy.nyaa',
    })
    expect(window.core!.shell.setSearchPlaceholder).toHaveBeenCalledWith('Search through Nyaa')
  })

  it('clears placeholder when returning to shell', async () => {
    const ctrl = new ShellController(() => {})
    ctrl.tools.setActiveTool('com.nuxy.nyaa')
    vi.mocked(window.core!.shell.resetToolState).mockClear()
    ctrl.tools.setActiveTool(null)
    expect(window.core!.shell.resetToolState).toHaveBeenCalledWith({
      clearSearchPlaceholder: true,
    })
  })
})

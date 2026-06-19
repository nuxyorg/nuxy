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
      deeplink: { dispatch: vi.fn() },
    },
  }
  ;(globalThis as any).document = {
    documentElement: { style: { zoom: '' } },
    createTreeWalker: vi.fn(() => ({ nextNode: vi.fn() })),
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

describe('ShellController commandPaletteActions', () => {
  it('includes caller.commands only when that tool is active', () => {
    const ctrl = new ShellController(() => {})
    ctrl.tools.setTools([
      {
        id: 'com.nuxy.nyaa',
        manifest: {
          id: 'com.nuxy.nyaa',
          name: 'Nyaa Search',
          version: '1.0.0',
          type: 'tool',
          caller: {
            commands: [
              { label: 'Nyaa settings', deeplink: 'nuxy://settings/extension/com.nuxy.nyaa' },
            ],
          },
        },
      },
      {
        id: 'com.nuxy.icon-browser',
        manifest: {
          id: 'com.nuxy.icon-browser',
          name: 'Icon Browser',
          version: '1.0.0',
          type: 'tool',
        },
      },
    ] as never[])

    expect(ctrl.commandPaletteActions()).toEqual([])

    ctrl.tools.setActiveTool('com.nuxy.nyaa')
    const actions = ctrl.commandPaletteActions()
    expect(actions).toHaveLength(1)
    expect(actions[0].label).toBe('Nyaa settings')

    actions[0].onExecute?.()
    expect(window.core!.deeplink!.dispatch).toHaveBeenCalledWith(
      'nuxy://settings/extension/com.nuxy.nyaa'
    )

    ctrl.tools.setActiveTool('com.nuxy.icon-browser')
    expect(ctrl.commandPaletteActions()).toEqual([])
  })

  it('combines caller commands with the active tool bridge actions', () => {
    const ctrl = new ShellController(() => {})
    ctrl.store.setState({
      bridge: {
        ...ctrl.store.getState().bridge,
        toolActions: [{ id: 'tool:foo', label: 'Foo action' }],
      },
    })
    ctrl.tools.setTools([
      {
        id: 'com.nuxy.nyaa',
        manifest: {
          id: 'com.nuxy.nyaa',
          name: 'Nyaa Search',
          version: '1.0.0',
          type: 'tool',
          caller: {
            commands: [
              { label: 'Nyaa settings', deeplink: 'nuxy://settings/extension/com.nuxy.nyaa' },
            ],
          },
        },
      },
    ] as never[])
    ctrl.tools.setActiveTool('com.nuxy.nyaa')

    const actions = ctrl.commandPaletteActions()
    expect(actions.map((a) => a.label)).toEqual(['Foo action', 'Nyaa settings'])
  })
})

describe('ShellController tool search placeholder', () => {
  beforeEach(() => {
    vi.mocked(window.core!.ipc.invoke).mockReset()
    vi.mocked(window.core!.shell!.resetToolState).mockClear()
    vi.mocked(window.core!.shell!.setSearchPlaceholder).mockClear()
  })

  it('loads placeholder from kernel when a tool becomes active', async () => {
    vi.mocked(window.core!.ipc.invoke).mockResolvedValue({
      success: true,
      data: { translations: { 'search.placeholder': 'Search through Nyaa' } },
    })
    const ctrl = new ShellController(() => {})
    ctrl.tools.setActiveTool('com.nuxy.nyaa')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(window.core!.shell!.resetToolState).toHaveBeenCalledWith({
      clearSearchPlaceholder: false,
    })
    expect(window.core!.ipc.invoke).toHaveBeenCalledWith('kernel', 'getExtensionTranslations', {
      extId: 'com.nuxy.nyaa',
    })
    expect(window.core!.shell!.setSearchPlaceholder).toHaveBeenCalledWith('Search through Nyaa')
  })

  it('clears placeholder when returning to shell', async () => {
    const ctrl = new ShellController(() => {})
    ctrl.tools.setActiveTool('com.nuxy.nyaa')
    vi.mocked(window.core!.shell!.resetToolState).mockClear()
    ctrl.tools.setActiveTool(null)
    expect(window.core!.shell!.resetToolState).toHaveBeenCalledWith({
      clearSearchPlaceholder: true,
    })
  })
})

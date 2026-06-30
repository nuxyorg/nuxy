import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ShellController } from '../controller.ts'
import { parseCoordinate } from '../utils.ts'

vi.hoisted(() => {
  ;(globalThis as any).window = {
    innerWidth: 1920,
    innerHeight: 1080,
    core: {
      ipc: { invoke: vi.fn() },
      shell: {
        registerShellActions: vi.fn(),
        refreshShellActions: vi.fn(),
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

describe('ShellController handleItemClick execute actions', () => {
  it('opens the target tool when execute returns toolId', async () => {
    vi.mocked(window.core!.ipc.invoke).mockResolvedValue({
      success: true,
      data: { toolId: 'com.nuxy.download-manager', query: '' },
    })
    const ctrl = new ShellController(() => {})
    ctrl.tools.setTools([
      {
        id: 'com.nuxy.download-manager',
        manifest: {
          id: 'com.nuxy.download-manager',
          name: 'Download Manager',
          version: '1.0.0',
          type: 'tool',
        },
      },
    ] as never[])

    await ctrl.handleItemClick({
      id: 'com.nuxy.download-manager',
      title: 'Download https://example.com/file.js',
      execute: {
        channel: 'add_from_provider',
        payload: { url: 'https://example.com/file.js' },
      },
    })

    expect(window.core!.ipc.invoke).toHaveBeenCalledWith(
      'com.nuxy.download-manager',
      'add_from_provider',
      { url: 'https://example.com/file.js' },
      { callerExtId: 'com.nuxy.shell' }
    )
    expect(ctrl.state.activeTool).toBe('com.nuxy.download-manager')
  })
})

describe('ShellController handleOmniKeyDown Enter', () => {
  const calcTool = {
    id: 'com.nuxy.calculator',
    manifest: {
      id: 'com.nuxy.calculator',
      name: 'Calculator',
      version: '1.0.0',
      type: 'tool',
    },
  }
  const emojiTool = {
    id: 'com.nuxy.emoji',
    manifest: {
      id: 'com.nuxy.emoji',
      name: 'Emoji Picker',
      version: '1.0.0',
      type: 'tool',
    },
  }

  it('opens the first list result when nothing is selected', () => {
    const ctrl = new ShellController(() => {})
    ctrl.tools.setTools([calcTool, emojiTool] as never[])
    ctrl.store.setState({ savedQuery: 'calc', query: 'calc', selectedIndex: -1 })
    ctrl.providers.recompute(ctrl.tools.tools, 'calc', [], {})

    const clickSpy = vi.spyOn(ctrl, 'handleItemClick').mockResolvedValue(undefined)
    const event = { key: 'Enter', preventDefault: vi.fn() } as unknown as KeyboardEvent

    ctrl.handleOmniKeyDown(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'com.nuxy.calculator', isTool: true })
    )
  })

  it('uses the highlighted result when one is selected', () => {
    const ctrl = new ShellController(() => {})
    ctrl.tools.setTools([calcTool, emojiTool] as never[])
    ctrl.store.setState({ savedQuery: 'calc', query: 'calc', selectedIndex: 0 })
    ctrl.providers.recompute(ctrl.tools.tools, 'calc', [], {})

    const clickSpy = vi.spyOn(ctrl, 'handleItemClick').mockResolvedValue(undefined)
    const event = { key: 'Enter', preventDefault: vi.fn() } as unknown as KeyboardEvent

    ctrl.handleOmniKeyDown(event)

    expect(clickSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'com.nuxy.calculator', isTool: true })
    )
  })

  it('routes to orchestrator only when there are no navigable results', async () => {
    vi.mocked(window.core!.ipc.invoke).mockResolvedValue({
      success: true,
      data: { ok: true, data: { toolCalled: 'com.nuxy.calculator', initialQuery: '' } },
    })
    const ctrl = new ShellController(() => {})
    ctrl.tools.setTools([calcTool, emojiTool] as never[])
    ctrl.tools.setOrchestrators([
      { id: 'com.nuxy.ai-orchestrator', manifest: { name: 'AI' } },
    ] as never[])
    ctrl.store.setState({ savedQuery: 'what is 2+2', query: 'what is 2+2', selectedIndex: -1 })
    ctrl.providers.recompute(ctrl.tools.tools, 'what is 2+2', [], {})

    const clickSpy = vi.spyOn(ctrl, 'handleItemClick').mockResolvedValue(undefined)
    const event = { key: 'Enter', preventDefault: vi.fn() } as unknown as KeyboardEvent

    ctrl.handleOmniKeyDown(event)

    expect(clickSpy).not.toHaveBeenCalled()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(window.core!.ipc.invoke).toHaveBeenCalledWith(
      'com.nuxy.ai-orchestrator',
      'route',
      { text: 'what is 2+2' },
      { callerExtId: 'com.nuxy.shell' }
    )
  })
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
    expect(window.core!.ipc.invoke).toHaveBeenCalledWith(
      'com.nuxy.ai-orchestrator',
      'route',
      { text: 'what is 2+2' },
      { callerExtId: 'com.nuxy.shell' }
    )
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

    actions[0].handler?.()
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
        toolActions: [{ id: 'tool:foo', label: 'Foo action', handler: () => {} }],
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

  it('auto-synthesizes a settings entry for a tool with entry.settings and no manual caller command', () => {
    const ctrl = new ShellController(() => {})
    ctrl.tools.setTools([
      {
        id: 'com.nuxy.download-manager',
        manifest: {
          id: 'com.nuxy.download-manager',
          name: 'Download Manager',
          version: '1.0.0',
          type: 'tool',
          entry: { settings: 'settings.json' },
        },
      },
    ] as never[])
    ctrl.tools.setActiveTool('com.nuxy.download-manager')

    const actions = ctrl.commandPaletteActions()
    expect(actions.map((a) => a.id)).toContain('auto-settings')

    const settingsAction = actions.find((a) => a.id === 'auto-settings')
    settingsAction?.handler?.()
    expect(window.core!.deeplink!.dispatch).toHaveBeenCalledWith(
      'nuxy://settings/extension/com.nuxy.download-manager'
    )
  })
})

describe('ShellController Ctrl+. settings shortcut wiring', () => {
  it('exposes a settings deeplink for the active tool when it declares entry.settings', () => {
    const ctrl = new ShellController(() => {})
    ctrl.tools.setTools([
      {
        id: 'com.nuxy.download-manager',
        manifest: {
          id: 'com.nuxy.download-manager',
          name: 'Download Manager',
          version: '1.0.0',
          type: 'tool',
          entry: { settings: 'settings.json' },
        },
      },
    ] as never[])

    expect(ctrl['_activeToolSettingsDeeplink']()).toBeNull()
    ctrl.tools.setActiveTool('com.nuxy.download-manager')
    expect(ctrl['_activeToolSettingsDeeplink']()).toBe(
      'nuxy://settings/extension/com.nuxy.download-manager'
    )
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

describe('ShellController handleOmniKeyDown provider cards', () => {
  it('navigates to provider result cards and copies on Enter', async () => {
    vi.useFakeTimers()
    vi.mocked(window.core!.ipc.invoke).mockResolvedValue({
      success: true,
      data: { items: [{ id: 'calc-result', title: '= 4', value: '4' }] },
    })

    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const ctrl = new ShellController(() => {})
    ctrl.providers.setProviders([
      { id: 'com.nuxy.calculator', manifest: { name: 'Calculator', providerType: 'result' } },
    ] as never[])
    ctrl.store.setState({ savedQuery: '2+2', query: '2+2', selectedIndex: -1 })
    ctrl.providers.sync('2+2', null, [], [])
    vi.runAllTimers()
    await Promise.resolve()
    await Promise.resolve()

    expect(ctrl.providers.navigableResults).toHaveLength(1)

    const down = { key: 'ArrowDown', preventDefault: vi.fn() } as unknown as KeyboardEvent
    ctrl.handleOmniKeyDown(down)
    expect(ctrl.store.getState().selectedIndex).toBe(0)

    const enter = { key: 'Enter', preventDefault: vi.fn() } as unknown as KeyboardEvent
    ctrl.handleOmniKeyDown(enter)

    expect(writeText).toHaveBeenCalledWith('4')
    expect(ctrl.store.getState().copiedId).toBe('calc-result')
    vi.useRealTimers()
  })
})

describe('ShellController returnToShell selection', () => {
  const angrysearchTool = {
    id: 'com.nuxy.angrysearch',
    manifest: { id: 'com.nuxy.angrysearch', name: 'ANGRYsearch', version: '1.0.0', type: 'tool' },
  }
  const stremioTool = {
    id: 'com.nuxy.stremio',
    manifest: { id: 'com.nuxy.stremio', name: 'Stremio Arama', version: '1.0.0', type: 'tool' },
  }

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('selects the exiting tool instead of the first list item', () => {
    const ctrl = new ShellController(() => {})
    vi.spyOn(ctrl, 'ensureShellFocus').mockImplementation(() => {})
    ctrl.tools.setTools([angrysearchTool, stremioTool] as never[])
    ctrl.providers.recompute(ctrl.tools.tools, '', [], {})
    ctrl.tools.setActiveTool('com.nuxy.stremio')

    ctrl.returnToShell()

    expect(ctrl.store.getState().selectedIndex).toBe(1)
    expect(ctrl.providers.navigableResults[ctrl.store.getState().selectedIndex]?.id).toBe(
      'com.nuxy.stremio'
    )
  })
})

describe('ShellController returnToShell positioning', () => {
  beforeEach(() => {
    window.innerHeight = 600
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('recenters using live content height after reset, not stale restingHeight', () => {
    let phase: 'tool' | 'shell' = 'tool'
    const container = {
      get offsetHeight() {
        return phase === 'tool' ? 600 : 320
      },
      offsetWidth: 800,
    } as HTMLElement

    const ctrl = new ShellController(() => {})
    ctrl.refs.container = container
    ctrl.refs.cfg = {
      windowWidth: 800,
      windowMaxHeight: 600,
      windowPosition: '1/2, 1/2',
      opacity: 1,
      theme: 'dark',
      zoom: '100%',
      font: 'system',
      holdMs: 'long',
    }
    ctrl.win.recordRestingHeight(180)
    ctrl.tools.setActiveTool('com.nuxy.download-manager')

    const originalSetState = ctrl.store.setState.bind(ctrl.store)
    ctrl.store.setState = (partial) => {
      phase = 'shell'
      return originalSetState(partial)
    }

    const animatePositionSpy = vi.spyOn(ctrl.win, 'animatePosition')
    vi.spyOn(ctrl.win, 'animateToHeight').mockImplementation((_toH, _fromH, cb) => {
      cb?.()
    })
    vi.spyOn(ctrl, 'ensureShellFocus').mockImplementation(() => {})

    ctrl.returnToShell()

    const expectedY = parseCoordinate('1/2', 600, 320)
    const staleY = parseCoordinate('1/2', 600, 180)
    expect(expectedY).not.toBe(staleY)

    const yValues = animatePositionSpy.mock.calls.map(([pos]) => pos.y)
    expect(yValues).toContain(expectedY)
    expect(yValues).not.toContain(staleY)
    expect(ctrl.win.restingHeight).toBe(320)
  })

  it('recenters again after the height animation completes', () => {
    let phase: 'tool' | 'shell' = 'tool'
    const container = {
      get offsetHeight() {
        return phase === 'tool' ? 600 : 320
      },
      offsetWidth: 800,
    } as HTMLElement

    const ctrl = new ShellController(() => {})
    ctrl.refs.container = container
    ctrl.refs.cfg = {
      windowWidth: 800,
      windowMaxHeight: 600,
      windowPosition: '1/2, 1/2',
      opacity: 1,
      theme: 'dark',
      zoom: '100%',
      font: 'system',
      holdMs: 'long',
    }
    ctrl.win.recordRestingHeight(180)
    ctrl.tools.setActiveTool('com.nuxy.download-manager')

    const originalSetState = ctrl.store.setState.bind(ctrl.store)
    ctrl.store.setState = (partial) => {
      phase = 'shell'
      return originalSetState(partial)
    }

    const animatePositionSpy = vi.spyOn(ctrl.win, 'animatePosition')
    let capturedComplete: (() => void) | undefined
    vi.spyOn(ctrl.win, 'animateToHeight').mockImplementation((_toH, _fromH, cb) => {
      capturedComplete = cb
    })
    vi.spyOn(ctrl, 'ensureShellFocus').mockImplementation(() => {})

    ctrl.returnToShell()

    expect(capturedComplete).toBeTypeOf('function')
    expect(animatePositionSpy).toHaveBeenCalledTimes(1)

    capturedComplete!()

    const expectedY = parseCoordinate('1/2', 600, 320)
    expect(animatePositionSpy).toHaveBeenCalledTimes(2)
    expect(animatePositionSpy.mock.calls[1][0].y).toBe(expectedY)
  })
})

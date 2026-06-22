import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Tool, Orchestrator } from '../types.ts'
import { makeHost } from './helpers.ts'

function makeTool(
  id: string,
  name: string,
  placeholder?: string,
  omniBarPosition?: 'top' | 'bottom'
): Tool {
  return {
    id,
    manifest: {
      id,
      name,
      version: '1',
      type: 'tool',
      placeholder,
      behavior: omniBarPosition ? { omniBarPosition } : undefined,
    } as Tool['manifest'],
  } as Tool
}

function makeOrchestrator(id: string): Orchestrator {
  return { id, manifest: { id, name: id, version: '1', type: 'orchestrator' } } as Orchestrator
}

describe('ToolController', () => {
  let ToolController: typeof import('../controllers/tool-controller.ts').ToolController

  beforeEach(async () => {
    vi.resetModules()
    ;({ ToolController } = await import('../controllers/tool-controller.ts'))
  })

  it('registers itself with the host', () => {
    const host = makeHost()
    new ToolController(host)
    expect(host.addController).toHaveBeenCalledWith(expect.any(Object))
  })

  it('initializes with empty tools and no active tool', () => {
    const host = makeHost()
    const ctrl = new ToolController(host)
    expect(ctrl.activeTool).toBeNull()
    expect(ctrl.tools).toEqual([])
    expect(ctrl.orchestrators).toEqual([])
    expect(ctrl.recentToolIds).toEqual([])
  })

  it('setTools updates tools and calls requestUpdate', () => {
    const host = makeHost()
    const ctrl = new ToolController(host)
    const tools = [makeTool('calc', 'Calculator')]
    ctrl.setTools(tools)
    expect(ctrl.tools).toEqual(tools)
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('setOrchestrators updates orchestrators and calls requestUpdate', () => {
    const host = makeHost()
    const ctrl = new ToolController(host)
    const orch = [makeOrchestrator('router')]
    ctrl.setOrchestrators(orch)
    expect(ctrl.orchestrators).toEqual(orch)
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('setRecentToolIds updates recentToolIds and calls requestUpdate', () => {
    const host = makeHost()
    const ctrl = new ToolController(host)
    ctrl.setRecentToolIds(['calc', 'search'])
    expect(ctrl.recentToolIds).toEqual(['calc', 'search'])
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('setActiveTool sets activeTool and calls requestUpdate', () => {
    const host = makeHost()
    const ctrl = new ToolController(host)
    ctrl.setActiveTool('calc')
    expect(ctrl.activeTool).toBe('calc')
    expect(host.requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('setActiveTool is a no-op if the same tool is already active', () => {
    const host = makeHost()
    const ctrl = new ToolController(host)
    ctrl.setActiveTool('calc')
    host.requestUpdate.mockClear()
    ctrl.setActiveTool('calc')
    expect(host.requestUpdate).not.toHaveBeenCalled()
  })

  it('setActiveTool fires onToolChange callback', () => {
    const host = makeHost()
    const onToolChange = vi.fn()
    const ctrl = new ToolController(host, { onToolChange })
    ctrl.setActiveTool('calc')
    expect(onToolChange).toHaveBeenCalledWith('calc')
  })

  it('setActiveTool to null fires onToolChange with null', () => {
    const host = makeHost()
    const onToolChange = vi.fn()
    const ctrl = new ToolController(host, { onToolChange })
    ctrl.setActiveTool('calc')
    onToolChange.mockClear()
    ctrl.setActiveTool(null)
    expect(onToolChange).toHaveBeenCalledWith(null)
  })

  it('activeToolName returns null when no active tool', () => {
    const host = makeHost()
    const ctrl = new ToolController(host)
    expect(ctrl.activeToolName).toBeNull()
  })

  it('activeToolName returns the manifest name of the active tool', () => {
    const host = makeHost()
    const ctrl = new ToolController(host)
    ctrl.setTools([makeTool('calc', 'Calculator')])
    ctrl.setActiveTool('calc')
    expect(ctrl.activeToolName).toBe('Calculator')
  })

  it('activeToolName falls back to the tool id when not in tools list', () => {
    const host = makeHost()
    const ctrl = new ToolController(host)
    ctrl.setActiveTool('unknown-tool')
    expect(ctrl.activeToolName).toBe('unknown-tool')
  })

  it('activeToolPlaceholder returns null when no active tool', () => {
    const host = makeHost()
    const ctrl = new ToolController(host)
    expect(ctrl.activeToolPlaceholder).toBeNull()
  })

  it('activeToolPlaceholder returns placeholder from manifest', () => {
    const host = makeHost()
    const ctrl = new ToolController(host)
    ctrl.setTools([makeTool('calc', 'Calculator', 'Type an expression…')])
    ctrl.setActiveTool('calc')
    expect(ctrl.activeToolPlaceholder).toBe('Type an expression…')
  })

  it('activeToolPlaceholder returns null when manifest has no placeholder', () => {
    const host = makeHost()
    const ctrl = new ToolController(host)
    ctrl.setTools([makeTool('calc', 'Calculator')])
    ctrl.setActiveTool('calc')
    expect(ctrl.activeToolPlaceholder).toBeNull()
  })

  it('activeToolOmniBarPosition returns "top" when no active tool', () => {
    const host = makeHost()
    const ctrl = new ToolController(host)
    expect(ctrl.activeToolOmniBarPosition).toBe('top')
  })

  it('activeToolOmniBarPosition returns "top" when manifest declares no behavior', () => {
    const host = makeHost()
    const ctrl = new ToolController(host)
    ctrl.setTools([makeTool('calc', 'Calculator')])
    ctrl.setActiveTool('calc')
    expect(ctrl.activeToolOmniBarPosition).toBe('top')
  })

  it('activeToolOmniBarPosition returns "bottom" when manifest declares it', () => {
    const host = makeHost()
    const ctrl = new ToolController(host)
    ctrl.setTools([makeTool('ollama', 'Ollama', undefined, 'bottom')])
    ctrl.setActiveTool('ollama')
    expect(ctrl.activeToolOmniBarPosition).toBe('bottom')
  })
})

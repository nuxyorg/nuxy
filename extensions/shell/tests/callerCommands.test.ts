import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildCallerCommandActions, mergeCommandPaletteActions } from '../utils/callerCommands.ts'
import type { Tool } from '../types.ts'

function makeTool(id: string, callerCommands?: { label: string; deeplink: string }[]): Tool {
  return {
    id,
    manifest: {
      id,
      name: id,
      version: '1.0.0',
      type: 'tool',
      ...(callerCommands ? { caller: { commands: callerCommands } } : {}),
    },
  }
}

describe('buildCallerCommandActions', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      core: { deeplink: { dispatch: vi.fn() } },
    })
  })

  it('returns an empty array when no tool declares caller.commands', () => {
    const tools = [makeTool('com.nuxy.nyaa'), makeTool('com.nuxy.settings')]
    expect(buildCallerCommandActions(tools, 'com.nuxy.nyaa')).toEqual([])
  })

  it('returns an empty array when no tool is active', () => {
    const tools = [
      makeTool('com.nuxy.nyaa', [
        { label: 'Nyaa settings', deeplink: 'nuxy://settings/extension/com.nuxy.nyaa' },
      ]),
    ]
    expect(buildCallerCommandActions(tools, null)).toEqual([])
  })

  it('returns an empty array when a different tool is active', () => {
    const tools = [
      makeTool('com.nuxy.nyaa', [
        { label: 'Nyaa settings', deeplink: 'nuxy://settings/extension/com.nuxy.nyaa' },
      ]),
      makeTool('com.nuxy.icon-browser'),
    ]
    expect(buildCallerCommandActions(tools, 'com.nuxy.icon-browser')).toEqual([])
  })

  it('builds one CommandPaletteAction per declared caller command', () => {
    const tools = [
      makeTool('com.nuxy.nyaa', [
        { label: 'Nyaa settings', deeplink: 'nuxy://settings/extension/com.nuxy.nyaa' },
      ]),
    ]
    const actions = buildCallerCommandActions(tools, 'com.nuxy.nyaa')
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({
      id: 'caller:com.nuxy.nyaa:0',
      label: 'Nyaa settings',
    })
  })

  it('collects caller commands only from the active tool', () => {
    const tools = [
      makeTool('com.nuxy.nyaa', [
        { label: 'Nyaa settings', deeplink: 'nuxy://settings/extension/com.nuxy.nyaa' },
      ]),
      makeTool('com.nuxy.notes', [
        { label: 'Notes settings', deeplink: 'nuxy://settings/extension/com.nuxy.notes' },
      ]),
    ]
    const actions = buildCallerCommandActions(tools, 'com.nuxy.nyaa')
    expect(actions.map((a) => a.label)).toEqual(['Nyaa settings'])
  })

  it('onExecute dispatches the declared deeplink through window.core.deeplink.dispatch', () => {
    const tools = [
      makeTool('com.nuxy.nyaa', [
        { label: 'Nyaa settings', deeplink: 'nuxy://settings/extension/com.nuxy.nyaa' },
      ]),
    ]
    const actions = buildCallerCommandActions(tools, 'com.nuxy.nyaa')
    actions[0].onExecute?.()
    expect(window.core!.deeplink!.dispatch).toHaveBeenCalledWith(
      'nuxy://settings/extension/com.nuxy.nyaa'
    )
  })

  it('ignores a caller.commands entry missing a label or deeplink', () => {
    const tools = [
      makeTool('com.nuxy.broken', [
        { label: '', deeplink: 'nuxy://settings/extension/x' },
        { label: 'Valid', deeplink: '' },
      ]),
    ]
    expect(buildCallerCommandActions(tools, 'com.nuxy.broken')).toEqual([])
  })
})

describe('mergeCommandPaletteActions', () => {
  it('appends caller command actions after the tool-scoped bridge actions', () => {
    const toolActions = [{ id: 'tool:a', label: 'Tool action A' }]
    const callerActions = [{ id: 'caller:b:0', label: 'Caller action B' }]
    expect(mergeCommandPaletteActions(toolActions, callerActions)).toEqual([
      ...toolActions,
      ...callerActions,
    ])
  })

  it('de-duplicates by id, preferring the tool-scoped action', () => {
    const toolActions = [{ id: 'same-id', label: 'From tool' }]
    const callerActions = [{ id: 'same-id', label: 'From caller' }]
    const merged = mergeCommandPaletteActions(toolActions, callerActions)
    expect(merged).toHaveLength(1)
    expect(merged[0].label).toBe('From tool')
  })

  it('returns the tool actions unchanged when there are no caller actions', () => {
    const toolActions = [{ id: 'tool:a', label: 'Tool action A' }]
    expect(mergeCommandPaletteActions(toolActions, [])).toEqual(toolActions)
  })
})

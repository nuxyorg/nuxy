import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildAutoSettingsAction,
  buildCallerCommandActions,
  mergeCommandPaletteActions,
} from '../utils/caller-commands.ts'
import type { Tool } from '../types.ts'

function makeTool(
  id: string,
  callerCommands?: { label: string; deeplink: string; section?: string }[],
  hasSettings?: boolean
): Tool {
  return {
    id,
    manifest: {
      id,
      name: id,
      version: '1.0.0',
      type: 'tool',
      ...(hasSettings ? { entry: { settings: 'settings.json' } } : {}),
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

  it('passes through an optional section label from manifest caller.commands', () => {
    const tools = [
      makeTool('com.nuxy.nyaa', [
        {
          label: 'Nyaa settings',
          deeplink: 'nuxy://settings/extension/com.nuxy.nyaa',
          section: 'Settings',
        },
      ]),
    ]
    const actions = buildCallerCommandActions(tools, 'com.nuxy.nyaa')
    expect(actions[0].section).toBe('Settings')
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

  it('handler dispatches the declared deeplink through window.core.deeplink.dispatch', () => {
    const tools = [
      makeTool('com.nuxy.nyaa', [
        { label: 'Nyaa settings', deeplink: 'nuxy://settings/extension/com.nuxy.nyaa' },
      ]),
    ]
    const actions = buildCallerCommandActions(tools, 'com.nuxy.nyaa')
    actions[0].handler()
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

describe('buildAutoSettingsAction', () => {
  const t = (key: string) => key

  it('returns an empty array when no tool is active', () => {
    const tools = [makeTool('com.nuxy.download-manager', undefined, true)]
    expect(buildAutoSettingsAction(tools, null, t)).toEqual([])
  })

  it('returns an empty array when the active tool has no entry.settings', () => {
    const tools = [makeTool('com.nuxy.calculator')]
    expect(buildAutoSettingsAction(tools, 'com.nuxy.calculator', t)).toEqual([])
  })

  it('synthesizes a Ctrl+. settings action when the active tool declares entry.settings', () => {
    const tools = [makeTool('com.nuxy.download-manager', undefined, true)]
    const actions = buildAutoSettingsAction(tools, 'com.nuxy.download-manager', t)
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({
      id: 'auto-settings',
      section: 'settings',
      showInMenu: true,
      hint: ['⌃', '.'],
    })
    actions[0].handler()
    expect(window.core!.deeplink!.dispatch).toHaveBeenCalledWith(
      'nuxy://settings/extension/com.nuxy.download-manager'
    )
  })

  it('skips synthesis when the manifest already declares a manual settings caller command', () => {
    const tools = [
      makeTool(
        'com.nuxy.nyaa',
        [
          {
            label: 'Nyaa settings',
            deeplink: 'nuxy://settings/extension/com.nuxy.nyaa',
            section: 'settings',
          },
        ],
        true
      ),
    ]
    expect(buildAutoSettingsAction(tools, 'com.nuxy.nyaa', t)).toEqual([])
  })
})

describe('mergeCommandPaletteActions', () => {
  it('appends caller command actions after the tool-scoped bridge actions', () => {
    const toolActions = [{ id: 'tool:a', label: 'Tool action A', handler: () => {} }]
    const callerActions = [{ id: 'caller:b:0', label: 'Caller action B', handler: () => {} }]
    expect(mergeCommandPaletteActions(toolActions, callerActions)).toEqual([
      ...toolActions,
      ...callerActions,
    ])
  })

  it('de-duplicates by id, preferring the tool-scoped action', () => {
    const toolActions = [{ id: 'same-id', label: 'From tool', handler: () => {} }]
    const callerActions = [{ id: 'same-id', label: 'From caller', handler: () => {} }]
    const merged = mergeCommandPaletteActions(toolActions, callerActions)
    expect(merged).toHaveLength(1)
    expect(merged[0].label).toBe('From tool')
  })

  it('returns the tool actions unchanged when there are no caller actions', () => {
    const toolActions = [{ id: 'tool:a', label: 'Tool action A', handler: () => {} }]
    expect(mergeCommandPaletteActions(toolActions, [])).toEqual(toolActions)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flattenShellActions } from '@nuxyorg/core'
import { setupDomGlobals } from '@nuxyorg/extension-sdk/testing'
import { IpcExplorerController } from '../controller.ts'
import { flatChannels, kernelTarget } from '../utils/parse-targets.ts'

setupDomGlobals({
  ipc: { invoke: vi.fn() },
  shell: {
    registerShellActions: vi.fn(),
    refreshShellActions: vi.fn(),
  },
})

function fireAction(controller: IpcExplorerController, key: string, modifiers?: string[]): void {
  const action = flattenShellActions(controller.getKeyActions()).find((entry) => {
    if (entry.key !== key) return false
    const mods = entry.modifiers ?? []
    if (modifiers?.length) {
      return modifiers.every((mod) => mods.includes(mod as 'ctrl'))
    }
    return mods.length === 0
  })
  action?.handler?.()
}

describe('IpcExplorerController', () => {
  beforeEach(() => {
    vi.mocked(window.core.ipc.invoke).mockReset()
  })

  it('starts with kernel target preloaded', () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({
      success: true,
      data: [],
    })

    const updates: number[] = []
    const controller = new IpcExplorerController(() => updates.push(updates.length))

    expect(controller.state.targets[0]?.extId).toBe('kernel')
    expect(controller.state.channelIndex).toBe(0)
    expect(controller.state.selectedChannel).toBe(flatChannels(kernelTarget())[0]?.channel)
    expect(controller.state.focusArea).toBe('channels')
  })

  it('loads extension ipcChannels after refresh', async () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'com.nuxy.download-manager',
          manifest: { name: 'Download Manager' },
          runtime: { ipcChannels: ['add', 'list'] },
        },
      ],
    })

    const controller = new IpcExplorerController(() => {})
    controller.connect()
    await vi.waitFor(() => expect(controller.state.ready).toBe(true))

    expect(controller.state.targets.some((t) => t.extId === 'com.nuxy.download-manager')).toBe(true)
    expect(
      controller.state.targets.find((t) => t.extId === 'com.nuxy.download-manager')?.channels
    ).toEqual(['add', 'list'])
  })

  it('keeps kernel target when listInstalledExtensions fails', async () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({
      success: false,
      error: 'boom',
    })

    const controller = new IpcExplorerController(() => {})
    await controller.refreshTargets()

    expect(controller.state.loadError).toBe('boom')
    expect(controller.state.targets[0]?.extId).toBe('kernel')
    expect(controller.state.targets[0]?.channels.length).toBeGreaterThan(0)
  })

  it('allows invoking a kernel channel and passes callerExtId', async () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({ success: true, data: [] })

    const controller = new IpcExplorerController(() => {})
    await controller.refreshTargets()
    controller.selectExtension('kernel')
    controller.selectChannelIndex(
      controller.flatChannelsForTarget.findIndex((c) => c.channel === 'listInstalledExtensions'),
      'channels'
    )

    expect(controller.canInvokeSelected).toBe(true)
    await controller.invokeSelected()

    expect(window.core.ipc.invoke).toHaveBeenCalledWith(
      'kernel',
      'listInstalledExtensions',
      {},
      { callerExtId: 'com.nuxy.ipc-explorer' }
    )
    expect(controller.state.invokeError).toBe('')
  })

  it('denies invoking a private channel on another extension and never calls the bridge', async () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'com.nuxy.qbittorrent',
          manifest: { name: 'qBittorrent', capabilities: { callable: true } },
          runtime: {
            ipcChannels: ['add', 'getStatus', 'list'],
            publicIpcChannels: ['add', 'getStatus'],
            privateIpcChannels: ['list'],
          },
        },
      ],
    })

    const controller = new IpcExplorerController(() => {})
    await controller.refreshTargets()
    controller.selectExtension('com.nuxy.qbittorrent')
    controller.selectChannelIndex(
      controller.flatChannelsForTarget.findIndex((c) => c.channel === 'list'),
      'channels'
    )

    expect(controller.canInvokeSelected).toBe(false)

    vi.mocked(window.core.ipc.invoke).mockClear()
    await controller.invokeSelected()

    expect(window.core.ipc.invoke).not.toHaveBeenCalled()
    expect(controller.state.invokeError).toContain('not public')
  })

  it('allows invoking a public channel on a callable extension', async () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'com.nuxy.qbittorrent',
          manifest: { name: 'qBittorrent', capabilities: { callable: true } },
          runtime: {
            ipcChannels: ['add', 'getStatus', 'list'],
            publicIpcChannels: ['add', 'getStatus'],
            privateIpcChannels: ['list'],
          },
        },
      ],
    })

    const controller = new IpcExplorerController(() => {})
    await controller.refreshTargets()
    controller.selectExtension('com.nuxy.qbittorrent')
    controller.selectChannelIndex(
      controller.flatChannelsForTarget.findIndex((c) => c.channel === 'getStatus'),
      'channels'
    )

    expect(controller.canInvokeSelected).toBe(true)
    await controller.invokeSelected()

    expect(window.core.ipc.invoke).toHaveBeenCalledWith(
      'com.nuxy.qbittorrent',
      'getStatus',
      {},
      { callerExtId: 'com.nuxy.ipc-explorer' }
    )
  })

  it('prefills payload textarea from manifest ipc.samples when selecting a channel', async () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'com.nuxy.qbittorrent',
          manifest: {
            name: 'qBittorrent',
            capabilities: { callable: true },
            ipc: {
              samples: {
                getStatus: {},
                add: { url: 'magnet:?xt=sample' },
              },
            },
          },
          runtime: {
            ipcChannels: ['add', 'getStatus'],
            publicIpcChannels: ['add', 'getStatus'],
            privateIpcChannels: [],
          },
        },
      ],
    })

    const controller = new IpcExplorerController(() => {})
    await controller.refreshTargets()
    controller.selectExtension('com.nuxy.qbittorrent')
    controller.selectChannelIndex(
      controller.flatChannelsForTarget.findIndex((c) => c.channel === 'add'),
      'channels'
    )

    expect(controller.state.payloadText).toBe('{\n  "url": "magnet:?xt=sample"\n}')
  })

  it('navigates channels with arrow key actions in the channels panel', async () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({ success: true, data: [] })

    const controller = new IpcExplorerController(() => {})
    await controller.refreshTargets()
    controller.focusChannels()

    const channels = controller.flatChannelsForTarget
    expect(channels.length).toBeGreaterThan(1)

    const startChannel = controller.state.selectedChannel
    fireAction(controller, 'ArrowDown')
    expect(controller.state.selectedChannel).not.toBe(startChannel)

    fireAction(controller, 'ArrowUp')
    expect(controller.state.selectedChannel).toBe(startChannel)
  })

  it('invokes the selected channel on Enter in the channels panel', async () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({ success: true, data: [] })

    const controller = new IpcExplorerController(() => {})
    await controller.refreshTargets()
    controller.focusChannels()

    fireAction(controller, 'Enter')

    expect(window.core.ipc.invoke).toHaveBeenCalledWith(
      'kernel',
      controller.state.selectedChannel,
      {},
      { callerExtId: 'com.nuxy.ipc-explorer' }
    )
  })

  it('moves focus between panels with horizontal arrows', async () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({ success: true, data: [] })

    const controller = new IpcExplorerController(() => {})
    await controller.refreshTargets()

    controller.focusChannels()
    fireAction(controller, 'ArrowLeft')
    expect(controller.state.focusArea).toBe('targets')

    fireAction(controller, 'ArrowRight')
    expect(controller.state.focusArea).toBe('channels')

    fireAction(controller, 'ArrowRight')
    expect(controller.state.focusArea).toBe('payload')
  })

  it('exposes invoke and refresh as shell actions', async () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({ success: true, data: [] })

    const controller = new IpcExplorerController(() => {})
    await controller.refreshTargets()
    controller.focusChannels()

    const actions = controller.getKeyActions()
    const invoke = actions.find((action) => action.id === 'ipc-explorer-invoke')
    const refresh = actions.find((action) => action.id === 'ipc-explorer-refresh')

    expect(invoke).toMatchObject({
      key: 'Enter',
      section: 'actions',
      showInMenu: true,
      hint: '↵',
    })
    expect(refresh).toMatchObject({
      key: 'r',
      modifiers: ['ctrl'],
      section: 'actions',
      showInMenu: true,
      hint: '⌃R',
    })
  })

  it('uses Ctrl+Enter to invoke from the payload panel', async () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({ success: true, data: [] })

    const controller = new IpcExplorerController(() => {})
    await controller.refreshTargets()
    controller.focusPayload()

    fireAction(controller, 'Enter', ['ctrl'])

    expect(window.core.ipc.invoke).toHaveBeenCalledWith(
      'kernel',
      controller.state.selectedChannel,
      {},
      { callerExtId: 'com.nuxy.ipc-explorer' }
    )
  })

  it('returns to the channels panel when leaving payload', async () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({ success: true, data: [] })

    const controller = new IpcExplorerController(() => {})
    await controller.refreshTargets()
    controller.focusPayload()

    controller.leavePayloadPanel()

    expect(controller.state.focusArea).toBe('channels')
  })

  it('shows invoke response in the payload panel and restores request JSON on Escape', async () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({
      success: true,
      data: { ok: true },
    })

    const controller = new IpcExplorerController(() => {})
    await controller.refreshTargets()
    controller.setPayloadText('{\n  "query": "test"\n}')
    controller.focusChannels()

    await controller.invokeSelected()

    expect(controller.state.payloadView).toBe('response')
    expect(controller.state.resultText).toBe(
      '{\n  "success": true,\n  "data": {\n    "ok": true\n  }\n}'
    )
    expect(controller.state.payloadText).toBe('{\n  "query": "test"\n}')
    expect(controller.state.focusArea).toBe('payload')

    fireAction(controller, 'Escape')
    expect(controller.state.payloadView).toBe('request')
    expect(controller.state.focusArea).toBe('payload')

    fireAction(controller, 'Escape')
    expect(controller.state.focusArea).toBe('channels')
  })
})

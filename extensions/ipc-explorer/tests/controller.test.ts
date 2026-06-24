import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDomGlobals } from '@nuxyorg/extension-sdk/testing'
import { IpcExplorerController } from '../controller.ts'

setupDomGlobals({
  ipc: { invoke: vi.fn() },
})

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
    expect(controller.state.selectedChannel).toBe('listInstalledExtensions')
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
    controller.selectChannel('listInstalledExtensions')

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
    controller.selectChannel('list')

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
    controller.selectChannel('getStatus')

    expect(controller.canInvokeSelected).toBe(true)
    await controller.invokeSelected()

    expect(window.core.ipc.invoke).toHaveBeenCalledWith(
      'com.nuxy.qbittorrent',
      'getStatus',
      {},
      { callerExtId: 'com.nuxy.ipc-explorer' }
    )
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDomGlobals } from '@nuxyorg/extension-sdk/testing'
import { invoke } from '../utils/ipc.ts'

setupDomGlobals({
  ipc: { invoke: vi.fn() },
})

describe('invoke', () => {
  beforeEach(() => {
    vi.mocked(window.core!.ipc!.invoke).mockReset()
  })

  it('calls window.core.ipc.invoke with the qbittorrent extension id', async () => {
    vi.mocked(window.core!.ipc!.invoke).mockResolvedValue({ success: true, data: ['a'] })

    const result = await invoke<string[]>('list')

    expect(window.core!.ipc!.invoke).toHaveBeenCalledWith(
      'com.nuxy.qbittorrent',
      'list',
      undefined,
      {
        callerExtId: 'com.nuxy.qbittorrent',
      }
    )
    expect(result).toEqual(['a'])
  })

  it('forwards the payload to ipc.invoke', async () => {
    vi.mocked(window.core!.ipc!.invoke).mockResolvedValue({ success: true, data: undefined })

    await invoke('add', { url: 'magnet:?xt=urn:btih:abc' })

    expect(window.core!.ipc!.invoke).toHaveBeenCalledWith(
      'com.nuxy.qbittorrent',
      'add',
      { url: 'magnet:?xt=urn:btih:abc' },
      { callerExtId: 'com.nuxy.qbittorrent' }
    )
  })

  it('throws with the server error message when success is false', async () => {
    vi.mocked(window.core!.ipc!.invoke).mockResolvedValue({
      success: false,
      error: 'Invalid qBittorrent username or password',
    })

    await expect(invoke('list')).rejects.toThrow('Invalid qBittorrent username or password')
  })

  it('throws a generic message when the response is null', async () => {
    vi.mocked(window.core!.ipc!.invoke).mockResolvedValue(null)

    await expect(invoke('list')).rejects.toThrow('IPC call failed')
  })
})

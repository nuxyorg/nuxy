import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDomGlobals } from '@nuxyorg/extension-sdk/testing'
import {
  handoffTorrent,
  handoffTorrents,
  downloadTorrentViaSystem,
} from '../utils/torrent-handoff.ts'

const dispatch = vi.fn()

setupDomGlobals({
  ipc: { invoke: vi.fn() },
  deeplink: { dispatch },
})

const QBIT_ID = 'com.nuxy.qbittorrent'
const NYAA_ID = 'com.nuxy.nyaa'
const MAGNET = 'magnet:?xt=urn:btih:abc'

describe('handoffTorrent', () => {
  beforeEach(() => {
    vi.mocked(window.core.ipc.invoke).mockReset()
    dispatch.mockReset()
  })

  it('checks getStatus and dispatches deeplink when qBittorrent is ready', async () => {
    vi.mocked(window.core.ipc.invoke).mockImplementation(async (extId, channel) => {
      if (extId === QBIT_ID && channel === 'getStatus') {
        return { success: true, data: { state: 'ready', host: 'http://localhost:8080' } }
      }
      return { success: false, error: 'unexpected' }
    })
    dispatch.mockResolvedValue({ ok: true })

    const result = await handoffTorrent('123', MAGNET)

    expect(result).toEqual({ ok: true, via: 'torrent-client' })
    expect(window.core.ipc.invoke).toHaveBeenCalledWith(
      QBIT_ID,
      'getStatus',
      {},
      { callerExtId: NYAA_ID }
    )
    expect(dispatch).toHaveBeenCalledWith(
      `nuxy://qbittorrent/add?url=${encodeURIComponent(MAGNET)}`
    )
  })

  it('returns failure when qBittorrent is not ready', async () => {
    vi.mocked(window.core.ipc.invoke).mockImplementation(async (extId, channel) => {
      if (extId === QBIT_ID && channel === 'getStatus') {
        return {
          success: true,
          data: { state: 'unreachable', message: 'fetch failed' },
        }
      }
      return { success: false, error: 'unexpected' }
    })

    const result = await handoffTorrent('123', MAGNET)

    expect(result).toEqual({
      ok: false,
      error: 'Torrent client is not ready',
      via: 'torrent-client',
    })
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('returns failure when deeplink dispatch fails', async () => {
    vi.mocked(window.core.ipc.invoke).mockImplementation(async (extId, channel) => {
      if (extId === QBIT_ID && channel === 'getStatus') {
        return { success: true, data: { state: 'ready' } }
      }
      return { success: false, error: 'unexpected' }
    })
    dispatch.mockResolvedValue({ ok: false, error: 'unknown-extension' })

    const result = await handoffTorrent('123', MAGNET)

    expect(result).toEqual({
      ok: false,
      error: 'unknown-extension',
      via: 'torrent-client',
    })
    expect(dispatch).toHaveBeenCalledOnce()
  })
})

describe('downloadTorrentViaSystem', () => {
  beforeEach(() => {
    vi.mocked(window.core.ipc.invoke).mockReset()
  })

  it('opens torrent download via nyaa backend IPC', async () => {
    vi.mocked(window.core.ipc.invoke).mockResolvedValue({ success: true })

    const result = await downloadTorrentViaSystem('123')

    expect(result).toEqual({ ok: true, via: 'system' })
    expect(window.core.ipc.invoke).toHaveBeenCalledWith(
      NYAA_ID,
      'downloadTorrent',
      { id: '123' },
      { callerExtId: NYAA_ID }
    )
  })
})

describe('handoffTorrents', () => {
  beforeEach(() => {
    vi.mocked(window.core.ipc.invoke).mockReset()
    dispatch.mockReset()
  })

  it('downloads all via system when qBittorrent is not ready', async () => {
    vi.mocked(window.core.ipc.invoke).mockImplementation(async (extId, channel) => {
      if (extId === QBIT_ID && channel === 'getStatus') {
        return { success: true, data: { state: 'unreachable', message: 'fetch failed' } }
      }
      if (extId === NYAA_ID && channel === 'downloadTorrents') {
        return { success: true }
      }
      return { success: false, error: 'unexpected' }
    })

    const result = await handoffTorrents([
      { id: '1', url: 'magnet:one' },
      { id: '2', url: 'magnet:two' },
    ])

    expect(result).toEqual({ ok: true, via: 'system' })
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('deeplinks the first torrent and adds the rest via IPC when qBittorrent is ready', async () => {
    vi.mocked(window.core.ipc.invoke).mockImplementation(async (extId, channel) => {
      if (extId === QBIT_ID && channel === 'getStatus') {
        return { success: true, data: { state: 'ready' } }
      }
      if (extId === QBIT_ID && channel === 'add') {
        return { success: true }
      }
      return { success: false, error: 'unexpected' }
    })
    dispatch.mockResolvedValue({ ok: true })

    const result = await handoffTorrents([
      { id: '1', url: 'magnet:one' },
      { id: '2', url: 'magnet:two' },
    ])

    expect(result).toEqual({ ok: true, via: 'torrent-client' })
    expect(dispatch).toHaveBeenCalledOnce()
    expect(window.core.ipc.invoke).toHaveBeenCalledWith(
      QBIT_ID,
      'add',
      { url: 'magnet:two' },
      { callerExtId: NYAA_ID }
    )
  })
})

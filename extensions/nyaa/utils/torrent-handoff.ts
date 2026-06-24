import type { TorrentClientStatus } from './resolve-ready-client.ts'

export interface TorrentHandoffResult {
  ok: true
  via: 'torrent-client' | 'system'
}

export interface TorrentHandoffFailure {
  ok: false
  error: string
  via?: 'torrent-client' | 'system'
}

export type TorrentHandoffOutcome = TorrentHandoffResult | TorrentHandoffFailure

const CALLER_EXT_ID = 'com.nuxy.nyaa'
const TORRENT_CLIENT_EXT_ID = 'com.nuxy.qbittorrent'
const TORRENT_CLIENT_DEEPLINK_HOST = 'qbittorrent'

function buildAddDeeplink(url: string): string {
  return `nuxy://${TORRENT_CLIENT_DEEPLINK_HOST}/add?url=${encodeURIComponent(url)}`
}

async function ipcInvoke<T>(
  extId: string,
  channel: string,
  payload?: unknown
): Promise<{ success: boolean; data?: T; error?: string }> {
  const res = (await window.core.ipc.invoke(extId, channel, payload, {
    callerExtId: CALLER_EXT_ID,
  })) as {
    success: boolean
    data?: T
    error?: string
  } | null
  return res ?? { success: false, error: 'IPC call failed' }
}

async function openViaSystem(id: string): Promise<TorrentHandoffOutcome> {
  const res = await ipcInvoke('com.nuxy.nyaa', 'downloadTorrent', { id })
  if (!res.success) {
    return { ok: false, error: res.error ?? 'Failed to open torrent download', via: 'system' }
  }
  return { ok: true, via: 'system' }
}

async function openManyViaSystem(ids: string[]): Promise<TorrentHandoffOutcome> {
  const res = await ipcInvoke('com.nuxy.nyaa', 'downloadTorrents', { ids })
  if (!res.success) {
    return { ok: false, error: res.error ?? 'Failed to open torrent downloads', via: 'system' }
  }
  return { ok: true, via: 'system' }
}

export async function isTorrentClientReady(): Promise<boolean> {
  const statusRes = await ipcInvoke<TorrentClientStatus>(TORRENT_CLIENT_EXT_ID, 'getStatus', {})
  if (!statusRes.success) return false
  return statusRes.data?.state === 'ready'
}

async function addViaTorrentClientBackend(url: string): Promise<TorrentHandoffOutcome> {
  const addRes = await ipcInvoke(TORRENT_CLIENT_EXT_ID, 'add', { url })
  if (!addRes.success) {
    return {
      ok: false,
      error: addRes.error ?? 'Failed to add torrent',
      via: 'torrent-client',
    }
  }
  return { ok: true, via: 'torrent-client' }
}

async function addViaTorrentClientDeeplink(url: string): Promise<TorrentHandoffOutcome> {
  const dispatch = window.core?.deeplink?.dispatch
  if (!dispatch) {
    return {
      ok: false,
      error: 'Deeplink dispatch is unavailable',
      via: 'torrent-client',
    }
  }

  const result = await dispatch(buildAddDeeplink(url))
  if (!result.ok) {
    return {
      ok: false,
      error: result.error ?? 'Failed to open torrent client',
      via: 'torrent-client',
    }
  }

  return { ok: true, via: 'torrent-client' }
}

export async function handoffTorrent(id: string, url: string): Promise<TorrentHandoffOutcome> {
  if (!(await isTorrentClientReady())) {
    return {
      ok: false,
      error: 'Torrent client is not ready',
      via: 'torrent-client',
    }
  }

  const result = await addViaTorrentClientDeeplink(url)
  if (result.ok) return result

  return {
    ok: false,
    error: result.error ?? 'Failed to open torrent client',
    via: 'torrent-client',
  }
}

export async function handoffTorrents(
  items: Array<{ id: string; url: string }>
): Promise<TorrentHandoffOutcome> {
  if (items.length === 0) return { ok: true, via: 'system' }

  if (!(await isTorrentClientReady())) {
    return openManyViaSystem(items.map((i) => i.id))
  }

  for (let i = 0; i < items.length; i++) {
    const result =
      i === 0
        ? await addViaTorrentClientDeeplink(items[i]!.url)
        : await addViaTorrentClientBackend(items[i]!.url)
    if (!result.ok) {
      return openManyViaSystem(items.map((item) => item.id))
    }
  }

  return { ok: true, via: 'torrent-client' }
}

export async function downloadTorrentViaSystem(id: string): Promise<TorrentHandoffOutcome> {
  return openViaSystem(id)
}

export async function downloadTorrentsViaSystem(ids: string[]): Promise<TorrentHandoffOutcome> {
  return openManyViaSystem(ids)
}

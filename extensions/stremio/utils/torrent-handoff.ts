export interface HandoffOutcome {
  ok: boolean
  error?: string
}

const CALLER_EXT_ID = 'com.nuxy.stremio'
const TORRENT_CLIENT_EXT_ID = 'com.nuxy.qbittorrent'
const TORRENT_CLIENT_DEEPLINK_HOST = 'qbittorrent'

interface TorrentClientStatus {
  state: string
  message?: string
}

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
  })) as { success: boolean; data?: T; error?: string } | null
  return res ?? { success: false, error: 'IPC call failed' }
}

export async function isTorrentClientReady(): Promise<boolean> {
  const res = await ipcInvoke<TorrentClientStatus>(TORRENT_CLIENT_EXT_ID, 'getStatus', {})
  if (!res.success) return false
  return res.data?.state === 'ready'
}

/** Hand a magnet to the torrent client via its deeplink scheme. */
export async function handoffMagnet(magnet: string): Promise<HandoffOutcome> {
  if (!(await isTorrentClientReady())) {
    return { ok: false, error: 'Torrent client is not ready' }
  }

  const dispatch = window.core?.deeplink?.dispatch
  if (!dispatch) return { ok: false, error: 'Deeplink dispatch is unavailable' }

  const result = await dispatch(buildAddDeeplink(magnet))
  if (!result.ok) return { ok: false, error: result.error ?? 'Failed to open torrent client' }
  return { ok: true }
}

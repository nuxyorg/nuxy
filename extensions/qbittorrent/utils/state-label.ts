/** Canonical qBittorrent API states, matching the `state.*` keys in locales/en.json. */
const KNOWN_STATES = [
  'downloading',
  'uploading',
  'pausedDL',
  'pausedUP',
  'stoppedDL',
  'stoppedUP',
  'queuedDL',
  'queuedUP',
  'stalledDL',
  'stalledUP',
  'checkingDL',
  'checkingUP',
  'checkingResumeData',
  'forcedDL',
  'forcedUP',
  'error',
  'missingFiles',
  'allocating',
  'metaDL',
  'moving',
  'unknown',
] as const

const LOOKUP = new Map(KNOWN_STATES.map((state) => [state.toLowerCase(), state]))

/** Maps a raw qBittorrent API state to its canonical `state.*` locale key, case-insensitively. */
export function normalizeTorrentState(state: string): string {
  return LOOKUP.get(state.toLowerCase()) ?? 'unknown'
}

const PAUSED_OR_STOPPED = new Set(['pauseddl', 'pausedup', 'stoppeddl', 'stoppedup'])

/** True when download is finished (100%) and the torrent is paused or stopped. */
export function isCompletedTorrent(torrent: { progress: number; state: string }): boolean {
  if (Math.round(torrent.progress * 100) < 100) return false
  return PAUSED_OR_STOPPED.has(torrent.state.toLowerCase())
}

/** Locale key for list status: `completed` overrides paused/stopped at 100%. */
export function resolveDisplayState(torrent: { progress: number; state: string }): string {
  if (isCompletedTorrent(torrent)) return 'completed'
  return normalizeTorrentState(torrent.state)
}

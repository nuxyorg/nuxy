import type { InstalledExtensionEntry } from './torrent-target.ts'
import { handoffTargetName, listAddHandoffCandidates } from './torrent-target.ts'

export interface ReadyTorrentClient {
  targetId: string
  name: string
}

export interface TorrentClientStatus {
  state: string
  message?: string
}

/** Worker broker wraps kernel channels as `{ success, data: { success, data: entries } }`. */
export function parseInstalledExtensions(data: unknown): InstalledExtensionEntry[] {
  if (Array.isArray(data)) return data as InstalledExtensionEntry[]
  if (data && typeof data === 'object' && 'data' in data) {
    const nested = (data as { data?: unknown }).data
    if (Array.isArray(nested)) return nested as InstalledExtensionEntry[]
  }
  return []
}

export async function resolveReadyTorrentClientFromEntries(
  entries: InstalledExtensionEntry[],
  probeStatus: (targetId: string) => Promise<TorrentClientStatus | null>
): Promise<ReadyTorrentClient | null> {
  const ready: ReadyTorrentClient[] = []

  for (const ext of listAddHandoffCandidates(entries)) {
    const targetId = ext.manifest.id
    const status = await probeStatus(targetId)
    if (status?.state === 'ready') {
      ready.push({ targetId, name: handoffTargetName(entries, targetId) })
    }
  }

  if (ready.length === 1) return ready[0]!
  return null
}

export interface InstalledExtensionEntry {
  id: string
  disabled?: boolean
  manifest: {
    id: string
    name?: string
    deeplinks?: { schemes?: string[] }
  }
}

const ADD_SCHEME = 'add'

export function listAddHandoffCandidates(
  entries: InstalledExtensionEntry[]
): InstalledExtensionEntry[] {
  return entries.filter(
    (ext) => !ext.disabled && ext.manifest.deeplinks?.schemes?.includes(ADD_SCHEME)
  )
}

/** @deprecated Prefer resolveReadyTorrentClient — kept for tests expecting single-candidate logic. */
export function findAddHandoffTarget(entries: InstalledExtensionEntry[]): string | null {
  const candidates = listAddHandoffCandidates(entries)
  if (candidates.length !== 1) return null
  return candidates[0]!.manifest.id
}

export function handoffTargetName(entries: InstalledExtensionEntry[], targetId: string): string {
  const ext = entries.find((e) => e.manifest.id === targetId)
  return ext?.manifest.name?.trim() || 'Torrent client'
}

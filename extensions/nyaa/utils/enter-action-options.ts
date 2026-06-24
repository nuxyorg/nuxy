export const ENTER_ACTION_COPY = 'copyMagnet'
export const ENTER_ACTION_DOWNLOAD = 'downloadTorrent'
export const ENTER_ACTION_TORRENT_CLIENT = 'torrentClient'

export type EnterAction =
  | typeof ENTER_ACTION_COPY
  | typeof ENTER_ACTION_DOWNLOAD
  | typeof ENTER_ACTION_TORRENT_CLIENT

export interface EnterActionOption {
  value: EnterAction
  label: string
}

/** Static labels from `settings.json` — kept in sync with schema option labels. */
export const STATIC_ENTER_ACTION_OPTIONS: EnterActionOption[] = [
  { value: ENTER_ACTION_COPY, label: 'Copy Magnet Link' },
  { value: ENTER_ACTION_DOWNLOAD, label: 'Save Torrent File' },
  { value: ENTER_ACTION_TORRENT_CLIENT, label: 'Add via qBittorrent' },
]

export function isEnterAction(value: unknown): value is EnterAction {
  return (
    value === ENTER_ACTION_COPY ||
    value === ENTER_ACTION_DOWNLOAD ||
    value === ENTER_ACTION_TORRENT_CLIENT
  )
}

export function normalizeEnterAction(
  saved: unknown,
  available: EnterActionOption[] = STATIC_ENTER_ACTION_OPTIONS
): EnterAction {
  const allowed = new Set(available.map((o) => o.value))
  if (isEnterAction(saved) && allowed.has(saved)) return saved
  return ENTER_ACTION_COPY
}

export function enterActionLabel(action: EnterAction, t: (key: string) => string): string {
  if (action === ENTER_ACTION_COPY) return t('actions.copyMagnet')
  if (action === ENTER_ACTION_DOWNLOAD) return t('actions.downloadTorrent')
  return STATIC_ENTER_ACTION_OPTIONS.find((o) => o.value === action)?.label ?? action
}

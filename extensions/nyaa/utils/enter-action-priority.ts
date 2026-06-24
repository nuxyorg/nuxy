import {
  ENTER_ACTION_COPY,
  ENTER_ACTION_DOWNLOAD,
  ENTER_ACTION_TORRENT_CLIENT,
  isEnterAction,
  normalizeEnterAction,
  type EnterAction,
} from './enter-action-options.ts'

export const DEFAULT_ENTER_ACTION_PRIORITY: EnterAction[] = [
  ENTER_ACTION_TORRENT_CLIENT,
  ENTER_ACTION_COPY,
  ENTER_ACTION_DOWNLOAD,
]

export interface LegacyEnterSettings {
  enterAction?: unknown
  useQbittorrent?: unknown
}

function parsePriorityArray(raw: unknown): EnterAction[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<EnterAction>()
  const result: EnterAction[] = []
  for (const item of raw) {
    if (!isEnterAction(item) || seen.has(item)) continue
    seen.add(item)
    result.push(item)
  }
  return result
}

function fillMissingActions(partial: EnterAction[]): EnterAction[] {
  const result = [...partial]
  for (const action of DEFAULT_ENTER_ACTION_PRIORITY) {
    if (!result.includes(action)) result.push(action)
  }
  return result
}

function migrateLegacyPriority(legacy?: LegacyEnterSettings): EnterAction[] {
  const enterAction = normalizeEnterAction(legacy?.enterAction)
  const useQbittorrent = legacy?.useQbittorrent !== false

  if (enterAction === ENTER_ACTION_TORRENT_CLIENT) {
    return [...DEFAULT_ENTER_ACTION_PRIORITY]
  }

  if (enterAction === ENTER_ACTION_COPY) {
    return useQbittorrent
      ? [...DEFAULT_ENTER_ACTION_PRIORITY]
      : [ENTER_ACTION_COPY, ENTER_ACTION_DOWNLOAD, ENTER_ACTION_TORRENT_CLIENT]
  }

  return useQbittorrent
    ? [ENTER_ACTION_TORRENT_CLIENT, ENTER_ACTION_DOWNLOAD, ENTER_ACTION_COPY]
    : [ENTER_ACTION_DOWNLOAD, ENTER_ACTION_COPY, ENTER_ACTION_TORRENT_CLIENT]
}

export function normalizeEnterActionPriority(
  raw: unknown,
  legacy?: LegacyEnterSettings
): EnterAction[] {
  const parsed = parsePriorityArray(raw)
  if (parsed.length > 0) return fillMissingActions(parsed)
  return migrateLegacyPriority(legacy)
}

export interface EffectiveEnterActions {
  enter: EnterAction
  shiftEnter: EnterAction | null
}

export function resolveEffectiveActions(
  priority: EnterAction[],
  torrentClientReady: boolean
): EffectiveEnterActions {
  const available = priority.filter(
    (action) => action !== ENTER_ACTION_TORRENT_CLIENT || torrentClientReady
  )

  const enter = available[0] ?? ENTER_ACTION_COPY
  const shiftEnter = available[1] ?? null

  return { enter, shiftEnter }
}

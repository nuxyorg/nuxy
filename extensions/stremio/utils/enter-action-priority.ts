import {
  ENTER_ACTION_TORRENT_CLIENT,
  ENTER_ACTION_COPY_MAGNET,
  ENTER_ACTION_PLAY,
  ENTER_ACTION_COPY_LINK,
  actionAppliesTo,
  isEnterAction,
  type EnterAction,
} from './enter-action-options.ts'
import type { StreamKind } from '../types.ts'

export const DEFAULT_ENTER_ACTION_PRIORITY: EnterAction[] = [
  ENTER_ACTION_TORRENT_CLIENT,
  ENTER_ACTION_PLAY,
  ENTER_ACTION_COPY_MAGNET,
  ENTER_ACTION_COPY_LINK,
]

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

export function normalizeEnterActionPriority(raw: unknown): EnterAction[] {
  const parsed = parsePriorityArray(raw)
  if (parsed.length > 0) return fillMissingActions(parsed)
  return [...DEFAULT_ENTER_ACTION_PRIORITY]
}

export interface EffectiveEnterActions {
  enter: EnterAction | null
  shiftEnter: EnterAction | null
}

export interface StreamActionContext {
  kind: StreamKind
  torrentClientReady: boolean
}

export function resolveEffectiveActions(
  priority: EnterAction[],
  ctx: StreamActionContext
): EffectiveEnterActions {
  const available = priority.filter((action) => {
    if (!actionAppliesTo(action, ctx.kind)) return false
    if (action === ENTER_ACTION_TORRENT_CLIENT && !ctx.torrentClientReady) return false
    return true
  })

  return { enter: available[0] ?? null, shiftEnter: available[1] ?? null }
}

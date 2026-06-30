import type { StreamKind } from '../types.ts'

export const ENTER_ACTION_TORRENT_CLIENT = 'torrentClient'
export const ENTER_ACTION_COPY_MAGNET = 'copyMagnet'
export const ENTER_ACTION_PLAY = 'playStream'
export const ENTER_ACTION_COPY_LINK = 'copyLink'

export type EnterAction =
  | typeof ENTER_ACTION_TORRENT_CLIENT
  | typeof ENTER_ACTION_COPY_MAGNET
  | typeof ENTER_ACTION_PLAY
  | typeof ENTER_ACTION_COPY_LINK

const ALL_ACTIONS: EnterAction[] = [
  ENTER_ACTION_TORRENT_CLIENT,
  ENTER_ACTION_COPY_MAGNET,
  ENTER_ACTION_PLAY,
  ENTER_ACTION_COPY_LINK,
]

/** Which stream kind each action applies to. */
const ACTION_KIND: Record<EnterAction, StreamKind> = {
  [ENTER_ACTION_TORRENT_CLIENT]: 'torrent',
  [ENTER_ACTION_COPY_MAGNET]: 'torrent',
  [ENTER_ACTION_PLAY]: 'debrid',
  [ENTER_ACTION_COPY_LINK]: 'debrid',
}

export function isEnterAction(value: unknown): value is EnterAction {
  return typeof value === 'string' && (ALL_ACTIONS as string[]).includes(value)
}

export function actionAppliesTo(action: EnterAction, kind: StreamKind): boolean {
  return ACTION_KIND[action] === kind
}

/** i18n label key for an action, consumed by the frontend translator. */
export function enterActionLabelKey(action: EnterAction): string {
  return `actions.${action}`
}

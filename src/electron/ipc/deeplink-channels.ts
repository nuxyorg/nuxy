import { ipcMain } from 'electron'
import { DEEPLINK_DISPATCH_CHANNEL } from '@nuxyorg/core'
import { handleDeeplinkUrl, type DeeplinkDispatchResult } from '../deeplink/dispatch.js'

/**
 * Lets the renderer self-trigger the same dispatch path used for
 * OS-delivered/cold-start/control-socket deeplinks (`handleDeeplinkUrl`),
 * without duplicating URL-parsing or routing logic. Used by the Ctrl+K
 * command palette's `caller.commands` entries, which resolve to a
 * `nuxy://...` URL string that needs to land on the exact same
 * `deeplink:open` push the renderer's `DeeplinkController` already handles.
 */
export function registerDeeplinkChannels(): void {
  ipcMain.handle(DEEPLINK_DISPATCH_CHANNEL, (_event, raw: unknown): DeeplinkDispatchResult => {
    if (typeof raw !== 'string') {
      return { ok: false, error: 'invalid-url' }
    }
    return handleDeeplinkUrl(raw)
  })
}

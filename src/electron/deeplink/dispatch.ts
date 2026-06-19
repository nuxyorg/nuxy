import { DEEPLINK_OPEN_CHANNEL, kernelLogger, type DeeplinkPayload } from '@nuxyorg/core'
import { parseDeeplinkUrl } from './parse.js'
import { getExtensionById, resolveExtensionId } from '../extensions/registry.js'
import { getMainWindow } from '../window/manager.js'

const log = kernelLogger.child('Deeplink')

export type DeeplinkDispatchResult =
  | { ok: true }
  | { ok: false; error: 'invalid-url' | 'unknown-extension' | 'no-window' }

/**
 * Parses a raw `nuxy://...` URL, resolves the extension id against the live
 * extension registry, and — if a main window exists — shows/focuses it and
 * sends a `deeplink:open` IPC event with the resolved `DeeplinkPayload`.
 *
 * Called from: `open-url` (macOS), `second-instance` argv parsing
 * (Linux/Windows), and the `/tmp/nuxy.sock` control socket (`--open` command).
 */
export function handleDeeplinkUrl(raw: string): DeeplinkDispatchResult {
  const parsed = parseDeeplinkUrl(raw)
  if (!parsed) {
    log.warn(`Failed to parse deeplink URL: ${raw}`)
    return { ok: false, error: 'invalid-url' }
  }

  const resolvedId = resolveExtensionId(parsed.extensionId)
  const ext = resolvedId ? getExtensionById(resolvedId) : undefined
  if (!resolvedId || !ext) {
    log.warn(`Deeplink targets unknown extension: ${parsed.extensionId}`)
    return { ok: false, error: 'unknown-extension' }
  }

  const win = getMainWindow()
  if (!win || win.isDestroyed()) {
    log.warn(`No main window available to dispatch deeplink: ${raw}`)
    return { ok: false, error: 'no-window' }
  }

  const payload: DeeplinkPayload = {
    extensionId: ext.id,
    path: parsed.path,
    query: parsed.query,
  }

  const wasVisible = win.isVisible()
  if (!wasVisible) {
    win.show()
  }
  if (win.isMinimized()) win.restore()
  win.focus()

  log.info(`Dispatching deeplink to extension "${ext.id}"`, payload)
  win.webContents.send(DEEPLINK_OPEN_CHANNEL, payload)

  return { ok: true }
}

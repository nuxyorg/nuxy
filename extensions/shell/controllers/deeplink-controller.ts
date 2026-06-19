import type { DeeplinkPayload } from '@nuxyorg/core'
import type { Tool } from '../types.ts'

export interface DeeplinkControllerCallbacks {
  /** Activates (mounting if needed) the target tool and forwards the query string. */
  openTool: (toolId: string, initialQuery: string) => void
  getTools: () => Tool[]
}

/** Reconstructs the deeplink's path+query suffix as a single string, e.g. "add?url=...". */
function encodePathAndQuery(path: string, query: Record<string, string>): string {
  const entries = Object.entries(query)
  if (entries.length === 0) return path
  const search = new URLSearchParams(entries).toString()
  return `${path}?${search}`
}

/**
 * How long to pause shell-reset after applying a deeplink. The reset this
 * guards against is triggered asynchronously (an IPC round trip in
 * src/renderer/bootstrap.ts's onShow handler), so this only needs to outlast
 * that round trip — it is not a visible delay to the user.
 */
const SHELL_RESET_PAUSE_MS = 1000

/**
 * Listens for `deeplink:open` (pushed by the main process via
 * `window.core.deeplink.onOpen`) and activates the target tool, forwarding
 * `path`/`query` to it as a `committedQuery`-like string via `openTool`.
 *
 * Unknown extension ids (not in the live tools list) are silently ignored —
 * the kernel already validated the id against the extension registry before
 * dispatching, so this is a defense-in-depth check against stale renderer
 * tool lists.
 */
export class DeeplinkController {
  private unbind: (() => void) | null = null

  constructor(private readonly callbacks: DeeplinkControllerCallbacks) {}

  bind(): void {
    const onOpen = window.core?.deeplink?.onOpen
    if (!onOpen) return
    this.unbind = onOpen((payload: DeeplinkPayload) => this.handleOpen(payload))
  }

  destroy(): void {
    this.unbind?.()
    this.unbind = null
  }

  private handleOpen(payload: DeeplinkPayload): void {
    const known = this.callbacks.getTools().some((t) => t.id === payload.extensionId)
    if (!known) return

    // The main process may show/focus the window as part of dispatching this
    // deeplink (src/electron/deeplink/dispatch.ts). That triggers the
    // renderer's "fresh start on show" shell-reset (src/renderer/bootstrap.ts),
    // which resolves asynchronously — late enough to land after openTool
    // below and wipe the tool we just activated. Pause shell-reset across
    // that window, the same flag suppressBlurHide-style tools already rely on.
    window.core?.shell?.setShellResetPaused?.(true)
    this.callbacks.openTool(payload.extensionId, encodePathAndQuery(payload.path, payload.query))
    setTimeout(() => window.core?.shell?.setShellResetPaused?.(false), SHELL_RESET_PAUSE_MS)
  }
}

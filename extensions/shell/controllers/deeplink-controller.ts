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
    this.callbacks.openTool(payload.extensionId, encodePathAndQuery(payload.path, payload.query))
  }
}

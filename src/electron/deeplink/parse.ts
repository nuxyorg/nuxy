import type { ParsedDeeplink } from '@nuxyorg/core'

const SCHEME = 'nuxy:'

/**
 * Parses a raw `nuxy://<extension-id>/<path>?<query>` URL string into its
 * constituent parts. Does not validate the extension id against any
 * registry — see `resolveDeeplinkTarget` in `dispatch.ts` for that.
 *
 * Returns `null` for malformed URLs, non-`nuxy:` schemes, or a missing
 * extension id (empty host segment).
 */
export function parseDeeplinkUrl(raw: string): ParsedDeeplink | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  if (url.protocol !== SCHEME) return null

  const extensionId = url.hostname.toLowerCase()
  if (!extensionId) return null

  const path = url.pathname.replace(/^\/+/, '').replace(/\/+$/, '')

  const query: Record<string, string> = {}
  for (const [key, value] of url.searchParams.entries()) {
    query[key] = value
  }

  return { extensionId, path, query }
}

export interface AddDeeplinkResult {
  url: string
  fileName?: string
}

/**
 * Parses the `committedQuery` forwarded by `nuxy-tool-host` for the
 * `nuxy://download-manager/add?url=...&fileName=...` deeplink. `path` is the
 * deeplink's path+query suffix verbatim, e.g. "add?url=https%3A%2F%2F...".
 * Returns null when the path isn't the "add" shape, or lacks a `url` param —
 * this is intentionally permissive (no throwing) since callers re-check this
 * on every update until it returns a result (the manifest's `deeplinks` field
 * is advisory, not a hard contract).
 */
export function parseAddDeeplink(path: string): AddDeeplinkResult | null {
  if (!path) return null
  const [head, queryString = ''] = path.split('?')
  if (head !== 'add') return null

  const params = new URLSearchParams(queryString)
  const url = params.get('url')
  if (!url) return null

  const fileName = params.get('fileName') ?? undefined
  return { url, fileName }
}

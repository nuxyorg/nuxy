export interface AddDeeplinkResult {
  url: string
}

/**
 * Parses the `committedQuery` forwarded by `nuxy-tool-host` for the
 * `nuxy://qbittorrent/add?url=...` deeplink. `path` is the deeplink's
 * path+query suffix verbatim, e.g. "add?url=magnet%3A...". Returns null when
 * the path isn't the "add" shape, or lacks a `url` param — intentionally
 * permissive (no throwing) since callers re-check this on every update until
 * it returns a result.
 */
export function parseAddDeeplink(path: string): AddDeeplinkResult | null {
  if (!path) return null
  const [head, queryString = ''] = path.split('?')
  if (head !== 'add') return null

  const params = new URLSearchParams(queryString)
  const url = params.get('url')
  if (!url) return null

  return { url }
}

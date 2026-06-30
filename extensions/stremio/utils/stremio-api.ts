import type { ContentType, MetaResult, EpisodeResult, StreamResult } from '../types.ts'

/** Strip a trailing `/manifest.json` and/or trailing slash from an addon base URL. */
export function normalizeAddonBase(url: string): string {
  return url
    .trim()
    .replace(/\/manifest\.json$/i, '')
    .replace(/\/+$/, '')
}

/** Cinemeta catalog search endpoint for a given content type. */
export function buildSearchUrl(cinemetaBase: string, type: ContentType, query: string): string {
  const base = normalizeAddonBase(cinemetaBase)
  return `${base}/catalog/${type}/top/search=${encodeURIComponent(query.trim())}.json`
}

/** Stream endpoint on the configured addon. `id` already includes `:season:episode` for series. */
export function buildStreamUrl(addonBase: string, type: ContentType, id: string): string {
  const base = normalizeAddonBase(addonBase)
  return `${base}/stream/${type}/${id}.json`
}

/** Cinemeta series meta endpoint (used to enumerate episodes). */
export function buildSeriesMetaUrl(cinemetaBase: string, id: string): string {
  const base = normalizeAddonBase(cinemetaBase)
  return `${base}/meta/series/${id}.json`
}

function isUsableMetaId(id: unknown): id is string {
  return typeof id === 'string' && (id.startsWith('tt') || id.startsWith('kitsu'))
}

/** Map a Cinemeta search response into normalized meta results. */
export function parseMetaSearch(json: unknown, type: ContentType): MetaResult[] {
  const metas = (json as { metas?: unknown } | null)?.metas
  if (!Array.isArray(metas)) return []

  const results: MetaResult[] = []
  for (const raw of metas) {
    if (!raw || typeof raw !== 'object') continue
    const m = raw as Record<string, unknown>
    const id = typeof m.imdb_id === 'string' ? m.imdb_id : m.id
    const name = m.name
    if (!isUsableMetaId(id) || typeof name !== 'string' || !name) continue
    results.push({
      id,
      type,
      name,
      year: typeof m.releaseInfo === 'string' ? m.releaseInfo : '',
      poster: typeof m.poster === 'string' ? m.poster : '',
    })
  }
  return results
}

/** Map a Cinemeta series meta response into a sorted episode list (skips season 0 specials). */
export function parseSeriesEpisodes(json: unknown): EpisodeResult[] {
  const meta = (json as { meta?: { id?: unknown; videos?: unknown } } | null)?.meta
  const seriesId = typeof meta?.id === 'string' ? meta.id : ''
  const videos = meta?.videos
  if (!seriesId || !Array.isArray(videos)) return []

  const episodes: EpisodeResult[] = []
  for (const raw of videos) {
    if (!raw || typeof raw !== 'object') continue
    const v = raw as Record<string, unknown>
    const season = typeof v.season === 'number' ? v.season : NaN
    const episode = typeof v.episode === 'number' ? v.episode : NaN
    if (!Number.isFinite(season) || !Number.isFinite(episode) || season < 1) continue
    const title =
      (typeof v.name === 'string' && v.name) || (typeof v.title === 'string' && v.title) || ''
    episodes.push({
      // Cinemeta videos carry a ready-made stream id; fall back to constructing it.
      id: typeof v.id === 'string' && v.id ? v.id : `${seriesId}:${season}:${episode}`,
      season,
      episode,
      title,
      released:
        (typeof v.released === 'string' && v.released) ||
        (typeof v.firstAired === 'string' && v.firstAired) ||
        '',
      thumbnail: typeof v.thumbnail === 'string' ? v.thumbnail : '',
      overview:
        (typeof v.overview === 'string' && v.overview) ||
        (typeof v.description === 'string' && v.description) ||
        '',
    })
  }
  episodes.sort((a, b) => a.season - b.season || a.episode - b.episode)
  return episodes
}

/**
 * Interleave two already-ranked lists round-robin so the most popular of each
 * type surfaces first (Cinemeta returns each catalog in popularity/relevance order).
 */
export function mergeByRank<T>(a: T[], b: T[]): T[] {
  const out: T[] = []
  const max = Math.max(a.length, b.length)
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i]!)
    if (i < b.length) out.push(b[i]!)
  }
  return out
}

function trackerFromSource(source: unknown): string | null {
  if (typeof source !== 'string') return null
  if (source.startsWith('tracker:')) return source.slice('tracker:'.length)
  if (/^(udp|https?|wss?):\/\//i.test(source)) return source
  return null
}

/** Build a magnet URI from an infoHash, display name and optional Stremio `sources` array. */
export function buildMagnet(infoHash: string, name: string, sources?: unknown): string {
  let magnet = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(name)}`
  if (Array.isArray(sources)) {
    for (const source of sources) {
      const tracker = trackerFromSource(source)
      if (tracker) magnet += `&tr=${encodeURIComponent(tracker)}`
    }
  }
  return magnet
}

/** Normalize a Stremio stream response into torrent (magnet) or debrid (url) results. */
export function parseStreams(json: unknown): StreamResult[] {
  const streams = (json as { streams?: unknown } | null)?.streams
  if (!Array.isArray(streams)) return []

  const results: StreamResult[] = []
  for (const raw of streams) {
    if (!raw || typeof raw !== 'object') continue
    const s = raw as Record<string, unknown>
    const name = typeof s.name === 'string' ? s.name : ''
    const description =
      (typeof s.description === 'string' && s.description) ||
      (typeof s.title === 'string' && s.title) ||
      ''

    if (typeof s.infoHash === 'string' && s.infoHash) {
      results.push({
        id: s.infoHash,
        kind: 'torrent',
        name,
        description,
        infoHash: s.infoHash,
        magnet: buildMagnet(s.infoHash, name || description || s.infoHash, s.sources),
      })
    } else if (typeof s.url === 'string' && s.url) {
      results.push({ id: s.url, kind: 'debrid', name, description, url: s.url })
    }
  }
  return results
}

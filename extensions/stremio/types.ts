export type ContentType = 'movie' | 'series'

export type StreamKind = 'torrent' | 'debrid'

/** A title returned by the Cinemeta search catalog. */
export interface MetaResult {
  /** IMDB id ("tt...") or kitsu id — usable as a Stremio stream id. */
  id: string
  type: ContentType
  name: string
  /** Release year (Cinemeta `releaseInfo`); empty when unknown. */
  year: string
  poster: string
}

/** A single episode of a series, derived from the Cinemeta series meta. */
export interface EpisodeResult {
  /** Full Stremio stream id, e.g. "tt0944947:1:5". */
  id: string
  season: number
  episode: number
  title: string
  /** ISO release date; empty when unknown. */
  released: string
  /** Episode still image URL; empty when unknown. */
  thumbnail: string
  /** Episode synopsis; empty when unknown. */
  overview: string
}

/** A normalized stream result from a Stremio stream addon. */
export interface StreamResult {
  /** Stable id for selection (infoHash, url, or synthesized). */
  id: string
  kind: StreamKind
  /** Addon-provided name line (often resolution / source). */
  name: string
  /** Addon-provided description (size, seeders, filename, …). */
  description: string
  /** Present when `kind === 'torrent'`. */
  magnet?: string
  /** Present when `kind === 'torrent'`. */
  infoHash?: string
  /** Present when `kind === 'debrid'` — direct playback URL. */
  url?: string
}

export type { EnterAction } from './utils/enter-action-options.ts'

export interface SearchMetaPayload {
  query: string
}

export interface GetSeriesEpisodesPayload {
  id: string
}

export interface GetStreamsPayload {
  type: ContentType
  id: string
}

export interface CopyTextPayload {
  text: string
}

export interface OpenExternalPayload {
  url: string
}

export interface ToggleFavoritePayload {
  meta: MetaResult
}

export interface ToggleFavoriteResult {
  favorites: MetaResult[]
  isFavorite: boolean
}

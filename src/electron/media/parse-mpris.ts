import type { NowPlaying } from './types.js'

const MPRIS_PREFIX = 'org.mpris.MediaPlayer2.'

/** Bus name → short source id (`org.mpris.MediaPlayer2.spotify` → `spotify`). */
export function mprisBusNameToSource(busName: string): string {
  if (!busName.startsWith(MPRIS_PREFIX)) return busName
  return busName.slice(MPRIS_PREFIX.length)
}

function unwrapVariant(value: unknown): unknown {
  if (
    value !== null &&
    typeof value === 'object' &&
    'value' in value &&
    typeof (value as { value: unknown }).value !== 'undefined'
  ) {
    return (value as { value: unknown }).value
  }
  return value
}

function stringFromMetadataField(value: unknown): string | undefined {
  const v = unwrapVariant(value)
  if (typeof v === 'string' && v.trim() !== '') return v.trim()
  if (Array.isArray(v)) {
    const first = v.map(unwrapVariant).find((x) => typeof x === 'string' && x.trim())
    if (typeof first === 'string') return first.trim()
  }
  return undefined
}

/**
 * Map MPRIS `Metadata` + `PlaybackStatus` to {@link NowPlaying}.
 * @see https://specifications.freedesktop.org/mpris-spec/latest/Player_Interface.html
 */
export function parseMprisPlayer(
  busName: string,
  metadata: unknown,
  playbackStatus: unknown
): NowPlaying | null {
  const meta =
    metadata && typeof metadata === 'object'
      ? (unwrapVariant(metadata) as Record<string, unknown>)
      : {}

  const title =
    stringFromMetadataField(meta['xesam:title']) ?? stringFromMetadataField(meta['mpris:trackid'])
  const artist = stringFromMetadataField(meta['xesam:artist'])
  const album = stringFromMetadataField(meta['xesam:album'])
  const artworkUrl = stringFromMetadataField(meta['mpris:artUrl'])

  const status = String(unwrapVariant(playbackStatus) ?? '')
  const playing = status === 'Playing'
  const paused = status === 'Paused'

  if (!playing && !paused && !title && !artist) {
    return null
  }

  return {
    title,
    artist,
    album,
    playing,
    source: mprisBusNameToSource(busName),
    artworkUrl,
  }
}

/** Prefer actively playing players, then paused, then any MPRIS name. */
export function pickBestMprisPlayer(
  entries: { busName: string; nowPlaying: NowPlaying | null }[]
): NowPlaying | null {
  const withData = entries.filter((e) => e.nowPlaying !== null) as {
    busName: string
    nowPlaying: NowPlaying
  }[]
  if (withData.length === 0) return null

  const playing = withData.find((e) => e.nowPlaying.playing)
  if (playing) return playing.nowPlaying

  const paused = withData.find((e) => !e.nowPlaying.playing)
  if (paused) return paused.nowPlaying

  return withData[0]!.nowPlaying
}

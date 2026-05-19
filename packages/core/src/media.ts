/** Currently playing media metadata exposed to extensions via `core.media`. */
export interface NowPlaying {
  title?: string
  artist?: string
  album?: string
  playing: boolean
  /** Human-readable player id, e.g. `spotify`, `firefox`. */
  source?: string
  artworkUrl?: string
}

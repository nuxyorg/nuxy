import type { NowPlaying } from '@nuxyorg/core'

export type { NowPlaying }

export type MediaPlatform = 'linux' | 'darwin' | 'win32' | 'unsupported'

/** Platform-specific now-playing backend (MPRIS, macOS MediaPlayer, Windows SMTC). */
export interface MediaPlatformProvider {
  readonly platform: MediaPlatform
  getNowPlaying(): Promise<NowPlaying | null>
}

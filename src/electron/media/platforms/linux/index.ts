import type { MediaPlatformProvider } from '../../types.js'
import { getMprisNowPlaying } from './mpris.js'

/** Linux desktop: MPRIS over the session D-Bus. */
export function createLinuxMediaProvider(): MediaPlatformProvider {
  return {
    platform: 'linux',
    getNowPlaying: getMprisNowPlaying,
  }
}

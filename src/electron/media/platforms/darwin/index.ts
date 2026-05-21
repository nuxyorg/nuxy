import type { MediaPlatformProvider } from '../../types.js'

/** macOS Now Playing — MediaPlayer / MRMediaRemote (not implemented yet). */
export function createDarwinMediaProvider(): MediaPlatformProvider {
  return {
    platform: 'darwin',
    async getNowPlaying() {
      return null
    },
  }
}

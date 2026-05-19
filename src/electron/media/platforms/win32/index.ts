import type { MediaPlatformProvider } from '../../types.js'

/** Windows System Media Transport Controls (not implemented yet). */
export function createWin32MediaProvider(): MediaPlatformProvider {
  return {
    platform: 'win32',
    async getNowPlaying() {
      return null
    }
  }
}

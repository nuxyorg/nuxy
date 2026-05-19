import { kernelLogger } from '@nuxy/core'
import type { MediaPlatformProvider } from '../../types.js'

const log = kernelLogger.child('Media:darwin')

let warned = false

/** macOS Now Playing — MediaPlayer / MRMediaRemote (not implemented yet). */
export function createDarwinMediaProvider(): MediaPlatformProvider {
  return {
    platform: 'darwin',
    async getNowPlaying() {
      if (!warned) {
        warned = true
        log.info(
          'Now playing is not implemented on macOS yet (planned: MediaPlayer framework).'
        )
      }
      return null
    }
  }
}

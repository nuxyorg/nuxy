import { kernelLogger } from '@nuxy/core'
import type { MediaPlatformProvider } from '../../types.js'

const log = kernelLogger.child('Media:win32')

let warned = false

/** Windows System Media Transport Controls (not implemented yet). */
export function createWin32MediaProvider(): MediaPlatformProvider {
  return {
    platform: 'win32',
    async getNowPlaying() {
      if (!warned) {
        warned = true
        log.info(
          'Now playing is not implemented on Windows yet (planned: SMTC / WinRT).'
        )
      }
      return null
    }
  }
}

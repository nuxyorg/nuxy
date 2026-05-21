import type { MediaPlatform, MediaPlatformProvider } from '../types.js'
import { createLinuxMediaProvider } from './linux/index.js'
import { createDarwinMediaProvider } from './darwin/index.js'
import { createWin32MediaProvider } from './win32/index.js'

const unsupportedProvider: MediaPlatformProvider = {
  platform: 'unsupported',
  async getNowPlaying() {
    return null
  },
}

/** Resolve the media backend for the current OS. */
export function createPlatformMediaProvider(): MediaPlatformProvider {
  switch (process.platform) {
    case 'linux':
      return createLinuxMediaProvider()
    case 'darwin':
      return createDarwinMediaProvider()
    case 'win32':
      return createWin32MediaProvider()
    default:
      return unsupportedProvider
  }
}

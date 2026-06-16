import { kernelLogger } from '@nuxyorg/core'
import type { MediaPlatform, NowPlaying } from './types.js'
import { createPlatformMediaProvider } from './platforms/index.js'

export type { NowPlaying, MediaPlatform } from './types.js'

const log = kernelLogger.child('Media')

let provider = createPlatformMediaProvider()

export function platformId(): MediaPlatform {
  return provider.platform
}

/** Replace provider (tests) or refresh after hot reload. */
export function setMediaProvider(next: ReturnType<typeof createPlatformMediaProvider>): void {
  provider = next
}

/** Currently playing track metadata for the active platform backend. */
export async function getNowPlaying(): Promise<NowPlaying | null> {
  log.silly(`getNowPlaying via ${provider.platform}`)
  return provider.getNowPlaying()
}

import { describe, it, expect, vi, beforeEach } from 'vitest'

const handleHandlers: Record<string, Function> = {}

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: Function) => {
      handleHandlers[channel] = handler
    }),
  },
}))

vi.mock('../deeplink/dispatch.js', () => ({
  handleDeeplinkUrl: vi.fn(),
}))

import { DEEPLINK_DISPATCH_CHANNEL } from '@nuxyorg/core'
import { handleDeeplinkUrl } from '../deeplink/dispatch.js'
import { registerDeeplinkChannels } from './deeplink-channels.js'

describe('deeplink-channels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(handleHandlers).forEach((k) => delete handleHandlers[k])
    registerDeeplinkChannels()
  })

  it('registers a deeplink:dispatch handler', () => {
    expect(handleHandlers[DEEPLINK_DISPATCH_CHANNEL]).toBeInstanceOf(Function)
  })

  it('forwards the raw URL string to handleDeeplinkUrl and returns its result', () => {
    vi.mocked(handleDeeplinkUrl).mockReturnValue({ ok: true })
    const result = handleHandlers[DEEPLINK_DISPATCH_CHANNEL](
      {} as any,
      'nuxy://settings/extension/com.nuxy.nyaa'
    )
    expect(handleDeeplinkUrl).toHaveBeenCalledWith('nuxy://settings/extension/com.nuxy.nyaa')
    expect(result).toEqual({ ok: true })
  })

  it('rejects a non-string payload without calling handleDeeplinkUrl', () => {
    const result = handleHandlers[DEEPLINK_DISPATCH_CHANNEL]({} as any, 42)
    expect(handleDeeplinkUrl).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, error: 'invalid-url' })
  })
})

import { describe, it, expect, vi } from 'vitest'

vi.mock('child_process', () => ({
  execFile: vi.fn(),
}))

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
  app: {
    getLocale: vi.fn(() => 'en'),
  },
}))

import { handleKernelChannel } from './kernel-channels.js'

describe('handleKernelChannel', () => {
  it('dispatches to extensionHandlers (listTools)', async () => {
    const result = await handleKernelChannel('listTools', undefined)
    expect(result).not.toMatchObject({ code: 'UNKNOWN_CHANNEL' })
    expect(result.success).toBe(true)
  })

  it('dispatches to compositionHandlers (listCompositionSlots)', async () => {
    const result = await handleKernelChannel('listCompositionSlots', undefined)
    expect(result).not.toMatchObject({ code: 'UNKNOWN_CHANNEL' })
    expect(result.success).toBe(true)
  })

  it('dispatches to themeHandlers (listThemes)', async () => {
    const result = await handleKernelChannel('listThemes', undefined)
    expect(result).not.toMatchObject({ code: 'UNKNOWN_CHANNEL' })
    expect(result.success).toBe(true)
  })

  it('dispatches to i18nHandlers (getExtensionSettingsSchemas)', async () => {
    const result = await handleKernelChannel('getExtensionSettingsSchemas', undefined)
    expect(result).not.toMatchObject({ code: 'UNKNOWN_CHANNEL' })
    expect(result.success).toBe(true)
  })

  it('dispatches to systemHandlers (getConfig)', async () => {
    const result = await handleKernelChannel('getConfig', undefined)
    expect(result).not.toMatchObject({ code: 'UNKNOWN_CHANNEL' })
    expect(result.success).toBe(true)
  })

  it('returns UNKNOWN_CHANNEL for an unrecognized channel name', async () => {
    const result = await handleKernelChannel('totallyMadeUpChannel', { foo: 'bar' })
    expect(result).toEqual({
      success: false,
      error: 'Unknown kernel channel: totallyMadeUpChannel',
      code: 'UNKNOWN_CHANNEL',
    })
  })
})

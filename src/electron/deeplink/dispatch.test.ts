import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetExtensionById,
  mockResolveExtensionId,
  mockGetMainWindow,
  mockShow,
  mockFocus,
  mockIsMinimized,
  mockRestore,
  mockIsVisible,
  mockSend,
} = vi.hoisted(() => ({
  mockGetExtensionById: vi.fn(),
  mockResolveExtensionId: vi.fn(),
  mockGetMainWindow: vi.fn(),
  mockShow: vi.fn(),
  mockFocus: vi.fn(),
  mockIsMinimized: vi.fn().mockReturnValue(false),
  mockRestore: vi.fn(),
  mockIsVisible: vi.fn().mockReturnValue(true),
  mockSend: vi.fn(),
}))

vi.mock('../extensions/registry.js', () => ({
  getExtensionById: mockGetExtensionById,
  resolveExtensionId: mockResolveExtensionId,
}))

vi.mock('../window/manager.js', () => ({
  getMainWindow: mockGetMainWindow,
}))

import { handleDeeplinkUrl } from './dispatch.js'
import { DEEPLINK_OPEN_CHANNEL } from '@nuxyorg/core'

function fakeWindow() {
  return {
    isDestroyed: () => false,
    isVisible: mockIsVisible,
    isMinimized: mockIsMinimized,
    restore: mockRestore,
    show: mockShow,
    focus: mockFocus,
    webContents: { send: mockSend },
  }
}

describe('handleDeeplinkUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsVisible.mockReturnValue(true)
    mockIsMinimized.mockReturnValue(false)
  })

  it('dispatches deeplink:open with resolved extension id, path, and query', () => {
    mockResolveExtensionId.mockReturnValue('com.nuxy.settings')
    mockGetExtensionById.mockReturnValue({
      id: 'com.nuxy.settings',
      folderName: 'settings',
      manifest: { id: 'com.nuxy.settings', name: 'Settings', version: '1.0.0', type: 'tool' },
    })
    const win = fakeWindow()
    mockGetMainWindow.mockReturnValue(win)

    const result = handleDeeplinkUrl('nuxy://settings/extension/nyaa')

    expect(result).toEqual({ ok: true })
    expect(mockSend).toHaveBeenCalledWith(DEEPLINK_OPEN_CHANNEL, {
      extensionId: 'com.nuxy.settings',
      path: 'extension/nyaa',
      query: {},
    })
  })

  it('focuses and shows the main window when dispatching', () => {
    mockResolveExtensionId.mockReturnValue('com.nuxy.settings')
    mockGetExtensionById.mockReturnValue({
      id: 'com.nuxy.settings',
      folderName: 'settings',
      manifest: { id: 'com.nuxy.settings', name: 'Settings', version: '1.0.0', type: 'tool' },
    })
    mockIsVisible.mockReturnValue(false)
    const win = fakeWindow()
    mockGetMainWindow.mockReturnValue(win)

    handleDeeplinkUrl('nuxy://settings/extension/nyaa')

    expect(mockShow).toHaveBeenCalled()
    expect(mockFocus).toHaveBeenCalled()
  })

  it('returns an error result for a malformed URL', () => {
    const result = handleDeeplinkUrl('not a url')
    expect(result).toEqual({ ok: false, error: 'invalid-url' })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('returns an error result when the extension id does not resolve', () => {
    mockResolveExtensionId.mockReturnValue(undefined)
    const result = handleDeeplinkUrl('nuxy://does-not-exist/foo')
    expect(result).toEqual({ ok: false, error: 'unknown-extension' })
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('returns an error result when there is no main window yet', () => {
    mockResolveExtensionId.mockReturnValue('com.nuxy.settings')
    mockGetExtensionById.mockReturnValue({
      id: 'com.nuxy.settings',
      folderName: 'settings',
      manifest: { id: 'com.nuxy.settings', name: 'Settings', version: '1.0.0', type: 'tool' },
    })
    mockGetMainWindow.mockReturnValue(null)

    const result = handleDeeplinkUrl('nuxy://settings/extension/nyaa')
    expect(result).toEqual({ ok: false, error: 'no-window' })
  })

  it('resolves via folder name when extension id is actually a folder name', () => {
    mockResolveExtensionId.mockReturnValue('com.nuxy.settings')
    mockGetExtensionById.mockReturnValue({
      id: 'com.nuxy.settings',
      folderName: 'settings',
      manifest: { id: 'com.nuxy.settings', name: 'Settings', version: '1.0.0', type: 'tool' },
    })
    mockGetMainWindow.mockReturnValue(fakeWindow())

    handleDeeplinkUrl('nuxy://settings/foo')

    expect(mockResolveExtensionId).toHaveBeenCalledWith('settings')
    expect(mockSend).toHaveBeenCalledWith(
      DEEPLINK_OPEN_CHANNEL,
      expect.objectContaining({ extensionId: 'com.nuxy.settings' })
    )
  })
})

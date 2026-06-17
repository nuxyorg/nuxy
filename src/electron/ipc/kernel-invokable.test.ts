import { describe, it, expect, vi, beforeEach } from 'vitest'

const loadedExtensionsMock = vi.hoisted(() => [{ id: 'com.nuxy.shell', folderName: 'shell' }])

vi.mock('../extensions/registry.js', () => ({
  loadedExtensions: loadedExtensionsMock,
}))

const kernelInstallExtensionMock = vi.hoisted(() => vi.fn())
const kernelUninstallExtensionMock = vi.hoisted(() => vi.fn())

vi.mock('./extension-ops.js', () => ({
  kernelInstallExtension: kernelInstallExtensionMock,
  kernelUninstallExtension: kernelUninstallExtensionMock,
}))

import { callKernelChannel } from './kernel-invokable.js'

describe('callKernelChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listInstalledExtensions', () => {
    it('returns success with loadedExtensions as data', async () => {
      const result = await callKernelChannel('listInstalledExtensions', undefined)
      expect(result).toEqual({ success: true, data: loadedExtensionsMock })
    })
  })

  describe('installExtension', () => {
    it('returns INVALID_ARGS when extId is missing', async () => {
      const result = await callKernelChannel('installExtension', { downloadUrl: 'https://x' })
      expect(result).toEqual({
        success: false,
        error: 'Missing extId or downloadUrl',
        code: 'INVALID_ARGS',
      })
      expect(kernelInstallExtensionMock).not.toHaveBeenCalled()
    })

    it('returns INVALID_ARGS when downloadUrl is missing', async () => {
      const result = await callKernelChannel('installExtension', { extId: 'com.foo' })
      expect(result).toEqual({
        success: false,
        error: 'Missing extId or downloadUrl',
        code: 'INVALID_ARGS',
      })
      expect(kernelInstallExtensionMock).not.toHaveBeenCalled()
    })

    it('returns INVALID_ARGS when extId is the wrong type', async () => {
      const result = await callKernelChannel('installExtension', {
        extId: 123,
        downloadUrl: 'https://x',
      })
      expect(result).toEqual({
        success: false,
        error: 'Missing extId or downloadUrl',
        code: 'INVALID_ARGS',
      })
    })

    it('returns INVALID_ARGS when downloadUrl is the wrong type', async () => {
      const result = await callKernelChannel('installExtension', {
        extId: 'com.foo',
        downloadUrl: 42,
      })
      expect(result).toEqual({
        success: false,
        error: 'Missing extId or downloadUrl',
        code: 'INVALID_ARGS',
      })
    })

    it('returns INVALID_ARGS when payload is undefined', async () => {
      const result = await callKernelChannel('installExtension', undefined)
      expect(result.success).toBe(false)
      expect((result as any).code).toBe('INVALID_ARGS')
    })

    it('delegates to kernelInstallExtension with valid args and returns its result', async () => {
      kernelInstallExtensionMock.mockResolvedValue({ success: true })
      const result = await callKernelChannel('installExtension', {
        extId: 'com.foo',
        downloadUrl: 'https://example.com/foo.nuxyext',
      })
      expect(kernelInstallExtensionMock).toHaveBeenCalledWith(
        'com.foo',
        'https://example.com/foo.nuxyext'
      )
      expect(result).toEqual({ success: true })
    })
  })

  describe('uninstallExtension', () => {
    it('returns INVALID_ARGS when extId is missing', async () => {
      const result = await callKernelChannel('uninstallExtension', {})
      expect(result).toEqual({
        success: false,
        error: 'Missing extension ID',
        code: 'INVALID_ARGS',
      })
      expect(kernelUninstallExtensionMock).not.toHaveBeenCalled()
    })

    it('returns INVALID_ARGS when extId is the wrong type', async () => {
      const result = await callKernelChannel('uninstallExtension', { extId: 7 })
      expect(result).toEqual({
        success: false,
        error: 'Missing extension ID',
        code: 'INVALID_ARGS',
      })
    })

    it('delegates to kernelUninstallExtension and returns its result', async () => {
      kernelUninstallExtensionMock.mockReturnValue({ success: true })
      const result = await callKernelChannel('uninstallExtension', { extId: 'com.foo' })
      expect(kernelUninstallExtensionMock).toHaveBeenCalledWith('com.foo')
      expect(result).toEqual({ success: true })
    })
  })

  describe('unknown channel', () => {
    it('returns UNKNOWN_CHANNEL', async () => {
      const result = await callKernelChannel('somethingElse', undefined)
      expect(result).toEqual({
        success: false,
        error: 'Kernel channel not available via broker: somethingElse',
        code: 'UNKNOWN_CHANNEL',
      })
    })
  })
})

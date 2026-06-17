import fs from 'fs'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const loadedExtensionsMock = vi.hoisted(
  () =>
    [] as Array<{
      id: string
      folderName: string
      manifest: { bootstrap?: boolean }
    }>
)

vi.mock('../extensions/registry.js', () => ({
  loadedExtensions: loadedExtensionsMock,
}))

const invokeRescanMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('../extensions/rescan-hook.js', () => ({
  invokeRescan: invokeRescanMock,
}))

import { kernelInstallExtension, kernelUninstallExtension } from './extension-ops.js'

describe('extension-ops', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadedExtensionsMock.length = 0
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('kernelInstallExtension', () => {
    it('returns success and schedules a rescan on a successful download', async () => {
      vi.useFakeTimers()
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(8),
        })
      )
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as any)
      vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined)
      vi.spyOn(fs, 'renameSync').mockReturnValue(undefined)

      const result = await kernelInstallExtension('com.foo', 'https://example.com/foo.nuxyext')

      expect(result).toEqual({ success: true })
      expect(fs.mkdirSync).toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalled()
      expect(fs.renameSync).toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(100)
      expect(invokeRescanMock).toHaveBeenCalledTimes(1)
    })

    it('returns DOWNLOAD_FAILED when the response is not ok', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          statusText: 'Not Found',
        })
      )

      const result = await kernelInstallExtension('com.foo', 'https://example.com/missing')

      expect(result).toEqual({
        success: false,
        error: 'Failed to download: Not Found',
        code: 'DOWNLOAD_FAILED',
      })
    })

    it('returns ERROR with the message when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

      const result = await kernelInstallExtension('com.foo', 'https://example.com/foo.nuxyext')

      expect(result).toEqual({
        success: false,
        error: 'Installation failed: network down',
        code: 'ERROR',
      })
    })

    it('returns ERROR when writing to disk throws', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(8),
        })
      )
      vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as any)
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('disk full')
      })

      const result = await kernelInstallExtension('com.foo', 'https://example.com/foo.nuxyext')

      expect(result).toEqual({
        success: false,
        error: 'Installation failed: disk full',
        code: 'ERROR',
      })
    })
  })

  describe('kernelUninstallExtension', () => {
    it('blocks uninstalling com.nuxy.shell', () => {
      const result = kernelUninstallExtension('com.nuxy.shell')
      expect(result).toEqual({
        success: false,
        error: 'Cannot uninstall system extension',
        code: 'FORBIDDEN',
      })
    })

    it('blocks uninstalling com.nuxy.settings', () => {
      const result = kernelUninstallExtension('com.nuxy.settings')
      expect(result).toEqual({
        success: false,
        error: 'Cannot uninstall system extension',
        code: 'FORBIDDEN',
      })
    })

    it('returns NOT_FOUND when the extension is not in loadedExtensions', () => {
      const result = kernelUninstallExtension('com.unknown')
      expect(result).toEqual({
        success: false,
        error: 'Extension not found',
        code: 'NOT_FOUND',
      })
    })

    it('blocks uninstalling a bootstrap extension', () => {
      loadedExtensionsMock.push({
        id: 'com.bootstrap',
        folderName: 'bootstrap-ext',
        manifest: { bootstrap: true },
      })

      const result = kernelUninstallExtension('com.bootstrap')

      expect(result).toEqual({
        success: false,
        error: 'Cannot uninstall bootstrap extension',
        code: 'FORBIDDEN',
      })
    })

    it('removes a normal extension dir/zip and returns success', () => {
      vi.useFakeTimers()
      loadedExtensionsMock.push({
        id: 'com.normal',
        folderName: 'normal-ext',
        manifest: {},
      })

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'chmodSync').mockReturnValue(undefined)
      vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false } as any)
      vi.spyOn(fs, 'readdirSync').mockReturnValue([] as any)
      vi.spyOn(fs, 'rmSync').mockReturnValue(undefined)

      const result = kernelUninstallExtension('com.normal')

      expect(result).toEqual({ success: true })
      expect(fs.rmSync).toHaveBeenCalled()
    })

    it('returns ERROR when an fs error occurs during removal', () => {
      loadedExtensionsMock.push({
        id: 'com.broken',
        folderName: 'broken-ext',
        manifest: {},
      })

      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'chmodSync').mockReturnValue(undefined)
      vi.spyOn(fs, 'statSync').mockReturnValue({ isDirectory: () => false } as any)
      vi.spyOn(fs, 'rmSync').mockImplementation(() => {
        throw new Error('permission denied')
      })

      const result = kernelUninstallExtension('com.broken')

      expect(result).toEqual({
        success: false,
        error: 'Uninstall failed: permission denied',
        code: 'ERROR',
      })
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

const execFileMock = vi.hoisted(() => vi.fn())

vi.mock('child_process', () => ({
  execFile: execFileMock,
}))

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}))

vi.mock('../../config/nuxyconfig.js', () => ({
  getConfig: vi.fn(() => ({ theme: 'dark' })),
  reloadConfig: vi.fn(),
}))

vi.mock('../../window/runtime.js', () => ({
  applyConfigToWindow: vi.fn(),
}))

import { BrowserWindow } from 'electron'
import { systemHandlers } from './system.js'
import { getConfig, reloadConfig } from '../../config/nuxyconfig.js'
import { applyConfigToWindow } from '../../window/runtime.js'

describe('systemHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getConfig', () => {
    it('returns current config', () => {
      vi.mocked(getConfig).mockReturnValue({ theme: 'dark' } as any)
      const result = systemHandlers.getConfig(undefined)
      expect(result).toEqual({ success: true, data: { theme: 'dark' } })
    })
  })

  describe('applyWindowSettings', () => {
    it('reloads config and applies it to the first non-destroyed window', () => {
      const win = { isDestroyed: vi.fn(() => false) }
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([win] as any)
      const result = systemHandlers.applyWindowSettings(undefined)
      expect(reloadConfig).toHaveBeenCalled()
      expect(applyConfigToWindow).toHaveBeenCalledWith(win)
      expect(result).toEqual({ success: true })
    })

    it('skips applying config when window is destroyed', () => {
      const win = { isDestroyed: vi.fn(() => true) }
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([win] as any)
      const result = systemHandlers.applyWindowSettings(undefined)
      expect(applyConfigToWindow).not.toHaveBeenCalled()
      expect(result).toEqual({ success: true })
    })

    it('handles no windows at all', () => {
      vi.mocked(BrowserWindow.getAllWindows).mockReturnValue([])
      const result = systemHandlers.applyWindowSettings(undefined)
      expect(applyConfigToWindow).not.toHaveBeenCalled()
      expect(result).toEqual({ success: true })
    })
  })

  describe('listSystemFonts', () => {
    it('returns deduped, sorted font names parsed from fc-list', async () => {
      execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
        cb(null, 'Zebra\nArial,Arial Bold\nArial\n')
      })
      const result = await systemHandlers.listSystemFonts(undefined)
      expect(result).toEqual({ success: true, data: ['Arial', 'Arial Bold', 'Zebra'] })
    })

    it('returns empty list when fc-list fails (error path)', async () => {
      execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
        cb(new Error('command not found'), '')
      })
      const result = await systemHandlers.listSystemFonts(undefined)
      expect(result).toEqual({ success: true, data: [] })
    })
  })
})

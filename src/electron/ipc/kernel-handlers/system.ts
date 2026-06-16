import { BrowserWindow } from 'electron'
import { execFile } from 'child_process'
import { kernelLogger } from '@nuxyorg/core'
import type { IpcResult } from '@nuxyorg/core'
import { getConfig, reloadConfig } from '../../config/nuxyconfig.js'
import { applyConfigToWindow } from '../../window/runtime.js'

const log = kernelLogger.child('KernelSystem')

type Handler = (payload: unknown) => IpcResult | Promise<IpcResult>

export const systemHandlers: Record<string, Handler> = {
  getConfig: () => ({ success: true, data: getConfig() }),

  applyWindowSettings: () => {
    reloadConfig()
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) applyConfigToWindow(win)
    return { success: true }
  },

  listSystemFonts: async () => {
    try {
      const fonts = await new Promise<string[]>((resolve, reject) => {
        execFile(
          'fc-list',
          ['--format=%{family}\n'],
          { maxBuffer: 4 * 1024 * 1024 },
          (err, stdout) => {
            if (err) return reject(err)
            const names = stdout
              .split('\n')
              .flatMap((line) => line.split(','))
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
            const unique = [...new Set(names)].sort((a, b) =>
              a.localeCompare(b, undefined, { sensitivity: 'base' })
            )
            resolve(unique)
          }
        )
      })
      return { success: true, data: fonts }
    } catch (e) {
      log.warn('fc-list failed, returning empty font list', e)
      return { success: true, data: [] }
    }
  },
}

import { loadedExtensions, rescanExtensions } from '../extensions/scanner.js'
import fs from 'fs'
import path from 'path'
import { EXTENSION_DIR } from '../config/paths.js'
import { kernelLogger } from '@nuxy/core'
import type { IpcResult } from '@nuxy/core'

const log = kernelLogger.child('KernelInvokable')

/**
 * Handles kernel IPC channels invoked by worker extensions via the broker.
 * Returns an IpcResult whose .data matches what the renderer would receive
 * from the same channel via ipcMain, so callers can use .success and .data
 * consistently regardless of whether they are the renderer or a worker.
 */
export async function callKernelChannel(channel: string, payload: unknown): Promise<IpcResult> {
  switch (channel) {
    case 'listInstalledExtensions':
      return { success: true, data: loadedExtensions }

    case 'installExtension': {
      const args = payload as { extId?: string; downloadUrl?: string } | undefined
      const extId = args?.extId
      const downloadUrl = args?.downloadUrl
      if (!extId || typeof extId !== 'string' || !downloadUrl || typeof downloadUrl !== 'string') {
        return { success: false, error: 'Missing extId or downloadUrl', code: 'INVALID_ARGS' }
      }
      try {
        const response = await fetch(downloadUrl)
        if (!response.ok) {
          return {
            success: false,
            error: `Failed to download: ${response.statusText}`,
            code: 'DOWNLOAD_FAILED',
          }
        }
        const buffer = await response.arrayBuffer()
        const fileData = Buffer.from(buffer)
        const filename = `${extId}.nuxyext`
        const tempFile = path.join(EXTENSION_DIR, `.tmp_${filename}`)
        fs.mkdirSync(EXTENSION_DIR, { recursive: true })
        fs.writeFileSync(tempFile, fileData)
        fs.renameSync(tempFile, path.join(EXTENSION_DIR, filename))
        setTimeout(() => {
          void rescanExtensions()
        }, 100)
        return { success: true }
      } catch (e: any) {
        log.error(`Failed to install extension ${extId}`, e)
        return { success: false, error: `Installation failed: ${e.message}`, code: 'ERROR' }
      }
    }

    case 'uninstallExtension': {
      const args = payload as { extId?: string } | undefined
      const extId = args?.extId
      if (!extId || typeof extId !== 'string') {
        return { success: false, error: 'Missing extension ID', code: 'INVALID_ARGS' }
      }
      if (extId === 'com.nuxy.shell' || extId === 'com.nuxy.settings') {
        return { success: false, error: 'Cannot uninstall system extension', code: 'FORBIDDEN' }
      }
      const ext = loadedExtensions.find((e) => e.id === extId)
      if (!ext) {
        return { success: false, error: 'Extension not found', code: 'NOT_FOUND' }
      }
      if (ext.manifest.bootstrap) {
        return { success: false, error: 'Cannot uninstall bootstrap extension', code: 'FORBIDDEN' }
      }
      const dirPath = path.join(EXTENSION_DIR, ext.folderName)
      const zipPath = path.join(EXTENSION_DIR, `${ext.folderName}.nuxyext`)
      try {
        if (fs.existsSync(dirPath)) {
          const restoreWritable = (p: string) => {
            try {
              fs.chmodSync(p, 0o755)
              if (fs.statSync(p).isDirectory()) {
                for (const item of fs.readdirSync(p)) restoreWritable(path.join(p, item))
              }
            } catch {}
          }
          restoreWritable(dirPath)
          fs.rmSync(dirPath, { recursive: true, force: true })
        }
        if (fs.existsSync(zipPath)) {
          fs.chmodSync(zipPath, 0o755)
          fs.rmSync(zipPath, { force: true })
        }
        setTimeout(() => {
          void rescanExtensions()
        }, 100)
        return { success: true }
      } catch (e: any) {
        log.error(`Failed to uninstall extension ${extId}`, e)
        return { success: false, error: `Uninstall failed: ${e.message}`, code: 'ERROR' }
      }
    }

    default:
      return {
        success: false,
        error: `Kernel channel not available via broker: ${channel}`,
        code: 'UNKNOWN_CHANNEL',
      }
  }
}

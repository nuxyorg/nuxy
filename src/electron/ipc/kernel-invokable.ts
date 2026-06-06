import { loadedExtensions } from '../extensions/registry.js'
import type { IpcResult } from '@nuxy/core'
import { kernelInstallExtension, kernelUninstallExtension } from './extension-ops.js'

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
      return kernelInstallExtension(extId, downloadUrl)
    }

    case 'uninstallExtension': {
      const args = payload as { extId?: string } | undefined
      const extId = args?.extId
      if (!extId || typeof extId !== 'string') {
        return { success: false, error: 'Missing extension ID', code: 'INVALID_ARGS' }
      }
      return kernelUninstallExtension(extId)
    }

    default:
      return {
        success: false,
        error: `Kernel channel not available via broker: ${channel}`,
        code: 'UNKNOWN_CHANNEL',
      }
  }
}

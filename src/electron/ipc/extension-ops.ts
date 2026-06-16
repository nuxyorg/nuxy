import fs from 'fs'
import path from 'path'
import { loadedExtensions } from '../extensions/registry.js'
import { invokeRescan } from '../extensions/rescan-hook.js'
import { EXTENSION_DIR } from '../config/paths.js'
import { kernelLogger } from '@nuxyorg/core'
import type { IpcResult } from '@nuxyorg/core'

const log = kernelLogger.child('ExtensionOps')

export async function kernelInstallExtension(
  extId: string,
  downloadUrl: string
): Promise<IpcResult> {
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
    const filename = `${extId}.nuxyext`
    const tempFile = path.join(EXTENSION_DIR, `.tmp_${filename}`)
    fs.mkdirSync(EXTENSION_DIR, { recursive: true })
    fs.writeFileSync(tempFile, Buffer.from(buffer))
    fs.renameSync(tempFile, path.join(EXTENSION_DIR, filename))
    setTimeout(() => void invokeRescan(), 100)
    return { success: true }
  } catch (e: any) {
    log.error(`Failed to install extension ${extId}`, e)
    return { success: false, error: `Installation failed: ${e.message}`, code: 'ERROR' }
  }
}

export function kernelUninstallExtension(extId: string): IpcResult {
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
    setTimeout(() => void invokeRescan(), 100)
    return { success: true }
  } catch (e: any) {
    log.error(`Failed to uninstall extension ${extId}`, e)
    return { success: false, error: `Uninstall failed: ${e.message}`, code: 'ERROR' }
  }
}

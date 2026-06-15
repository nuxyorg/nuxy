import { kernelLogger, type IpcResult } from '@nuxy/core'
import { loadedExtensions } from '../../extensions/scanner.js'
import { setExtensionEnabled } from '../../extensions/disabled.js'
import { invokeRescan } from '../../extensions/rescan-hook.js'
import { getDisplayName } from '../../extensions/registry.js'
import { listExtensionsByKind, listUikitExtensions } from '../list-by-type.js'
import { kernelInstallExtension, kernelUninstallExtension } from '../extension-ops.js'

const log = kernelLogger.child('KernelExtensions')

function countByType(type: string): number {
  return loadedExtensions.filter((ext) => !ext.disabled && ext.manifest.type === type).length
}

type Handler = (payload: unknown) => IpcResult | Promise<IpcResult>

export const extensionHandlers: Record<string, Handler> = {
  listTools: () => ({ success: true, data: listExtensionsByKind('tool') }),
  listProviders: () => ({ success: true, data: listExtensionsByKind('provider') }),
  listOrchestrators: () => ({ success: true, data: listExtensionsByKind('orchestrator') }),
  listUikitExtensions: () => ({ success: true, data: listUikitExtensions() }),

  getExtensionSummary: () => ({
    success: true,
    data: {
      tools: listExtensionsByKind('tool').length,
      themes: countByType('theme'),
      uikit: countByType('uikit'),
      iconpacks: countByType('iconpack'),
    },
  }),

  listInstalledExtensions: () => ({
    success: true,
    data: loadedExtensions.map((ext) => ({
      ...ext,
      manifest: { ...ext.manifest, name: getDisplayName(ext) },
    })),
  }),

  getPreloads: () => ({
    success: true,
    data: loadedExtensions
      .filter((ext) => !ext.disabled && ext.manifest.entry?.preload)
      .map((ext) => ({
        id: ext.id,
        url: `nuxy-ext://${ext.id}/${ext.manifest.entry!.preload!.replace(/\.ts$/, '.js')}`,
      })),
  }),

  uninstallExtension: (payload) => {
    const args = payload as { extId?: string } | undefined
    const extId = args?.extId
    if (!extId || typeof extId !== 'string') {
      return { success: false, error: 'Missing extension ID', code: 'INVALID_ARGS' }
    }
    return kernelUninstallExtension(extId)
  },

  setExtensionEnabled: (payload) => {
    const args = payload as { extId?: string; enabled?: boolean } | undefined
    const extId = args?.extId
    const enabled = args?.enabled
    if (!extId || typeof extId !== 'string' || typeof enabled !== 'boolean') {
      return { success: false, error: 'Missing extId or enabled', code: 'INVALID_ARGS' }
    }
    if (extId === 'com.nuxy.shell' || extId === 'com.nuxy.settings') {
      return { success: false, error: 'Cannot disable system extension', code: 'FORBIDDEN' }
    }
    const ext = loadedExtensions.find((e) => e.id === extId)
    if (ext?.manifest.bootstrap) {
      return { success: false, error: 'Cannot disable bootstrap extension', code: 'FORBIDDEN' }
    }
    if (ext?.manifest.type === 'uikit') {
      return { success: false, error: 'Cannot disable uikit extension', code: 'FORBIDDEN' }
    }
    setExtensionEnabled(extId, enabled)
    setTimeout(() => void invokeRescan(), 100)
    return { success: true }
  },

  installExtension: (payload) => {
    const args = payload as { extId?: string; downloadUrl?: string } | undefined
    const extId = args?.extId
    const downloadUrl = args?.downloadUrl
    if (!extId || typeof extId !== 'string' || !downloadUrl || typeof downloadUrl !== 'string') {
      return { success: false, error: 'Missing extId or downloadUrl', code: 'INVALID_ARGS' }
    }
    return kernelInstallExtension(extId, downloadUrl)
  },
}

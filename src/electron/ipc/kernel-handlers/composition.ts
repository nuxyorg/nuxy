import { loadedExtensions } from '../../extensions/scanner.js'
import {
  resolveToolElementTag,
  listCompositionProvides,
  validateCompositionClaim,
} from '@nuxyorg/core'
import type { IpcResult } from '@nuxyorg/core'

function getShellManifest() {
  return loadedExtensions.find((ext) => ext.manifest.bootstrap)?.manifest
}

type Handler = (payload: unknown) => IpcResult | Promise<IpcResult>

export const compositionHandlers: Record<string, Handler> = {
  getToolElementTag: (payload) => {
    const args = payload as { extId?: string } | undefined
    const extId = args?.extId
    if (!extId || typeof extId !== 'string') {
      return { success: false, error: 'Missing extId', code: 'INVALID_ARGS' }
    }
    const ext = loadedExtensions.find((e) => e.id === extId)
    if (!ext) {
      return { success: false, error: `Extension not found: ${extId}`, code: 'EXTENSION_NOT_FOUND' }
    }
    return { success: true, data: resolveToolElementTag(ext.manifest) }
  },

  listCompositionSlots: () => {
    const shell = getShellManifest()
    if (!shell) {
      return { success: true, data: [] }
    }
    return { success: true, data: listCompositionProvides(shell) }
  },

  validateCompositionClaim: (payload) => {
    const args = payload as { extId?: string; slotName?: string } | undefined
    const extId = args?.extId
    const slotName = args?.slotName
    if (!extId || typeof extId !== 'string' || !slotName || typeof slotName !== 'string') {
      return { success: false, error: 'Missing extId or slotName', code: 'INVALID_ARGS' }
    }
    const ext = loadedExtensions.find((e) => e.id === extId)
    if (!ext) {
      return { success: false, error: `Extension not found: ${extId}`, code: 'EXTENSION_NOT_FOUND' }
    }
    const result = validateCompositionClaim(ext.manifest, slotName, getShellManifest())
    if (!result.ok) {
      return { success: false, error: result.error, code: result.code }
    }
    return { success: true, data: { maxMounts: result.maxMounts } }
  },
}

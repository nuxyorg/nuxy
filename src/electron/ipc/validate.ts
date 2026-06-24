import type { IpcResult } from '@nuxyorg/core'
import { getExtensionById, isChannelAllowed, isPublicChannel } from '../extensions/registry.js'

const KERNEL_CHANNELS = new Set([
  'listTools',
  'listProviders',
  'listOrchestrators',
  'listUikitExtensions',
  'getConfig',
  'applyWindowSettings',
  'getTheme',
  'listThemes',
  'getThemeByName',
  'getDefaultThemeName',
  'getIcon',
  'getIconPack',
  'listIconPacks',
  'listSystemFonts',
  'getExtensionSettingsSchemas',
  'getPreloads',
  'listInstalledExtensions',
  'installExtension',
  'uninstallExtension',
  'getExtensionTranslations',
  'setExtensionEnabled',
  'getToolElementTag',
  'listCompositionSlots',
  'validateCompositionClaim',
])

export function validateExtInvokeArgs(
  extId: unknown,
  channel: unknown,
  payload: unknown,
  callerExtId?: string
):
  | { ok: true; extId: string; channel: string; payload: unknown }
  | { ok: false; result: IpcResult } {
  if (typeof extId !== 'string' || extId.trim() === '') {
    return {
      ok: false,
      result: { success: false, error: 'Invalid extId', code: 'INVALID_ARGS' },
    }
  }

  if (typeof channel !== 'string' || channel.trim() === '') {
    return {
      ok: false,
      result: {
        success: false,
        error: 'Invalid channel',
        code: 'INVALID_ARGS',
      },
    }
  }

  const id = extId.trim()
  const ch = channel.trim()

  if (id === 'kernel') {
    if (!KERNEL_CHANNELS.has(ch)) {
      return {
        ok: false,
        result: {
          success: false,
          error: `Unknown kernel channel: ${ch}`,
          code: 'UNKNOWN_CHANNEL',
        },
      }
    }
    if (payload !== undefined && payload !== null && typeof payload !== 'object') {
      return {
        ok: false,
        result: {
          success: false,
          error: 'Kernel channel payload must be an object',
          code: 'INVALID_ARGS',
        },
      }
    }
    return { ok: true, extId: id, channel: ch, payload }
  }

  const target = getExtensionById(id)
  if (!target) {
    return {
      ok: false,
      result: {
        success: false,
        error: `Extension not found: ${id}`,
        code: 'EXTENSION_NOT_FOUND',
      },
    }
  }

  if (!isChannelAllowed(id, ch)) {
    return {
      ok: false,
      result: {
        success: false,
        error: `Unknown channel: ${ch}`,
        code: 'UNKNOWN_CHANNEL',
      },
    }
  }

  const isPublic = isPublicChannel(id, ch)

  if (!isPublic) {
    if (!callerExtId || callerExtId !== id) {
      return {
        ok: false,
        result: {
          success: false,
          error: callerExtId
            ? `Channel is not public: ${ch}`
            : 'callerExtId is required for private IPC channels',
          code: callerExtId ? 'IPC_PRIVATE' : 'CALLER_REQUIRED',
        },
      }
    }
    return { ok: true, extId: id, channel: ch, payload }
  }

  if (callerExtId && callerExtId !== id) {
    if (!target.manifest.capabilities?.callable) {
      return {
        ok: false,
        result: {
          success: false,
          error: 'Target is not callable',
          code: 'CALLABLE_DENIED',
        },
      }
    }
  }

  return { ok: true, extId: id, channel: ch, payload }
}

export function validateWindowResize(
  width: unknown,
  height: unknown
): { ok: true; width: number; height: number } | { ok: false } {
  if (typeof width !== 'number' || typeof height !== 'number') {
    return { ok: false }
  }
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return { ok: false }
  }
  return { ok: true, width, height }
}

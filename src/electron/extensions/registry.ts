import type { ExtensionIpcManifest, ExtensionRuntimeMeta, LoadedExtension } from '@nuxyorg/core'
import fs from 'fs'
import path from 'path'
import electron from 'electron'
import { DATA_DIR, EXTRACTED_DIR } from '../config/paths.js'
import { resolveLocale } from '../../../packages/core/src/i18n.js'

const byId = new Map<string, LoadedExtension>()
const folderToId = new Map<string, string>()
const shortNameToId = new Map<string, string>()
const ipcChannelsByExtId = new Map<string, Set<string>>()
const publicIpcChannelsByExtId = new Map<string, Set<string>>()
const privateIpcChannelsByExtId = new Map<string, Set<string>>()

export interface IpcSyncValidationResult {
  ok: boolean
  errors: string[]
  warnings: string[]
}

/** Last dot-separated segment of a reverse-domain id, e.g. "com.nuxy.settings" → "settings". */
function shortNameOf(id: string): string {
  const idx = id.lastIndexOf('.')
  return idx === -1 ? id : id.slice(idx + 1)
}

export const loadedExtensions: LoadedExtension[] = []

export function getPreferredLocale(): string {
  const settingsFile = path.join(DATA_DIR, 'com.nuxy.settings', 'settings.json')
  let preferredLanguages: string[] = []
  try {
    if (fs.existsSync(settingsFile)) {
      const raw = fs.readFileSync(settingsFile, 'utf8')
      const parsed = JSON.parse(raw) as { preferredLanguages?: string[] }
      preferredLanguages = parsed.preferredLanguages ?? []
    }
  } catch {}

  let appLocale = 'en'
  try {
    const app = typeof electron === 'object' && electron ? (electron as any).app : null
    if (app) {
      appLocale = app.getLocale()
    }
  } catch {}

  const candidates = [...preferredLanguages, appLocale].filter(Boolean)
  return resolveLocale(candidates, ['en', 'tr', 'ja'], 'en')
}

export function registerExtension(ext: LoadedExtension): void {
  const existing = byId.get(ext.id)
  if (existing) {
    const existingPath = path.join(EXTRACTED_DIR, existing.folderName)
    const newPath = path.join(EXTRACTED_DIR, ext.folderName)
    const existingScore = scoreExtractFolder(existingPath, existing.folderName)
    const newScore = scoreExtractFolder(newPath, ext.folderName)
    if (newScore <= existingScore) return
    unregisterExtension(ext.id)
  }
  byId.set(ext.id, ext)
  folderToId.set(ext.folderName, ext.id)
  shortNameToId.set(shortNameOf(ext.id), ext.id)
  loadedExtensions.push(ext)
}

function scoreExtractFolder(folderPath: string, folderName: string): number {
  let score = 0
  if (fs.existsSync(path.join(folderPath, '_frontend.bundle.mjs'))) score += 100
  if (/-\d/.test(folderName)) score += 10
  try {
    score += fs.statSync(folderPath).mtimeMs / 1e15
  } catch {
    /* ignore */
  }
  return score
}

export function getExtensionById(id: string): LoadedExtension | undefined {
  return byId.get(id)
}

export function getExtensionFolder(id: string): string | undefined {
  return byId.get(id)?.folderName
}

/**
 * Resolves a manifest id, folder name, or short name (the last dot segment
 * of a reverse-domain id, e.g. "settings" for "com.nuxy.settings") to the
 * full manifest id. Used by the `nuxy://<extension-id>/...` deeplink
 * resolver so URLs can target the short, user-facing name rather than the
 * full reverse-domain id. If two loaded extensions share a short name, the
 * most recently registered one wins — short names are a convenience alias,
 * not a stable identifier.
 */
export function resolveExtensionId(idOrFolder: string): string | undefined {
  if (byId.has(idOrFolder)) return idOrFolder
  return folderToId.get(idOrFolder) ?? shortNameToId.get(idOrFolder)
}

export function isBootstrapExtension(ext: LoadedExtension): boolean {
  return ext.manifest.bootstrap === true
}

export function setExtensionChannels(extId: string, channels: string[]): void {
  ipcChannelsByExtId.set(extId, new Set(channels))
}

export function isChannelAllowed(extId: string, channel: string): boolean {
  const allowed = ipcChannelsByExtId.get(extId)
  if (!allowed) return false
  return allowed.has(channel)
}

export function isPublicChannel(extId: string, channel: string): boolean {
  return publicIpcChannelsByExtId.get(extId)?.has(channel) ?? false
}

export function isPrivateChannel(extId: string, channel: string): boolean {
  return privateIpcChannelsByExtId.get(extId)?.has(channel) ?? false
}

/**
 * Validates a worker's IPC sync payload against the extension's manifest-declared
 * public surface. Channels registered public but not declared in `manifest.ipc.public`
 * are an error (manifest is the source of truth); manifest-declared public channels
 * with no registered handler are a warning (handler may not have booted yet).
 */
export function validateIpcSync(
  extId: string,
  manifestIpc: ExtensionIpcManifest | undefined,
  runtime: Pick<ExtensionRuntimeMeta, 'publicIpcChannels'>
): IpcSyncValidationResult {
  const declaredPublic = manifestIpc?.public ?? []
  const samples = manifestIpc?.samples ?? {}
  const declared = new Set(declaredPublic)
  const registered = new Set(runtime.publicIpcChannels)
  const errors: string[] = []
  const warnings: string[] = []

  for (const channel of registered) {
    if (!declared.has(channel)) {
      errors.push(`Channel "${channel}" registered public but not declared in manifest.ipc.public`)
    }
  }

  for (const channel of declaredPublic) {
    if (!registered.has(channel)) {
      warnings.push(
        `Manifest declares public channel "${channel}" with no registered public handler`
      )
    }
    if (!(channel in samples)) {
      warnings.push(
        `Public channel "${channel}" has no ipc.samples entry — add an example payload for IPC Explorer and cross-extension callers`
      )
    }
  }

  for (const channel of Object.keys(samples)) {
    if (!declared.has(channel)) {
      warnings.push(`ipc.samples declares "${channel}" which is not listed in ipc.public`)
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

export function mergeRuntimeSync(extId: string, payload: ExtensionRuntimeMeta): void {
  const ext = byId.get(extId)
  if (!ext) return
  ext.runtime = payload
  setExtensionChannels(extId, payload.ipcChannels)
  publicIpcChannelsByExtId.set(extId, new Set(payload.publicIpcChannels))
  privateIpcChannelsByExtId.set(extId, new Set(payload.privateIpcChannels))
}

export function getDisplayName(ext: LoadedExtension): string {
  if (ext.runtime?.displayName) {
    return ext.runtime.displayName
  }

  if (ext.manifest.locales) {
    try {
      const {
        supported,
        default: defaultLocale,
        dir: localesDir = 'locales',
      } = ext.manifest.locales
      const resolved = getPreferredLocale()
      const resolvedLocale = resolveLocale([resolved], supported, defaultLocale)
      const extFolder = path.join(EXTRACTED_DIR, ext.folderName)

      const tryLoadName = (loc: string): string | null => {
        try {
          const filePath = path.join(extFolder, localesDir, `${loc}.json`)
          if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8')
            const parsed = JSON.parse(raw)
            return parsed.meta?.name ?? null
          }
        } catch {}
        return null
      }

      const name = tryLoadName(resolvedLocale) ?? tryLoadName(defaultLocale)
      if (name) return name
    } catch {}
  }

  return ext.manifest.name
}

export function markFailed(extId: string, error: string): void {
  const ext = byId.get(extId)
  if (!ext) return
  ext.status = 'failed'
  ext.lastError = error
}

export function clearFailed(extId: string): void {
  const ext = byId.get(extId)
  if (!ext) return
  delete ext.status
  delete ext.lastError
}

export function unregisterExtension(extId: string): void {
  const ext = byId.get(extId)
  if (!ext) return
  byId.delete(extId)
  folderToId.delete(ext.folderName)
  if (shortNameToId.get(shortNameOf(extId)) === extId) {
    shortNameToId.delete(shortNameOf(extId))
  }
  ipcChannelsByExtId.delete(extId)
  publicIpcChannelsByExtId.delete(extId)
  privateIpcChannelsByExtId.delete(extId)
  const idx = loadedExtensions.findIndex((e) => e.id === extId)
  if (idx >= 0) loadedExtensions.splice(idx, 1)
}

export function clearRegistry(): void {
  byId.clear()
  folderToId.clear()
  shortNameToId.clear()
  ipcChannelsByExtId.clear()
  publicIpcChannelsByExtId.clear()
  privateIpcChannelsByExtId.clear()
  loadedExtensions.length = 0
}

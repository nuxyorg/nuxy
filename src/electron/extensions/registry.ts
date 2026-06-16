import type { ExtensionRuntimeMeta, LoadedExtension } from '@nuxyorg/core'
import fs from 'fs'
import path from 'path'
import electron from 'electron'
import { DATA_DIR, EXTRACTED_DIR } from '../config/paths.js'
import { resolveLocale } from '../../../packages/core/src/i18n.js'

const byId = new Map<string, LoadedExtension>()
const folderToId = new Map<string, string>()
const ipcChannelsByExtId = new Map<string, Set<string>>()

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
  if (byId.has(ext.id)) {
    return
  }
  byId.set(ext.id, ext)
  folderToId.set(ext.folderName, ext.id)
  loadedExtensions.push(ext)
}

export function getExtensionById(id: string): LoadedExtension | undefined {
  return byId.get(id)
}

export function getExtensionFolder(id: string): string | undefined {
  return byId.get(id)?.folderName
}

export function resolveExtensionId(idOrFolder: string): string | undefined {
  if (byId.has(idOrFolder)) return idOrFolder
  return folderToId.get(idOrFolder)
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

export function mergeRuntimeSync(extId: string, payload: ExtensionRuntimeMeta): void {
  const ext = byId.get(extId)
  if (!ext) return
  ext.runtime = payload
  setExtensionChannels(extId, payload.ipcChannels)
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

export function unregisterExtension(extId: string): void {
  const ext = byId.get(extId)
  if (!ext) return
  byId.delete(extId)
  folderToId.delete(ext.folderName)
  ipcChannelsByExtId.delete(extId)
  const idx = loadedExtensions.findIndex((e) => e.id === extId)
  if (idx >= 0) loadedExtensions.splice(idx, 1)
}

export function clearRegistry(): void {
  byId.clear()
  folderToId.clear()
  ipcChannelsByExtId.clear()
  loadedExtensions.length = 0
}

/// <reference types="vite/client" />
import { BrowserWindow, app } from 'electron'
import { execFile } from 'child_process'
import { loadedExtensions, rescanExtensions } from '../extensions/scanner.js'
import { setExtensionEnabled } from '../extensions/disabled.js'
import fs from 'fs'
import path from 'path'
import { EXTENSION_DIR, EXTRACTED_DIR, DATA_DIR } from '../config/paths.js'
import { getExtensionById, getDisplayName, getPreferredLocale } from '../extensions/registry.js'
import { listExtensionsByKind } from './list-by-type.js'
import { kernelLogger, resolveLocale, flattenTranslations, getTextDirection } from '@nuxy/core'
import type { IpcResult } from '@nuxy/core'
import { getConfig, reloadConfig } from '../config/nuxyconfig.js'
import { loadTheme } from '../themes/install.js'
import { listExtensionThemeNames } from '../themes/extension-themes.js'
import { getIcon, listIconPacks } from '../icons/registry.js'
import { applyConfigToWindow } from '../window/runtime.js'

const log = kernelLogger.child('KernelChannels')

function listUikitExtensions(): typeof loadedExtensions {
  return loadedExtensions
    .filter(
      (ext) =>
        !ext.disabled &&
        (ext.manifest.type === 'uikit' || ext.manifest.type === 'helper') &&
        ext.manifest.entry?.frontend
    )
    .sort((a, b) => (a.manifest.priority ?? 100) - (b.manifest.priority ?? 100))
}

function translateSettingsSchema(ext: any, resolvedLocale: string): any {
  if (!ext.settingsSchema) return undefined

  const localesConfig = ext.manifest.locales
  if (!localesConfig) return ext.settingsSchema

  const { supported, default: defaultLocale, dir: localesDir = 'locales' } = localesConfig
  const extFolder = path.join(EXTRACTED_DIR, ext.folderName)

  const tryLoadTranslations = (locale: string): any => {
    try {
      const filePath = path.join(extFolder, localesDir, `${locale}.json`)
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8')
        return JSON.parse(raw)
      }
    } catch {}
    return null
  }

  const translations = tryLoadTranslations(resolvedLocale) ?? tryLoadTranslations(defaultLocale)
  if (!translations || !translations.settings) return ext.settingsSchema

  const fields = ext.settingsSchema.fields.map((field: any) => {
    const tField = translations.settings[field.key]
    if (!tField) return field

    const updatedField = { ...field }
    if (typeof tField === 'object' && tField !== null) {
      if (tField.label) updatedField.label = tField.label
      if (tField.description) updatedField.description = tField.description
      if (tField.placeholder) updatedField.placeholder = tField.placeholder
      if (tField.options && Array.isArray(updatedField.options)) {
        updatedField.options = updatedField.options.map((opt: any) => {
          const optValStr = String(opt.value)
          const optLabel = tField.options[optValStr] ?? opt.label
          return { ...opt, label: optLabel }
        })
      }
    } else if (typeof tField === 'string') {
      updatedField.label = tField
    }
    return updatedField
  })

  return { ...ext.settingsSchema, fields }
}

export async function handleKernelChannel(ch: string, pl: unknown): Promise<IpcResult> {
  if (ch === 'listTools') {
    return { success: true, data: listExtensionsByKind('tool') }
  }

  if (ch === 'listProviders') {
    return { success: true, data: listExtensionsByKind('provider') }
  }

  if (ch === 'listOrchestrators') {
    return { success: true, data: listExtensionsByKind('orchestrator') }
  }

  if (ch === 'listUikitExtensions') {
    return { success: true, data: listUikitExtensions() }
  }

  if (ch === 'getConfig') {
    return { success: true, data: getConfig() }
  }

  if (ch === 'applyWindowSettings') {
    reloadConfig()
    const win = BrowserWindow.getAllWindows()[0]
    if (win && !win.isDestroyed()) applyConfigToWindow(win)
    return { success: true }
  }

  if (ch === 'getTheme') {
    return { success: true, data: loadTheme('dark') }
  }

  if (ch === 'getThemeByName') {
    const args = pl as { name?: string } | undefined
    const name = args?.name
    if (!name || typeof name !== 'string') {
      return { success: false, error: 'Missing theme name', code: 'INVALID_ARGS' }
    }
    return { success: true, data: loadTheme(name) }
  }

  if (ch === 'listThemes') {
    const extNames = listExtensionThemeNames()
    const all = [...new Set(['dark', 'light', ...extNames])]
    return { success: true, data: all }
  }

  if (ch === 'getPreloads') {
    const list = loadedExtensions
      .filter((ext) => !ext.disabled && ext.manifest.entry?.preload)
      .map((ext) => ({
        id: ext.id,
        url: `nuxy-ext://${ext.id}/${ext.manifest.entry!.preload!.replace(/\.ts$/, '.js')}`,
      }))
    return { success: true, data: list }
  }

  if (ch === 'getIcon') {
    const args = pl as { name?: string; pack?: string } | undefined
    const name = args?.name
    if (!name || typeof name !== 'string') {
      return { success: false, error: 'Missing icon name', code: 'INVALID_ARGS' }
    }
    const svg = getIcon(name, args?.pack)
    if (!svg) {
      return { success: false, error: `Icon not found: ${name}`, code: 'NOT_FOUND' }
    }
    return { success: true, data: svg }
  }

  if (ch === 'listIconPacks') {
    return { success: true, data: listIconPacks() }
  }

  if (ch === 'getExtensionSettingsSchemas') {
    const resolvedLocale = getPreferredLocale()
    const schemas = loadedExtensions
      .filter((ext) => ext.settingsSchema)
      .map((ext) => ({
        extId: ext.id,
        name: getDisplayName(ext),
        schema: translateSettingsSchema(ext, resolvedLocale)!,
      }))
    return { success: true, data: schemas }
  }

  if (ch === 'getExtensionTranslations') {
    const args = pl as { extId?: string } | undefined
    const targetExtId = args?.extId
    if (!targetExtId || typeof targetExtId !== 'string') {
      return { success: false, error: 'Missing extId', code: 'INVALID_ARGS' }
    }

    const ext = getExtensionById(targetExtId)
    if (!ext?.manifest.locales) {
      return { success: true, data: { locale: 'en', dir: 'ltr', translations: {} } }
    }

    const {
      supported,
      default: defaultLocale,
      dir: localesDir = 'locales',
    } = ext.manifest.locales

    const settingsFile = path.join(DATA_DIR, 'com.nuxy.settings', 'settings.json')
    let preferredLanguages: string[] = []
    try {
      const raw = fs.readFileSync(settingsFile, 'utf8')
      const parsed = JSON.parse(raw) as { preferredLanguages?: string[] }
      preferredLanguages = parsed.preferredLanguages ?? []
    } catch {}

    const candidates = [...preferredLanguages, app.getLocale()].filter(Boolean)
    const resolved = resolveLocale(candidates, supported, defaultLocale)
    const dir = getTextDirection(resolved)

    const extFolder = path.join(EXTRACTED_DIR, ext.folderName)
    const tryLoad = (locale: string): Record<string, string> | null => {
      try {
        const raw = fs.readFileSync(path.join(extFolder, localesDir, `${locale}.json`), 'utf8')
        return flattenTranslations(JSON.parse(raw))
      } catch {
        return null
      }
    }

    const translations = tryLoad(resolved) ?? tryLoad(defaultLocale) ?? {}
    return { success: true, data: { locale: resolved, dir, translations } }
  }

  if (ch === 'listSystemFonts') {
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
  }

  if (ch === 'listInstalledExtensions') {
    const mapped = loadedExtensions.map((ext) => ({
      ...ext,
      manifest: { ...ext.manifest, name: getDisplayName(ext) },
    }))
    return { success: true, data: mapped }
  }

  if (ch === 'uninstallExtension') {
    const args = pl as { extId?: string } | undefined
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
      setTimeout(() => void rescanExtensions(), 100)
      return { success: true }
    } catch (e: any) {
      log.error(`Failed to uninstall extension ${extId}`, e)
      return { success: false, error: `Uninstall failed: ${e.message}`, code: 'ERROR' }
    }
  }

  if (ch === 'setExtensionEnabled') {
    const args = pl as { extId?: string; enabled?: boolean } | undefined
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
    setExtensionEnabled(extId, enabled)
    setTimeout(() => void rescanExtensions(), 100)
    return { success: true }
  }

  if (ch === 'installExtension') {
    const args = pl as { extId?: string; downloadUrl?: string } | undefined
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
      setTimeout(() => void rescanExtensions(), 100)
      return { success: true }
    } catch (e: any) {
      log.error(`Failed to install extension ${extId}`, e)
      return { success: false, error: `Installation failed: ${e.message}`, code: 'ERROR' }
    }
  }

  return { success: false, error: `Unknown kernel channel: ${ch}`, code: 'UNKNOWN_CHANNEL' }
}

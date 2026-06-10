import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { loadedExtensions } from '../../extensions/scanner.js'
import { getExtensionById, getDisplayName, getPreferredLocale } from '../../extensions/registry.js'
import { EXTRACTED_DIR, DATA_DIR } from '../../config/paths.js'
import { kernelLogger, resolveLocale, flattenTranslations, getTextDirection } from '@nuxy/core'
import type { IpcResult } from '@nuxy/core'

const log = kernelLogger.child('KernelI18n')

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
          const optLabel = tField.options[optValStr] ?? optValStr
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

type Handler = (payload: unknown) => IpcResult | Promise<IpcResult>

export const i18nHandlers: Record<string, Handler> = {
  getExtensionSettingsSchemas: () => {
    const resolvedLocale = getPreferredLocale()
    const schemas = loadedExtensions
      .filter((ext) => ext.settingsSchema)
      .map((ext) => ({
        extId: ext.id,
        name: getDisplayName(ext),
        schema: translateSettingsSchema(ext, resolvedLocale)!,
      }))
    return { success: true, data: schemas }
  },

  getExtensionTranslations: (payload) => {
    const args = payload as { extId?: string } | undefined
    const targetExtId = args?.extId
    if (!targetExtId || typeof targetExtId !== 'string') {
      return { success: false, error: 'Missing extId', code: 'INVALID_ARGS' }
    }

    const ext = getExtensionById(targetExtId)
    if (!ext) {
      return { success: false, error: 'Extension not registered yet', code: 'NOT_FOUND' }
    }
    if (!ext.manifest.locales) {
      return { success: true, data: { locale: 'en', dir: 'ltr', translations: {} } }
    }

    const { supported, default: defaultLocale, dir: localesDir = 'locales' } = ext.manifest.locales

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
  },
}

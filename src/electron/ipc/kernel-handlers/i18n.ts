import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { loadedExtensions } from '../../extensions/scanner.js'
import { getExtensionById, getDisplayName, getPreferredLocale } from '../../extensions/registry.js'
import { EXTRACTED_DIR, DATA_DIR } from '../../config/paths.js'
import {
  resolveLocale,
  flattenTranslations,
  mergeTranslations,
  getTextDirection,
} from '@nuxyorg/core'
import type { ExtensionSettingsSchema, IpcResult, LoadedExtension } from '@nuxyorg/core'

/** Read the live settings schema from the extracted extension folder (avoids stale in-memory cache). */
export function readSettingsSchemaFromDisk(
  ext: LoadedExtension
): ExtensionSettingsSchema | undefined {
  const settingsFile = ext.manifest.entry?.settings
  if (!settingsFile) return ext.settingsSchema

  const settingsPath = path.join(EXTRACTED_DIR, ext.folderName, settingsFile)
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as ExtensionSettingsSchema
    }
  } catch {}

  return ext.settingsSchema
}

function translateSettingsSchema(
  ext: LoadedExtension,
  resolvedLocale: string
): ExtensionSettingsSchema | undefined {
  const baseSchema = readSettingsSchemaFromDisk(ext)
  if (!baseSchema) return undefined

  const localesConfig = ext.manifest.locales
  if (!localesConfig) return baseSchema

  const { default: defaultLocale, dir: localesDir = 'locales' } = localesConfig
  const extFolder = path.join(EXTRACTED_DIR, ext.folderName)

  const tryLoadTranslations = (locale: string): Record<string, unknown> | null => {
    try {
      const filePath = path.join(extFolder, localesDir, `${locale}.json`)
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8')
        return JSON.parse(raw) as Record<string, unknown>
      }
    } catch {}
    return null
  }

  const translations = tryLoadTranslations(resolvedLocale) ?? tryLoadTranslations(defaultLocale)
  const settingsTranslations = translations?.settings as Record<string, unknown> | undefined
  if (!settingsTranslations) return baseSchema

  const fields = baseSchema.fields.map((field) => {
    const tField = settingsTranslations[field.key]
    if (!tField) return field

    const updatedField = { ...field }
    if (typeof tField === 'object' && tField !== null) {
      const tf = tField as Record<string, unknown>
      if (typeof tf.label === 'string') updatedField.label = tf.label
      if (typeof tf.description === 'string') updatedField.description = tf.description
      if (typeof tf.placeholder === 'string') updatedField.placeholder = tf.placeholder
      const tOptions = tf.options as Record<string, string> | undefined
      if (tOptions && Array.isArray(updatedField.options)) {
        updatedField.options = updatedField.options.map((opt) => {
          const optValStr = String(opt.value)
          const optLabel = tOptions[optValStr] ?? opt.label ?? optValStr
          return { ...opt, label: optLabel }
        })
      }
    } else if (typeof tField === 'string') {
      updatedField.label = tField
    }
    return updatedField
  })

  return { ...baseSchema, fields }
}

type Handler = (payload: unknown) => IpcResult | Promise<IpcResult>

export const i18nHandlers: Record<string, Handler> = {
  getExtensionSettingsSchemas: () => {
    const resolvedLocale = getPreferredLocale()
    const schemas = loadedExtensions
      .filter((ext) => readSettingsSchemaFromDisk(ext))
      .map((ext) => {
        const schema = translateSettingsSchema(ext, resolvedLocale)!
        return {
          extId: ext.id,
          name: getDisplayName(ext),
          schema,
        }
      })
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

    const defaultTranslations = tryLoad(defaultLocale) ?? {}
    const resolvedTranslations =
      resolved === defaultLocale ? defaultTranslations : tryLoad(resolved)
    const translations =
      resolved === defaultLocale || !resolvedTranslations
        ? defaultTranslations
        : mergeTranslations(defaultTranslations, resolvedTranslations)
    return { success: true, data: { locale: resolved, dir, translations } }
  },
}

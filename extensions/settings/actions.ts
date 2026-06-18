import { applyUiFontSettings } from '@nuxyorg/extension-sdk'
import type { NuxySettings, AnyRow } from './types.ts'

const EXT_ID = 'com.nuxy.settings'

export interface SettingsActionsContext {
  getSettings: () => NuxySettings
  getExtValues: () => Record<string, Record<string, unknown>>
  getFontFamilyMap: () => Record<string, string>
  setSettings: (next: NuxySettings) => void
  patchExtValues: (extId: string, values: Record<string, unknown>) => void
  setActiveSelect: (key: string | null) => void
}

export function createSettingsActions(ctx: SettingsActionsContext) {
  const applyTheme = (name: string): void => {
    if (!name || !window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke('kernel', 'getThemeByName', { name })
      .then((res) => {
        const r = res as {
          success: boolean
          data?: { colors?: Record<string, string>; tokens?: Record<string, string> }
        }
        if (!r?.success || !r.data) return
        const { colors, tokens } = r.data
        const root = document.documentElement
        Array.from({ length: root.style.length }, (_, i) => root.style[i])
          .filter((p) => p.startsWith('--'))
          .forEach((p) => root.style.removeProperty(p))
        if (colors) Object.entries(colors).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
        if (tokens) Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
      })
      .catch(() => {})
  }

  const applySettings = (s: NuxySettings): void => {
    if (s.zoom) document.documentElement.style.zoom = s.zoom
    applyUiFontSettings({
      font: s.font,
      fontWeight: s.fontWeight,
      fontFamilyMap: ctx.getFontFamilyMap(),
    })
    if (s.theme) applyTheme(String(s.theme))
  }

  const updateSetting = (key: keyof NuxySettings, value: unknown): void => {
    const settings = ctx.getSettings()
    const next: NuxySettings = { ...settings, [key]: value }
    ctx.setSettings(next)
    applySettings(next)
    ctx.setActiveSelect(null)
    window.core?.events?.emit('settings-updated', next as Record<string, unknown>)
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'saveSettings', next)
      .then(() => {
        if (key === 'preferredLanguages') window.core?.events?.emit('locale-changed')
        window.core.ipc.invoke('kernel', 'applyWindowSettings', next).catch(() => {})
      })
      .catch(() => {})
  }

  const addLanguage = (code: string): void => {
    if (!code) return
    const settings = ctx.getSettings()
    const current = (settings.preferredLanguages || []).filter(Boolean)
    if (current.includes(code)) return
    updateSetting('preferredLanguages', [...current, code])
  }

  const removeLanguage = (code: string): void => {
    const settings = ctx.getSettings()
    const current = (settings.preferredLanguages || []).filter(Boolean)
    updateSetting(
      'preferredLanguages',
      current.filter((l) => l !== code)
    )
  }

  const updateExtSetting = (extId: string, key: string, value: unknown): void => {
    const extValues = ctx.getExtValues()
    const next = { ...(extValues[extId] || {}), [key]: value }
    ctx.patchExtValues(extId, next)
    ctx.setActiveSelect(null)
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'saveExtensionSettingValues', { extId, values: next })
      .catch(() => {})
  }

  const toggleExtension = (extId: string, enabled: boolean): void => {
    ctx.setActiveSelect(null)
    if (!window.core?.ipc?.invoke) return
    window.core.ipc.invoke('kernel', 'setExtensionEnabled', { extId, enabled }).catch(() => {})
  }

  const handleRowSelect = (row: AnyRow, value: unknown): void => {
    const isLang = 'isLanguage' in row && row.isLanguage
    const isToggle = 'isExtToggle' in row && row.isExtToggle
    if (isLang) addLanguage(value as string)
    else if (isToggle) toggleExtension(row.extId, value as boolean)
    else if (row.isExtension) updateExtSetting(row.extId, row.fieldKey, value)
    else updateSetting(row.key as keyof NuxySettings, value)
  }

  const handleExtInputChange = (row: AnyRow, value: string): void => {
    if (!row.isExtension) return
    const extValues = ctx.getExtValues()
    ctx.patchExtValues(row.extId, { ...(extValues[row.extId] || {}), [row.fieldKey]: value })
    if (row.type === 'color') updateExtSetting(row.extId, row.fieldKey, value)
  }

  const handleExtInputBlur = (row: AnyRow, value: string): void => {
    if (row.isExtension) updateExtSetting(row.extId, row.fieldKey, value)
  }

  return {
    applySettings,
    updateSetting,
    addLanguage,
    removeLanguage,
    updateExtSetting,
    toggleExtension,
    handleRowSelect,
    handleExtInputChange,
    handleExtInputBlur,
  }
}

export type SettingsActions = ReturnType<typeof createSettingsActions>

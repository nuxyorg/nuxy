import type { NuxySettings, AnyRow } from '../types.ts'

const EXT_ID = 'com.nuxy.settings'

export interface SettingsActionsParams {
  settings: NuxySettings
  extValues: Record<string, Record<string, unknown>>
  fontFamilyMap: Record<string, string>
  setSettings: React.Dispatch<React.SetStateAction<NuxySettings>>
  setExtValues: React.Dispatch<React.SetStateAction<Record<string, Record<string, unknown>>>>
  setActiveSelect: React.Dispatch<React.SetStateAction<string | null>>
}

export interface SettingsActions {
  applySettings: (s: NuxySettings) => void
  updateSetting: (key: keyof NuxySettings, value: unknown) => void
  addLanguage: (code: string) => void
  removeLanguage: (code: string) => void
  updateExtSetting: (extId: string, key: string, value: unknown) => void
  toggleExtension: (extId: string, enabled: boolean) => void
  /** Route a SelectBox onSelect to the correct update function for any row type. */
  handleRowSelect: (row: AnyRow, value: unknown) => void
  /** Handle live text/color input change for extension input rows. */
  handleExtInputChange: (row: AnyRow, value: string) => void
  /** Persist extension input field value on blur. */
  handleExtInputBlur: (row: AnyRow, value: string) => void
}

export function useSettingsActions({
  settings,
  extValues,
  fontFamilyMap,
  setSettings,
  setExtValues,
  setActiveSelect,
}: SettingsActionsParams): SettingsActions {
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
        if (colors) Object.entries(colors).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
        if (tokens) Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
      })
      .catch(() => {})
  }

  const applySettings = (s: NuxySettings): void => {
    if (s.zoom) document.documentElement.style.zoom = s.zoom
    if (s.font) document.body.style.fontFamily = fontFamilyMap[s.font] || String(s.font)
    if (s.theme) applyTheme(String(s.theme))
  }

  const updateSetting = (key: keyof NuxySettings, value: unknown): void => {
    const next: NuxySettings = { ...settings, [key]: value }
    setSettings(next)
    applySettings(next)
    setActiveSelect(null)

    window.dispatchEvent(new CustomEvent('nuxy-settings-updated', { detail: next }))

    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'saveSettings', next)
      .then(() => {
        if (key === 'preferredLanguages') {
          window.dispatchEvent(new CustomEvent('nuxy-locale-changed'))
        }
        window.core.ipc.invoke('kernel', 'applyWindowSettings', next).catch(() => {})
      })
      .catch(() => {})
  }

  const addLanguage = (code: string): void => {
    if (!code) return
    const current = (settings.preferredLanguages || []).filter(Boolean)
    if (current.includes(code)) return
    updateSetting('preferredLanguages', [...current, code])
  }

  const removeLanguage = (code: string): void => {
    const current = (settings.preferredLanguages || []).filter(Boolean)
    updateSetting(
      'preferredLanguages',
      current.filter((l) => l !== code)
    )
  }

  const updateExtSetting = (extId: string, key: string, value: unknown): void => {
    const next = { ...(extValues[extId] || {}), [key]: value }
    setExtValues((prev) => ({ ...prev, [extId]: next }))
    setActiveSelect(null)
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'saveExtensionSettingValues', { extId, values: next })
      .catch(() => {})
  }

  const toggleExtension = (extId: string, enabled: boolean): void => {
    setActiveSelect(null)
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
    setExtValues((prev) => ({
      ...prev,
      [row.extId]: { ...(prev[row.extId] || {}), [row.fieldKey]: value },
    }))
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

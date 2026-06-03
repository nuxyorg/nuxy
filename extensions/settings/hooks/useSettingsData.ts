const React = window.React

import type { NuxySettings, SelectOption, ExtSettingsInfo } from '../types.ts'
import { DEFAULT_SETTINGS } from '../utils/settingsOptions.ts'

const EXT_ID = 'com.nuxy.settings'

export interface InstalledExtension {
  id: string
  manifest: { name: string; bootstrap?: boolean; type: string }
  disabled?: boolean
}

export interface SettingsData {
  themes: SelectOption[]
  iconPacks: SelectOption[]
  systemFonts: string[]
  settings: NuxySettings
  setSettings: React.Dispatch<React.SetStateAction<NuxySettings>>
  extSchemas: ExtSettingsInfo[]
  extValues: Record<string, Record<string, unknown>>
  setExtValues: React.Dispatch<React.SetStateAction<Record<string, Record<string, unknown>>>>
  installedExtensions: InstalledExtension[]
}

export function useSettingsData(): SettingsData {
  const [themes, setThemes] = React.useState<SelectOption[]>([])
  const [iconPacks, setIconPacks] = React.useState<SelectOption[]>([])
  const [systemFonts, setSystemFonts] = React.useState<string[]>([])
  const [settings, setSettings] = React.useState<NuxySettings>(DEFAULT_SETTINGS)
  const [extSchemas, setExtSchemas] = React.useState<ExtSettingsInfo[]>([])
  const [extValues, setExtValues] = React.useState<Record<string, Record<string, unknown>>>({})
  const [installedExtensions, setInstalledExtensions] = React.useState<InstalledExtension[]>([])

  // Load themes
  React.useEffect(() => {
    window.core.themes
      ?.list()
      .then((res) => {
        const r = res as { success: boolean; data?: unknown[] }
        if (r?.success && Array.isArray(r.data)) {
          setThemes(r.data.map((name) => ({ value: name as string, label: name as string })))
        }
      })
      .catch(() => {})
  }, [])

  // Load icon packs
  React.useEffect(() => {
    window.core.icons
      ?.listPacks()
      .then((res) => {
        const r = res as { success: boolean; data?: unknown[] }
        if (r?.success && Array.isArray(r.data)) {
          setIconPacks(r.data.map((name) => ({ value: name as string, label: name as string })))
        }
      })
      .catch(() => {})
  }, [])

  // Load system fonts
  React.useEffect(() => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke('kernel', 'listSystemFonts', {})
      .then((res) => {
        const r = res as { success: boolean; data?: unknown[] }
        if (r?.success && Array.isArray(r.data)) {
          setSystemFonts(r.data as string[])
        }
      })
      .catch(() => {})
  }, [])

  // Load settings values + apply on mount (applySettings passed in via callback to avoid circular dep)
  React.useEffect(() => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'getSettings', {})
      .then((res) => {
        const r = res as { success: boolean; data?: NuxySettings }
        if (r?.success && r.data) {
          setSettings(r.data)
          // Apply zoom + font immediately so the UI reflects saved settings
          if (r.data.zoom) document.documentElement.style.zoom = r.data.zoom
          if (r.data.font) {
            // font-family application is handled by useSettingsActions once fontFamilyMap is built
          }
          window.dispatchEvent(new CustomEvent('nuxy-settings-loaded', { detail: r.data }))
        }
      })
      .catch(() => {})
  }, [])

  // Load extension schemas + per-extension values
  React.useEffect(() => {
    if (!window.core?.ipc?.invoke) return

    window.core.ipc
      .invoke('kernel', 'listInstalledExtensions', {})
      .then((res) => {
        const r = res as { success: boolean; data?: unknown[] }
        if (r?.success && Array.isArray(r.data)) {
          setInstalledExtensions(r.data as InstalledExtension[])
        }
      })
      .catch(() => {})

    window.core.ipc
      .invoke('kernel', 'getExtensionSettingsSchemas', {})
      .then((res) => {
        const r = res as { success: boolean; data?: ExtSettingsInfo[] }
        if (r?.success && Array.isArray(r.data) && r.data.length > 0) {
          setExtSchemas(r.data)
          r.data.forEach((info: ExtSettingsInfo) => {
            window.core.ipc
              .invoke(EXT_ID, 'getExtensionSettingValues', info.extId)
              .then((vRes) => {
                const vr = vRes as { success: boolean; data?: Record<string, unknown> }
                if (vr?.success && vr.data) {
                  setExtValues((prev) => ({ ...prev, [info.extId]: vr.data! }))
                }
              })
              .catch(() => {})
          })
        }
      })
      .catch(() => {})
  }, [])

  return {
    themes,
    iconPacks,
    systemFonts,
    settings,
    setSettings,
    extSchemas,
    extValues,
    setExtValues,
    installedExtensions,
  }
}

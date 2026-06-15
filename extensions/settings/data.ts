import type { NuxySettings, SelectOption, ExtSettingsInfo } from './types.ts'
import { DEFAULT_SETTINGS } from './utils/settingsOptions.ts'

const EXT_ID = 'com.nuxy.settings'
const OLLAMA_EXT_ID = 'com.nuxy.ollama'

export interface InstalledExtension {
  id: string
  manifest: { name: string; bootstrap?: boolean; type: string }
  disabled?: boolean
}

export interface SettingsDataState {
  themes: SelectOption[]
  iconPacks: SelectOption[]
  systemFonts: string[]
  settings: NuxySettings
  extSchemas: ExtSettingsInfo[]
  extValues: Record<string, Record<string, unknown>>
  installedExtensions: InstalledExtension[]
  ollamaModelOptions: SelectOption[]
}

export type SettingsDataPatch = Partial<SettingsDataState>

export function loadSettingsData(onPatch: (patch: SettingsDataPatch) => void): () => void {
  const cleanups: Array<() => void> = []

  if (!window.core?.ipc) return () => {}

  window.core.themes
    ?.list()
    .then((res) => {
      const r = res as { success: boolean; data?: unknown[] }
      if (r?.success && Array.isArray(r.data)) {
        onPatch({
          themes: r.data.map((name) => ({ value: name as string, label: name as string })),
        })
      }
    })
    .catch(() => {})

  window.core.icons
    ?.listPacks()
    .then((res) => {
      const r = res as { success: boolean; data?: unknown[] }
      if (r?.success && Array.isArray(r.data)) {
        onPatch({
          iconPacks: [
            { value: '', label: '' },
            ...r.data.map((name) => ({ value: name as string, label: name as string })),
          ],
        })
      }
    })
    .catch(() => {})

  window.core.ipc
    .invoke('kernel', 'listSystemFonts', {})
    .then((res) => {
      const r = res as { success: boolean; data?: unknown[] }
      if (r?.success && Array.isArray(r.data)) onPatch({ systemFonts: r.data as string[] })
    })
    .catch(() => {})

  window.core.ipc
    .invoke(EXT_ID, 'getSettings', {})
    .then((res) => {
      const r = res as { success: boolean; data?: NuxySettings }
      if (r?.success && r.data) {
        onPatch({ settings: r.data })
        if (r.data.zoom) document.documentElement.style.zoom = r.data.zoom
        window.core?.events?.emit('settings-loaded', r.data as Record<string, unknown>)
      }
    })
    .catch(() => {})

  const fetchExtData = () => {
    window.core.ipc
      .invoke('kernel', 'listInstalledExtensions', {})
      .then((res) => {
        const r = res as { success: boolean; data?: unknown[] }
        if (r?.success && Array.isArray(r.data)) {
          onPatch({ installedExtensions: r.data as InstalledExtension[] })
        }
      })
      .catch(() => {})

    window.core.ipc
      .invoke('kernel', 'getExtensionSettingsSchemas', {})
      .then((res) => {
        const r = res as { success: boolean; data?: ExtSettingsInfo[] }
        if (r?.success && Array.isArray(r.data) && r.data.length > 0) {
          onPatch({ extSchemas: r.data })
          if (r.data.some((info) => info.extId === OLLAMA_EXT_ID)) {
            window.core.ipc
              .invoke(OLLAMA_EXT_ID, 'models', {})
              .then((mRes) => {
                const mr = mRes as { success: boolean; data?: string[] }
                if (mr?.success && Array.isArray(mr.data) && mr.data.length > 0) {
                  onPatch({
                    ollamaModelOptions: mr.data.map((name) => ({ value: name, label: name })),
                  })
                }
              })
              .catch(() => {})
          }
          r.data.forEach((info) => {
            window.core.ipc
              .invoke(EXT_ID, 'getExtensionSettingValues', info.extId)
              .then((vRes) => {
                const vr = vRes as { success: boolean; data?: Record<string, unknown> }
                if (vr?.success && vr.data) {
                  onPatch({ extValues: { [info.extId]: vr.data } })
                }
              })
              .catch(() => {})
          })
        }
      })
      .catch(() => {})
  }

  fetchExtData()
  const offLocale = window.core?.events?.on('locale-changed', fetchExtData)
  if (offLocale) cleanups.push(offLocale)

  return () => cleanups.forEach((fn) => fn())
}

export function createDefaultSettingsData(): SettingsDataState {
  return {
    themes: [],
    iconPacks: [],
    systemFonts: [],
    settings: DEFAULT_SETTINGS,
    extSchemas: [],
    extValues: {},
    installedExtensions: [],
    ollamaModelOptions: [],
  }
}

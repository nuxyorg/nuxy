export type ExtensionType = 'tool' | 'provider' | 'orchestrator' | 'theme' | 'iconpack' | 'uikit'

export type ExtensionPermission =
  | 'storage'
  | 'clipboard'
  | 'network'
  | 'notifications'
  | 'media'
  | 'shell'
  | 'settings.read'
  | 'settings.write'

export type ExtensionSettingType = 'text' | 'select' | 'color' | 'location' | 'list' | 'toggle'

export interface ExtensionSettingField {
  key: string
  label: string
  type: ExtensionSettingType
  default?: unknown
  options?: Array<{ value: unknown; label: string }>
  placeholder?: string
  description?: string
}

export interface ExtensionSettingsSchema {
  version?: number
  fields: ExtensionSettingField[]
}

export interface ExtensionSettingsInfo {
  extId: string
  name: string
  schema: ExtensionSettingsSchema
}

export interface ExtensionManifest {
  id: string
  name: string
  version: string
  type: ExtensionType
  /** When true, core loads this extension's frontend as the launcher shell. */
  bootstrap?: boolean
  /** Logical icon name from the active icon pack (e.g. "clipboard", "calendar"). */
  icon?: string
  permissions?: ExtensionPermission[]
  capabilities?: {
    callable?: boolean
    caller?: boolean
  }
  /**
   * Load order priority for uikit extensions. Lower numbers load first.
   * Only relevant when type is 'uikit'. Defaults to 100.
   */
  priority?: number
  entry?: {
    backend?: string
    frontend?: string
    /** Path to a ThemeDefinition JSON file within the extension folder. */
    theme?: string
    /** Path to an IconPackDefinition JSON file within the extension folder. */
    icons?: string
    /** Path to an ExtensionSettingsSchema JSON file within the extension folder. */
    settings?: string
  }
}

export interface ExtensionRuntimeMeta {
  ipcChannels: string[]
  displayName?: string
}

export interface LoadedExtension {
  /** Canonical extension id from manifest.id */
  id: string
  /** Directory name under ~/.nuxy/extensions/ */
  folderName: string
  manifest: ExtensionManifest
  runtime?: ExtensionRuntimeMeta
  settingsSchema?: ExtensionSettingsSchema
}

export interface IpcResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export interface ThemeDefinition {
  version: number
  name: string
  colors: Record<string, string>
  tokens?: Record<string, string>
  /** CSS class name overrides for shell UI elements (e.g. container, itemActive). */
  styles?: Record<string, string>
}

export interface IconPackDefinition {
  version: number
  name: string
  /** Map of logical icon name → SVG string. */
  icons: Record<string, string>
}

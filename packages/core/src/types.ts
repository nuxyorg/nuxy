export type ExtensionType = 'tool' | 'provider' | 'orchestrator' | 'theme' | 'iconpack'

export type ExtensionPermission = 'storage' | 'clipboard' | 'network' | 'notifications' | 'media'

export interface ExtensionManifest {
  id: string
  name: string
  version: string
  type: ExtensionType
  /** When true, core loads this extension's frontend as the launcher shell. */
  bootstrap?: boolean
  permissions?: ExtensionPermission[]
  capabilities?: {
    callable?: boolean
    caller?: boolean
  }
  entry?: {
    backend?: string
    frontend?: string
    /** Path to a ThemeDefinition JSON file within the extension folder. */
    theme?: string
    /** Path to an IconPackDefinition JSON file within the extension folder. */
    icons?: string
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

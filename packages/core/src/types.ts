export type ExtensionType = 'tool' | 'provider' | 'orchestrator'

export type ExtensionPermission =
  | 'storage'
  | 'clipboard'
  | 'network'
  | 'notifications'
  | 'media'

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
}

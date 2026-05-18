export type ExtensionType = 'tool' | 'provider' | 'orchestrator'

export interface ExtensionManifest {
  id: string
  name: string
  version: string
  type: ExtensionType
  capabilities?: {
    callable?: boolean
    caller?: boolean
  }
  entry?: {
    backend?: string
    frontend?: string
  }
}

export interface LoadedExtension {
  /** Canonical extension id from manifest.id */
  id: string
  /** Directory name under ~/.nuxy/extensions/ */
  folderName: string
  manifest: ExtensionManifest
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
  styles: Record<string, string>
}

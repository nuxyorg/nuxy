import type { ExtensionManifest } from '@nuxy/extension-sdk'

export interface Tool {
  id: string
  manifest: ExtensionManifest & {
    name: string
    icon?: string
  }
}

export interface Provider {
  id: string
  manifest: ExtensionManifest & {
    name: string
    providerType?: 'list' | 'result' | 'compare'
  }
}

export interface Orchestrator {
  id: string
  manifest: ExtensionManifest & {
    name: string
  }
}

export interface ShellConfig {
  windowWidth?: number
  windowMaxHeight?: number
  windowPosition?: string
  opacity?: number
  theme?: string
  zoom?: string
  font?: string
}

export interface ListItem {
  id: string
  title: string
  subtitle?: string
  isTool?: boolean
  value?: string
}

export interface ProviderState {
  loading: boolean
  items: ListItem[]
  type: 'list' | 'result' | 'compare'
  name: string
}

export interface KeyAction {
  key: string
  modifiers?: string[]
  label: string
  hint?: string | string[]
  activeOn?: () => boolean
  handler: () => void
  onExecute?: () => void
}

export interface CommandPaletteAction {
  id: string
  label: string
  onExecute?: () => void
}

export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number | null
  height: number | null
}

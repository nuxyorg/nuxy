import type { ExtensionManifest } from '@nuxyorg/extension-sdk'
import type { HoldMsPreset } from './hold-ms.ts'

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
    providerGroup?: string
    providerGroupLabel?: string
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
  fontWeight?: string
  kbdScheme?: string
  holdMs?: HoldMsPreset
}

export interface ListItem {
  id: string
  title: string
  subtitle?: string
  icon?: string
  isTool?: boolean
  value?: string
  execute?: {
    channel: string
    payload?: unknown
  }
}

export interface ProviderState {
  loading: boolean
  items: ListItem[]
  type: 'list' | 'result' | 'compare'
  name: string
}

export interface HoldProgress {
  ms: number
  hint: string | string[]
}

export interface KeyAction {
  key: string
  modifiers?: string[]
  label: string
  hint?: string | string[]
  activeOn?: () => boolean
  handler: () => void
  onExecute?: () => void
  allowRepeat?: boolean
  trigger?: 'press' | 'hold'
  holdMs?: number
  holdCancelToast?: string
}

export interface CommandPaletteAction {
  id: string
  label: string
  /** Optional Ctrl+K section id for divider grouping in the palette. */
  section?: string
  onExecute?: () => void
  children?: CommandPaletteAction[]
}

export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number | null
  height: number | null
}

export interface UsageEntry {
  count: number
  queries: string[]
}

export type UsageStats = Record<string, UsageEntry>

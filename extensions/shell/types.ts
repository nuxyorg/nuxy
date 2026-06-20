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
  /** Result/compare provider card shown in the top results zone. */
  isProviderCard?: boolean
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

export type { ShellAction } from '@nuxyorg/core'

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

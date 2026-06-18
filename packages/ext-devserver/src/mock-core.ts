import { applyUiFontSettings } from '@nuxyorg/extension-sdk'
import fileMocks from 'virtual:ext-mocks'
import { createEventsBridge, createShellBridge } from './dev-bridges'
import type { DevExtensionInfo, DevIconPack, DevTheme } from './dev-env'
import { toIconKebab } from './dev-env'
import { loadDevExtensionTranslations, registerDevLocaleExtensions } from './dev-i18n'
import type { DevLocaleExtension } from './dev-i18n'

type IpcResult = { success: boolean; data?: unknown; error?: string; hasHandler?: boolean }

export type MockSource = 'ui' | 'backend' | 'file' | 'null'

export interface LogEntry {
  extId: string
  channel: string
  payload: unknown
  data: unknown
  source: MockSource
  ts: number
}

export const ipcLog: LogEntry[] = []

export const runtimeMocks: Record<string, unknown> = {}

let devExtension: DevExtensionInfo | null = null
let defaultTheme: DevTheme | null = null
let iconPack: DevIconPack | null = null

export function setMock(channel: string, value: unknown): void {
  runtimeMocks[channel] = value
}

export function clearMock(channel: string): void {
  delete runtimeMocks[channel]
}

function kernelDefault(channel: string, payload?: unknown): unknown {
  if (!devExtension) return null

  switch (channel) {
    case 'listTools':
      return [
        {
          id: devExtension.id,
          manifest: {
            id: devExtension.id,
            name: devExtension.name,
            version: '1.0.0',
            type: 'tool',
            icon: 'settings',
          },
        },
      ]
    case 'listProviders':
      return []
    case 'listOrchestrators':
      return []
    case 'getConfig':
      return {
        windowWidth: 800,
        windowMaxHeight: 600,
        opacity: 1,
        theme: 'dark',
        zoom: '100%',
        font: 'system',
        windowPosition: '1/2, 1/2',
        holdMs: 'long',
      }
    case 'getTheme':
      return defaultTheme
        ? {
            version: 1,
            name: 'dark',
            colors: defaultTheme.colors ?? {},
            tokens: defaultTheme.tokens ?? {},
          }
        : null
    case 'getThemeByName':
      return defaultTheme
        ? {
            version: 1,
            name: 'dark',
            colors: defaultTheme.colors ?? {},
            tokens: defaultTheme.tokens ?? {},
          }
        : null
    case 'getDefaultThemeName':
      return 'dark'
    case 'listThemes':
      return ['dark']
    case 'listIconPacks':
      return iconPack ? [iconPack.name] : []
    case 'getIconPack':
      return iconPack
    case 'getIcon': {
      const args = payload as { name?: string } | undefined
      const name = args?.name
      if (!name || typeof name !== 'string') return null
      return null
    }
    case 'getExtensionSummary':
      return { tools: 1, themes: 1, uikit: 1, iconpacks: iconPack ? 1 : 0 }
    case 'getToolElementTag': {
      const args = payload as { extId?: string } | undefined
      return args?.extId === devExtension.id ? devExtension.element : null
    }
    case 'listSystemFonts':
      return ['system', 'Inter', 'Roboto', 'Ubuntu', 'JetBrains Mono', 'Fira Code', 'Noto Sans']
    case 'listInstalledExtensions':
      return [
        {
          id: devExtension.id,
          manifest: {
            name: devExtension.name,
            type: 'tool',
            bootstrap: devExtension.id === 'com.nuxy.shell',
          },
          disabled: false,
        },
      ]
    case 'getExtensionSettingsSchemas':
      return []
    default:
      return null
  }
}

async function mockInvoke(extId: string, channel: string, payload?: unknown): Promise<IpcResult> {
  if (extId === 'kernel' && !Object.prototype.hasOwnProperty.call(runtimeMocks, channel)) {
    if (channel === 'getExtensionTranslations') {
      const args = payload as { extId?: string } | undefined
      const data = await loadDevExtensionTranslations(args?.extId)
      if (data) {
        ipcLog.push({ extId, channel, payload, data, source: 'backend', ts: Date.now() })
        return { success: true, data }
      }
      ipcLog.push({ extId, channel, payload, data: null, source: 'null', ts: Date.now() })
      return { success: false, error: 'Extension not registered', code: 'NOT_FOUND' }
    }

    const fm = (fileMocks as Record<string, unknown>)[channel]
    if (fm !== undefined) {
      const data = typeof fm === 'function' ? await (fm as (p: unknown) => unknown)(payload) : fm
      ipcLog.push({ extId, channel, payload, data, source: 'file', ts: Date.now() })
      return { success: true, data }
    }

    const data = kernelDefault(channel, payload)
    ipcLog.push({ extId, channel, payload, data, source: 'null', ts: Date.now() })
    return { success: true, data }
  }

  if (Object.prototype.hasOwnProperty.call(runtimeMocks, channel)) {
    const m = runtimeMocks[channel]
    const data = typeof m === 'function' ? await (m as (p: unknown) => unknown)(payload) : m
    ipcLog.push({ extId, channel, payload, data, source: 'ui', ts: Date.now() })
    return { success: true, data }
  }

  try {
    const res = await fetch('/api/invoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extId, channel, payload }),
    })
    if (res.ok) {
      const result: IpcResult = await res.json()
      const source: MockSource = result.hasHandler ? 'backend' : 'null'
      ipcLog.push({ extId, channel, payload, data: result.data, source, ts: Date.now() })
      return { success: result.success, data: result.data }
    }
  } catch {
    /* server not ready yet, fall through */
  }

  const fm = (fileMocks as Record<string, unknown>)[channel]
  if (fm !== undefined) {
    const data = typeof fm === 'function' ? await (fm as (p: unknown) => unknown)(payload) : fm
    ipcLog.push({ extId, channel, payload, data, source: 'file', ts: Date.now() })
    return { success: true, data }
  }

  ipcLog.push({ extId, channel, payload, data: null, source: 'null', ts: Date.now() })
  return { success: true, data: null }
}

export function setupMockCore(
  extension: DevExtensionInfo,
  options?: {
    theme?: DevTheme | null
    iconPack?: DevIconPack | null
    localeExtensions?: DevLocaleExtension[]
  }
): void {
  devExtension = extension
  defaultTheme = options?.theme ?? null
  iconPack = options?.iconPack ?? null
  if (options?.localeExtensions?.length) {
    registerDevLocaleExtensions(options.localeExtensions)
  }
  ;(window as any).core = {
    ipc: { invoke: mockInvoke },
    window: {
      hide: () => {},
      resize: () => {},
      center: () => {},
      drag: () => {},
      onShow: () => () => {},
      esc: () => {},
      setBlurSuppressed: () => {},
      setBlurSuppressedSync: async () => ({ suppressed: false }),
      clearBlurSuppressed: () => {},
    },
    icons: {
      get: async (name: string) => {
        const key = toIconKebab(name)
        try {
          const res = await fetch(`/dev/icons/${key}.svg`)
          if (res.ok) return await res.text()
        } catch {
          /* ignore */
        }
        return ''
      },
      listPacks: () => mockInvoke('kernel', 'listIconPacks', {}),
    },
    themes: {
      list: () => mockInvoke('kernel', 'listThemes', {}),
    },
    tools: {
      resolveElementTag: async (extId: string) => {
        const res = await mockInvoke('kernel', 'getToolElementTag', { extId })
        return res.success ? (res.data as string | null) : null
      },
    },
    composition: {
      declareSlots: () => {},
      mount: async () => ({
        setState: () => {},
        release: () => {},
      }),
      setState: () => {},
      onStateChange: () => () => {},
    },
    shell: createShellBridge(),
    events: createEventsBridge(),
  }
  ;(window as any).core.events.on('settings-updated', (detail: Record<string, unknown>) => {
    applyUiFontSettings({
      font: detail.font as string | undefined,
      fontWeight: detail.fontWeight as string | number | undefined,
    })
  })
}

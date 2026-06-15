import fs from 'fs'
import fsPromises from 'fs/promises'
import os from 'os'
import path from 'path'
import { DatabaseSync } from 'node:sqlite'
import type {
  CoreContext,
  ExtensionRuntimeMeta,
  RegistryEntry,
  NowPlaying,
  ThemeDefinition,
  IconPackDefinition,
  DbHandle,
  ExtensionManifest,
} from '@nuxy/core'
import {
  HostChannel,
  resolveLocale,
  flattenTranslations,
  interpolate,
  selectPlural,
  getTextDirection,
} from '@nuxy/core'
import type { WorkerLogger } from './worker-log.js'
import { buildFsApi } from './proxy-fs.js'
import { buildShellApi } from './proxy-shell.js'
import { buildSettingsApi } from './proxy-settings.js'

export function createCoreProxy(
  callHost: (channel: string, payload?: unknown) => Promise<unknown>,
  logger: WorkerLogger,
  registerIpcHandler: (channel: string, handler: (payload: unknown) => Promise<unknown>) => void,
  extId: string,
  permissions: string[] = [],
  extDir?: string,
  onRegistryEntry?: (entry: { kind: string; displayName?: string }) => void
): {
  core: CoreContext
  initI18n: () => Promise<void>
  getSyncPayload: () => ExtensionRuntimeMeta
} {
  const ipcChannels: string[] = []
  const registeredEntries: RegistryEntry[] = []
  let displayName: string | undefined

  const dataDir = process.env.NUXY_DATA_DIR
    ? path.join(process.env.NUXY_DATA_DIR, extId)
    : path.join(os.homedir(), '.nxy', 'data', extId)
  const extSettingsFile = path.join(dataDir, 'ext-settings.json')

  let i18nLocale = 'en'
  let i18nDir: 'ltr' | 'rtl' = 'ltr'
  let i18nTranslations: Record<string, string> = {}

  async function initI18n(): Promise<void> {
    if (!extDir) return
    try {
      const manifestPath = path.join(extDir, 'manifest.json')
      const manifestRaw = await fsPromises.readFile(manifestPath, 'utf8').catch(() => null)
      if (!manifestRaw) return
      const manifest = JSON.parse(manifestRaw) as ExtensionManifest
      if (!manifest.locales) return

      const { supported, default: defaultLocale, dir: localesDir = 'locales' } = manifest.locales

      const globalSettings = process.env.NUXY_DATA_DIR
        ? path.join(process.env.NUXY_DATA_DIR, 'com.nuxy.settings', 'settings.json')
        : path.join(os.homedir(), '.nxy', 'data', 'com.nuxy.settings', 'settings.json')
      let preferredLanguages: string[] = []
      try {
        const raw = await fsPromises.readFile(globalSettings, 'utf8')
        const parsed = JSON.parse(raw) as { preferredLanguages?: string[] }
        preferredLanguages = parsed.preferredLanguages ?? []
      } catch {}

      const systemHint = (process.env.LANG ?? '').split('.')[0].replace('_', '-')
      const candidates = [...preferredLanguages, systemHint].filter(Boolean)

      i18nLocale = resolveLocale(candidates, supported, defaultLocale)
      i18nDir = getTextDirection(i18nLocale)

      const tryLoad = async (locale: string): Promise<Record<string, string> | null> => {
        const p = path.join(extDir, localesDir, `${locale}.json`)
        try {
          const raw = await fsPromises.readFile(p, 'utf8')
          return flattenTranslations(JSON.parse(raw))
        } catch {
          return null
        }
      }

      i18nTranslations = (await tryLoad(i18nLocale)) ?? (await tryLoad(defaultLocale)) ?? {}
    } catch (err) {
      logger.warn('i18n: initialization failed', err)
    }
  }

  function checkPermission(permission: string, apiName: string) {
    if (!permissions.includes(permission)) {
      throw new Error(
        `Permission Denied: Extension "${extId}" lacks "${permission}" permission required for "${apiName}"`
      )
    }
  }

  function openDb(name: string): DbHandle {
    fs.mkdirSync(dataDir, { recursive: true })
    const dbPath = path.join(dataDir, `${name}.db`)
    return new DatabaseSync(dbPath) as unknown as DbHandle
  }

  const core: CoreContext = {
    clipboard: {
      readText: () => {
        checkPermission('clipboard', 'core.clipboard.readText')
        return callHost(HostChannel.CLIPBOARD_READ) as Promise<string>
      },
      writeText: (text: string) => {
        checkPermission('clipboard', 'core.clipboard.writeText')
        return callHost(HostChannel.CLIPBOARD_WRITE, text) as Promise<void>
      },
      readImage: () => {
        checkPermission('clipboard', 'core.clipboard.readImage')
        return callHost(HostChannel.CLIPBOARD_READ_IMAGE) as Promise<string | null>
      },
      writeImage: (dataURL: string) => {
        checkPermission('clipboard', 'core.clipboard.writeImage')
        return callHost(HostChannel.CLIPBOARD_WRITE_IMAGE, dataURL) as Promise<void>
      },
      writeFiles: (paths: string[]) => {
        checkPermission('clipboard', 'core.clipboard.writeFiles')
        return callHost(HostChannel.CLIPBOARD_WRITE_FILES, paths) as Promise<void>
      },
    },
    fs: buildFsApi(checkPermission, callHost),
    db: {
      open: (name: string) => {
        checkPermission('db', 'core.db.open')
        return openDb(name)
      },
    },
    shell: buildShellApi(checkPermission),
    media: {
      getNowPlaying: () => {
        checkPermission('media', 'core.media.getNowPlaying')
        return callHost(HostChannel.MEDIA_GET_NOW_PLAYING) as Promise<NowPlaying | null>
      },
    },
    storage: {
      read: <T>(file: string) => {
        checkPermission('storage', 'core.storage.read')
        return callHost(HostChannel.STORAGE_READ, file) as Promise<T | null>
      },
      write: <T>(file: string, data: T) => {
        checkPermission('storage', 'core.storage.write')
        return callHost(HostChannel.STORAGE_WRITE, { file, data }) as Promise<void>
      },
    },
    ipc: {
      handle: (channel, handler) => {
        logger.log('info', 'IPC', 'Registered handler for channel: ' + channel)
        ipcChannels.push(channel)
        registerIpcHandler(channel, handler as (payload: unknown) => Promise<unknown>)
      },
      broadcast: (channel, data) => {
        void callHost(HostChannel.IPC_BROADCAST, { channel, data })
      },
    },
    registry: {
      registerTool: (cfg) => {
        displayName = cfg.displayName as string | undefined
        const entry: RegistryEntry = {
          kind: 'tool',
          name: cfg.name as string | undefined,
          displayName,
        }
        registeredEntries.push(entry)
        onRegistryEntry?.(entry)
        logger.log('info', 'Registry', 'Registered Tool: ' + cfg.name, cfg)
      },
      registerProvider: (cfg) => {
        displayName = cfg.displayName as string | undefined
        const entry: RegistryEntry = {
          kind: 'provider',
          name: cfg.name as string | undefined,
          displayName,
        }
        registeredEntries.push(entry)
        onRegistryEntry?.(entry)
        logger.log('info', 'Registry', 'Registered Provider: ' + cfg.name, cfg)
      },
      registerOrchestrator: (cfg) => {
        const entry: RegistryEntry = { kind: 'orchestrator' }
        registeredEntries.push(entry)
        onRegistryEntry?.(entry)
        logger.log('info', 'Registry', 'Registered Orchestrator', cfg)
      },
      registerTheme: (def: ThemeDefinition) => {
        void callHost(HostChannel.THEME_REGISTER, def)
        logger.log('info', 'Registry', 'Registered Theme: ' + def.name)
      },
      registerIconPack: (def: IconPackDefinition) => {
        void callHost(HostChannel.ICONPACK_REGISTER, def)
        logger.log('info', 'Registry', 'Registered IconPack: ' + def.name)
      },
      getCallableTools: () => {
        return (callHost(HostChannel.REGISTRY_GET_CALLABLE_TOOLS, {}) as unknown as unknown[]) ?? []
      },
    },
    extensions: {
      invoke: (targetId, channel, payload) =>
        callHost(HostChannel.BROKER_INVOKE, { targetId, channel, payload }) as ReturnType<
          CoreContext['extensions']['invoke']
        >,
    },
    logger: {
      silly: logger.silly,
      info: logger.info,
      warn: logger.warn,
      error: logger.error,
    },
    config: {
      get: async () => {
        const res = (await callHost(HostChannel.BROKER_INVOKE, {
          targetId: 'kernel',
          channel: 'getConfig',
        })) as any
        return res?.data
      },
    },
    i18n: {
      get locale() {
        return i18nLocale
      },
      get dir() {
        return i18nDir
      },
      t: (key: string, vars?: Record<string, string | number>, count?: number): string => {
        let template: string | undefined
        if (count !== undefined) {
          template = selectPlural(i18nTranslations, key, count, i18nLocale)
        }
        if (!template) template = i18nTranslations[key]
        if (!template) {
          logger.silly(`i18n: missing key "${key}" for locale "${i18nLocale}"`)
          return key
        }
        return vars ? interpolate(template, vars) : template
      },
    },
    settings: buildSettingsApi(extId, dataDir, extSettingsFile, permissions),
  }

  return {
    core,
    initI18n,
    getSyncPayload: (): ExtensionRuntimeMeta => ({
      ipcChannels: [...ipcChannels],
      displayName,
      registeredEntries: registeredEntries.length > 0 ? [...registeredEntries] : undefined,
    }),
  }
}

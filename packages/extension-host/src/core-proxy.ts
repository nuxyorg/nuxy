import { execFile, spawn as nodeSpawn } from 'child_process'
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
  SpawnHandle,
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

export type { ExtensionRuntimeMeta as RegistrySyncPayload }

export function createCoreProxy(
  callHost: (channel: string, payload?: unknown) => Promise<unknown>,
  logger: WorkerLogger,
  registerIpcHandler: (channel: string, handler: (payload: unknown) => Promise<unknown>) => void,
  extId: string,
  permissions: string[] = [],
  extDir?: string,
  onRegistryEntry?: (entry: { kind: string; displayName?: string }) => void
): { core: CoreContext; initI18n: () => Promise<void>; getSyncPayload: () => ExtensionRuntimeMeta } {
  const ipcChannels: string[] = []
  const registeredEntries: RegistryEntry[] = []
  let displayName: string | undefined

  const dataDir = path.join(os.homedir(), '.nuxy', 'data', extId)
  const extSettingsFile = path.join(dataDir, 'ext-settings.json')

  // i18n state — populated by initI18n() before register() is called
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

      // Read user's preferred languages from the global settings store
      const globalSettings = path.join(os.homedir(), '.nuxy', 'data', 'com.nuxy.settings', 'settings.json')
      let preferredLanguages: string[] = []
      try {
        const raw = await fsPromises.readFile(globalSettings, 'utf8')
        const parsed = JSON.parse(raw) as { preferredLanguages?: string[] }
        preferredLanguages = parsed.preferredLanguages ?? []
      } catch {}

      // Use LANG env as a last-resort system locale hint
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

  function openDb(name: string): DbHandle {
    fs.mkdirSync(dataDir, { recursive: true })
    const dbPath = path.join(dataDir, `${name}.db`)
    return new DatabaseSync(dbPath) as unknown as DbHandle
  }

  function shellSpawn(cmd: string, args: string[]): SpawnHandle {
    const proc = nodeSpawn(cmd, args)
    return {
      onData(handler) {
        proc.stdout?.on('data', (chunk: Buffer) => handler(chunk.toString()))
      },
      onClose(handler) {
        proc.on('close', (code) => handler(code))
      },
      kill(signal?: string) {
        proc.kill(signal as NodeJS.Signals | undefined)
      },
    }
  }

  function checkPermission(permission: string, apiName: string) {
    if (!permissions.includes(permission)) {
      throw new Error(`Permission Denied: Extension "${extId}" lacks "${permission}" permission required for "${apiName}"`)
    }
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
    fs: {
      fileExists: (p: string) => {
        checkPermission('fs', 'core.fs.fileExists')
        return callHost(HostChannel.FS_FILE_EXISTS, p) as Promise<boolean>
      },
      readDir: async (p: string) => {
        checkPermission('fs', 'core.fs.readDir')
        const entries = await fsPromises.readdir(p, { withFileTypes: true })
        return entries.map((e) => ({ name: e.name, isDir: e.isDirectory() }))
      },
      readFile: (p: string) => {
        checkPermission('fs', 'core.fs.readFile')
        return fsPromises.readFile(p, 'utf8')
      },
      readFileBinary: (p: string) => {
        checkPermission('fs', 'core.fs.readFileBinary')
        return fsPromises.readFile(p).then((buf) => new Uint8Array(buf))
      },
      writeFile: (p: string, data: string | Uint8Array) => {
        checkPermission('fs', 'core.fs.writeFile')
        return fsPromises.writeFile(p, data instanceof Uint8Array ? Buffer.from(data) : data)
      },
      mkdir: (p: string, opts?: { recursive?: boolean }) => {
        checkPermission('fs', 'core.fs.mkdir')
        return fsPromises.mkdir(p, opts).then(() => {})
      },
      rename: (src: string, dest: string) => {
        checkPermission('fs', 'core.fs.rename')
        return fsPromises.rename(src, dest)
      },
      rm: (p: string) => {
        checkPermission('fs', 'core.fs.rm')
        return fsPromises.unlink(p)
      },
      stat: async (p: string) => {
        checkPermission('fs', 'core.fs.stat')
        const s = await fsPromises.stat(p)
        return { isDir: s.isDirectory(), size: s.size, mtimeMs: s.mtimeMs }
      },
      homedir: () => {
        checkPermission('fs', 'core.fs.homedir')
        return os.homedir()
      },
      tmpdir: () => {
        checkPermission('fs', 'core.fs.tmpdir')
        return os.tmpdir()
      },
    },
    db: {
      open: (name: string) => {
        checkPermission('db', 'core.db.open')
        return openDb(name)
      },
    },
    shell: {
      open: (pathOrUrl: string) => {
        checkPermission('shell', 'core.shell.open')
        return new Promise<void>((resolve, reject) => {
          const cmd =
            process.platform === 'darwin'
              ? 'open'
              : process.platform === 'win32'
                ? 'explorer'
                : 'xdg-open'
          execFile(cmd, [pathOrUrl], (err) => (err ? reject(err) : resolve()))
        })
      },
      exec: (cmd: string, args: string[], opts?: { maxBuffer?: number }) => {
        checkPermission('shell', 'core.shell.exec')
        return new Promise<{ stdout: string; code: number }>((resolve, reject) => {
          execFile(cmd, args, { maxBuffer: opts?.maxBuffer ?? 1024 * 1024 }, (err, stdout) => {
            if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
              reject(err)
            } else {
              resolve({
                stdout: stdout ?? '',
                code: (err as NodeJS.ErrnoException & { code?: number })?.code ?? (err ? 1 : 0),
              })
            }
          })
        })
      },
      spawn: (cmd: string, args: string[]) => {
        checkPermission('shell', 'core.shell.spawn')
        return shellSpawn(cmd, args)
      },
    },
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
        const entry: RegistryEntry = { kind: 'tool', name: cfg.name as string | undefined, displayName }
        registeredEntries.push(entry)
        onRegistryEntry?.(entry)
        logger.log('info', 'Registry', 'Registered Tool: ' + cfg.name, cfg)
      },
      registerProvider: (cfg) => {
        displayName = cfg.displayName as string | undefined
        const entry: RegistryEntry = { kind: 'provider', name: cfg.name as string | undefined, displayName }
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
      get locale() { return i18nLocale },
      get dir() { return i18nDir },
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
    settings: {
      read: async <T = unknown>(key: string): Promise<T | null> => {
        try {
          const content = await fsPromises.readFile(extSettingsFile, 'utf8')
          const data = JSON.parse(content) as Record<string, unknown>
          return (key in data ? data[key] : null) as T | null
        } catch {
          return null
        }
      },
      write: async (key: string, value: unknown): Promise<void> => {
        let data: Record<string, unknown> = {}
        try {
          const content = await fsPromises.readFile(extSettingsFile, 'utf8')
          data = JSON.parse(content) as Record<string, unknown>
        } catch {}
        data[key] = value
        fs.mkdirSync(dataDir, { recursive: true })
        await fsPromises.writeFile(extSettingsFile, JSON.stringify(data, null, 2))
      },
      ...(permissions.includes('settings.read') && {
        readAllExtension: async (targetExtId: string): Promise<Record<string, unknown>> => {
          const p = path.join(os.homedir(), '.nuxy', 'data', targetExtId, 'ext-settings.json')
          try {
            const content = await fsPromises.readFile(p, 'utf8')
            return JSON.parse(content) as Record<string, unknown>
          } catch {
            return {}
          }
        },
        readExtension: async <T = unknown>(targetExtId: string, key: string): Promise<T | null> => {
          const p = path.join(os.homedir(), '.nuxy', 'data', targetExtId, 'ext-settings.json')
          try {
            const content = await fsPromises.readFile(p, 'utf8')
            const data = JSON.parse(content) as Record<string, unknown>
            return (key in data ? data[key] : null) as T | null
          } catch {
            return null
          }
        },
      }),
      ...(permissions.includes('settings.write') && {
        writeAllExtension: async (
          targetExtId: string,
          values: Record<string, unknown>
        ): Promise<void> => {
          const dir = path.join(os.homedir(), '.nuxy', 'data', targetExtId)
          fs.mkdirSync(dir, { recursive: true })
          await fsPromises.writeFile(
              path.join(dir, 'ext-settings.json'),
              JSON.stringify(values, null, 2)
          )
        },
        writeExtension: async (targetExtId: string, key: string, value: unknown): Promise<void> => {
          const dir = path.join(os.homedir(), '.nuxy', 'data', targetExtId)
          const p = path.join(dir, 'ext-settings.json')
          let data: Record<string, unknown> = {}
          try {
            const content = await fsPromises.readFile(p, 'utf8')
            data = JSON.parse(content) as Record<string, unknown>
          } catch {}
          data[key] = value
          fs.mkdirSync(dir, { recursive: true })
          await fsPromises.writeFile(p, JSON.stringify(data, null, 2))
        },
      }),
    },
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

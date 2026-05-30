import { execFile, spawn as nodeSpawn } from 'child_process'
import fs from 'fs'
import fsPromises from 'fs/promises'
import os from 'os'
import path from 'path'
import { DatabaseSync } from 'node:sqlite'
import type {
  CoreContext,
  ExtensionRuntimeMeta,
  NowPlaying,
  ThemeDefinition,
  IconPackDefinition,
  DbHandle,
  SpawnHandle,
} from '@nuxy/core'
import { HostChannel } from '@nuxy/core'
import type { WorkerLogger } from './worker-log.js'

export type { ExtensionRuntimeMeta as RegistrySyncPayload }

export function createCoreProxy(
  callHost: (channel: string, payload?: unknown) => Promise<unknown>,
  logger: WorkerLogger,
  registerIpcHandler: (channel: string, handler: (payload: unknown) => Promise<unknown>) => void,
  extId: string,
  permissions: string[] = [],
  onRegistryEntry?: (entry: { kind: string; displayName?: string }) => void
): { core: CoreContext; getSyncPayload: () => ExtensionRuntimeMeta } {
  const ipcChannels: string[] = []
  let displayName: string | undefined

  const dataDir = path.join(os.homedir(), '.nuxy', 'data', extId)
  const extSettingsFile = path.join(dataDir, 'ext-settings.json')

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

  const core: CoreContext = {
    clipboard: {
      readText: () => callHost(HostChannel.CLIPBOARD_READ) as Promise<string>,
      writeText: (text: string) => callHost(HostChannel.CLIPBOARD_WRITE, text) as Promise<void>,
      readImage: () => callHost(HostChannel.CLIPBOARD_READ_IMAGE) as Promise<string | null>,
      writeImage: (dataURL: string) =>
        callHost(HostChannel.CLIPBOARD_WRITE_IMAGE, dataURL) as Promise<void>,
      writeFiles: (paths: string[]) =>
        callHost(HostChannel.CLIPBOARD_WRITE_FILES, paths) as Promise<void>,
    },
    fs: {
      fileExists: (p: string) => callHost(HostChannel.FS_FILE_EXISTS, p) as Promise<boolean>,
      readDir: async (p: string) => {
        const entries = await fsPromises.readdir(p, { withFileTypes: true })
        return entries.map((e) => ({ name: e.name, isDir: e.isDirectory() }))
      },
      readFile: (p: string) => fsPromises.readFile(p, 'utf8'),
      readFileBinary: (p: string) => fsPromises.readFile(p).then((buf) => new Uint8Array(buf)),
      writeFile: (p: string, data: string | Uint8Array) =>
        fsPromises.writeFile(p, data instanceof Uint8Array ? Buffer.from(data) : data),
      mkdir: (p: string, opts?: { recursive?: boolean }) =>
        fsPromises.mkdir(p, opts).then(() => {}),
      rename: (src: string, dest: string) => fsPromises.rename(src, dest),
      rm: (p: string) => fsPromises.unlink(p),
      stat: async (p: string) => {
        const s = await fsPromises.stat(p)
        return { isDir: s.isDirectory(), size: s.size, mtimeMs: s.mtimeMs }
      },
      homedir: () => os.homedir(),
      tmpdir: () => os.tmpdir(),
    },
    db: {
      open: openDb,
    },
    shell: {
      open: (pathOrUrl: string) =>
        new Promise<void>((resolve, reject) => {
          const cmd =
            process.platform === 'darwin'
              ? 'open'
              : process.platform === 'win32'
                ? 'explorer'
                : 'xdg-open'
          execFile(cmd, [pathOrUrl], (err) => (err ? reject(err) : resolve()))
        }),
      exec: (cmd: string, args: string[], opts?: { maxBuffer?: number }) =>
        new Promise<{ stdout: string; code: number }>((resolve, reject) => {
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
        }),
      spawn: shellSpawn,
    },
    media: {
      getNowPlaying: () =>
        callHost(HostChannel.MEDIA_GET_NOW_PLAYING) as Promise<NowPlaying | null>,
    },
    storage: {
      read: <T>(file: string) => callHost(HostChannel.STORAGE_READ, file) as Promise<T | null>,
      write: <T>(file: string, data: T) =>
        callHost(HostChannel.STORAGE_WRITE, { file, data }) as Promise<void>,
    },
    ipc: {
      handle: (channel, handler) => {
        logger.log('info', 'IPC', 'Registered handler for channel: ' + channel)
        ipcChannels.push(channel)
        registerIpcHandler(channel, handler as (payload: unknown) => Promise<unknown>)
      },
    },
    registry: {
      registerTool: (cfg) => {
        displayName = cfg.displayName as string | undefined
        onRegistryEntry?.({ kind: 'tool', displayName })
        logger.log('info', 'Registry', 'Registered Tool: ' + cfg.name, cfg)
      },
      registerProvider: (cfg) => {
        displayName = cfg.displayName as string | undefined
        onRegistryEntry?.({ kind: 'provider', displayName })
        logger.log('info', 'Registry', 'Registered Provider: ' + cfg.name, cfg)
      },
      registerOrchestrator: (cfg) => {
        onRegistryEntry?.({ kind: 'orchestrator' })
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
    getSyncPayload: (): ExtensionRuntimeMeta => ({
      ipcChannels: [...ipcChannels],
      displayName,
    }),
  }
}

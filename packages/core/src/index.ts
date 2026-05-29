import type { NowPlaying } from './media.js'
import type { IpcResult, ThemeDefinition, IconPackDefinition } from './types.js'

export type { NowPlaying } from './media.js'

export interface DbHandle {
  exec(sql: string): void
  prepare(sql: string): PreparedStatement
  close(): void
  function(name: string, fn: (...args: unknown[]) => unknown): void
}

export interface PreparedStatement {
  run(...args: unknown[]): void
  get(...args: unknown[]): Record<string, unknown> | undefined
  all(...args: unknown[]): Record<string, unknown>[]
}

export interface DirEntry {
  name: string
  isDir: boolean
}

export interface FileStat {
  isDir: boolean
  size: number
  mtimeMs: number
}

export interface SpawnHandle {
  onData(handler: (chunk: string) => void): void
  onClose(handler: (code: number | null) => void): void
  kill(signal?: string): void
}

export interface CoreContext {
  clipboard: {
    readText: () => Promise<string>
    writeText: (text: string) => Promise<void>
    readImage: () => Promise<string | null>
    writeImage: (dataURL: string) => Promise<void>
    writeFiles: (paths: string[]) => Promise<void>
  }
  fs: {
    fileExists: (path: string) => Promise<boolean>
    readDir: (path: string) => Promise<DirEntry[]>
    readFile: (path: string, encoding?: 'utf8') => Promise<string>
    readFileBinary: (path: string) => Promise<Uint8Array>
    writeFile: (path: string, data: string | Uint8Array) => Promise<void>
    mkdir: (path: string, opts?: { recursive?: boolean }) => Promise<void>
    rename: (src: string, dest: string) => Promise<void>
    rm: (path: string) => Promise<void>
    stat: (path: string) => Promise<FileStat>
    homedir: () => string
    tmpdir: () => string
  }
  db: {
    open: (name: string) => DbHandle
  }
  shell: {
    open: (pathOrUrl: string) => Promise<void>
    exec: (cmd: string, args: string[], opts?: { maxBuffer?: number }) => Promise<{ stdout: string; code: number }>
    spawn: (cmd: string, args: string[]) => SpawnHandle
  }
  media: {
    getNowPlaying: () => Promise<NowPlaying | null>
  }
  storage: {
    read: <T>(file: string) => Promise<T | null>
    write: <T>(file: string, data: T) => Promise<void>
  }
  ipc: {
    handle: <T, R>(channel: string, handler: (payload: T) => Promise<R>) => void
  }
  registry: {
    registerTool: (config: { name: string; [key: string]: unknown }) => void
    registerProvider: (config: { name: string; [key: string]: unknown }) => void
    registerOrchestrator: (config: { [key: string]: unknown }) => void
    registerTheme: (def: ThemeDefinition) => void
    registerIconPack: (def: IconPackDefinition) => void
  }
  extensions: {
    invoke: (targetId: string, channel: string, payload?: unknown) => Promise<IpcResult>
  }
  logger: {
    silly: (msg: string, meta?: unknown) => void
    info: (msg: string, meta?: unknown) => void
    warn: (msg: string, meta?: unknown) => void
    error: (msg: string, meta?: unknown) => void
  }
  config: {
    get: () => Promise<unknown>
  }
}

export { createLogger, kernelLogger } from './logger.js'
export type { Logger, LogLevel } from './logger.js'
export type {
  ExtensionManifest,
  ExtensionPermission,
  ExtensionRuntimeMeta,
  ExtensionType,
  LoadedExtension,
  IpcResult,
  ThemeDefinition,
  IconPackDefinition,
} from './types.js'
export { HostChannel } from './host-channels.js'
export type { HostChannelName } from './host-channels.js'
export type { WorkerToHostMessage, HostToWorkerMessage } from './messages.js'

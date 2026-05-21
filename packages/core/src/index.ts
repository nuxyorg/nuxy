import type { NowPlaying } from './media.js'
import type { IpcResult, ThemeDefinition, IconPackDefinition } from './types.js'

export type { NowPlaying } from './media.js'

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

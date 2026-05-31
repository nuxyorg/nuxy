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
    exec: (
      cmd: string,
      args: string[],
      opts?: { maxBuffer?: number }
    ) => Promise<{ stdout: string; code: number }>
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
  /**
   * Localisation context for this extension.
   * Available only when the manifest declares a `locales` block.
   * Always safe to call — returns the key string when no translation is found.
   */
  i18n: {
    /** Resolved BCP 47 locale code (e.g. "tr", "ja-JP"). */
    readonly locale: string
    /** Text direction for the resolved locale. */
    readonly dir: 'ltr' | 'rtl'
    /**
     * Translate a key.
     * - Interpolation: `t('greeting', { name: 'World' })` → `"Hello, World!"`
     * - Plurals:       `t('items', { count: 3 }, 3)`       → `"3 items"`
     */
    t: (key: string, vars?: Record<string, string | number>, count?: number) => string
  }
  settings: {
    /** Read a value from this extension's own settings. No permission required. */
    read: <T = unknown>(key: string) => Promise<T | null>
    /** Write a value to this extension's own settings. No permission required. */
    write: (key: string, value: unknown) => Promise<void>
    /**
     * Read a value from another extension's settings.
     * Requires `settings.read` permission in the manifest.
     */
    readExtension?: <T = unknown>(targetExtId: string, key: string) => Promise<T | null>
    /**
     * Write a value to another extension's settings.
     * Requires `settings.write` permission in the manifest.
     */
    writeExtension?: (targetExtId: string, key: string, value: unknown) => Promise<void>
    /**
     * Read all values from another extension's settings file.
     * Requires `settings.read` permission in the manifest.
     */
    readAllExtension?: (targetExtId: string) => Promise<Record<string, unknown>>
    /**
     * Overwrite all values in another extension's settings file.
     * Requires `settings.write` permission in the manifest.
     */
    writeAllExtension?: (targetExtId: string, values: Record<string, unknown>) => Promise<void>
  }
}

export { createLogger, kernelLogger } from './logger.js'
export type { Logger, LogLevel } from './logger.js'
export type {
  ExtensionManifest,
  ExtensionLocaleConfig,
  ExtensionPermission,
  ExtensionRuntimeMeta,
  ExtensionType,
  LoadedExtension,
  IpcResult,
  ThemeDefinition,
  IconPackDefinition,
  ExtensionSettingType,
  ExtensionSettingField,
  ExtensionSettingsSchema,
  ExtensionSettingsInfo,
} from './types.js'
export { HostChannel } from './host-channels.js'
export type { HostChannelName } from './host-channels.js'
export type { WorkerToHostMessage, HostToWorkerMessage } from './messages.js'
export {
  resolveLocale,
  flattenTranslations,
  interpolate,
  selectPlural,
  getTextDirection,
} from './i18n.js'
export type { PluralCategory, TextDirection } from './i18n.js'

import type {
  CoreContext,
  ExtensionRuntimeMeta,
  NowPlaying,
  ThemeDefinition,
  IconPackDefinition,
} from '@nuxy/core'
import { HostChannel } from '@nuxy/core'
import type { WorkerLogger } from './worker-log.js'

export type { ExtensionRuntimeMeta as RegistrySyncPayload }

export function createCoreProxy(
  callHost: (channel: string, payload?: unknown) => Promise<unknown>,
  logger: WorkerLogger,
  registerIpcHandler: (channel: string, handler: (payload: unknown) => Promise<unknown>) => void,
  onRegistryEntry?: (entry: { kind: string; displayName?: string }) => void
): { core: CoreContext; getSyncPayload: () => ExtensionRuntimeMeta } {
  const ipcChannels: string[] = []
  let displayName: string | undefined

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
      fileExists: (path: string) => callHost(HostChannel.FS_FILE_EXISTS, path) as Promise<boolean>,
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
  }

  return {
    core,
    getSyncPayload: (): ExtensionRuntimeMeta => ({
      ipcChannels: [...ipcChannels],
      displayName,
    }),
  }
}

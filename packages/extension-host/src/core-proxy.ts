import type { CoreContext, NowPlaying } from '@nuxy/core'
import { HostChannel } from '@nuxy/core'
import type { WorkerLogger } from './worker-log.js'

export interface RegistrySyncPayload {
  ipcChannels: string[]
  displayName?: string
}

export function createCoreProxy(
  callHost: (channel: string, payload?: unknown) => Promise<unknown>,
  logger: WorkerLogger,
  registerIpcHandler: (
    channel: string,
    handler: (payload: unknown) => Promise<unknown>
  ) => void,
  onRegistryEntry?: (entry: { kind: string; displayName?: string }) => void
): { core: CoreContext; getSyncPayload: () => RegistrySyncPayload } {
  const ipcChannels: string[] = []
  let displayName: string | undefined

  const core: CoreContext = {
    clipboard: {
      readText: () => callHost(HostChannel.CLIPBOARD_READ) as Promise<string>,
      writeText: (text: string) =>
        callHost(HostChannel.CLIPBOARD_WRITE, text) as Promise<void>
    },
    media: {
      getNowPlaying: () =>
        callHost(HostChannel.MEDIA_GET_NOW_PLAYING) as Promise<NowPlaying | null>
    },
    storage: {
      read: <T>(file: string) =>
        callHost(HostChannel.STORAGE_READ, file) as Promise<T | null>,
      write: <T>(file: string, data: T) =>
        callHost(HostChannel.STORAGE_WRITE, { file, data }) as Promise<void>
    },
    ipc: {
      handle: (channel, handler) => {
        logger.log('info', 'IPC', 'Registered handler for channel: ' + channel)
        ipcChannels.push(channel)
        registerIpcHandler(
          channel,
          handler as (payload: unknown) => Promise<unknown>
        )
      },
      broadcast: (channel, payload) => {
        logger.log(
          'warn',
          'IPC',
          `broadcast("${channel}") is not implemented yet`,
          payload
        )
      }
    },
    registry: {
      registerTool: (cfg) => {
        const name =
          cfg && typeof cfg === 'object' && 'name' in cfg
            ? String((cfg as { name: unknown }).name)
            : '(tool)'
        displayName = name
        onRegistryEntry?.({ kind: 'tool', displayName: name })
        logger.log('info', 'Registry', 'Registered Tool: ' + name, cfg)
      },
      registerProvider: (cfg) => {
        const name =
          cfg && typeof cfg === 'object' && 'name' in cfg
            ? String((cfg as { name: unknown }).name)
            : '(provider)'
        displayName = name
        onRegistryEntry?.({ kind: 'provider', displayName: name })
        logger.log('info', 'Registry', 'Registered Provider: ' + name, cfg)
      },
      registerOrchestrator: (cfg) => {
        onRegistryEntry?.({ kind: 'orchestrator' })
        logger.log('info', 'Registry', 'Registered Orchestrator', cfg)
      }
    },
    extensions: {
      invoke: (targetId, channel, payload) =>
        callHost(HostChannel.BROKER_INVOKE, { targetId, channel, payload })
    },
    logger: {
      silly: logger.silly,
      info: logger.info,
      warn: logger.warn,
      error: logger.error
    }
  }

  return {
    core,
    getSyncPayload: () => ({
      ipcChannels: [...ipcChannels],
      displayName
    })
  }
}

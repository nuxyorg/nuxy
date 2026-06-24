import { KERNEL_IPC_CHANNELS } from './kernel-channels.ts'

export interface IpcTarget {
  extId: string
  name: string
  disabled: boolean
  channels: string[]
  /** Channels callable cross-extension (manifest.ipc.public, backend-confirmed via runtime sync). */
  publicChannels: string[]
  /** Channels callable only by this extension's own frontend/worker. */
  privateChannels: string[]
  callable: boolean
}

export interface LoadedExtensionEntry {
  id: string
  disabled?: boolean
  manifest?: {
    name?: string
    capabilities?: { callable?: boolean }
  }
  runtime?: {
    ipcChannels?: string[]
    publicIpcChannels?: string[]
    privateIpcChannels?: string[]
  }
}

export function kernelTarget(): IpcTarget {
  const channels = [...KERNEL_IPC_CHANNELS]
  return {
    extId: 'kernel',
    name: 'Kernel',
    disabled: false,
    channels,
    publicChannels: channels,
    privateChannels: [],
    callable: false,
  }
}

export function parseExtensionTargets(data: unknown): IpcTarget[] {
  if (!Array.isArray(data)) return []

  return data
    .filter(
      (entry): entry is LoadedExtensionEntry =>
        !!entry &&
        typeof entry === 'object' &&
        typeof (entry as LoadedExtensionEntry).id === 'string'
    )
    .map((ext) => {
      const runtime = ext.runtime
      // Legacy sync payloads (pre public/private split) report only `ipcChannels` —
      // treat everything as private until the worker reports the split explicitly.
      const hasSplit = runtime?.publicIpcChannels !== undefined
      const publicChannels = hasSplit ? [...(runtime?.publicIpcChannels ?? [])].sort() : []
      const privateChannels = hasSplit
        ? [...(runtime?.privateIpcChannels ?? [])].sort()
        : [...(runtime?.ipcChannels ?? [])].sort()

      return {
        extId: ext.id,
        name: ext.manifest?.name ?? ext.id,
        disabled: ext.disabled === true,
        channels: [...(ext.runtime?.ipcChannels ?? [])].sort(),
        publicChannels,
        privateChannels,
        callable: ext.manifest?.capabilities?.callable === true,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function buildIpcTargets(data: unknown): IpcTarget[] {
  return [kernelTarget(), ...parseExtensionTargets(data)]
}

export function selectedTarget(targets: IpcTarget[], extId: string): IpcTarget | undefined {
  return targets.find((t) => t.extId === extId)
}

/** This tool's own extension id — never matches a target, so every call it makes is cross-extension. */
export const EXPLORER_EXT_ID = 'com.nuxy.ipc-explorer'

/**
 * IPC Explorer has no public/private surface of its own, so its calls into any target are
 * always cross-extension: kernel channels stay open (separate whitelist), and extension
 * channels are legal only when public and the target is callable — the exact rule the
 * kernel enforces, mirrored here so the UI can disable illegal invokes up front.
 */
export function canInvokeChannel(target: IpcTarget | undefined, channel: string): boolean {
  if (!target || !channel) return false
  if (target.extId === 'kernel') return target.channels.includes(channel)
  return target.callable && target.publicChannels.includes(channel)
}

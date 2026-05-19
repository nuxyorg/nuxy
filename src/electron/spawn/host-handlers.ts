import fs from 'fs'
import { clipboard } from 'electron'
import { HostChannel, kernelLogger } from '@nuxy/core'
import { assertHostPermission } from '../config/permissions.js'
import { resolveStoragePath } from '../config/storage-path.js'
import { getExtensionById } from '../extensions/registry.js'
import { invokeExtension } from '../ipc/broker.js'
import { getNowPlaying } from '../media/index.js'
import { extensionDataDir } from './migrate-data.js'

const log = kernelLogger.child('HostHandlers')

export interface HostCallReply {
  result?: unknown
  error?: string
}

export async function handleHostCall(
  extId: string,
  channel: string,
  payload: unknown
): Promise<HostCallReply> {
  const ext = getExtensionById(extId)
  if (!ext) {
    return { error: `Extension not found: ${extId}` }
  }

  if (channel === HostChannel.BROKER_INVOKE) {
    const { targetId, channel: targetChannel, payload: pl } = payload as {
      targetId: string
      channel: string
      payload?: unknown
    }
    const result = await invokeExtension(extId, targetId, targetChannel, pl)
    if (!result.success) {
      return { error: result.error ?? 'Broker invoke failed' }
    }
    return { result: result.data }
  }

  const denied = assertHostPermission(ext.manifest, channel)
  if (denied) {
    return { error: denied.error ?? 'PERMISSION_DENIED' }
  }

  try {
    switch (channel) {
      case HostChannel.CLIPBOARD_READ:
        return { result: clipboard.readText() }

      case HostChannel.CLIPBOARD_WRITE:
        clipboard.writeText(payload as string)
        return { result: true }

      case HostChannel.STORAGE_READ: {
        const dataDir = extensionDataDir(extId)
        const filePath = resolveStoragePath(dataDir, payload as string)
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8')
          return { result: JSON.parse(fileContent) }
        }
        return { result: null }
      }

      case HostChannel.STORAGE_WRITE: {
        const { file, data } = payload as { file: string; data: unknown }
        const dataDir = extensionDataDir(extId)
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true })
        }
        const filePath = resolveStoragePath(dataDir, file)
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
        return { result: true }
      }

      case HostChannel.MEDIA_GET_NOW_PLAYING:
        return { result: await getNowPlaying() }

      default:
        return { error: `Unknown host channel: ${channel}` }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(`Host call error on channel "${channel}" in "${extId}"`, {
      error: message
    })
    return { error: message }
  }
}

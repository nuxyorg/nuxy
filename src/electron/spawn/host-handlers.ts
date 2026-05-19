import fs from 'fs'
import fsPromises from 'fs/promises'
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
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof (payload as Record<string, unknown>).targetId !== 'string' ||
      typeof (payload as Record<string, unknown>).channel !== 'string'
    ) {
      return { error: 'Invalid broker invoke payload: missing targetId or channel' }
    }
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
        if (typeof payload !== 'string') {
          return { error: 'CLIPBOARD_WRITE: payload must be a string' }
        }
        clipboard.writeText(payload)
        return { result: true }

      case HostChannel.STORAGE_READ: {
        if (typeof payload !== 'string') {
          return { error: 'STORAGE_READ: payload must be a file path string' }
        }
        const dataDir = extensionDataDir(extId)
        const filePath = resolveStoragePath(dataDir, payload)
        try {
          const fileContent = await fsPromises.readFile(filePath, 'utf8')
          return { result: JSON.parse(fileContent) }
        } catch {
          return { result: null }
        }
      }

      case HostChannel.STORAGE_WRITE: {
        if (
          typeof payload !== 'object' ||
          payload === null ||
          typeof (payload as Record<string, unknown>).file !== 'string'
        ) {
          return { error: 'STORAGE_WRITE: payload must be { file: string, data: unknown }' }
        }
        const { file, data } = payload as { file: string; data: unknown }
        const dataDir = extensionDataDir(extId)
        await fsPromises.mkdir(dataDir, { recursive: true })
        const filePath = resolveStoragePath(dataDir, file)
        await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
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

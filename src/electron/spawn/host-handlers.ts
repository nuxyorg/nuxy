import fs from 'fs'
import fsPromises from 'fs/promises'
import { clipboard, nativeImage, BrowserWindow } from 'electron'
import { HostChannel, kernelLogger } from '@nuxyorg/core'
import type { ThemeDefinition, IconPackDefinition } from '@nuxyorg/core'
import { assertHostPermission } from '../config/permissions.js'
import { resolveStoragePath } from '../config/storage-path.js'
import { getExtensionById, loadedExtensions } from '../extensions/registry.js'
import { invokeExtension } from '../ipc/broker.js'
import { getNowPlaying } from '../media/index.js'
import { extensionDataDir } from './migrate-data.js'
import { registerExtensionTheme } from '../themes/extension-themes.js'
import { registerIconPack } from '../icons/registry.js'

const log = kernelLogger.child('HostHandlers')

interface BrokerInvokePayload {
  targetId: string
  channel: string
  payload?: unknown
}

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
      typeof (payload as BrokerInvokePayload).targetId !== 'string' ||
      typeof (payload as BrokerInvokePayload).channel !== 'string'
    ) {
      return { error: 'Invalid broker invoke payload: missing targetId or channel' }
    }
    const { targetId, channel: targetChannel, payload: pl } = payload as BrokerInvokePayload
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

      case HostChannel.CLIPBOARD_READ_IMAGE: {
        const image = clipboard.readImage()
        if (!image.isEmpty()) {
          return { result: image.toDataURL() }
        }
        return { result: null }
      }

      case HostChannel.CLIPBOARD_WRITE_IMAGE: {
        if (typeof payload !== 'string') {
          return { error: 'CLIPBOARD_WRITE_IMAGE: payload must be a dataURL string' }
        }
        const img = nativeImage.createFromDataURL(payload)
        clipboard.writeImage(img)
        return { result: true }
      }

      case HostChannel.CLIPBOARD_WRITE_FILES: {
        if (!Array.isArray(payload) || !payload.every((p) => typeof p === 'string')) {
          return { error: 'CLIPBOARD_WRITE_FILES: payload must be string[]' }
        }
        const paths = payload as string[]
        const uriList = paths.map((p) => `file://${p}`).join('\n') + '\n'
        if (process.platform === 'linux') {
          clipboard.writeBuffer(
            'x-special/nautilus-clipboard',
            Buffer.from(`copy\n${uriList}`, 'utf8')
          )
        } else {
          clipboard.writeBuffer('text/uri-list', Buffer.from(uriList, 'utf8'))
        }
        return { result: true }
      }

      case HostChannel.FS_FILE_EXISTS: {
        if (typeof payload !== 'string') {
          return { error: 'FS_FILE_EXISTS: payload must be a path string' }
        }
        return { result: fs.existsSync(payload) }
      }

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

      case HostChannel.THEME_REGISTER: {
        if (ext.manifest.type !== 'theme') {
          return { error: 'PERMISSION_DENIED: Only theme extensions can register themes' }
        }
        const def = payload as ThemeDefinition
        if (!def?.name || typeof def.name !== 'string' || !def.colors) {
          return { error: 'Invalid ThemeDefinition: missing name or colors' }
        }
        registerExtensionTheme(def)
        log.info(`Extension "${extId}" registered theme: ${def.name}`)
        return { result: true }
      }

      case HostChannel.ICONPACK_REGISTER: {
        if (ext.manifest.type !== 'iconpack') {
          return { error: 'PERMISSION_DENIED: Only iconpack extensions can register icon packs' }
        }
        const def = payload as IconPackDefinition
        if (!def?.name || typeof def.name !== 'string' || !def.icons) {
          return { error: 'Invalid IconPackDefinition: missing name or icons' }
        }
        registerIconPack(def)
        log.info(`Extension "${extId}" registered icon pack: ${def.name}`)
        return { result: true }
      }

      case HostChannel.IPC_BROADCAST: {
        const p = payload as { channel?: string; data?: unknown } | null
        if (!p || typeof p.channel !== 'string') {
          return { error: 'IPC_BROADCAST: payload must be { channel: string, data: unknown }' }
        }
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed()) win.webContents.send('ext:broadcast', p.channel, p.data)
        })
        return { result: true }
      }

      case HostChannel.REGISTRY_GET_CALLABLE_TOOLS: {
        const tools = loadedExtensions
          .filter((ext) => !ext.disabled && ext.manifest.type === 'tool')
          .map((ext) => ({
            id: ext.id,
            manifest: { name: ext.manifest.name },
          }))
        return { result: tools }
      }

      default:
        return { error: `Unknown host channel: ${channel}` }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(`Host call error on channel "${channel}" in "${extId}"`, {
      error: message,
    })
    return { error: message }
  }
}

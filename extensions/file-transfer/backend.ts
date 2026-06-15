import type { CoreContext } from '@nuxy/extension-sdk'
import type {
  AbortReceivePayload,
  CopyCodePayload,
  FinishReceivePayload,
  FinishReceiveResult,
  InitReceivePayload,
  InitReceiveResult,
  TransferSettings,
  WriteChunkPayload,
} from './types.ts'

interface ReceiveSession {
  filePath: string
  fileName: string
  totalSize: number
  chunks: Uint8Array[]
  bytesWritten: number
}

const sessions = new Map<string, ReceiveSession>()

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'download'
  const cleaned = base.replace(/[^\w.\-() ]+/g, '_').trim()
  return cleaned || 'download'
}

function resolveDownloadDir(core: CoreContext, configured: string): string {
  const trimmed = configured.trim() || '~/Downloads'
  if (trimmed.startsWith('~/')) {
    return `${core.fs.homedir()}/${trimmed.slice(2)}`
  }
  return trimmed
}

function uniquePath(dir: string, fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName
  const ext = dot > 0 ? fileName.slice(dot) : ''
  return `${dir}/${stem}${ext}`
}

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'file-transfer' })

  core.ipc.handle('getSettings', async (): Promise<TransferSettings> => {
    const downloadDir = (await core.settings.read<string>('downloadDir')) ?? '~/Downloads'
    const maxFileSizeMb = (await core.settings.read<number>('maxFileSizeMb')) ?? 512
    const signalingHost = (await core.settings.read<string>('signalingHost')) ?? '0.peerjs.com'
    const signalingPort = (await core.settings.read<number>('signalingPort')) ?? 443
    const stunServer =
      (await core.settings.read<string>('stunServer')) ?? 'stun:stun.l.google.com:19302'
    return {
      downloadDir,
      maxFileSizeMb,
      signalingHost,
      signalingPort,
      stunServer,
    }
  })

  core.ipc.handle('initReceive', async (payload: unknown): Promise<InitReceiveResult> => {
    const { fileName, totalSize } = payload as InitReceivePayload
    if (!fileName || totalSize <= 0) throw new Error('Invalid receive payload')

    const downloadDirSetting = (await core.settings.read<string>('downloadDir')) ?? '~/Downloads'
    const maxFileSizeMb = (await core.settings.read<number>('maxFileSizeMb')) ?? 512
    const maxBytes = maxFileSizeMb * 1024 * 1024
    if (totalSize > maxBytes) {
      throw new Error(`File exceeds max size of ${maxFileSizeMb} MB`)
    }

    const downloadDir = resolveDownloadDir(core, downloadDirSetting)
    await core.fs.mkdir(downloadDir, { recursive: true })

    const safeName = sanitizeFileName(fileName)
    const filePath = uniquePath(downloadDir, safeName)
    const sessionId = crypto.randomUUID()

    sessions.set(sessionId, {
      filePath,
      fileName: safeName,
      totalSize,
      chunks: [],
      bytesWritten: 0,
    })

    return { sessionId, filePath }
  })

  core.ipc.handle('writeChunk', async (payload: unknown): Promise<void> => {
    const { sessionId, chunkBase64 } = payload as WriteChunkPayload
    const session = sessions.get(sessionId)
    if (!session) throw new Error('Receive session not found')

    const binary = Uint8Array.from(atob(chunkBase64), (c) => c.charCodeAt(0))
    session.chunks.push(binary)
    session.bytesWritten += binary.byteLength

    if (session.bytesWritten > session.totalSize * 1.05) {
      sessions.delete(sessionId)
      throw new Error('Received more data than expected')
    }
  })

  core.ipc.handle('finishReceive', async (payload: unknown): Promise<FinishReceiveResult> => {
    const { sessionId } = payload as FinishReceivePayload
    const session = sessions.get(sessionId)
    if (!session) throw new Error('Receive session not found')

    const combined = new Uint8Array(session.bytesWritten)
    let offset = 0
    for (const chunk of session.chunks) {
      combined.set(chunk, offset)
      offset += chunk.byteLength
    }

    await core.fs.writeFile(session.filePath, combined)
    sessions.delete(sessionId)

    core.logger.info(`File saved to ${session.filePath} (${session.bytesWritten} bytes)`)
    return { filePath: session.filePath, bytesWritten: session.bytesWritten }
  })

  core.ipc.handle('abortReceive', async (payload: unknown): Promise<void> => {
    const { sessionId } = payload as AbortReceivePayload
    sessions.delete(sessionId)
  })

  core.ipc.handle('copyCode', async (payload: unknown): Promise<void> => {
    const { code } = payload as CopyCodePayload
    await core.clipboard.writeText(code)
    core.logger.info('Transfer code copied to clipboard')
  })
}

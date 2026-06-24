import type { CoreContext } from '@nuxyorg/extension-sdk'
import type { SpawnHandle } from '@nuxyorg/core'
import type {
  AddDownloadPayload,
  DownloadIdPayload,
  DownloadItem,
  DownloadStatus,
  RegisterExternalPayload,
  RemoveExternalPayload,
  UpdateExternalPayload,
} from './types.ts'

const QUEUE_FILE = 'queue.json'
const POLL_INTERVAL_MS = 1000

interface ActiveDownload {
  handle: SpawnHandle
  pollTimer: ReturnType<typeof setInterval>
  lastBytes: number
  lastSampleAt: number
}

function resolveDownloadDir(core: CoreContext, configured: string): string {
  const trimmed = configured.trim() || '~/Downloads'
  if (trimmed.startsWith('~/')) {
    return `${core.fs.homedir()}/${trimmed.slice(2)}`
  }
  return trimmed
}

function fileNameFromUrl(url: URL): string {
  const segments = url.pathname.split('/').filter(Boolean)
  const last = segments.pop()
  return last && last.trim() ? last : 'download'
}

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'download'
  const cleaned = base.replace(/[^\w.\-() ]+/g, '_').trim()
  return cleaned || 'download'
}

function dirname(filePath: string): string {
  const idx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  return idx > 0 ? filePath.slice(0, idx) : filePath
}

function isHttpUrl(text: string): boolean {
  try {
    const parsed = new URL(text)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'download-manager' })
  core.registry.registerProvider({ name: 'download-manager' })

  const items = new Map<string, DownloadItem>()
  const active = new Map<string, ActiveDownload>()

  function touch(id: string, patch: Partial<DownloadItem>): void {
    const current = items.get(id)
    if (!current) return
    items.set(id, { ...current, ...patch, updatedAt: new Date().toISOString() })
  }

  function persist(): void {
    void core.storage.write(QUEUE_FILE, Array.from(items.values()))
  }

  function findBySource(extensionId: string, jobId: string): DownloadItem | undefined {
    return Array.from(items.values()).find(
      (item) => item.source?.extensionId === extensionId && item.source?.jobId === jobId
    )
  }

  function stopPolling(id: string): void {
    const a = active.get(id)
    if (!a) return
    clearInterval(a.pollTimer)
    active.delete(id)
  }

  function startPolling(id: string, filePath: string, handle: SpawnHandle): void {
    const a: ActiveDownload = {
      handle,
      pollTimer: setInterval(() => {
        void core.fs
          .stat(filePath)
          .then((stat) => {
            const now = Date.now()
            const prev = active.get(id)
            if (!prev) return
            const elapsedSec = (now - prev.lastSampleAt) / 1000
            const deltaBytes = stat.size - prev.lastBytes
            const speedBps = elapsedSec > 0 ? Math.max(0, deltaBytes / elapsedSec) : 0
            prev.lastBytes = stat.size
            prev.lastSampleAt = now
            touch(id, { bytesDownloaded: stat.size, speedBps })
            persist()
          })
          .catch(() => {})
      }, POLL_INTERVAL_MS),
      lastBytes: 0,
      lastSampleAt: Date.now(),
    }
    active.set(id, a)

    handle.onClose((code: number | null) => {
      stopPolling(id)
      const current = items.get(id)
      // A pause kills the process too; do not overwrite the 'paused' status
      // a close that races in after pause() already set it.
      if (!current || current.status !== 'downloading') return
      if (code === 0) {
        touch(id, { status: 'completed', speedBps: 0 })
      } else {
        touch(id, {
          status: 'failed',
          speedBps: 0,
          error: `Download process exited with code ${code}`,
        })
      }
      persist()
    })
  }

  function spawnCurl(item: DownloadItem, resume: boolean): SpawnHandle {
    const args = resume
      ? ['-fL', '-C', '-', '-o', item.filePath, item.url]
      : ['-fL', '-o', item.filePath, item.url]
    return core.shell.spawn('curl', args)
  }

  async function startDownload(item: DownloadItem, resume: boolean): Promise<void> {
    const handle = spawnCurl(item, resume)
    startPolling(item.id, item.filePath, handle)
    touch(item.id, { status: 'downloading', error: null })
    persist()
  }

  async function restoreQueue(): Promise<void> {
    const saved = await core.storage.read<DownloadItem[]>(QUEUE_FILE)
    if (!saved) return
    for (const saved_item of saved) {
      // Any item that was mid-flight when the app last shut down had its
      // underlying curl process killed along with it — it cannot silently
      // resume, so surface it as failed rather than implying it's still moving.
      const restored: DownloadItem =
        saved_item.status === 'downloading'
          ? {
              ...saved_item,
              status: 'failed',
              error: 'Download interrupted by app restart',
              speedBps: 0,
            }
          : saved_item
      items.set(restored.id, restored)
    }
    persist()
  }

  void restoreQueue()

  core.ipc.handle('list', async (): Promise<DownloadItem[]> => {
    return Array.from(items.values())
  })

  async function queueDownload(payload: unknown): Promise<DownloadItem> {
    const { url: rawUrl, fileName } = payload as AddDownloadPayload

    let parsed: URL
    try {
      parsed = new URL(rawUrl)
    } catch {
      throw new Error('Invalid URL')
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid URL: only http/https are supported')
    }

    const downloadDirSetting = (await core.settings.read<string>('downloadDir')) ?? '~/Downloads'
    const downloadDir = resolveDownloadDir(core, downloadDirSetting)
    await core.fs.mkdir(downloadDir, { recursive: true })

    const safeName = sanitizeFileName(fileName?.trim() || fileNameFromUrl(parsed))
    const filePath = `${downloadDir}/${safeName}`
    const now = new Date().toISOString()

    const item: DownloadItem = {
      id: crypto.randomUUID(),
      url: rawUrl,
      fileName: safeName,
      filePath,
      status: 'queued',
      bytesDownloaded: 0,
      totalBytes: null,
      speedBps: 0,
      error: null,
      createdAt: now,
      updatedAt: now,
      thumbnail: null,
    }
    items.set(item.id, item)
    persist()

    await startDownload(item, false)
    core.logger.info(`Queued download: ${item.url} -> ${item.filePath}`)
    return items.get(item.id) as DownloadItem
  }

  core.ipc.handle('eval', async (payload: unknown): Promise<{ items: unknown[] }> => {
    const text = (payload as { text?: string } | null | undefined)?.text ?? ''
    const trimmed = text.trim()
    if (!isHttpUrl(trimmed)) return { items: [] }

    return {
      items: [
        {
          id: 'com.nuxy.download-manager',
          title: core.i18n.t('provider.download', { url: trimmed }),
          subtitle: core.i18n.t('provider.subtitle'),
          execute: { channel: 'add_from_provider', payload: { url: trimmed } },
        },
      ],
    }
  })

  core.ipc.handle(
    'add_from_provider',
    async (payload: unknown): Promise<{ toolId: string; query: string }> => {
      await queueDownload(payload)
      return { toolId: 'com.nuxy.download-manager', query: '' }
    }
  )

  core.ipc.handle('add', async (payload: unknown): Promise<DownloadItem> => {
    return queueDownload(payload)
  })

  core.ipc.handle('pause', async (payload: unknown): Promise<void> => {
    const { id } = payload as DownloadIdPayload
    const item = items.get(id)
    if (!item || item.status !== 'downloading') return
    if (item.source) {
      await core.extensions.invoke(item.source.extensionId, 'pause', { jobId: item.source.jobId })
      touch(id, { status: 'paused', speedBps: 0 })
      persist()
      return
    }
    const a = active.get(id)
    a?.handle.kill()
    stopPolling(id)
    touch(id, { status: 'paused', speedBps: 0 })
    persist()
  })

  core.ipc.handle('resume', async (payload: unknown): Promise<void> => {
    const { id } = payload as DownloadIdPayload
    const item = items.get(id)
    if (!item || (item.status !== 'paused' && item.status !== 'failed')) return
    if (item.source) {
      await core.extensions.invoke(item.source.extensionId, 'resume', {
        jobId: item.source.jobId,
      })
      touch(id, { status: 'downloading', error: null })
      persist()
      return
    }
    await startDownload(item, true)
  })

  core.ipc.handle('cancel', async (payload: unknown): Promise<void> => {
    const { id } = payload as DownloadIdPayload
    const item = items.get(id)
    if (!item) return
    if (item.source) {
      await core.extensions.invoke(item.source.extensionId, 'cancel', {
        jobId: item.source.jobId,
      })
      touch(id, { status: 'cancelled', speedBps: 0 })
      persist()
      return
    }
    const a = active.get(id)
    a?.handle.kill()
    stopPolling(id)
    if (await core.fs.fileExists(item.filePath)) {
      await core.fs.rm(item.filePath)
    }
    touch(id, { status: 'cancelled', speedBps: 0 })
    persist()
  })

  core.ipc.handle(
    'registerExternal',
    async (payload: unknown): Promise<DownloadItem> => {
      const { extensionId, jobId, url, fileName, filePath, totalBytes, thumbnail } =
        payload as RegisterExternalPayload
      const now = new Date().toISOString()
      const item: DownloadItem = {
        id: crypto.randomUUID(),
        url,
        fileName: sanitizeFileName(fileName),
        filePath: filePath ?? '',
        status: 'downloading',
        bytesDownloaded: 0,
        totalBytes: totalBytes ?? null,
        speedBps: 0,
        error: null,
        createdAt: now,
        updatedAt: now,
        source: { extensionId, jobId },
        thumbnail: thumbnail ?? null,
      }
      items.set(item.id, item)
      persist()
      return item
    },
    { expose: 'public' }
  )

  core.ipc.handle(
    'updateExternal',
    async (payload: unknown): Promise<void> => {
      const { extensionId, jobId, filePath, ...patch } = payload as UpdateExternalPayload
      const item = findBySource(extensionId, jobId)
      if (!item) return
      touch(item.id, { ...patch, ...(filePath ? { filePath } : {}) })
      persist()
    },
    { expose: 'public' }
  )

  core.ipc.handle('removeExternal', async (payload: unknown): Promise<void> => {
    const { extensionId, jobId } = payload as RemoveExternalPayload
    const item = findBySource(extensionId, jobId)
    if (!item) return
    items.delete(item.id)
    persist()
  })

  core.ipc.handle('remove', async (payload: unknown): Promise<void> => {
    const { id } = payload as DownloadIdPayload
    stopPolling(id)
    items.delete(id)
    persist()
  })

  core.ipc.handle('openFile', async (payload: unknown): Promise<void> => {
    const { id } = payload as DownloadIdPayload
    const item = items.get(id)
    if (!item) throw new Error('Download not found')
    if (await core.fs.fileExists(item.filePath)) {
      await core.shell.open(item.filePath)
      return
    }
    await core.shell.open(item.url)
  })

  core.ipc.handle('openFolder', async (payload: unknown): Promise<void> => {
    const { id } = payload as DownloadIdPayload
    const item = items.get(id)
    if (!item) throw new Error('Download not found')
    await core.shell.open(dirname(item.filePath))
  })
}

// Re-exported only so DownloadStatus stays referenced for downstream typing.
export type { DownloadStatus }

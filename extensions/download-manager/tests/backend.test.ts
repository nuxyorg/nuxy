import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext } from '@nuxyorg/extension-sdk'
import { createMockCore } from '@nuxyorg/extension-sdk/testing'
import { register } from '../backend.ts'
import type { DownloadItem } from '../types.ts'

interface FakeSpawnHandle {
  onData: (handler: (chunk: string) => void) => void
  onClose: (handler: (code: number | null) => void) => void
  kill: (signal?: string) => void
  emitClose: (code: number | null) => void
}

function createFakeSpawnHandle(): FakeSpawnHandle {
  let closeHandler: ((code: number | null) => void) | null = null
  return {
    onData: () => {},
    onClose: (handler) => {
      closeHandler = handler
    },
    kill: vi.fn(),
    emitClose(code) {
      closeHandler?.(code)
    },
  }
}

describe('download-manager backend', () => {
  let core: CoreContext
  let handlers: Record<string, (payload?: unknown) => Promise<unknown>>
  let spawnHandle: FakeSpawnHandle

  beforeEach(() => {
    vi.useFakeTimers()
    spawnHandle = createFakeSpawnHandle()
    ;({ core, handlers } = createMockCore({
      fs: {
        homedir: vi.fn().mockReturnValue('/home/test'),
        mkdir: vi.fn().mockResolvedValue(undefined),
        stat: vi.fn().mockResolvedValue({ isDir: false, size: 0, mtimeMs: 0 }),
        rm: vi.fn().mockResolvedValue(undefined),
        fileExists: vi.fn().mockResolvedValue(false),
      },
      shell: {
        spawn: vi.fn().mockReturnValue(spawnHandle),
        exec: vi.fn().mockResolvedValue({ stdout: '', code: 0 }),
        open: vi.fn().mockResolvedValue(undefined),
      },
      settings: {
        read: vi.fn(async (key: string) => {
          if (key === 'downloadDir') return '~/Downloads'
          return null
        }),
        write: vi.fn().mockResolvedValue(undefined),
      },
      storage: {
        read: vi.fn().mockResolvedValue(null),
        write: vi.fn().mockResolvedValue(undefined),
      },
    }))
    register(core)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('registers as a tool', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'download-manager' })
  })

  it('registers as a provider', () => {
    expect(core.registry.registerProvider).toHaveBeenCalledWith({ name: 'download-manager' })
  })

  describe('eval handler', () => {
    it('offers a download action item when the query is an http(s) url', async () => {
      const res = (await handlers.eval({ text: 'https://example.com/file.iso' })) as {
        items: unknown[]
      }
      expect(res.items).toHaveLength(1)
      expect(res.items[0]).toMatchObject({
        id: 'com.nuxy.download-manager',
        execute: {
          channel: 'add_from_provider',
          payload: { url: 'https://example.com/file.iso' },
        },
      })
    })

    it('offers a download action for urls with @ in the path', async () => {
      const url = 'https://cdn.statically.io/gh/jcubic/static@master/js/lzjb.js'
      const res = (await handlers.eval({ text: url })) as { items: unknown[] }
      expect(res.items).toHaveLength(1)
      expect(res.items[0]).toMatchObject({
        execute: { channel: 'add_from_provider', payload: { url } },
      })
    })

    it('trims surrounding whitespace before validating the url', async () => {
      const res = (await handlers.eval({ text: '  https://example.com/file.iso  ' })) as {
        items: unknown[]
      }
      expect(res.items).toHaveLength(1)
    })

    it('returns no items for plain text that is not a url', async () => {
      const res = (await handlers.eval({ text: 'hello world' })) as { items: unknown[] }
      expect(res.items).toHaveLength(0)
    })

    it('returns no items for non-http(s) urls', async () => {
      const res = (await handlers.eval({ text: 'ftp://example.com/file.iso' })) as {
        items: unknown[]
      }
      expect(res.items).toHaveLength(0)
    })

    it('returns no items for an empty query', async () => {
      const res = (await handlers.eval({ text: '   ' })) as { items: unknown[] }
      expect(res.items).toHaveLength(0)
    })
  })

  it('starts empty', async () => {
    const items = (await handlers.list()) as DownloadItem[]
    expect(items).toEqual([])
  })

  describe('openFile handler', () => {
    it('opens the saved file when it exists on disk', async () => {
      vi.mocked(core.fs.fileExists).mockResolvedValue(true)
      const item = (await handlers.add({ url: 'https://example.com/file.iso' })) as DownloadItem
      await handlers.openFile({ id: item.id })
      expect(core.shell.open).toHaveBeenCalledWith('/home/test/Downloads/file.iso')
    })

    it('opens the source url when the file is not on disk yet', async () => {
      vi.mocked(core.fs.fileExists).mockResolvedValue(false)
      const item = (await handlers.add({ url: 'https://example.com/file.iso' })) as DownloadItem
      await handlers.openFile({ id: item.id })
      expect(core.shell.open).toHaveBeenCalledWith('https://example.com/file.iso')
    })
  })

  describe('openFolder handler', () => {
    it('opens the download directory for the item', async () => {
      const item = (await handlers.add({
        url: 'https://example.com/path/to/archive.tar.gz',
      })) as DownloadItem
      await handlers.openFolder({ id: item.id })
      expect(core.shell.open).toHaveBeenCalledWith('/home/test/Downloads')
    })
  })

  describe('add_from_provider handler', () => {
    it('queues the download and returns a navigation target for the shell', async () => {
      const url = 'https://cdn.statically.io/gh/jcubic/static@master/js/lzjb.js'
      const res = (await handlers.add_from_provider({ url })) as { toolId: string; query: string }
      expect(res).toEqual({ toolId: 'com.nuxy.download-manager', query: '' })
      expect(core.shell.spawn).toHaveBeenCalledWith('curl', [
        '-fL',
        '-o',
        '/home/test/Downloads/lzjb.js',
        url,
      ])
    })
  })

  it('adds a download and spawns curl', async () => {
    const item = (await handlers.add({
      url: 'https://example.com/file.iso',
    })) as DownloadItem

    expect(item.url).toBe('https://example.com/file.iso')
    expect(item.fileName).toBe('file.iso')
    expect(item.status).toBe('downloading')
    expect(item.filePath).toBe('/home/test/Downloads/file.iso')
    expect(core.fs.mkdir).toHaveBeenCalledWith('/home/test/Downloads', { recursive: true })
    expect(core.shell.spawn).toHaveBeenCalledWith(
      'curl',
      expect.arrayContaining(['-fL', '-o', '/home/test/Downloads/file.iso', item.url])
    )
  })

  it('derives a filename from the url when none is given', async () => {
    const item = (await handlers.add({
      url: 'https://example.com/path/to/archive.tar.gz',
    })) as DownloadItem
    expect(item.fileName).toBe('archive.tar.gz')
  })

  it('falls back to a generic filename when the url has no path segment', async () => {
    const item = (await handlers.add({ url: 'https://example.com/' })) as DownloadItem
    expect(item.fileName).toBe('download')
  })

  it('uses an explicit fileName when provided', async () => {
    const item = (await handlers.add({
      url: 'https://example.com/file.iso',
      fileName: 'custom-name.iso',
    })) as DownloadItem
    expect(item.fileName).toBe('custom-name.iso')
    expect(item.filePath).toBe('/home/test/Downloads/custom-name.iso')
  })

  it('rejects invalid urls', async () => {
    await expect(handlers.add({ url: 'not-a-url' })).rejects.toThrow(/invalid url/i)
  })

  it('polls file size and updates progress', async () => {
    const item = (await handlers.add({ url: 'https://example.com/file.iso' })) as DownloadItem

    vi.mocked(core.fs.stat).mockResolvedValue({ isDir: false, size: 2048, mtimeMs: 0 })
    await vi.advanceTimersByTimeAsync(1000)

    const items = (await handlers.list()) as DownloadItem[]
    const updated = items.find((i) => i.id === item.id)
    expect(updated?.bytesDownloaded).toBe(2048)
  })

  it('marks a download completed when the process exits 0', async () => {
    const item = (await handlers.add({ url: 'https://example.com/file.iso' })) as DownloadItem
    spawnHandle.emitClose(0)
    await vi.runOnlyPendingTimersAsync()

    const items = (await handlers.list()) as DownloadItem[]
    const updated = items.find((i) => i.id === item.id)
    expect(updated?.status).toBe('completed')
  })

  it('marks a download failed when the process exits non-zero', async () => {
    const item = (await handlers.add({ url: 'https://example.com/file.iso' })) as DownloadItem
    spawnHandle.emitClose(1)
    await vi.runOnlyPendingTimersAsync()

    const items = (await handlers.list()) as DownloadItem[]
    const updated = items.find((i) => i.id === item.id)
    expect(updated?.status).toBe('failed')
    expect(updated?.error).toBeTruthy()
  })

  it('pauses a download by killing its process', async () => {
    const item = (await handlers.add({ url: 'https://example.com/file.iso' })) as DownloadItem
    await handlers.pause({ id: item.id })

    expect(spawnHandle.kill).toHaveBeenCalled()
    const items = (await handlers.list()) as DownloadItem[]
    expect(items.find((i) => i.id === item.id)?.status).toBe('paused')
  })

  it('resumes a paused download with curl -C - (continue-at)', async () => {
    const item = (await handlers.add({ url: 'https://example.com/file.iso' })) as DownloadItem
    await handlers.pause({ id: item.id })
    vi.mocked(core.shell.spawn).mockClear()

    await handlers.resume({ id: item.id })

    expect(core.shell.spawn).toHaveBeenCalledWith('curl', expect.arrayContaining(['-C', '-']))
    const items = (await handlers.list()) as DownloadItem[]
    expect(items.find((i) => i.id === item.id)?.status).toBe('downloading')
  })

  it('cancels a download, kills the process, and removes the partial file', async () => {
    const item = (await handlers.add({ url: 'https://example.com/file.iso' })) as DownloadItem
    vi.mocked(core.fs.fileExists).mockResolvedValue(true)

    await handlers.cancel({ id: item.id })

    expect(spawnHandle.kill).toHaveBeenCalled()
    expect(core.fs.rm).toHaveBeenCalledWith(item.filePath)
    const items = (await handlers.list()) as DownloadItem[]
    expect(items.find((i) => i.id === item.id)?.status).toBe('cancelled')
  })

  it('removes a download entry from the list', async () => {
    const item = (await handlers.add({ url: 'https://example.com/file.iso' })) as DownloadItem
    spawnHandle.emitClose(0)
    await vi.runOnlyPendingTimersAsync()

    await handlers.remove({ id: item.id })

    const items = (await handlers.list()) as DownloadItem[]
    expect(items.find((i) => i.id === item.id)).toBeUndefined()
  })

  it('persists the queue to storage on changes', async () => {
    await handlers.add({ url: 'https://example.com/file.iso' })
    expect(core.storage.write).toHaveBeenCalledWith('queue.json', expect.any(Array))
  })

  it('restores queued items from storage on register, marking in-flight ones interrupted', async () => {
    const persisted: DownloadItem[] = [
      {
        id: 'abc',
        url: 'https://example.com/file.iso',
        fileName: 'file.iso',
        filePath: '/home/test/Downloads/file.iso',
        status: 'downloading',
        bytesDownloaded: 100,
        totalBytes: null,
        speedBps: 0,
        error: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]
    const { core: restoredCore, handlers: restoredHandlers } = createMockCore({
      fs: {
        homedir: vi.fn().mockReturnValue('/home/test'),
        mkdir: vi.fn().mockResolvedValue(undefined),
        stat: vi.fn().mockResolvedValue({ isDir: false, size: 0, mtimeMs: 0 }),
        rm: vi.fn().mockResolvedValue(undefined),
        fileExists: vi.fn().mockResolvedValue(false),
      },
      shell: { spawn: vi.fn().mockReturnValue(createFakeSpawnHandle()), exec: vi.fn() },
      settings: { read: vi.fn().mockResolvedValue(null), write: vi.fn() },
      storage: {
        read: vi.fn().mockResolvedValue(persisted),
        write: vi.fn().mockResolvedValue(undefined),
      },
    })
    register(restoredCore)
    // Allow the async restore-on-register microtask to settle.
    await vi.runOnlyPendingTimersAsync()

    const items = (await restoredHandlers.list()) as DownloadItem[]
    expect(items[0].status).toBe('failed')
    expect(items[0].error).toMatch(/interrupted/i)
  })
})

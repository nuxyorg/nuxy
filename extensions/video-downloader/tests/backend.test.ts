import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext } from '@nuxyorg/extension-sdk'
import { createMockCore } from '@nuxyorg/extension-sdk/testing'
import { register } from '../backend.ts'

const DOWNLOAD_MANAGER_ID = 'com.nuxy.download-manager'
const EXT_ID = 'com.nuxy.video-downloader'

interface FakeSpawnHandle {
  onData: (handler: (chunk: string) => void) => void
  onClose: (handler: (code: number | null) => void) => void
  kill: ReturnType<typeof vi.fn>
  emitData: (chunk: string) => void
  emitClose: (code: number | null) => void
}

function createFakeSpawnHandle(): FakeSpawnHandle {
  let dataHandler: ((chunk: string) => void) | null = null
  let closeHandler: ((code: number | null) => void) | null = null
  return {
    onData: (handler) => {
      dataHandler = handler
    },
    onClose: (handler) => {
      closeHandler = handler
    },
    kill: vi.fn(),
    emitData(chunk) {
      dataHandler?.(chunk)
    },
    emitClose(code) {
      closeHandler?.(code)
    },
  }
}

describe('video-downloader backend', () => {
  let core: CoreContext
  let handlers: Record<string, (payload?: unknown) => Promise<unknown>>
  let spawnHandle: FakeSpawnHandle

  beforeEach(() => {
    spawnHandle = createFakeSpawnHandle()
    ;({ core, handlers } = createMockCore({
      fs: {
        homedir: vi.fn().mockReturnValue('/home/test'),
        mkdir: vi.fn().mockResolvedValue(undefined),
        fileExists: vi.fn().mockResolvedValue(false),
        rm: vi.fn().mockResolvedValue(undefined),
      },
      shell: {
        exec: vi.fn().mockResolvedValue({ stdout: '/usr/bin/yt-dlp', code: 0 }),
        spawn: vi.fn().mockReturnValue(spawnHandle),
      },
      settings: {
        read: vi.fn().mockResolvedValue('~/Downloads'),
        write: vi.fn().mockResolvedValue(undefined),
      },
      extensions: {
        invoke: vi.fn().mockResolvedValue({ success: true }),
      },
    }))
    register(core)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers as a tool named "video-downloader"', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'video-downloader' })
  })

  it('registers as a provider named "video-downloader"', () => {
    expect(core.registry.registerProvider).toHaveBeenCalledWith({ name: 'video-downloader' })
  })

  describe('eval', () => {
    it('returns a tool item when the query is a known video URL', async () => {
      const result = (await handlers.eval({
        text: 'https://www.youtube.com/watch?v=abc123',
      })) as { items: Array<Record<string, unknown>> }

      expect(result.items).toHaveLength(1)
      expect(result.items[0]).toMatchObject({
        id: EXT_ID,
        isTool: true,
        initialQuery: 'https://www.youtube.com/watch?v=abc123',
      })
    })

    it('matches other supported video hosts such as vimeo and tiktok', async () => {
      const vimeo = (await handlers.eval({ text: 'https://vimeo.com/12345' })) as {
        items: unknown[]
      }
      const tiktok = (await handlers.eval({
        text: 'https://www.tiktok.com/@user/video/123',
      })) as { items: unknown[] }

      expect(vimeo.items).toHaveLength(1)
      expect(tiktok.items).toHaveLength(1)
    })

    it('returns no items for non-video text or unsupported URLs', async () => {
      const empty = (await handlers.eval({ text: '' })) as { items: unknown[] }
      const plainText = (await handlers.eval({ text: 'hello world' })) as { items: unknown[] }
      const unsupported = (await handlers.eval({ text: 'https://example.com/page' })) as {
        items: unknown[]
      }

      expect(empty.items).toHaveLength(0)
      expect(plainText.items).toHaveLength(0)
      expect(unsupported.items).toHaveLength(0)
    })
  })

  describe('status', () => {
    it('returns { installed: true } when yt-dlp binary is found', async () => {
      await Promise.resolve()
      const result = await handlers.status(undefined)
      expect(result).toEqual({ installed: true })
    })

    it('returns { installed: false } when yt-dlp binary is missing', async () => {
      const { core: freshCore, handlers: freshHandlers } = createMockCore({
        shell: {
          exec: vi.fn().mockRejectedValue(new Error('not found')),
          spawn: vi.fn().mockReturnValue(createFakeSpawnHandle()),
        },
      })
      register(freshCore)
      const result = await freshHandlers.status(undefined)
      expect(result).toEqual({ installed: false })
    })
  })

  describe('getFormats', () => {
    it('calls core.shell.exec with yt-dlp and correct args', async () => {
      vi.mocked(core.shell.exec).mockResolvedValueOnce({
        stdout: JSON.stringify({ formats: [] }),
        code: 0,
      })

      await handlers.getFormats({ url: 'https://youtube.com/watch?v=test' })

      expect(core.shell.exec).toHaveBeenCalledWith(
        'yt-dlp',
        ['-J', '--no-download', 'https://youtube.com/watch?v=test'],
        { maxBuffer: 10 * 1024 * 1024 }
      )
    })

    it('parses yt-dlp JSON output into a VideoMetadata shape', async () => {
      vi.mocked(core.shell.exec).mockResolvedValueOnce({
        stdout: JSON.stringify({
          title: 'Test Video Title',
          thumbnail: 'https://example.com/thumb.jpg',
          duration: 360,
          uploader: 'Test Channel',
          formats: [
            {
              format_id: '137',
              ext: 'mp4',
              resolution: '1920x1080',
              filesize: 102400,
              format_note: 'HD',
            },
          ],
        }),
        code: 0,
      })

      const result = (await handlers.getFormats({ url: 'https://example.com/video' })) as {
        title: string
        formats: unknown[]
      }
      expect(result.title).toBe('Test Video Title')
      expect(result.formats).toHaveLength(1)
    })

    it('throws a helpful error when yt-dlp is not installed (ENOENT)', async () => {
      const enoentErr = Object.assign(new Error('spawn yt-dlp ENOENT'), { code: 'ENOENT' })
      vi.mocked(core.shell.exec).mockRejectedValueOnce(enoentErr)

      await expect(handlers.getFormats({ url: 'https://example.com/video' })).rejects.toThrow(
        'yt-dlp is not installed'
      )
    })
  })

  describe('download', () => {
    it('spawns yt-dlp with the chosen format and registers the job with the download manager', async () => {
      const { jobId } = (await handlers.download({
        url: 'https://example.com/video',
        formatId: '137',
        resolution: '1080p',
        metadata: { title: 'My Video', thumbnail: null, duration: null, uploader: null },
      })) as { jobId: string }

      expect(typeof jobId).toBe('string')
      expect(core.shell.spawn).toHaveBeenCalledWith(
        'yt-dlp',
        expect.arrayContaining([
          '--newline',
          '--continue',
          '-f',
          '137',
          'https://example.com/video',
        ])
      )
      expect(core.extensions.invoke).toHaveBeenCalledWith(DOWNLOAD_MANAGER_ID, 'registerExternal', {
        extensionId: EXT_ID,
        jobId,
        url: 'https://example.com/video',
        fileName: 'My Video',
        filePath: null,
        totalBytes: null,
        thumbnail: null,
      })
    })

    it('forwards the video thumbnail to the download manager when known', async () => {
      const { jobId } = (await handlers.download({
        url: 'https://example.com/video',
        formatId: '137',
        resolution: '1080p',
        metadata: {
          title: 'My Video',
          thumbnail: 'https://img.youtube.com/vi/abc/0.jpg',
          duration: null,
          uploader: null,
        },
      })) as { jobId: string }

      expect(core.extensions.invoke).toHaveBeenCalledWith(DOWNLOAD_MANAGER_ID, 'registerExternal', {
        extensionId: EXT_ID,
        jobId,
        url: 'https://example.com/video',
        fileName: 'My Video',
        filePath: null,
        totalBytes: null,
        thumbnail: 'https://img.youtube.com/vi/abc/0.jpg',
      })
    })

    it('reports progress to the download manager as bytes derived from the percentage', async () => {
      const { jobId } = (await handlers.download({
        url: 'https://example.com/video',
        formatId: '137',
        resolution: '1080p',
        metadata: { title: 'My Video', thumbnail: null, duration: null, uploader: null },
      })) as { jobId: string }

      spawnHandle.emitData('[download]  45.2% of 128.34MiB at 1.23MiB/s ETA 00:42\n')

      expect(core.extensions.invoke).toHaveBeenCalledWith(
        DOWNLOAD_MANAGER_ID,
        'updateExternal',
        expect.objectContaining({
          extensionId: EXT_ID,
          jobId,
          status: 'downloading',
          totalBytes: 128.34 * 1024 * 1024,
        })
      )
    })

    it('reports completed status when the process exits 0', async () => {
      const { jobId } = (await handlers.download({
        url: 'https://example.com/video',
        formatId: '137',
        resolution: '1080p',
        metadata: { title: 'My Video', thumbnail: null, duration: null, uploader: null },
      })) as { jobId: string }

      spawnHandle.emitClose(0)

      expect(core.extensions.invoke).toHaveBeenCalledWith(
        DOWNLOAD_MANAGER_ID,
        'updateExternal',
        expect.objectContaining({ extensionId: EXT_ID, jobId, status: 'completed' })
      )
    })

    it('reports failed status with an error message when the process exits non-zero', async () => {
      const { jobId } = (await handlers.download({
        url: 'https://example.com/video',
        formatId: '137',
        resolution: '1080p',
        metadata: { title: 'My Video', thumbnail: null, duration: null, uploader: null },
      })) as { jobId: string }

      spawnHandle.emitClose(1)

      expect(core.extensions.invoke).toHaveBeenCalledWith(
        DOWNLOAD_MANAGER_ID,
        'updateExternal',
        expect.objectContaining({
          extensionId: EXT_ID,
          jobId,
          status: 'failed',
          error: expect.stringContaining('1'),
        })
      )
    })
  })

  describe('pause / resume / cancel', () => {
    it('pause kills the active process for the job', async () => {
      const { jobId } = (await handlers.download({
        url: 'https://example.com/video',
        formatId: '137',
        resolution: '1080p',
        metadata: { title: 'My Video', thumbnail: null, duration: null, uploader: null },
      })) as { jobId: string }

      await handlers.pause({ jobId })

      expect(spawnHandle.kill).toHaveBeenCalledWith('SIGTERM')
    })

    it('resume re-spawns yt-dlp with --continue for the same job', async () => {
      const { jobId } = (await handlers.download({
        url: 'https://example.com/video',
        formatId: '137',
        resolution: '1080p',
        metadata: { title: 'My Video', thumbnail: null, duration: null, uploader: null },
      })) as { jobId: string }
      await handlers.pause({ jobId })
      vi.mocked(core.shell.spawn).mockClear()

      await handlers.resume({ jobId })

      expect(core.shell.spawn).toHaveBeenCalledWith(
        'yt-dlp',
        expect.arrayContaining(['--continue', '-f', '137'])
      )
    })

    it('cancel kills the process and removes the partial file if known', async () => {
      const { jobId } = (await handlers.download({
        url: 'https://example.com/video',
        formatId: '137',
        resolution: '1080p',
        metadata: { title: 'My Video', thumbnail: null, duration: null, uploader: null },
      })) as { jobId: string }
      spawnHandle.emitData('[download] Destination: /home/test/Downloads/My Video.mp4\n')
      vi.mocked(core.fs.fileExists).mockResolvedValue(true)

      await handlers.cancel({ jobId })

      expect(spawnHandle.kill).toHaveBeenCalledWith('SIGTERM')
      expect(core.fs.rm).toHaveBeenCalledWith('/home/test/Downloads/My Video.mp4')
    })

    it('cancel on an unknown job is a no-op', async () => {
      await expect(handlers.cancel({ jobId: 'missing' })).resolves.toBeUndefined()
    })
  })
})

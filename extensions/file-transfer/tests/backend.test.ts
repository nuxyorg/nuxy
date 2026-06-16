import { describe, it, expect, vi, beforeEach } from 'vitest'
import { type CoreContext } from '@nuxyorg/extension-sdk'
import { createMockCore } from '@nuxyorg/extension-sdk/testing'
import { register } from '../backend.ts'

describe('file-transfer backend', () => {
  let core: CoreContext
  let handlers: Record<string, (payload?: unknown) => Promise<unknown>>

  beforeEach(() => {
    ;({ core, handlers } = createMockCore({
      fs: {
        homedir: vi.fn().mockReturnValue('/home/test'),
        mkdir: vi.fn().mockResolvedValue(undefined),
        writeFile: vi.fn().mockResolvedValue(undefined),
      },
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      settings: {
        read: vi.fn(async (key: string) => {
          if (key === 'downloadDir') return '~/Downloads'
          if (key === 'maxFileSizeMb') return 512
          if (key === 'signalingHost') return '0.peerjs.com'
          if (key === 'signalingPort') return 443
          if (key === 'stunServer') return 'stun:stun.l.google.com:19302'
          return null
        }),
        write: vi.fn().mockResolvedValue(undefined),
      },
    }))
    register(core)
  })

  it('registers as a tool', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'file-transfer' })
  })

  it('returns settings', async () => {
    const settings = await handlers.getSettings()
    expect(settings).toEqual({
      downloadDir: '~/Downloads',
      maxFileSizeMb: 512,
      signalingHost: '0.peerjs.com',
      signalingPort: 443,
      stunServer: 'stun:stun.l.google.com:19302',
    })
  })

  it('initializes a receive session', async () => {
    const result = (await handlers.initReceive({
      fileName: 'photo.png',
      totalSize: 1024,
    })) as { sessionId: string; filePath: string }

    expect(result.sessionId).toBeTruthy()
    expect(result.filePath).toBe('/home/test/Downloads/photo.png')
    expect(core.fs.mkdir).toHaveBeenCalledWith('/home/test/Downloads', { recursive: true })
  })

  it('writes chunks and finishes receive', async () => {
    const { sessionId } = (await handlers.initReceive({
      fileName: 'data.bin',
      totalSize: 4,
    })) as { sessionId: string; filePath: string }

    const chunk = btoa(String.fromCharCode(1, 2, 3, 4))
    await handlers.writeChunk({ sessionId, chunkBase64: chunk })

    const finished = (await handlers.finishReceive({ sessionId })) as {
      filePath: string
      bytesWritten: number
    }

    expect(finished.bytesWritten).toBe(4)
    expect(finished.filePath).toBe('/home/test/Downloads/data.bin')
    expect(core.fs.writeFile).toHaveBeenCalled()
  })

  it('rejects files above max size', async () => {
    await expect(
      handlers.initReceive({ fileName: 'big.zip', totalSize: 600 * 1024 * 1024 })
    ).rejects.toThrow(/max size/)
  })

  it('copies transfer code to clipboard', async () => {
    await handlers.copyCode({ code: 'FT-ABCD-EFGH' })
    expect(core.clipboard.writeText).toHaveBeenCalledWith('FT-ABCD-EFGH')
  })

  it('aborts receive session', async () => {
    const { sessionId } = (await handlers.initReceive({
      fileName: 'tmp.bin',
      totalSize: 10,
    })) as { sessionId: string; filePath: string }

    await handlers.abortReceive({ sessionId })
    await expect(handlers.finishReceive({ sessionId })).rejects.toThrow(/not found/)
  })
})

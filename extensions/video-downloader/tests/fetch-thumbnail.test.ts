import { describe, it, expect, vi, beforeEach } from 'vitest'
import { type CoreContext } from '@nuxyorg/extension-sdk'
import { createMockCore } from '@nuxyorg/extension-sdk/testing'
import {
  mimeFromImageBytes,
  networkFlagsForCurl,
  resolveThumbnailUrl,
} from '../utils/fetch-thumbnail.ts'

describe('networkFlagsForCurl', () => {
  it('maps yt-dlp IPv4 flags to curl -4', () => {
    expect(networkFlagsForCurl(['-4'])).toEqual(['-4'])
    expect(networkFlagsForCurl(['--force-ipv4'])).toEqual(['-4'])
  })

  it('maps proxy and insecure flags', () => {
    expect(
      networkFlagsForCurl(['--proxy', 'http://127.0.0.1:8080', '--no-check-certificate'])
    ).toEqual(['--proxy', 'http://127.0.0.1:8080', '-k'])
  })

  it('ignores unrelated yt-dlp flags', () => {
    expect(networkFlagsForCurl(['--no-playlist', '-f', '137'])).toEqual([])
  })
})

describe('mimeFromImageBytes', () => {
  it('detects common image formats', () => {
    expect(mimeFromImageBytes(new Uint8Array([0xff, 0xd8, 0xff]))).toBe('image/jpeg')
    expect(mimeFromImageBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe('image/png')
  })
})

describe('resolveThumbnailUrl', () => {
  let core: CoreContext

  beforeEach(() => {
    ;({ core } = createMockCore({
      fs: {
        tmpdir: vi.fn().mockReturnValue('/tmp'),
        fileExists: vi.fn().mockResolvedValue(true),
        readFileBinary: vi.fn().mockResolvedValue(new Uint8Array([0xff, 0xd8, 0xff, 0x00])),
        rm: vi.fn().mockResolvedValue(undefined),
      },
      shell: {
        exec: vi.fn().mockResolvedValue({ stdout: '', code: 0 }),
      },
    }))
  })

  it('returns the original URL when no network flags are configured', async () => {
    await expect(resolveThumbnailUrl(core, 'https://example.com/thumb.jpg', [])).resolves.toBe(
      'https://example.com/thumb.jpg'
    )
    expect(core.shell.exec).not.toHaveBeenCalled()
  })

  it('fetches via curl with IPv4 flags and returns a data URL', async () => {
    const result = await resolveThumbnailUrl(core, 'https://example.com/thumb.jpg', ['-4'])

    expect(core.shell.exec).toHaveBeenCalledWith(
      'curl',
      expect.arrayContaining([
        '-fsSL',
        '-o',
        expect.stringContaining('/tmp/nuxy-vd-thumb-'),
        '-4',
        'https://example.com/thumb.jpg',
      ])
    )
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('passes through existing data URLs unchanged', async () => {
    const dataUrl = 'data:image/png;base64,abc'
    await expect(resolveThumbnailUrl(core, dataUrl, ['-4'])).resolves.toBe(dataUrl)
    expect(core.shell.exec).not.toHaveBeenCalled()
  })
})

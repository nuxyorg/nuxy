import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import { register } from './backend.ts'

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,FAKE'),
  },
}))

import QRCode from 'qrcode'

describe('qr backend', () => {
  let core: CoreContext
  let handlers: Record<string, (payload?: unknown) => Promise<unknown>>

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ core, handlers } = createMockCore({
      settings: {
        read: vi.fn().mockResolvedValue(null),
      },
    }))
    await register(core)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.mocked(QRCode.toDataURL).mockResolvedValue('data:image/png;base64,FAKE')
  })

  it('registers a tool', () => {
    expect(core.registry.registerTool).toHaveBeenCalledOnce()
    expect(core.registry.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(String) })
    )
  })

  describe('qr:generate', () => {
    it('returns a dataUrl for a given text', async () => {
      const result = await handlers['qr:generate']({ text: 'https://example.com' })
      expect(result).toEqual({ dataUrl: 'data:image/png;base64,FAKE' })
    })

    it('calls QRCode.toDataURL with the provided text', async () => {
      await handlers['qr:generate']({ text: 'hello world' })
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        'hello world',
        expect.objectContaining({ margin: 2 })
      )
    })

    it('uses a space for empty text to avoid QRCode errors', async () => {
      await handlers['qr:generate']({ text: '' })
      expect(QRCode.toDataURL).toHaveBeenCalledWith(' ', expect.any(Object))
    })

    it('uses default size 256 when settings returns null', async () => {
      await handlers['qr:generate']({ text: 'test' })
      expect(QRCode.toDataURL).toHaveBeenCalledWith('test', expect.objectContaining({ width: 256 }))
    })

    it('uses size from settings when available', async () => {
      ;({ core, handlers } = createMockCore({
        settings: {
          read: vi.fn().mockImplementation((key: string) => {
            if (key === 'size') return Promise.resolve('512')
            return Promise.resolve(null)
          }),
        },
      }))
      await register(core)

      await handlers['qr:generate']({ text: 'test' })
      expect(QRCode.toDataURL).toHaveBeenCalledWith('test', expect.objectContaining({ width: 512 }))
    })

    it('uses payload size over settings size', async () => {
      await handlers['qr:generate']({ text: 'test', size: 128 })
      expect(QRCode.toDataURL).toHaveBeenCalledWith('test', expect.objectContaining({ width: 128 }))
    })

    it('uses default error correction M when settings returns null', async () => {
      await handlers['qr:generate']({ text: 'test' })
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ errorCorrectionLevel: 'M' })
      )
    })

    it('uses errorCorrection from settings when available', async () => {
      ;({ core, handlers } = createMockCore({
        settings: {
          read: vi.fn().mockImplementation((key: string) => {
            if (key === 'errorCorrection') return Promise.resolve('H')
            return Promise.resolve(null)
          }),
        },
      }))
      await register(core)

      await handlers['qr:generate']({ text: 'test' })
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ errorCorrectionLevel: 'H' })
      )
    })

    it('uses payload errorCorrectionLevel over settings', async () => {
      await handlers['qr:generate']({ text: 'test', errorCorrectionLevel: 'Q' })
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ errorCorrectionLevel: 'Q' })
      )
    })

    it('always uses fixed dark/light colors', async () => {
      await handlers['qr:generate']({ text: 'test' })
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          color: { dark: '#000000', light: '#ffffff' },
        })
      )
    })
  })

  describe('qr:copyText', () => {
    it('writes text to clipboard and returns { copied: true }', async () => {
      const result = await handlers['qr:copyText']({ text: 'https://example.com' })
      expect(core.clipboard.writeText).toHaveBeenCalledWith('https://example.com')
      expect(result).toEqual({ copied: true })
    })

    it('writes empty string to clipboard when text is empty', async () => {
      const result = await handlers['qr:copyText']({ text: '' })
      expect(core.clipboard.writeText).toHaveBeenCalledWith('')
      expect(result).toEqual({ copied: true })
    })
  })
})

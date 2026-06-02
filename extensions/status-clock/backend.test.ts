import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockCore } from '@nuxy/extension-sdk'
import type { ClockSettings } from './types.ts'

beforeEach(() => {
  vi.resetModules()
})
afterEach(() => {
  vi.restoreAllMocks()
})

async function freshBackend() {
  const mod = await import('./backend.ts')
  return mod.register
}

describe('status-clock backend', () => {
  it('registers getSettings IPC handler', async () => {
    const register = await freshBackend()
    const { core, handlers } = createMockCore(vi)
    await register(core)
    expect(typeof handlers['getSettings']).toBe('function')
  })

  it('logs info message on register', async () => {
    const register = await freshBackend()
    const { core } = createMockCore(vi)
    await register(core)
    expect(core.logger.info).toHaveBeenCalledWith('Status Clock registered')
  })

  it('logs info exactly once', async () => {
    const register = await freshBackend()
    const { core } = createMockCore(vi)
    await register(core)
    expect(core.logger.info).toHaveBeenCalledOnce()
  })

  describe('getSettings handler — defaults', () => {
    it('returns format=24h and showSeconds=true when nothing is stored', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore(vi)
      ;(core.settings.read as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      await register(core)
      const result = (await handlers['getSettings']()) as ClockSettings
      expect(result).toEqual({ format: '24h', showSeconds: true })
    })

    it('returns defaults when settings.read resolves undefined', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore(vi)
      ;(core.settings.read as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      await register(core)
      const result = (await handlers['getSettings']()) as ClockSettings
      expect(result).toEqual({ format: '24h', showSeconds: true })
    })
  })

  describe('getSettings handler — stored format values', () => {
    it('returns format=12h when stored', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore(vi)
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce('12h')
        .mockResolvedValueOnce(null)
      await register(core)
      const result = (await handlers['getSettings']()) as ClockSettings
      expect(result.format).toBe('12h')
    })

    it('returns format=24h when stored explicitly', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore(vi)
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce('24h')
        .mockResolvedValueOnce(null)
      await register(core)
      const result = (await handlers['getSettings']()) as ClockSettings
      expect(result.format).toBe('24h')
    })

    it('passes stored format string through as-is (invalid value passthrough)', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore(vi)
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce('invalid')
        .mockResolvedValueOnce(null)
      await register(core)
      const result = (await handlers['getSettings']()) as ClockSettings
      expect(result.format).toBe('invalid')
    })
  })

  describe('getSettings handler — stored showSeconds values', () => {
    it('returns showSeconds=false when stored as false', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore(vi)
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(false)
      await register(core)
      const result = (await handlers['getSettings']()) as ClockSettings
      expect(result.showSeconds).toBe(false)
    })

    it('returns showSeconds=true when stored as true', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore(vi)
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(true)
      await register(core)
      const result = (await handlers['getSettings']()) as ClockSettings
      expect(result.showSeconds).toBe(true)
    })
  })

  describe('getSettings handler — all combinations', () => {
    it('12h + showSeconds=true', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore(vi)
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce('12h')
        .mockResolvedValueOnce(true)
      await register(core)
      const result = (await handlers['getSettings']()) as ClockSettings
      expect(result).toEqual({ format: '12h', showSeconds: true })
    })

    it('12h + showSeconds=false', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore(vi)
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce('12h')
        .mockResolvedValueOnce(false)
      await register(core)
      const result = (await handlers['getSettings']()) as ClockSettings
      expect(result).toEqual({ format: '12h', showSeconds: false })
    })

    it('24h + showSeconds=false', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore(vi)
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce('24h')
        .mockResolvedValueOnce(false)
      await register(core)
      const result = (await handlers['getSettings']()) as ClockSettings
      expect(result).toEqual({ format: '24h', showSeconds: false })
    })

    it('24h + showSeconds=true', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore(vi)
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce('24h')
        .mockResolvedValueOnce(true)
      await register(core)
      const result = (await handlers['getSettings']()) as ClockSettings
      expect(result).toEqual({ format: '24h', showSeconds: true })
    })
  })

  describe('getSettings handler — partial stored values', () => {
    it('format stored but showSeconds not — showSeconds defaults to true', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore(vi)
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce('12h')
        .mockResolvedValueOnce(null)
      await register(core)
      const result = (await handlers['getSettings']()) as ClockSettings
      expect(result).toEqual({ format: '12h', showSeconds: true })
    })

    it('showSeconds stored but format not — format defaults to 24h', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore(vi)
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(false)
      await register(core)
      const result = (await handlers['getSettings']()) as ClockSettings
      expect(result).toEqual({ format: '24h', showSeconds: false })
    })
  })

  it('reads format key before showSeconds key', async () => {
    const register = await freshBackend()
    const { core, handlers } = createMockCore(vi)
    const readMock = core.settings.read as ReturnType<typeof vi.fn>
    readMock.mockResolvedValue(null)
    await register(core)
    await handlers['getSettings']()
    expect(readMock).toHaveBeenNthCalledWith(1, 'format')
    expect(readMock).toHaveBeenNthCalledWith(2, 'showSeconds')
  })

  it('getSettings can be called multiple times independently', async () => {
    const register = await freshBackend()
    const { core, handlers } = createMockCore(vi)
    const readMock = core.settings.read as ReturnType<typeof vi.fn>
    readMock
      .mockResolvedValueOnce('12h')
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce('24h')
      .mockResolvedValueOnce(true)
    await register(core)
    const first = (await handlers['getSettings']()) as ClockSettings
    const second = (await handlers['getSettings']()) as ClockSettings
    expect(first).toEqual({ format: '12h', showSeconds: false })
    expect(second).toEqual({ format: '24h', showSeconds: true })
  })
})

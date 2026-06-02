import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockCore } from '@nuxy/extension-sdk'
import type { SoundSettings } from './types.ts'

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

describe('ambient-sound backend', () => {
  it('registers getSettings IPC handler', async () => {
    const register = await freshBackend()
    const { core, handlers } = createMockCore()
    await register(core)
    expect(typeof handlers['getSettings']).toBe('function')
  })

  it('logs info message on register', async () => {
    const register = await freshBackend()
    const { core } = createMockCore()
    await register(core)
    expect(core.logger.info).toHaveBeenCalledWith('Ambient Sound registered')
  })

  it('logs info exactly once', async () => {
    const register = await freshBackend()
    const { core } = createMockCore()
    await register(core)
    expect(core.logger.info).toHaveBeenCalledOnce()
  })

  describe('getSettings handler — defaults', () => {
    it('returns enabled=true, volume=0.2, style=click when nothing stored', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result).toEqual({ enabled: true, volume: 0.2, style: 'click' })
    })

    it('returns defaults when settings.read resolves undefined', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result).toEqual({ enabled: true, volume: 0.2, style: 'click' })
    })
  })

  describe('getSettings handler — stored enabled values', () => {
    it('returns enabled=false when stored', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result.enabled).toBe(false)
    })

    it('returns enabled=true when stored explicitly', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result.enabled).toBe(true)
    })
  })

  describe('getSettings handler — stored volume values', () => {
    it('returns volume=0 (minimum boundary)', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(null)
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result.volume).toBe(0)
    })

    it('returns volume=1.0 (maximum boundary)', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(1.0)
        .mockResolvedValueOnce(null)
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result.volume).toBe(1.0)
    })

    it('returns volume=0.0 (same as 0 — boundary)', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(0.0)
        .mockResolvedValueOnce(null)
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result.volume).toBe(0.0)
    })

    it('returns volume=0.5 (mid value)', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(0.5)
        .mockResolvedValueOnce(null)
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result.volume).toBe(0.5)
    })
  })

  describe('getSettings handler — stored style values', () => {
    it('returns style=soft', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('soft')
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result.style).toBe('soft')
    })

    it('returns style=typewriter', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('typewriter')
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result.style).toBe('typewriter')
    })

    it('returns style=click when stored explicitly', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('click')
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result.style).toBe('click')
    })

    it('passes invalid style value through as-is', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('invalid')
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result.style).toBe('invalid')
    })
  })

  describe('getSettings handler — partial stored values', () => {
    it('enabled stored but volume and style not — volume and style use defaults', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result).toEqual({ enabled: false, volume: 0.2, style: 'click' })
    })

    it('volume stored but enabled and style not — enabled and style use defaults', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(0.8)
        .mockResolvedValueOnce(null)
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result).toEqual({ enabled: true, volume: 0.8, style: 'click' })
    })

    it('style stored but enabled and volume not — enabled and volume use defaults', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('typewriter')
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result).toEqual({ enabled: true, volume: 0.2, style: 'typewriter' })
    })
  })

  describe('getSettings handler — all fields stored', () => {
    it('returns all stored values: enabled=false, volume=0.5, style=soft', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(0.5)
        .mockResolvedValueOnce('soft')
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result).toEqual({ enabled: false, volume: 0.5, style: 'soft' })
    })

    it('returns all stored values: enabled=true, volume=1.0, style=typewriter', async () => {
      const register = await freshBackend()
      const { core, handlers } = createMockCore()
      ;(core.settings.read as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(1.0)
        .mockResolvedValueOnce('typewriter')
      await register(core)
      const result = (await handlers['getSettings']()) as SoundSettings
      expect(result).toEqual({ enabled: true, volume: 1.0, style: 'typewriter' })
    })
  })

  it('reads enabled, then volume, then style keys in that order', async () => {
    const register = await freshBackend()
    const { core, handlers } = createMockCore()
    const readMock = core.settings.read as ReturnType<typeof vi.fn>
    readMock.mockResolvedValue(null)
    await register(core)
    await handlers['getSettings']()
    expect(readMock).toHaveBeenNthCalledWith(1, 'enabled')
    expect(readMock).toHaveBeenNthCalledWith(2, 'volume')
    expect(readMock).toHaveBeenNthCalledWith(3, 'style')
  })

  it('getSettings can be called multiple times independently', async () => {
    const register = await freshBackend()
    const { core, handlers } = createMockCore()
    const readMock = core.settings.read as ReturnType<typeof vi.fn>
    readMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(0.1)
      .mockResolvedValueOnce('soft')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(0.9)
      .mockResolvedValueOnce('typewriter')
    await register(core)
    const first = (await handlers['getSettings']()) as SoundSettings
    const second = (await handlers['getSettings']()) as SoundSettings
    expect(first).toEqual({ enabled: false, volume: 0.1, style: 'soft' })
    expect(second).toEqual({ enabled: true, volume: 0.9, style: 'typewriter' })
  })
})

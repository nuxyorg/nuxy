import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import { register } from './backend.ts'

const CONTAINER_LINE = JSON.stringify({
  ID: 'abc123def456',
  Names: '/my-nginx',
  Image: 'nginx:latest',
  Status: 'Up 2 hours',
  State: 'running',
  Ports: '0.0.0.0:80->80/tcp',
  RunningFor: '2 hours ago',
})

const IMAGE_LINE = JSON.stringify({
  ID: 'sha256:abc',
  Repository: 'nginx',
  Tag: 'latest',
  Size: '142MB',
  CreatedAt: '2024-01-01 00:00:00 +0000 UTC',
})

function setup(overrides?: Parameters<typeof createMockCore>[0]): {
  core: CoreContext
  handlers: Record<string, (payload?: unknown) => Promise<unknown>>
} {
  const { core, handlers } = createMockCore({
    shell: {
      exec: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    },
    settings: {
      read: vi.fn().mockResolvedValue(null),
    },
    ...overrides,
  })
  register(core)
  return { core, handlers }
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('docker backend', () => {
  it('registers a tool', () => {
    const { core } = setup()
    expect(core.registry.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(String) })
    )
  })

  describe('docker:containers', () => {
    it('calls docker ps --format with no --all by default', async () => {
      const { core, handlers } = setup({
        shell: {
          exec: vi.fn().mockResolvedValue({ stdout: CONTAINER_LINE, stderr: '', exitCode: 0 }),
        },
      })
      const containers = (await handlers['docker:containers']({})) as Array<{
        id: string
        name: string
        state: string
      }>
      expect(core.shell.exec).toHaveBeenCalledWith('docker', [
        'ps',
        '--format',
        '{{json .}}',
      ])
      expect(containers).toHaveLength(1)
      expect(containers[0].id).toBe('abc123def456')
      expect(containers[0].name).toBe('my-nginx')
      expect(containers[0].state).toBe('running')
    })

    it('appends --all when payload.all is true', async () => {
      const { core, handlers } = setup({
        shell: {
          exec: vi.fn().mockResolvedValue({ stdout: CONTAINER_LINE, stderr: '', exitCode: 0 }),
        },
      })
      await handlers['docker:containers']({ all: true })
      expect(core.shell.exec).toHaveBeenCalledWith('docker', [
        'ps',
        '--format',
        '{{json .}}',
        '--all',
      ])
    })

    it('reads showAll setting when payload.all is undefined', async () => {
      const { core, handlers } = setup({
        shell: {
          exec: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
        },
        settings: {
          read: vi.fn().mockResolvedValue(true),
        },
      })
      await handlers['docker:containers']({})
      expect(core.settings.read).toHaveBeenCalledWith('showAll')
      expect(core.shell.exec).toHaveBeenCalledWith('docker', [
        'ps',
        '--format',
        '{{json .}}',
        '--all',
      ])
    })

    it('returns empty array and warns when docker ps fails', async () => {
      const { core, handlers } = setup({
        shell: {
          exec: vi.fn().mockResolvedValue({ stdout: '', stderr: 'daemon not running', exitCode: 1 }),
        },
      })
      const result = await handlers['docker:containers']({})
      expect(result).toEqual([])
      expect(core.logger.warn).toHaveBeenCalledWith(
        'docker ps failed',
        expect.objectContaining({ stderr: 'daemon not running' })
      )
    })

    it('skips malformed JSON lines without throwing', async () => {
      const { handlers } = setup({
        shell: {
          exec: vi.fn().mockResolvedValue({
            stdout: `not-json\n${CONTAINER_LINE}\nalso-bad`,
            stderr: '',
            exitCode: 0,
          }),
        },
      })
      const containers = (await handlers['docker:containers']({})) as unknown[]
      expect(containers).toHaveLength(1)
    })
  })

  describe('docker:start', () => {
    it('calls docker start with the container id', async () => {
      const { core, handlers } = setup()
      const result = (await handlers['docker:start']({ id: 'abc123' })) as { success: boolean }
      expect(core.shell.exec).toHaveBeenCalledWith('docker', ['start', 'abc123'])
      expect(result.success).toBe(true)
    })

    it('returns success:false and logs error when docker start fails', async () => {
      const { core, handlers } = setup({
        shell: {
          exec: vi.fn().mockResolvedValue({ stdout: '', stderr: 'no such container', exitCode: 1 }),
        },
      })
      const result = (await handlers['docker:start']({ id: 'bad-id' })) as {
        success: boolean
        error?: string
      }
      expect(result.success).toBe(false)
      expect(result.error).toBe('no such container')
      expect(core.logger.error).toHaveBeenCalled()
    })
  })

  describe('docker:stop', () => {
    it('calls docker stop with the container id', async () => {
      const { core, handlers } = setup()
      const result = (await handlers['docker:stop']({ id: 'abc123' })) as { success: boolean }
      expect(core.shell.exec).toHaveBeenCalledWith('docker', ['stop', 'abc123'])
      expect(result.success).toBe(true)
    })

    it('returns success:false when docker stop fails', async () => {
      const { handlers } = setup({
        shell: {
          exec: vi.fn().mockResolvedValue({ stdout: '', stderr: 'error', exitCode: 1 }),
        },
      })
      const result = (await handlers['docker:stop']({ id: 'x' })) as { success: boolean }
      expect(result.success).toBe(false)
    })
  })

  describe('docker:restart', () => {
    it('calls docker restart with the container id', async () => {
      const { core, handlers } = setup()
      await handlers['docker:restart']({ id: 'abc123' })
      expect(core.shell.exec).toHaveBeenCalledWith('docker', ['restart', 'abc123'])
    })

    it('returns success:false when docker restart fails', async () => {
      const { handlers } = setup({
        shell: {
          exec: vi.fn().mockResolvedValue({ stdout: '', stderr: 'error', exitCode: 1 }),
        },
      })
      const result = (await handlers['docker:restart']({ id: 'x' })) as { success: boolean }
      expect(result.success).toBe(false)
    })
  })

  describe('docker:remove', () => {
    it('calls docker rm without -f by default', async () => {
      const { core, handlers } = setup()
      await handlers['docker:remove']({ id: 'abc123' })
      expect(core.shell.exec).toHaveBeenCalledWith('docker', ['rm', 'abc123'])
    })

    it('appends -f when force is true', async () => {
      const { core, handlers } = setup()
      await handlers['docker:remove']({ id: 'abc123', force: true })
      expect(core.shell.exec).toHaveBeenCalledWith('docker', ['rm', '-f', 'abc123'])
    })

    it('returns success:false when docker rm fails', async () => {
      const { handlers } = setup({
        shell: {
          exec: vi.fn().mockResolvedValue({ stdout: '', stderr: 'running container', exitCode: 1 }),
        },
      })
      const result = (await handlers['docker:remove']({ id: 'x' })) as {
        success: boolean
        error?: string
      }
      expect(result.success).toBe(false)
      expect(result.error).toBe('running container')
    })
  })

  describe('docker:logs', () => {
    it('calls docker logs with default tail of 50', async () => {
      const { core, handlers } = setup({
        shell: {
          exec: vi.fn().mockResolvedValue({ stdout: 'log line 1\nlog line 2', stderr: '', exitCode: 0 }),
        },
      })
      const result = (await handlers['docker:logs']({ id: 'abc123' })) as { logs: string }
      expect(core.shell.exec).toHaveBeenCalledWith('docker', ['logs', '--tail', '50', 'abc123'])
      expect(result.logs).toBe('log line 1\nlog line 2')
    })

    it('respects custom tail value', async () => {
      const { core, handlers } = setup()
      await handlers['docker:logs']({ id: 'abc123', tail: 100 })
      expect(core.shell.exec).toHaveBeenCalledWith('docker', ['logs', '--tail', '100', 'abc123'])
    })

    it('returns stderr as logs when exitCode is non-zero', async () => {
      const { handlers } = setup({
        shell: {
          exec: vi.fn().mockResolvedValue({
            stdout: '',
            stderr: 'no such container',
            exitCode: 1,
          }),
        },
      })
      const result = (await handlers['docker:logs']({ id: 'bad' })) as { logs: string }
      expect(result.logs).toBe('no such container')
    })

    it('falls back to stderr when stdout is empty (docker logs outputs to stderr)', async () => {
      const { handlers } = setup({
        shell: {
          exec: vi.fn().mockResolvedValue({
            stdout: '',
            stderr: 'actual logs here',
            exitCode: 0,
          }),
        },
      })
      const result = (await handlers['docker:logs']({ id: 'abc' })) as { logs: string }
      expect(result.logs).toBe('actual logs here')
    })
  })

  describe('docker:images', () => {
    it('calls docker images --format', async () => {
      const { core, handlers } = setup({
        shell: {
          exec: vi.fn().mockResolvedValue({ stdout: IMAGE_LINE, stderr: '', exitCode: 0 }),
        },
      })
      const images = (await handlers['docker:images']()) as Array<{
        id: string
        repository: string
        tag: string
      }>
      expect(core.shell.exec).toHaveBeenCalledWith('docker', ['images', '--format', '{{json .}}'])
      expect(images).toHaveLength(1)
      expect(images[0].repository).toBe('nginx')
      expect(images[0].tag).toBe('latest')
    })

    it('returns empty array when docker images fails', async () => {
      const { handlers } = setup({
        shell: {
          exec: vi.fn().mockResolvedValue({ stdout: '', stderr: 'error', exitCode: 1 }),
        },
      })
      const result = await handlers['docker:images']()
      expect(result).toEqual([])
    })

    it('skips malformed JSON lines', async () => {
      const { handlers } = setup({
        shell: {
          exec: vi.fn().mockResolvedValue({
            stdout: `bad-line\n${IMAGE_LINE}`,
            stderr: '',
            exitCode: 0,
          }),
        },
      })
      const images = (await handlers['docker:images']()) as unknown[]
      expect(images).toHaveLength(1)
    })
  })
})

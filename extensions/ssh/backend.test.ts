import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'

const SAMPLE_CONFIG = `
# SSH Config
Host webserver
    HostName 192.168.1.10
    User admin
    Port 2222

Host db
    HostName 10.0.0.5
    User postgres

Host jump
    HostName jump.example.com
    User root
    IdentityFile ~/.ssh/jump_rsa

Host *
    ServerAliveInterval 60
`

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function freshBackend(): Promise<(core: CoreContext) => Promise<void>> {
  const mod = await import('./backend.ts')
  return mod.register
}

function createCore(
  overrides: Parameters<typeof createMockCore>[0] = {}
): ReturnType<typeof createMockCore> {
  return createMockCore({
    fs: {
      homedir: vi.fn().mockReturnValue('/home/testuser'),
      fileExists: vi.fn().mockResolvedValue(true),
      readFile: vi.fn().mockResolvedValue(SAMPLE_CONFIG),
    },
    settings: {
      read: vi.fn().mockResolvedValue(null),
    },
    shell: {
      exec: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
      open: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  })
}

describe('ssh backend', () => {
  it('registers a tool', async () => {
    const register = await freshBackend()
    const { core } = createCore()
    await register(core)
    expect(core.registry.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(String) })
    )
  })

  describe('ssh:list', () => {
    it('returns parsed SSH hosts, skipping wildcards', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const hosts = await (handlers['ssh:list'] as () => Promise<unknown[]>)()

      expect(hosts).toHaveLength(3)
      const names = (hosts as Array<{ name: string }>).map((h) => h.name)
      expect(names).toContain('webserver')
      expect(names).toContain('db')
      expect(names).toContain('jump')
      expect(names).not.toContain('*')
    })

    it('parses hostname, user, and port correctly', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const hosts = await (
        handlers['ssh:list'] as () => Promise<
          Array<{
            name: string
            hostname: string
            user?: string
            port?: number
          }>
        >
      )()

      const webserver = hosts.find((h) => h.name === 'webserver')
      expect(webserver?.hostname).toBe('192.168.1.10')
      expect(webserver?.user).toBe('admin')
      expect(webserver?.port).toBe(2222)

      const db = hosts.find((h) => h.name === 'db')
      expect(db?.hostname).toBe('10.0.0.5')
      expect(db?.user).toBe('postgres')
      expect(db?.port).toBeUndefined()
    })

    it('parses IdentityFile', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const hosts = await (
        handlers['ssh:list'] as () => Promise<
          Array<{
            name: string
            identityFile?: string
          }>
        >
      )()

      const jump = hosts.find((h) => h.name === 'jump')
      expect(jump?.identityFile).toBe('~/.ssh/jump_rsa')
    })

    it('returns empty array when config file does not exist', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore({
        fs: {
          homedir: vi.fn().mockReturnValue('/home/testuser'),
          fileExists: vi.fn().mockResolvedValue(false),
          readFile: vi.fn().mockResolvedValue(''),
        },
      })
      await register(core)

      const hosts = await (handlers['ssh:list'] as () => Promise<unknown[]>)()
      expect(hosts).toEqual([])
    })

    it('uses configured configPath setting and resolves ~', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore({
        settings: {
          read: vi.fn().mockImplementation(async (key: string) => {
            if (key === 'configPath') return '~/.config/ssh/config'
            return null
          }),
        },
      })
      await register(core)

      await (handlers['ssh:list'] as () => Promise<unknown[]>)()

      expect(core.fs.fileExists).toHaveBeenCalledWith('/home/testuser/.config/ssh/config')
    })
  })

  describe('ssh:refresh', () => {
    it('re-reads config and returns updated host list', async () => {
      const register = await freshBackend()
      const mockReadFile = vi.fn().mockResolvedValueOnce(SAMPLE_CONFIG).mockResolvedValueOnce(`
Host newhost
    HostName 1.2.3.4
`)
      const { core, handlers } = createCore({
        fs: {
          homedir: vi.fn().mockReturnValue('/home/testuser'),
          fileExists: vi.fn().mockResolvedValue(true),
          readFile: mockReadFile,
        },
      })
      await register(core)

      const refreshed = await (handlers['ssh:refresh'] as () => Promise<Array<{ name: string }>>)()
      expect(refreshed).toHaveLength(1)
      expect(refreshed[0].name).toBe('newhost')
    })
  })

  describe('ssh:connect', () => {
    it('opens ssh:// URI by default terminal', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      await (handlers['ssh:connect'] as (p: unknown) => Promise<unknown>)({ host: 'webserver' })

      expect(core.shell.open).toHaveBeenCalledWith(expect.stringContaining('ssh://'))
    })

    it('builds connection string with user and port', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      await (handlers['ssh:connect'] as (p: unknown) => Promise<unknown>)({ host: 'webserver' })

      expect(core.shell.open).toHaveBeenCalledWith('ssh://admin@192.168.1.10 -p 2222')
    })

    it('builds connection string without port when default (22)', async () => {
      const config = `
Host myserver
    HostName example.com
    User deploy
    Port 22
`
      const register = await freshBackend()
      const { core, handlers } = createCore({
        fs: {
          homedir: vi.fn().mockReturnValue('/home/testuser'),
          fileExists: vi.fn().mockResolvedValue(true),
          readFile: vi.fn().mockResolvedValue(config),
        },
      })
      await register(core)

      await (handlers['ssh:connect'] as (p: unknown) => Promise<unknown>)({ host: 'myserver' })

      expect(core.shell.open).toHaveBeenCalledWith('ssh://deploy@example.com')
    })

    it('uses kitty when configured', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore({
        settings: {
          read: vi.fn().mockImplementation(async (key: string) => {
            if (key === 'terminal') return 'kitty'
            return null
          }),
        },
      })
      await register(core)

      await (handlers['ssh:connect'] as (p: unknown) => Promise<unknown>)({ host: 'db' })

      expect(core.shell.exec).toHaveBeenCalledWith('kitty', expect.arrayContaining(['ssh']))
    })

    it('uses alacritty when configured', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore({
        settings: {
          read: vi.fn().mockImplementation(async (key: string) => {
            if (key === 'terminal') return 'alacritty'
            return null
          }),
        },
      })
      await register(core)

      await (handlers['ssh:connect'] as (p: unknown) => Promise<unknown>)({ host: 'db' })

      expect(core.shell.exec).toHaveBeenCalledWith(
        'alacritty',
        expect.arrayContaining(['-e', 'ssh'])
      )
    })

    it('uses gnome-terminal when configured', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore({
        settings: {
          read: vi.fn().mockImplementation(async (key: string) => {
            if (key === 'terminal') return 'gnome-terminal'
            return null
          }),
        },
      })
      await register(core)

      await (handlers['ssh:connect'] as (p: unknown) => Promise<unknown>)({ host: 'db' })

      expect(core.shell.exec).toHaveBeenCalledWith(
        'gnome-terminal',
        expect.arrayContaining(['--', 'ssh'])
      )
    })

    it('uses konsole when configured', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore({
        settings: {
          read: vi.fn().mockImplementation(async (key: string) => {
            if (key === 'terminal') return 'konsole'
            return null
          }),
        },
      })
      await register(core)

      await (handlers['ssh:connect'] as (p: unknown) => Promise<unknown>)({ host: 'db' })

      expect(core.shell.exec).toHaveBeenCalledWith('konsole', expect.arrayContaining(['-e', 'ssh']))
    })

    it('throws when host is not found', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      await expect(
        (handlers['ssh:connect'] as (p: unknown) => Promise<unknown>)({ host: 'nonexistent' })
      ).rejects.toThrow()
    })

    it('returns { launched: true } on success', async () => {
      const register = await freshBackend()
      const { core, handlers } = createCore()
      await register(core)

      const result = await (handlers['ssh:connect'] as (p: unknown) => Promise<unknown>)({
        host: 'db',
      })

      expect(result).toEqual({ launched: true })
    })
  })
})

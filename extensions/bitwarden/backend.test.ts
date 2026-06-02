import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'

type ExecFn = (cmd: string, args: string[]) => Promise<{ stdout: string; code: number }>

function makeExec({
  rbw = false,
  bw = false,
  email = 'user@example.com',
  unlocked = true,
} = {}): ReturnType<typeof vi.fn> {
  return vi.fn(async (cmd: string, args: string[]) => {
    if (cmd === 'which') {
      const bin = args[0]
      if (bin === 'rbw' && rbw) return { stdout: '/usr/bin/rbw', code: 0 }
      if (bin === 'bw' && bw) return { stdout: '/usr/bin/bw', code: 0 }
      throw new Error('not found')
    }
    if (cmd === 'cat' && args[0] === '/etc/os-release') {
      return { stdout: 'NAME="Arch Linux"\nID=arch\n', code: 0 }
    }
    if (cmd === 'rbw') {
      const sub = args[0]
      if (sub === 'config') {
        if (args[1] === 'show') {
          const emailLine = email ? `email: ${email}\n` : ''
          return { stdout: `${emailLine}base_url: https://api.bitwarden.com\n`, code: 0 }
        }
        if (args[1] === 'set') return { stdout: '', code: 0 }
      }
      if (sub === 'unlocked') {
        if (unlocked) return { stdout: '', code: 0 }
        throw new Error('locked')
      }
      if (sub === 'unlock') return { stdout: '', code: 0 }
      if (sub === 'sync') return { stdout: '', code: 0 }
      if (sub === 'list') return { stdout: '', code: 0 }
      if (sub === 'get') return { stdout: '', code: 0 }
    }
    return { stdout: '', code: 0 }
  })
}

function createCore(exec: ReturnType<typeof vi.fn> | null = null): {
  core: CoreContext
  handlers: Record<string, (payload?: unknown) => Promise<unknown>>
} {
  const { core, handlers } = createMockCore({
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
    shell: {
      exec: (exec ?? vi.fn().mockResolvedValue({ stdout: '', code: 0 })) as ExecFn,
    },
  })
  return { core, handlers }
}

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

// ─── Registration ─────────────────────────────────────────────────────────────

describe('bitwarden backend', () => {
  it('registers as a tool named "bitwarden"', async () => {
    const exec = makeExec({ rbw: true })
    const register = await freshBackend()
    const { core } = createCore(exec)
    await register(core as CoreContext)
    expect(
      (core.registry as { registerTool: ReturnType<typeof vi.fn> }).registerTool
    ).toHaveBeenCalledWith({ name: 'bitwarden' })
  })

  // ─── bw:status — no backend ────────────────────────────────────────────────

  it('bw:status returns { backend: "none" } when neither binary is found', async () => {
    const exec = makeExec({ rbw: false, bw: false })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)
    const status = await handlers['bw:status']()
    expect((status as { backend: string }).backend).toBe('none')
  })

  // ─── bw:search — rbw path ─────────────────────────────────────────────────

  it('bw:search parses rbw list tab-separated output correctly', async () => {
    const exec = makeExec({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    exec.mockResolvedValueOnce({
      stdout: 'abc-123\tGitHub\tuser@example.com\ndef-456\tGoogle\tme@gmail.com\n',
      code: 0,
    })

    const results = (await handlers['bw:search']({ query: '' })) as unknown[]
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      id: 'abc-123',
      name: 'GitHub',
      username: 'user@example.com',
      backend: 'rbw',
    })
    expect(results[1]).toEqual({
      id: 'def-456',
      name: 'Google',
      username: 'me@gmail.com',
      backend: 'rbw',
    })
  })

  it('bw:search filters results by query — case-insensitive name match', async () => {
    const exec = makeExec({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    exec.mockResolvedValueOnce({
      stdout: 'abc-123\tGitHub\tuser@example.com\ndef-456\tGoogle\tme@gmail.com\n',
      code: 0,
    })

    const results = (await handlers['bw:search']({ query: 'github' })) as { name: string }[]
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('GitHub')
  })

  it('bw:search filters results by query — case-insensitive username match', async () => {
    const exec = makeExec({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    exec.mockResolvedValueOnce({
      stdout: 'abc-123\tGitHub\tuser@example.com\ndef-456\tGoogle\tme@gmail.com\n',
      code: 0,
    })

    const results = (await handlers['bw:search']({ query: 'GMAIL' })) as { username: string }[]
    expect(results).toHaveLength(1)
    expect(results[0].username).toBe('me@gmail.com')
  })

  // ─── bw:getPassword — rbw path ────────────────────────────────────────────

  it('bw:getPassword calls rbw get password <name> and returns trimmed stdout', async () => {
    const exec = makeExec({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    exec.mockResolvedValueOnce({ stdout: 'supersecret\n', code: 0 })

    const result = await handlers['bw:getPassword']({ id: 'abc-123', name: 'GitHub' })
    expect(result).toEqual({ password: 'supersecret' })
    expect(exec).toHaveBeenCalledWith('rbw', ['get', 'password', 'GitHub'])
  })

  // ─── bw:getTotp — rbw path ────────────────────────────────────────────────

  it('bw:getTotp calls rbw get totp <name> and returns trimmed stdout', async () => {
    const exec = makeExec({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    exec.mockResolvedValueOnce({ stdout: '123456\n', code: 0 })

    const result = await handlers['bw:getTotp']({ id: 'abc-123', name: 'GitHub' })
    expect(result).toEqual({ code: '123456' })
    expect(exec).toHaveBeenCalledWith('rbw', ['get', 'totp', 'GitHub'])
  })

  // ─── bw:copyPassword ──────────────────────────────────────────────────────

  it('bw:copyPassword writes the password to core.clipboard.writeText', async () => {
    const exec = makeExec({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    exec.mockResolvedValueOnce({ stdout: 'mypassword\n', code: 0 })

    await handlers['bw:copyPassword']({ id: 'abc-123', name: 'GitHub' })
    expect(
      (core.clipboard as { writeText: ReturnType<typeof vi.fn> }).writeText
    ).toHaveBeenCalledWith('mypassword')
  })

  it('bw:copyPassword schedules clipboard clear after 30s', async () => {
    vi.useFakeTimers()
    const exec = makeExec({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    exec.mockResolvedValueOnce({ stdout: 'mypassword\n', code: 0 })

    await handlers['bw:copyPassword']({ id: 'abc-123', name: 'GitHub' })
    expect(
      (core.clipboard as { writeText: ReturnType<typeof vi.fn> }).writeText
    ).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(29_999)
    expect(
      (core.clipboard as { writeText: ReturnType<typeof vi.fn> }).writeText
    ).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    await Promise.resolve()
    expect(
      (core.clipboard as { writeText: ReturnType<typeof vi.fn> }).writeText
    ).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('bw:copyPassword clears clipboard after timer fires', async () => {
    vi.useFakeTimers()
    const exec = makeExec({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    exec.mockResolvedValueOnce({ stdout: 'mypassword\n', code: 0 })

    await handlers['bw:copyPassword']({ id: 'abc-123', name: 'GitHub' })
    vi.advanceTimersByTime(30_000)
    await Promise.resolve()

    expect(
      (core.clipboard as { writeText: ReturnType<typeof vi.fn> }).writeText
    ).toHaveBeenLastCalledWith('')

    vi.useRealTimers()
  })

  // ─── bw:copyTotp ──────────────────────────────────────────────────────────

  it('bw:copyTotp writes the code to core.clipboard.writeText', async () => {
    const exec = makeExec({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    await handlers['bw:copyTotp']({ code: '123456' })
    expect(
      (core.clipboard as { writeText: ReturnType<typeof vi.fn> }).writeText
    ).toHaveBeenCalledWith('123456')
  })

  it('bw:copyTotp schedules clipboard clear after 30s', async () => {
    vi.useFakeTimers()
    const exec = makeExec({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    await handlers['bw:copyTotp']({ code: '654321' })
    expect(
      (core.clipboard as { writeText: ReturnType<typeof vi.fn> }).writeText
    ).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(30_000)
    await Promise.resolve()
    expect(
      (core.clipboard as { writeText: ReturnType<typeof vi.fn> }).writeText
    ).toHaveBeenLastCalledWith('')

    vi.useRealTimers()
  })

  // ─── bw:status — rbw path ─────────────────────────────────────────────────

  it('bw:status (rbw path) returns { locked: false } when rbw unlocked exits 0', async () => {
    const exec = makeExec({ rbw: true, email: 'user@example.com', unlocked: true })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    const status = await handlers['bw:status']()
    expect(status).toEqual({
      installed: true,
      configured: true,
      email: 'user@example.com',
      locked: false,
      backend: 'rbw',
      os: 'arch',
    })
  })

  it('bw:status (rbw path) returns { locked: true } when rbw unlocked exits non-zero', async () => {
    const exec = makeExec({ rbw: true, email: 'user@example.com', unlocked: false })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    const status = await handlers['bw:status']()
    expect(status).toEqual({
      installed: true,
      configured: true,
      email: 'user@example.com',
      locked: true,
      backend: 'rbw',
      os: 'arch',
    })
  })

  it('bw:status (rbw path) returns configured: false when email is not configured', async () => {
    const exec = makeExec({ rbw: true, email: '' })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    const status = await handlers['bw:status']()
    expect(status).toEqual({
      installed: true,
      configured: false,
      email: null,
      locked: true,
      backend: 'rbw',
      os: 'arch',
    })
  })

  it('bw:setEmail configures the email address', async () => {
    const exec = makeExec({ rbw: true, email: '' })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    await handlers['bw:setEmail']({ email: 'new@example.com' })
    expect(exec).toHaveBeenCalledWith('rbw', ['config', 'set', 'email', 'new@example.com'])
  })

  it('bw:unlock unlocks the vault', async () => {
    const exec = makeExec({ rbw: true, email: 'user@example.com', unlocked: false })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    await handlers['bw:unlock']()
    expect(exec).toHaveBeenCalledWith('rbw', ['unlock'])
  })

  it('bw:sync synchronizes the vault successfully', async () => {
    const exec = makeExec({ rbw: true, email: 'user@example.com', unlocked: true })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    const result = await handlers['bw:sync']()
    expect(result).toEqual({ ok: true })
  })

  // ─── Error paths ─────────────────────────────────────────────────────────────

  it('bw:search propagates when exec rejects (rbw backend)', async () => {
    const exec = makeExec({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    exec.mockRejectedValueOnce(new Error('rbw process crashed'))

    await expect(handlers['bw:search']({ query: '' })).rejects.toThrow('rbw process crashed')
  })

  it('bw:unlock propagates when exec rejects (e.g. user dismissed pinentry)', async () => {
    const exec = makeExec({ rbw: true, email: 'user@example.com', unlocked: false })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    exec.mockRejectedValueOnce(new Error('pinentry dismissed'))

    await expect(handlers['bw:unlock']()).rejects.toThrow('pinentry dismissed')
  })

  it('bw:sync propagates when exec rejects', async () => {
    const exec = makeExec({ rbw: true, email: 'user@example.com', unlocked: true })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    exec.mockRejectedValueOnce(new Error('network unreachable'))

    await expect(handlers['bw:sync']()).rejects.toThrow('network unreachable')
  })

  it('bw:copyPassword propagates when clipboard write fails', async () => {
    const exec = makeExec({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    exec.mockResolvedValueOnce({ stdout: 'mypassword\n', code: 0 })
    ;(core.clipboard as { writeText: ReturnType<typeof vi.fn> }).writeText.mockRejectedValueOnce(
      new Error('clipboard unavailable')
    )

    await expect(
      handlers['bw:copyPassword']({ id: 'abc-123', name: 'GitHub' })
    ).rejects.toThrow('clipboard unavailable')
  })

  it('bw:copyUsername propagates when clipboard write fails', async () => {
    const exec = makeExec({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    ;(core.clipboard as { writeText: ReturnType<typeof vi.fn> }).writeText.mockRejectedValueOnce(
      new Error('clipboard unavailable')
    )

    await expect(
      handlers['bw:copyUsername']({ id: 'abc-123', name: 'GitHub', username: 'user@example.com' })
    ).rejects.toThrow('clipboard unavailable')
  })

  it('bw:status returns a valid status object when uname fails (falls back to linux os)', async () => {
    // detectOS catches all errors and returns 'linux'; getRbwConfig has its own try/catch.
    // So bw:status should return a fully formed status object regardless.
    const exec = vi.fn(async (cmd: string, args: string[]) => {
      if (cmd === 'which') {
        if (args[0] === 'rbw') return { stdout: '/usr/bin/rbw', code: 0 }
        throw new Error('not found')
      }
      if (cmd === 'uname') throw new Error('uname failed')
      if (cmd === 'rbw') {
        const sub = args[0]
        if (sub === 'config' && args[1] === 'show') {
          return { stdout: 'email: user@example.com\n', code: 0 }
        }
        if (sub === 'unlocked') return { stdout: '', code: 0 }
      }
      return { stdout: '', code: 0 }
    })
    const register = await freshBackend()
    const { core, handlers } = createCore(exec)
    await register(core as CoreContext)

    const status = (await handlers['bw:status']()) as {
      installed: boolean
      backend: string
      os: string
    }
    expect(status.installed).toBe(true)
    expect(status.backend).toBe('rbw')
    // uname failure → detectOS falls through the cat path; cat is not mocked so it
    // also fails, causing detectOS to return 'linux'
    expect(status.os).toBe('linux')
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { execFile } from 'child_process'

vi.mock('child_process', () => ({
  execFile: vi.fn((cmd, args, cb) => cb(null, '', '')),
}))

function createCore() {
  const handlers = {}
  const core = {
    registry: { registerTool: vi.fn() },
    ipc: { handle: (ch, fn) => { handlers[ch] = fn } },
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  }
  return { core, handlers }
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function freshBackend() {
  const mod = await import('./backend.js')
  return mod.register
}

let rbwConfigEmail = 'user@example.com'
let rbwUnlockedState = true

beforeEach(() => {
  vi.resetModules()
  rbwConfigEmail = 'user@example.com'
  rbwUnlockedState = true
})

function mockWhich({ rbw = false, bw = false, email = 'user@example.com', unlocked = true } = {}) {
  rbwConfigEmail = email
  rbwUnlockedState = unlocked

  execFile.mockImplementation((cmd, args, cb) => {
    if (cmd === 'which') {
      const bin = args[0]
      if (bin === 'rbw' && rbw) return cb(null, '/usr/bin/rbw', '')
      if (bin === 'bw' && bw) return cb(null, '/usr/bin/bw', '')
      return cb(new Error('not found'), '', '')
    }
    if (cmd === 'cat' && args[0] === '/etc/os-release') {
      return cb(null, 'NAME="Arch Linux"\nID=arch\n', '')
    }
    if (cmd === 'rbw') {
      const sub = args[0]
      if (sub === 'config') {
        if (args[1] === 'show') {
          if (rbwConfigEmail) {
            return cb(null, `email: ${rbwConfigEmail}\nbase_url: https://api.bitwarden.com\n`, '')
          }
          return cb(null, 'base_url: https://api.bitwarden.com\n', '')
        }
        if (args[1] === 'set' && args[2] === 'email') {
          rbwConfigEmail = args[3]
          return cb(null, '', '')
        }
      }
      if (sub === 'unlocked') {
        if (rbwUnlockedState) return cb(null, '', '')
        return cb(new Error('locked'), '', '')
      }
      if (sub === 'unlock') {
        rbwUnlockedState = true
        return cb(null, '', '')
      }
      if (sub === 'sync') {
        return cb(null, '', '')
      }
    }
    cb(null, '', '')
  })
}

// ─── Registration ─────────────────────────────────────────────────────────────

describe('bitwarden backend', () => {
  it('registers as a tool named "bitwarden"', async () => {
    mockWhich({ rbw: true })
    const register = await freshBackend()
    const { core } = createCore()
    await register(core)
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'bitwarden' })
  })

  // ─── bw:status — no backend ────────────────────────────────────────────────

  it('bw:status returns { backend: "none" } when neither binary is found', async () => {
    mockWhich({ rbw: false, bw: false })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)
    const status = await handlers['bw:status']()
    expect(status.backend).toBe('none')
  })

  // ─── bw:search — rbw path ─────────────────────────────────────────────────

  it('bw:search parses rbw list tab-separated output correctly', async () => {
    mockWhich({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    execFile.mockImplementationOnce((cmd, args, cb) => {
      cb(null, 'abc-123\tGitHub\tuser@example.com\ndef-456\tGoogle\tme@gmail.com\n', '')
    })

    const results = await handlers['bw:search']({ query: '' })
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ id: 'abc-123', name: 'GitHub', username: 'user@example.com', backend: 'rbw' })
    expect(results[1]).toEqual({ id: 'def-456', name: 'Google', username: 'me@gmail.com', backend: 'rbw' })
  })

  it('bw:search filters results by query — case-insensitive name match', async () => {
    mockWhich({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    execFile.mockImplementationOnce((cmd, args, cb) => {
      cb(null, 'abc-123\tGitHub\tuser@example.com\ndef-456\tGoogle\tme@gmail.com\n', '')
    })

    const results = await handlers['bw:search']({ query: 'github' })
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('GitHub')
  })

  it('bw:search filters results by query — case-insensitive username match', async () => {
    mockWhich({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    execFile.mockImplementationOnce((cmd, args, cb) => {
      cb(null, 'abc-123\tGitHub\tuser@example.com\ndef-456\tGoogle\tme@gmail.com\n', '')
    })

    const results = await handlers['bw:search']({ query: 'GMAIL' })
    expect(results).toHaveLength(1)
    expect(results[0].username).toBe('me@gmail.com')
  })

  // ─── bw:getPassword — rbw path ────────────────────────────────────────────

  it('bw:getPassword calls rbw get password <name> and returns trimmed stdout', async () => {
    mockWhich({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    execFile.mockImplementationOnce((cmd, args, cb) => {
      expect(cmd).toBe('rbw')
      expect(args).toEqual(['get', 'password', 'GitHub'])
      cb(null, 'supersecret\n', '')
    })

    const result = await handlers['bw:getPassword']({ id: 'abc-123', name: 'GitHub' })
    expect(result).toEqual({ password: 'supersecret' })
  })

  // ─── bw:getTotp — rbw path ────────────────────────────────────────────────

  it('bw:getTotp calls rbw get totp <name> and returns trimmed stdout', async () => {
    mockWhich({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    execFile.mockImplementationOnce((cmd, args, cb) => {
      expect(cmd).toBe('rbw')
      expect(args).toEqual(['get', 'totp', 'GitHub'])
      cb(null, '123456\n', '')
    })

    const result = await handlers['bw:getTotp']({ id: 'abc-123', name: 'GitHub' })
    expect(result).toEqual({ code: '123456' })
  })

  // ─── bw:copyPassword ──────────────────────────────────────────────────────

  it('bw:copyPassword writes the password to core.clipboard.writeText', async () => {
    mockWhich({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    execFile.mockImplementationOnce((cmd, args, cb) => {
      cb(null, 'mypassword\n', '')
    })

    await handlers['bw:copyPassword']({ id: 'abc-123', name: 'GitHub' })
    expect(core.clipboard.writeText).toHaveBeenCalledWith('mypassword')
  })

  it('bw:copyPassword schedules clipboard clear after 30s', async () => {
    vi.useFakeTimers()
    mockWhich({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    execFile.mockImplementationOnce((cmd, args, cb) => {
      cb(null, 'mypassword\n', '')
    })

    await handlers['bw:copyPassword']({ id: 'abc-123', name: 'GitHub' })
    expect(core.clipboard.writeText).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(29_999)
    expect(core.clipboard.writeText).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    await Promise.resolve()
    expect(core.clipboard.writeText).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('bw:copyPassword clears clipboard after timer fires', async () => {
    vi.useFakeTimers()
    mockWhich({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    execFile.mockImplementationOnce((cmd, args, cb) => {
      cb(null, 'mypassword\n', '')
    })

    await handlers['bw:copyPassword']({ id: 'abc-123', name: 'GitHub' })
    vi.advanceTimersByTime(30_000)
    await Promise.resolve()

    expect(core.clipboard.writeText).toHaveBeenLastCalledWith('')

    vi.useRealTimers()
  })

  // ─── bw:copyTotp ──────────────────────────────────────────────────────────

  it('bw:copyTotp writes the code to core.clipboard.writeText', async () => {
    mockWhich({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    await handlers['bw:copyTotp']({ code: '123456' })
    expect(core.clipboard.writeText).toHaveBeenCalledWith('123456')
  })

  it('bw:copyTotp schedules clipboard clear after 30s', async () => {
    vi.useFakeTimers()
    mockWhich({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    await handlers['bw:copyTotp']({ code: '654321' })
    expect(core.clipboard.writeText).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(30_000)
    await Promise.resolve()
    expect(core.clipboard.writeText).toHaveBeenLastCalledWith('')

    vi.useRealTimers()
  })

  // ─── bw:status — rbw path ─────────────────────────────────────────────────

  it('bw:status (rbw path) returns { locked: false } when rbw unlocked exits 0', async () => {
    mockWhich({ rbw: true, email: 'user@example.com', unlocked: true })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    const status = await handlers['bw:status']()
    expect(status).toEqual({
      installed: true,
      configured: true,
      email: 'user@example.com',
      locked: false,
      backend: 'rbw',
      os: 'arch'
    })
  })

  it('bw:status (rbw path) returns { locked: true } when rbw unlocked exits non-zero', async () => {
    mockWhich({ rbw: true, email: 'user@example.com', unlocked: false })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    const status = await handlers['bw:status']()
    expect(status).toEqual({
      installed: true,
      configured: true,
      email: 'user@example.com',
      locked: true,
      backend: 'rbw',
      os: 'arch'
    })
  })

  it('bw:status (rbw path) returns configured: false when email is not configured', async () => {
    mockWhich({ rbw: true, email: null })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    const status = await handlers['bw:status']()
    expect(status).toEqual({
      installed: true,
      configured: false,
      email: null,
      locked: true,
      backend: 'rbw',
      os: 'arch'
    })
  })

  it('bw:setEmail configures the email address', async () => {
    mockWhich({ rbw: true, email: null })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    await handlers['bw:setEmail']({ email: 'new@example.com' })
    expect(rbwConfigEmail).toBe('new@example.com')
  })

  it('bw:unlock unlocks the vault', async () => {
    mockWhich({ rbw: true, email: 'user@example.com', unlocked: false })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    await handlers['bw:unlock']()
    expect(rbwUnlockedState).toBe(true)
  })

  it('bw:sync synchronizes the vault successfully', async () => {
    mockWhich({ rbw: true, email: 'user@example.com', unlocked: true })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    const result = await handlers['bw:sync']()
    expect(result).toEqual({ ok: true })
  })
})

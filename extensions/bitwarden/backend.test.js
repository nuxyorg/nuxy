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

function mockWhich({ rbw = false, bw = false } = {}) {
  execFile.mockImplementation((cmd, args, cb) => {
    if (cmd === 'which') {
      const bin = args[0]
      if (bin === 'rbw' && rbw) return cb(null, '/usr/bin/rbw', '')
      if (bin === 'bw' && bw) return cb(null, '/usr/bin/bw', '')
      return cb(new Error('not found'), '', '')
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

  // ─── bw:status — rbw path ─────────────────────────────────────────────────

  it('bw:status (rbw path) returns { locked: false } when rbw unlocked exits 0', async () => {
    mockWhich({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    execFile.mockImplementationOnce((cmd, args, cb) => {
      expect(cmd).toBe('rbw')
      expect(args).toEqual(['unlocked'])
      cb(null, '', '')
    })

    const status = await handlers['bw:status']()
    expect(status).toEqual({ locked: false, backend: 'rbw' })
  })

  it('bw:status (rbw path) returns { locked: true } when rbw unlocked exits non-zero', async () => {
    mockWhich({ rbw: true })
    const register = await freshBackend()
    const { core, handlers } = createCore()
    await register(core)

    execFile.mockImplementationOnce((cmd, args, cb) => {
      cb(new Error('locked'), '', '')
    })

    const status = await handlers['bw:status']()
    expect(status).toEqual({ locked: true, backend: 'rbw' })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockCore } from '@nuxy/extension-sdk'
import { register } from './backend.ts'
import type { ProcessInfo, KillResult } from './types.ts'

const MOCK_PS_OUTPUT = `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
alice          1  0.0  0.1  12345  1234 ?        Ss   10:00   0:00 /sbin/init
alice       1234  2.5  1.5 234567 15000 ?        Sl   10:01   0:01 /usr/bin/node server.js
root         567  0.0  0.2  23456  2345 ?        Ss   10:00   0:00 /usr/lib/systemd/systemd
alice       2345  0.1  0.8  56789  8000 pts/0    S+   10:02   0:00 chrome --type=renderer`

function createCore(overrides?: Record<string, unknown>) {
  return createMockCore({
    i18n: { locale: 'en', dir: 'ltr', t: vi.fn((key: string) => key) },
    shell: {
      exec: vi.fn().mockResolvedValue({ stdout: MOCK_PS_OUTPUT, code: 0 }),
    },
    settings: {
      read: vi.fn().mockResolvedValue(null),
      write: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  })
}

describe('prockill backend', () => {
  let core: ReturnType<typeof createCore>['core']
  let handlers: ReturnType<typeof createCore>['handlers']

  beforeEach(() => {
    const result = createCore()
    core = result.core
    handlers = result.handlers
    register(core)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // 1. registerTool called with { name: 'prockill' }
  it('registers a tool named "prockill"', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'prockill' })
  })

  // 2. listProcesses({ query: '' }) → shell.exec called with 'ps' and ['aux']
  it('listProcesses calls shell.exec with "ps" and ["aux"]', async () => {
    await handlers['listProcesses']({ query: '' })
    expect(core.shell.exec).toHaveBeenCalledWith('ps', ['aux'])
  })

  // 3. listProcesses({ query: '' }) → returns parsed ProcessInfo array with correct fields
  it('listProcesses parses process list with correct fields', async () => {
    const result = (await handlers['listProcesses']({ query: '' })) as ProcessInfo[]
    expect(Array.isArray(result)).toBe(true)

    // With showSystemProcesses: false (default), root and pid<=1 are filtered out
    // alice/1234 and alice/2345 should be present; alice/1 and root/567 filtered
    const node = result.find((p) => p.pid === 1234)
    expect(node).toBeDefined()
    expect(node!.pid).toBe(1234)
    expect(node!.cpu).toBe('2.5')
    expect(node!.mem).toBe('1.5')
    expect(node!.user).toBe('alice')
    expect(node!.command).toContain('/usr/bin/node')
    expect(node!.name).toBe('node')
  })

  // 4. listProcesses with showSystemProcesses: false (default) → root process filtered out
  it('listProcesses filters out root processes and pid<=1 by default', async () => {
    const result = (await handlers['listProcesses']({ query: '' })) as ProcessInfo[]
    const rootProc = result.find((p) => p.user === 'root')
    expect(rootProc).toBeUndefined()

    // pid=1 (alice/init) should also be filtered (pid <= 1)
    const initProc = result.find((p) => p.pid === 1)
    expect(initProc).toBeUndefined()
  })

  // 5. listProcesses with showSystemProcesses: true → root process included
  it('listProcesses includes root processes when showSystemProcesses is true', async () => {
    const { core: core2, handlers: handlers2 } = createCore({
      settings: {
        read: vi.fn().mockResolvedValue(true),
        write: vi.fn().mockResolvedValue(undefined),
      },
    })
    register(core2)

    const result = (await handlers2['listProcesses']({ query: '' })) as ProcessInfo[]
    const rootProc = result.find((p) => p.user === 'root')
    expect(rootProc).toBeDefined()
    expect(rootProc!.pid).toBe(567)
  })

  // 6. listProcesses({ query: 'chrome' }) → only chrome process returned
  it('listProcesses filters by query (case-insensitive)', async () => {
    const result = (await handlers['listProcesses']({ query: 'chrome' })) as ProcessInfo[]
    expect(result.length).toBe(1)
    expect(result[0].name).toBe('chrome')
    expect(result[0].pid).toBe(2345)
  })

  // 7. listProcesses({ query: 'nonexistent' }) → empty array
  it('listProcesses returns empty array when query has no matches', async () => {
    const result = (await handlers['listProcesses']({ query: 'nonexistent' })) as ProcessInfo[]
    expect(result).toEqual([])
  })

  // 8. listProcesses shell throws → returns [], logger.error called
  it('listProcesses returns [] and logs error when shell.exec throws', async () => {
    const { core: core2, handlers: handlers2 } = createCore({
      shell: {
        exec: vi.fn().mockRejectedValue(new Error('exec failed')),
      },
    })
    register(core2)

    const result = (await handlers2['listProcesses']({ query: '' })) as ProcessInfo[]
    expect(result).toEqual([])
    expect(core2.logger.error).toHaveBeenCalled()
  })

  // 9. killProcess({ pid: 1234, signal: 'SIGTERM' }) → shell.exec('kill', ['-SIGTERM', '1234'])
  it('killProcess calls shell.exec("kill", ["-SIGTERM", "1234"]) for SIGTERM', async () => {
    ;(core.shell.exec as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ stdout: '', code: 0 })
    await handlers['killProcess']({ pid: 1234, signal: 'SIGTERM' })
    expect(core.shell.exec).toHaveBeenCalledWith('kill', ['-SIGTERM', '1234'])
  })

  // 10. killProcess({ pid: 1234, signal: 'SIGKILL' }) → shell.exec('kill', ['-SIGKILL', '1234'])
  it('killProcess calls shell.exec("kill", ["-SIGKILL", "1234"]) for SIGKILL', async () => {
    ;(core.shell.exec as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ stdout: '', code: 0 })
    await handlers['killProcess']({ pid: 1234, signal: 'SIGKILL' })
    expect(core.shell.exec).toHaveBeenCalledWith('kill', ['-SIGKILL', '1234'])
  })

  // 11. killProcess({ pid: 1234, signal: 'SIGTERM' }) → returns { success: true, pid: 1234 }
  it('killProcess returns { success: true, pid } on success', async () => {
    ;(core.shell.exec as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ stdout: '', code: 0 })
    const result = (await handlers['killProcess']({ pid: 1234, signal: 'SIGTERM' })) as KillResult
    expect(result.success).toBe(true)
    expect(result.pid).toBe(1234)
  })

  // 12. killProcess({ pid: -1, signal: 'SIGTERM' }) → returns { success: false }, shell.exec NOT called
  it('killProcess rejects negative pid without calling shell.exec', async () => {
    const killExec = core.shell.exec as ReturnType<typeof vi.fn>
    killExec.mockClear()
    const result = (await handlers['killProcess']({
      pid: -1,
      signal: 'SIGTERM',
    })) as KillResult
    expect(result.success).toBe(false)
    // exec should not have been called for the kill (may have been called by listProcesses setup — use mockClear above)
    expect(killExec).not.toHaveBeenCalled()
  })

  // 13. killProcess({ pid: 0, signal: 'SIGTERM' }) → returns { success: false }, NOT called
  it('killProcess rejects pid=0 without calling shell.exec', async () => {
    const killExec = core.shell.exec as ReturnType<typeof vi.fn>
    killExec.mockClear()
    const result = (await handlers['killProcess']({
      pid: 0,
      signal: 'SIGTERM',
    })) as KillResult
    expect(result.success).toBe(false)
    expect(killExec).not.toHaveBeenCalled()
  })

  // 14. killProcess shell throws → returns { success: false, error: '...' }
  it('killProcess returns { success: false, error } when shell.exec throws', async () => {
    ;(core.shell.exec as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Operation not permitted')
    )
    const result = (await handlers['killProcess']({
      pid: 1234,
      signal: 'SIGTERM',
    })) as KillResult
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(result.pid).toBe(1234)
  })

  // 15. killProcess with invalid signal → returns { success: false }, NOT called
  it('killProcess rejects invalid signal without calling shell.exec', async () => {
    const killExec = core.shell.exec as ReturnType<typeof vi.fn>
    killExec.mockClear()
    const result = (await handlers['killProcess']({
      pid: 1234,
      signal: 'SIGFOO' as 'SIGTERM',
    })) as KillResult
    expect(result.success).toBe(false)
    expect(killExec).not.toHaveBeenCalled()
  })
})

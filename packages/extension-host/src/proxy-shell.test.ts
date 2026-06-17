import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'

const execFileMock = vi.hoisted(() => vi.fn())
const spawnMock = vi.hoisted(() => vi.fn())

vi.mock('child_process', () => ({
  execFile: execFileMock,
  spawn: spawnMock,
}))

import { buildShellApi } from './proxy-shell.ts'

describe('buildShellApi', () => {
  let checkPermission: ReturnType<typeof vi.fn>
  let api: ReturnType<typeof buildShellApi>

  beforeEach(() => {
    checkPermission = vi.fn()
    execFileMock.mockReset()
    spawnMock.mockReset()
    api = buildShellApi(checkPermission)
  })

  it('open checks permission and execFiles the platform opener', async () => {
    execFileMock.mockImplementation((_cmd, _args, cb) => cb(null))

    await api.open('/tmp/file.txt')
    expect(checkPermission).toHaveBeenCalledWith('shell', 'core.shell.open')
    expect(execFileMock).toHaveBeenCalled()
  })

  it('open rejects when execFile errors', async () => {
    execFileMock.mockImplementation((_cmd, _args, cb) => cb(new Error('boom')))

    await expect(api.open('/tmp/file.txt')).rejects.toThrow('boom')
  })

  it('exec checks permission and resolves stdout/code on success', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => cb(null, 'output\n'))

    const result = await api.exec('echo', ['hi'])
    expect(checkPermission).toHaveBeenCalledWith('shell', 'core.shell.exec')
    expect(result).toEqual({ stdout: 'output\n', code: 0 })
  })

  it('exec rejects with ENOENT when the binary is missing', async () => {
    const err = Object.assign(new Error('not found'), { code: 'ENOENT' })
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => cb(err))

    await expect(api.exec('missing-binary', [])).rejects.toThrow('not found')
  })

  it('exec resolves with a non-zero code for non-ENOENT failures', async () => {
    const err = Object.assign(new Error('failed'), { code: 1 })
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => cb(err, ''))

    const result = await api.exec('false', [])
    expect(result).toEqual({ stdout: '', code: 1 })
  })

  it('spawn checks permission and returns a handle that wires onData/onClose/kill', () => {
    const fakeProc = new EventEmitter() as EventEmitter & { kill: ReturnType<typeof vi.fn> }
    ;(fakeProc as unknown as { stdout: EventEmitter }).stdout = new EventEmitter()
    fakeProc.kill = vi.fn()
    spawnMock.mockReturnValue(fakeProc)

    const handle = api.spawn('ls', ['-la'])
    expect(checkPermission).toHaveBeenCalledWith('shell', 'core.shell.spawn')

    const dataHandler = vi.fn()
    handle.onData(dataHandler)
    ;(fakeProc as unknown as { stdout: EventEmitter }).stdout.emit('data', Buffer.from('hi'))
    expect(dataHandler).toHaveBeenCalledWith('hi')

    const closeHandler = vi.fn()
    handle.onClose(closeHandler)
    fakeProc.emit('close', 0)
    expect(closeHandler).toHaveBeenCalledWith(0)

    handle.kill('SIGTERM')
    expect(fakeProc.kill).toHaveBeenCalledWith('SIGTERM')
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fsPromises from 'fs/promises'
import os from 'os'
import { buildFsApi } from './proxy-fs.ts'

describe('buildFsApi', () => {
  let checkPermission: ReturnType<typeof vi.fn>
  let callHost: ReturnType<typeof vi.fn>
  let api: ReturnType<typeof buildFsApi>

  beforeEach(() => {
    checkPermission = vi.fn()
    callHost = vi.fn().mockResolvedValue('host-result')
    api = buildFsApi(checkPermission, callHost)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fileExists checks permission and delegates to callHost', async () => {
    const result = await api.fileExists('/tmp/foo')
    expect(checkPermission).toHaveBeenCalledWith('fs', 'core.fs.fileExists')
    expect(callHost).toHaveBeenCalledWith('fs:fileExists', '/tmp/foo')
    expect(result).toBe('host-result')
  })

  it('readDir checks permission and maps dirent entries', async () => {
    vi.spyOn(fsPromises, 'readdir').mockResolvedValue([
      { name: 'a.txt', isDirectory: () => false },
      { name: 'sub', isDirectory: () => true },
    ] as never)

    const entries = await api.readDir('/tmp')
    expect(checkPermission).toHaveBeenCalledWith('fs', 'core.fs.readDir')
    expect(entries).toEqual([
      { name: 'a.txt', isDir: false },
      { name: 'sub', isDir: true },
    ])
  })

  it('readFile checks permission and reads as utf8', async () => {
    vi.spyOn(fsPromises, 'readFile').mockResolvedValue('contents' as never)
    const result = await api.readFile('/tmp/foo.txt')
    expect(checkPermission).toHaveBeenCalledWith('fs', 'core.fs.readFile')
    expect(fsPromises.readFile).toHaveBeenCalledWith('/tmp/foo.txt', 'utf8')
    expect(result).toBe('contents')
  })

  it('readFileBinary checks permission and returns a Uint8Array', async () => {
    vi.spyOn(fsPromises, 'readFile').mockResolvedValue(Buffer.from([1, 2, 3]) as never)
    const result = await api.readFileBinary('/tmp/foo.bin')
    expect(checkPermission).toHaveBeenCalledWith('fs', 'core.fs.readFileBinary')
    expect(result).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('writeFile checks permission and writes string data as-is', async () => {
    vi.spyOn(fsPromises, 'writeFile').mockResolvedValue(undefined)
    await api.writeFile('/tmp/foo.txt', 'hello')
    expect(checkPermission).toHaveBeenCalledWith('fs', 'core.fs.writeFile')
    expect(fsPromises.writeFile).toHaveBeenCalledWith('/tmp/foo.txt', 'hello')
  })

  it('writeFile converts Uint8Array data to a Buffer', async () => {
    vi.spyOn(fsPromises, 'writeFile').mockResolvedValue(undefined)
    const data = new Uint8Array([4, 5, 6])
    await api.writeFile('/tmp/foo.bin', data)
    const [, written] = vi.mocked(fsPromises.writeFile).mock.calls[0]
    expect(Buffer.isBuffer(written)).toBe(true)
    expect(Array.from(written as Buffer)).toEqual([4, 5, 6])
  })

  it('mkdir checks permission and resolves to undefined', async () => {
    vi.spyOn(fsPromises, 'mkdir').mockResolvedValue(undefined)
    const result = await api.mkdir('/tmp/dir', { recursive: true })
    expect(checkPermission).toHaveBeenCalledWith('fs', 'core.fs.mkdir')
    expect(fsPromises.mkdir).toHaveBeenCalledWith('/tmp/dir', { recursive: true })
    expect(result).toBeUndefined()
  })

  it('rename checks permission and delegates to fs.rename', async () => {
    vi.spyOn(fsPromises, 'rename').mockResolvedValue(undefined)
    await api.rename('/tmp/a', '/tmp/b')
    expect(checkPermission).toHaveBeenCalledWith('fs', 'core.fs.rename')
    expect(fsPromises.rename).toHaveBeenCalledWith('/tmp/a', '/tmp/b')
  })

  it('rm checks permission and unlinks the file', async () => {
    vi.spyOn(fsPromises, 'unlink').mockResolvedValue(undefined)
    await api.rm('/tmp/a')
    expect(checkPermission).toHaveBeenCalledWith('fs', 'core.fs.rm')
    expect(fsPromises.unlink).toHaveBeenCalledWith('/tmp/a')
  })

  it('stat checks permission and maps Stats to the public shape', async () => {
    vi.spyOn(fsPromises, 'stat').mockResolvedValue({
      isDirectory: () => true,
      size: 1024,
      mtimeMs: 12345,
    } as never)
    const result = await api.stat('/tmp/dir')
    expect(checkPermission).toHaveBeenCalledWith('fs', 'core.fs.stat')
    expect(result).toEqual({ isDir: true, size: 1024, mtimeMs: 12345 })
  })

  it('homedir checks permission and returns os.homedir()', () => {
    vi.spyOn(os, 'homedir').mockReturnValue('/home/test')
    expect(api.homedir()).toBe('/home/test')
    expect(checkPermission).toHaveBeenCalledWith('fs', 'core.fs.homedir')
  })

  it('tmpdir checks permission and returns os.tmpdir()', () => {
    vi.spyOn(os, 'tmpdir').mockReturnValue('/tmp')
    expect(api.tmpdir()).toBe('/tmp')
    expect(checkPermission).toHaveBeenCalledWith('fs', 'core.fs.tmpdir')
  })

  it('throws and never calls fs when checkPermission rejects', () => {
    checkPermission.mockImplementation(() => {
      throw new Error('Permission Denied')
    })
    const readFileSpy = vi.spyOn(fsPromises, 'readFile')
    expect(() => api.readFile('/tmp/foo.txt')).toThrow('Permission Denied')
    expect(readFileSpy).not.toHaveBeenCalled()
  })
})

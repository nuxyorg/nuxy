import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// IMPORTANT: All vi.mock calls must be at top level before imports

const mockWebContents = { send: vi.fn(), isDestroyed: vi.fn(() => false) }
const mockWin = { webContents: mockWebContents, isDestroyed: vi.fn(() => false) }

vi.mock('electron', () => ({
  clipboard: {
    readText: vi.fn(() => 'clipboard text'),
    writeText: vi.fn(),
    readImage: vi.fn(() => ({
      isEmpty: vi.fn(() => false),
      toDataURL: vi.fn(() => 'data:image/png;base64,...'),
    })),
    writeImage: vi.fn(),
    writeBuffer: vi.fn(),
  },
  nativeImage: {
    createFromDataURL: vi.fn(() => ({})),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => [mockWin]),
  },
}))

vi.mock('@nuxy/core', () => ({
  HostChannel: {
    CLIPBOARD_READ: 'clipboard:readText',
    CLIPBOARD_WRITE: 'clipboard:writeText',
    CLIPBOARD_READ_IMAGE: 'clipboard:readImage',
    CLIPBOARD_WRITE_IMAGE: 'clipboard:writeImage',
    CLIPBOARD_WRITE_FILES: 'clipboard:writeFiles',
    FS_FILE_EXISTS: 'fs:fileExists',
    STORAGE_READ: 'storage:read',
    STORAGE_WRITE: 'storage:write',
    MEDIA_GET_NOW_PLAYING: 'media:getNowPlaying',
    BROKER_INVOKE: 'broker:invoke',
    THEME_REGISTER: 'theme:register',
    ICONPACK_REGISTER: 'iconpack:register',
    IPC_BROADCAST: 'ipc:broadcast',
    REGISTRY_GET_CALLABLE_TOOLS: 'registry:getCallableTools',
  },
  kernelLogger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      silly: vi.fn(),
    })),
  },
}))

vi.mock('../config/permissions.js', () => ({
  assertHostPermission: vi.fn(() => null), // null = allowed
}))

vi.mock('../config/storage-path.js', () => ({
  resolveStoragePath: vi.fn((_dir: string, file: string) => `/fake/data/${file}`),
}))

vi.mock('../extensions/registry.js', () => ({
  getExtensionById: vi.fn(),
  loadedExtensions: [],
}))

vi.mock('../ipc/broker.js', () => ({
  invokeExtension: vi.fn(async () => ({ success: true, data: 'broker result' })),
}))

vi.mock('../media/index.js', () => ({
  getNowPlaying: vi.fn(async () => ({ title: 'Song', artist: 'Artist' })),
}))

vi.mock('./migrate-data.js', () => ({
  extensionDataDir: vi.fn((extId: string) => `/fake/data/${extId}`),
}))

vi.mock('../themes/extension-themes.js', () => ({
  registerExtensionTheme: vi.fn(),
}))

vi.mock('../icons/registry.js', () => ({
  registerIconPack: vi.fn(),
}))

import { handleHostCall } from './host-handlers.js'
import { getExtensionById, loadedExtensions } from '../extensions/registry.js'
import { invokeExtension } from '../ipc/broker.js'
import { assertHostPermission } from '../config/permissions.js'
import { registerExtensionTheme } from '../themes/extension-themes.js'
import { registerIconPack } from '../icons/registry.js'
import { clipboard, nativeImage, BrowserWindow } from 'electron'
import fs from 'fs'
import fsPromises from 'fs/promises'

function makeExt(type = 'tool', permissions = ['clipboard', 'storage', 'media', 'fs']) {
  return {
    id: 'com.nuxy.test',
    folderName: 'test',
    manifest: {
      id: 'com.nuxy.test',
      name: 'Test',
      version: '1.0.0',
      type,
      permissions,
      capabilities: { caller: true, callable: true },
    },
  }
}

describe('handleHostCall', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getExtensionById).mockReturnValue(makeExt() as any)
    vi.mocked(assertHostPermission).mockReturnValue(null as any)
    mockWebContents.send.mockClear()
    ;(loadedExtensions as unknown[]).length = 0
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Extension not found
  // ---------------------------------------------------------------------------

  it('returns error when extension not found', async () => {
    vi.mocked(getExtensionById).mockReturnValue(undefined as any)
    const result = await handleHostCall('unknown', 'clipboard:readText', null)
    expect(result).toEqual({ error: 'Extension not found: unknown' })
  })

  // ---------------------------------------------------------------------------
  // BROKER_INVOKE
  // ---------------------------------------------------------------------------

  it('BROKER_INVOKE: returns error when payload is null', async () => {
    const result = await handleHostCall('com.nuxy.test', 'broker:invoke', null)
    expect(result).toEqual({ error: 'Invalid broker invoke payload: missing targetId or channel' })
  })

  it('BROKER_INVOKE: returns error when payload missing targetId', async () => {
    const result = await handleHostCall('com.nuxy.test', 'broker:invoke', {
      channel: 'some:channel',
    })
    expect(result).toEqual({ error: 'Invalid broker invoke payload: missing targetId or channel' })
  })

  it('BROKER_INVOKE: returns error when payload missing channel', async () => {
    const result = await handleHostCall('com.nuxy.test', 'broker:invoke', {
      targetId: 'com.nuxy.other',
    })
    expect(result).toEqual({ error: 'Invalid broker invoke payload: missing targetId or channel' })
  })

  it('BROKER_INVOKE: calls invokeExtension with correct args and returns result on success', async () => {
    vi.mocked(invokeExtension).mockResolvedValue({ success: true, data: 'broker result' } as any)
    const result = await handleHostCall('com.nuxy.test', 'broker:invoke', {
      targetId: 'com.nuxy.other',
      channel: 'some:channel',
      payload: { key: 'value' },
    })
    expect(invokeExtension).toHaveBeenCalledWith(
      'com.nuxy.test',
      'com.nuxy.other',
      'some:channel',
      { key: 'value' }
    )
    expect(result).toEqual({ result: 'broker result' })
  })

  it('BROKER_INVOKE: returns error when invokeExtension returns success: false', async () => {
    vi.mocked(invokeExtension).mockResolvedValue({ success: false, error: 'fail' } as any)
    const result = await handleHostCall('com.nuxy.test', 'broker:invoke', {
      targetId: 'com.nuxy.other',
      channel: 'some:channel',
    })
    expect(result).toEqual({ error: 'fail' })
  })

  // ---------------------------------------------------------------------------
  // Permission denied
  // ---------------------------------------------------------------------------

  it('returns permission error when assertHostPermission denies', async () => {
    vi.mocked(assertHostPermission).mockReturnValue({ error: 'PERMISSION_DENIED' } as any)
    const result = await handleHostCall('com.nuxy.test', 'clipboard:readText', null)
    expect(result).toEqual({ error: 'PERMISSION_DENIED' })
  })

  // ---------------------------------------------------------------------------
  // clipboard:readText
  // ---------------------------------------------------------------------------

  it('clipboard:readText returns clipboard text', async () => {
    vi.mocked(clipboard.readText).mockReturnValue('clipboard text')
    const result = await handleHostCall('com.nuxy.test', 'clipboard:readText', null)
    expect(result).toEqual({ result: 'clipboard text' })
  })

  // ---------------------------------------------------------------------------
  // clipboard:writeText
  // ---------------------------------------------------------------------------

  it('clipboard:writeText calls writeText and returns true', async () => {
    const result = await handleHostCall('com.nuxy.test', 'clipboard:writeText', 'hello world')
    expect(clipboard.writeText).toHaveBeenCalledWith('hello world')
    expect(result).toEqual({ result: true })
  })

  it('clipboard:writeText returns error when payload is not a string', async () => {
    const result = await handleHostCall('com.nuxy.test', 'clipboard:writeText', 42)
    expect(result).toEqual({ error: 'CLIPBOARD_WRITE: payload must be a string' })
  })

  // ---------------------------------------------------------------------------
  // clipboard:readImage
  // ---------------------------------------------------------------------------

  it('clipboard:readImage returns data URL when image is not empty', async () => {
    vi.mocked(clipboard.readImage).mockReturnValue({
      isEmpty: vi.fn(() => false),
      toDataURL: vi.fn(() => 'data:image/png;base64,...'),
    } as any)
    const result = await handleHostCall('com.nuxy.test', 'clipboard:readImage', null)
    expect(result).toEqual({ result: 'data:image/png;base64,...' })
  })

  it('clipboard:readImage returns null when image is empty', async () => {
    vi.mocked(clipboard.readImage).mockReturnValue({
      isEmpty: vi.fn(() => true),
      toDataURL: vi.fn(() => 'data:image/png;base64,...'),
    } as any)
    const result = await handleHostCall('com.nuxy.test', 'clipboard:readImage', null)
    expect(result).toEqual({ result: null })
  })

  // ---------------------------------------------------------------------------
  // clipboard:writeImage
  // ---------------------------------------------------------------------------

  it('clipboard:writeImage calls createFromDataURL and writeImage and returns true', async () => {
    const fakeImg = { type: 'nativeimage' }
    vi.mocked(nativeImage.createFromDataURL).mockReturnValue(fakeImg as any)
    const result = await handleHostCall(
      'com.nuxy.test',
      'clipboard:writeImage',
      'data:image/png;base64,abc'
    )
    expect(nativeImage.createFromDataURL).toHaveBeenCalledWith('data:image/png;base64,abc')
    expect(clipboard.writeImage).toHaveBeenCalledWith(fakeImg)
    expect(result).toEqual({ result: true })
  })

  it('clipboard:writeImage returns error when payload is not a string', async () => {
    const result = await handleHostCall('com.nuxy.test', 'clipboard:writeImage', null)
    expect(result).toEqual({ error: 'CLIPBOARD_WRITE_IMAGE: payload must be a dataURL string' })
  })

  // ---------------------------------------------------------------------------
  // clipboard:writeFiles
  // ---------------------------------------------------------------------------

  it('clipboard:writeFiles returns error when payload is not string[]', async () => {
    const result = await handleHostCall('com.nuxy.test', 'clipboard:writeFiles', [1, 2, 3])
    expect(result).toEqual({ error: 'CLIPBOARD_WRITE_FILES: payload must be string[]' })
  })

  it('clipboard:writeFiles calls writeBuffer with correct args on linux', async () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })

    const result = await handleHostCall('com.nuxy.test', 'clipboard:writeFiles', [
      '/home/user/file.txt',
    ])

    expect(clipboard.writeBuffer).toHaveBeenCalledWith(
      'x-special/nautilus-clipboard',
      Buffer.from('copy\nfile:///home/user/file.txt\n', 'utf8')
    )
    expect(result).toEqual({ result: true })

    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
  })

  it('clipboard:writeFiles calls writeBuffer with text/uri-list on non-linux', async () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })

    const result = await handleHostCall('com.nuxy.test', 'clipboard:writeFiles', [
      '/home/user/file.txt',
    ])

    expect(clipboard.writeBuffer).toHaveBeenCalledWith(
      'text/uri-list',
      Buffer.from('file:///home/user/file.txt\n', 'utf8')
    )
    expect(result).toEqual({ result: true })

    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
  })

  // ---------------------------------------------------------------------------
  // fs:fileExists
  // ---------------------------------------------------------------------------

  it('fs:fileExists returns true when file exists', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    const result = await handleHostCall('com.nuxy.test', 'fs:fileExists', '/some/path')
    expect(result).toEqual({ result: true })
  })

  it('fs:fileExists returns false when file does not exist', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    const result = await handleHostCall('com.nuxy.test', 'fs:fileExists', '/some/path')
    expect(result).toEqual({ result: false })
  })

  it('fs:fileExists returns error when payload is not a string', async () => {
    const result = await handleHostCall('com.nuxy.test', 'fs:fileExists', 42)
    expect(result).toEqual({ error: 'FS_FILE_EXISTS: payload must be a path string' })
  })

  // ---------------------------------------------------------------------------
  // storage:read
  // ---------------------------------------------------------------------------

  it('storage:read returns parsed JSON when file exists', async () => {
    vi.spyOn(fsPromises, 'readFile').mockResolvedValue(JSON.stringify({ hello: 'world' }) as any)
    const result = await handleHostCall('com.nuxy.test', 'storage:read', 'data.json')
    expect(result).toEqual({ result: { hello: 'world' } })
  })

  it('storage:read returns null when readFile throws', async () => {
    vi.spyOn(fsPromises, 'readFile').mockRejectedValue(new Error('ENOENT'))
    const result = await handleHostCall('com.nuxy.test', 'storage:read', 'data.json')
    expect(result).toEqual({ result: null })
  })

  it('storage:read returns error when payload is not a string', async () => {
    const result = await handleHostCall('com.nuxy.test', 'storage:read', null)
    expect(result).toEqual({ error: 'STORAGE_READ: payload must be a file path string' })
  })

  // ---------------------------------------------------------------------------
  // storage:write
  // ---------------------------------------------------------------------------

  it('storage:write calls mkdir and writeFile and returns true', async () => {
    vi.spyOn(fsPromises, 'mkdir').mockResolvedValue(undefined as any)
    vi.spyOn(fsPromises, 'writeFile').mockResolvedValue(undefined as any)

    const result = await handleHostCall('com.nuxy.test', 'storage:write', {
      file: 'data.json',
      data: { foo: 'bar' },
    })

    expect(fsPromises.mkdir).toHaveBeenCalledWith('/fake/data/com.nuxy.test', { recursive: true })
    expect(fsPromises.writeFile).toHaveBeenCalledWith(
      '/fake/data/data.json',
      JSON.stringify({ foo: 'bar' }, null, 2),
      'utf8'
    )
    expect(result).toEqual({ result: true })
  })

  it('storage:write returns error when payload missing file field', async () => {
    const result = await handleHostCall('com.nuxy.test', 'storage:write', { data: { foo: 'bar' } })
    expect(result).toEqual({
      error: 'STORAGE_WRITE: payload must be { file: string, data: unknown }',
    })
  })

  it('storage:write returns error when payload is null', async () => {
    const result = await handleHostCall('com.nuxy.test', 'storage:write', null)
    expect(result).toEqual({
      error: 'STORAGE_WRITE: payload must be { file: string, data: unknown }',
    })
  })

  // ---------------------------------------------------------------------------
  // media:getNowPlaying
  // ---------------------------------------------------------------------------

  it('media:getNowPlaying returns now playing info', async () => {
    const result = await handleHostCall('com.nuxy.test', 'media:getNowPlaying', null)
    expect(result).toEqual({ result: { title: 'Song', artist: 'Artist' } })
  })

  // ---------------------------------------------------------------------------
  // theme:register
  // ---------------------------------------------------------------------------

  it('theme:register returns error when ext type is not theme', async () => {
    vi.mocked(getExtensionById).mockReturnValue(makeExt('tool') as any)
    const result = await handleHostCall('com.nuxy.test', 'theme:register', {
      name: 'my-theme',
      colors: { primary: '#fff' },
    })
    expect(result).toEqual({
      error: 'PERMISSION_DENIED: Only theme extensions can register themes',
    })
  })

  it('theme:register returns error when ThemeDefinition missing name', async () => {
    vi.mocked(getExtensionById).mockReturnValue(makeExt('theme') as any)
    const result = await handleHostCall('com.nuxy.test', 'theme:register', {
      colors: { primary: '#fff' },
    })
    expect(result).toEqual({ error: 'Invalid ThemeDefinition: missing name or colors' })
  })

  it('theme:register returns error when ThemeDefinition missing colors', async () => {
    vi.mocked(getExtensionById).mockReturnValue(makeExt('theme') as any)
    const result = await handleHostCall('com.nuxy.test', 'theme:register', {
      name: 'my-theme',
    })
    expect(result).toEqual({ error: 'Invalid ThemeDefinition: missing name or colors' })
  })

  it('theme:register calls registerExtensionTheme and returns true with valid payload', async () => {
    vi.mocked(getExtensionById).mockReturnValue(makeExt('theme') as any)
    const def = { name: 'my-theme', colors: { primary: '#fff' } }
    const result = await handleHostCall('com.nuxy.test', 'theme:register', def)
    expect(registerExtensionTheme).toHaveBeenCalledWith(def)
    expect(result).toEqual({ result: true })
  })

  // ---------------------------------------------------------------------------
  // iconpack:register
  // ---------------------------------------------------------------------------

  it('iconpack:register returns error when ext type is not iconpack', async () => {
    vi.mocked(getExtensionById).mockReturnValue(makeExt('tool') as any)
    const result = await handleHostCall('com.nuxy.test', 'iconpack:register', {
      name: 'my-icons',
      icons: { star: '<svg/>' },
    })
    expect(result).toEqual({
      error: 'PERMISSION_DENIED: Only iconpack extensions can register icon packs',
    })
  })

  it('iconpack:register calls registerIconPack and returns true with valid payload', async () => {
    vi.mocked(getExtensionById).mockReturnValue(makeExt('iconpack') as any)
    const def = { name: 'my-icons', icons: { star: '<svg/>' } }
    const result = await handleHostCall('com.nuxy.test', 'iconpack:register', def)
    expect(registerIconPack).toHaveBeenCalledWith(def)
    expect(result).toEqual({ result: true })
  })

  // ---------------------------------------------------------------------------
  // ipc:broadcast
  // ---------------------------------------------------------------------------

  it('ipc:broadcast sends ext:broadcast to all windows and returns true', async () => {
    const result = await handleHostCall('com.nuxy.test', 'ipc:broadcast', {
      channel: 'some:event',
      data: { foo: 'bar' },
    })
    expect(mockWebContents.send).toHaveBeenCalledWith('ext:broadcast', 'some:event', { foo: 'bar' })
    expect(result).toEqual({ result: true })
  })

  it('ipc:broadcast returns error when payload is null', async () => {
    const result = await handleHostCall('com.nuxy.test', 'ipc:broadcast', null)
    expect(result).toEqual({
      error: 'IPC_BROADCAST: payload must be { channel: string, data: unknown }',
    })
  })

  it('ipc:broadcast returns error when channel is missing', async () => {
    const result = await handleHostCall('com.nuxy.test', 'ipc:broadcast', { data: 42 })
    expect(result).toEqual({
      error: 'IPC_BROADCAST: payload must be { channel: string, data: unknown }',
    })
  })

  it('ipc:broadcast skips destroyed windows', async () => {
    mockWin.isDestroyed.mockReturnValueOnce(true)
    const result = await handleHostCall('com.nuxy.test', 'ipc:broadcast', {
      channel: 'test',
      data: null,
    })
    expect(mockWebContents.send).not.toHaveBeenCalled()
    expect(result).toEqual({ result: true })
  })

  // ---------------------------------------------------------------------------
  // registry:getCallableTools
  // ---------------------------------------------------------------------------

  it('registry:getCallableTools returns tool extensions', async () => {
    ;(loadedExtensions as unknown[]).push(
      { id: 'com.nuxy.tool1', disabled: false, manifest: { type: 'tool', name: 'Tool One' } },
      { id: 'com.nuxy.tool2', disabled: false, manifest: { type: 'tool', name: 'Tool Two' } }
    )
    const result = await handleHostCall('com.nuxy.test', 'registry:getCallableTools', {})
    expect(result).toEqual({
      result: [
        { id: 'com.nuxy.tool1', manifest: { name: 'Tool One' } },
        { id: 'com.nuxy.tool2', manifest: { name: 'Tool Two' } },
      ],
    })
  })

  it('registry:getCallableTools excludes non-tool extensions', async () => {
    ;(loadedExtensions as unknown[]).push(
      {
        id: 'com.nuxy.provider',
        disabled: false,
        manifest: { type: 'provider', name: 'Provider' },
      },
      { id: 'com.nuxy.tool', disabled: false, manifest: { type: 'tool', name: 'Tool' } }
    )
    const result = await handleHostCall('com.nuxy.test', 'registry:getCallableTools', {})
    expect(result).toEqual({ result: [{ id: 'com.nuxy.tool', manifest: { name: 'Tool' } }] })
  })

  it('registry:getCallableTools excludes disabled extensions', async () => {
    ;(loadedExtensions as unknown[]).push(
      { id: 'com.nuxy.disabled', disabled: true, manifest: { type: 'tool', name: 'Disabled' } },
      { id: 'com.nuxy.active', disabled: false, manifest: { type: 'tool', name: 'Active' } }
    )
    const result = await handleHostCall('com.nuxy.test', 'registry:getCallableTools', {})
    expect(result).toEqual({ result: [{ id: 'com.nuxy.active', manifest: { name: 'Active' } }] })
  })

  it('registry:getCallableTools returns empty array when no tools loaded', async () => {
    const result = await handleHostCall('com.nuxy.test', 'registry:getCallableTools', {})
    expect(result).toEqual({ result: [] })
  })

  // ---------------------------------------------------------------------------
  // Unknown channel
  // ---------------------------------------------------------------------------

  it('returns error for unknown channel', async () => {
    const result = await handleHostCall('com.nuxy.test', 'unknown:thing', null)
    expect(result).toEqual({ error: 'Unknown host channel: unknown:thing' })
  })
})

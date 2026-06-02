import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

vi.mock('@nuxy/core', () => ({
  kernelLogger: {
    child: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })),
  },
}))

vi.mock('../config/paths.js', () => ({
  DATA_DIR: '/tmp/nuxy-test/data',
  LEGACY_DATA_DIR: '/tmp/nuxy-test/legacy',
}))

import { extensionDataDir, migrateLegacyData } from './migrate-data.js'

const DATA_DIR = '/tmp/nuxy-test/data'
const LEGACY_DATA_DIR = '/tmp/nuxy-test/legacy'

describe('extensionDataDir', () => {
  it('returns path.join(DATA_DIR, extId) correctly', () => {
    expect(extensionDataDir('com.nuxy.test')).toBe(path.join(DATA_DIR, 'com.nuxy.test'))
  })
})

describe('migrateLegacyData', () => {
  let existsSyncSpy: ReturnType<typeof vi.spyOn>
  let readdirSyncSpy: ReturnType<typeof vi.spyOn>
  let mkdirSyncSpy: ReturnType<typeof vi.spyOn>
  let cpSyncSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    existsSyncSpy = vi.spyOn(fs, 'existsSync')
    readdirSyncSpy = vi.spyOn(fs, 'readdirSync')
    mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as any)
    cpSyncSpy = vi.spyOn(fs, 'cpSync').mockImplementation(() => undefined as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('skips migration when targetDir exists and is non-empty', () => {
    // First existsSync call: targetDir check → true; readdirSync returns non-empty
    existsSyncSpy.mockReturnValue(true)
    readdirSyncSpy.mockReturnValue(['file.json'] as any)

    migrateLegacyData('com.nuxy.test', 'test-folder')

    expect(cpSyncSpy).not.toHaveBeenCalled()
  })

  it('proceeds when targetDir exists but is empty', () => {
    const targetDir = path.join(DATA_DIR, 'com.nuxy.test')
    const firstSource = path.join(LEGACY_DATA_DIR, 'com.nuxy.test')

    existsSyncSpy.mockImplementation((p: any) => {
      if (p === targetDir) return true
      if (p === firstSource) return true
      return false
    })
    readdirSyncSpy.mockReturnValue([] as any)

    migrateLegacyData('com.nuxy.test', 'test-folder')

    expect(cpSyncSpy).toHaveBeenCalledWith(firstSource, targetDir, { recursive: true })
  })

  it('proceeds when targetDir does not exist', () => {
    const targetDir = path.join(DATA_DIR, 'com.nuxy.test')
    const firstSource = path.join(LEGACY_DATA_DIR, 'com.nuxy.test')

    existsSyncSpy.mockImplementation((p: any) => {
      if (p === targetDir) return false
      if (p === firstSource) return true
      return false
    })

    migrateLegacyData('com.nuxy.test', 'test-folder')

    expect(cpSyncSpy).toHaveBeenCalledWith(firstSource, targetDir, { recursive: true })
  })

  it('copies from LEGACY_DATA_DIR/extId when it exists (first source)', () => {
    const targetDir = path.join(DATA_DIR, 'com.nuxy.myext')
    const firstSource = path.join(LEGACY_DATA_DIR, 'com.nuxy.myext')

    existsSyncSpy.mockImplementation((p: any) => {
      if (p === targetDir) return false
      if (p === firstSource) return true
      return false
    })

    migrateLegacyData('com.nuxy.myext', 'my-folder')

    expect(cpSyncSpy).toHaveBeenCalledOnce()
    expect(cpSyncSpy).toHaveBeenCalledWith(firstSource, targetDir, { recursive: true })
  })

  it('falls back to LEGACY_DATA_DIR/folderName when extId dir does not exist', () => {
    const targetDir = path.join(DATA_DIR, 'com.nuxy.myext')
    const firstSource = path.join(LEGACY_DATA_DIR, 'com.nuxy.myext')
    const secondSource = path.join(LEGACY_DATA_DIR, 'my-folder')

    existsSyncSpy.mockImplementation((p: any) => {
      if (p === targetDir) return false
      if (p === firstSource) return false
      if (p === secondSource) return true
      return false
    })

    migrateLegacyData('com.nuxy.myext', 'my-folder')

    expect(cpSyncSpy).toHaveBeenCalledOnce()
    expect(cpSyncSpy).toHaveBeenCalledWith(secondSource, targetDir, { recursive: true })
  })

  it('falls back to DATA_DIR/folderName as third source', () => {
    const targetDir = path.join(DATA_DIR, 'com.nuxy.myext')
    const firstSource = path.join(LEGACY_DATA_DIR, 'com.nuxy.myext')
    const secondSource = path.join(LEGACY_DATA_DIR, 'my-folder')
    const thirdSource = path.join(DATA_DIR, 'my-folder')

    existsSyncSpy.mockImplementation((p: any) => {
      if (p === targetDir) return false
      if (p === firstSource) return false
      if (p === secondSource) return false
      if (p === thirdSource) return true
      return false
    })

    migrateLegacyData('com.nuxy.myext', 'my-folder')

    expect(cpSyncSpy).toHaveBeenCalledOnce()
    expect(cpSyncSpy).toHaveBeenCalledWith(thirdSource, targetDir, { recursive: true })
  })

  it('does nothing when no source dir exists (cpSync never called)', () => {
    existsSyncSpy.mockReturnValue(false)

    migrateLegacyData('com.nuxy.myext', 'my-folder')

    expect(cpSyncSpy).not.toHaveBeenCalled()
  })

  it('calls mkdirSync(DATA_DIR, { recursive: true }) before cpSync', () => {
    const targetDir = path.join(DATA_DIR, 'com.nuxy.myext')
    const firstSource = path.join(LEGACY_DATA_DIR, 'com.nuxy.myext')

    existsSyncSpy.mockImplementation((p: any) => {
      if (p === targetDir) return false
      if (p === firstSource) return true
      return false
    })

    const callOrder: string[] = []
    mkdirSyncSpy.mockImplementation(() => {
      callOrder.push('mkdir')
      return undefined as any
    })
    cpSyncSpy.mockImplementation(() => {
      callOrder.push('cpSync')
      return undefined as any
    })

    migrateLegacyData('com.nuxy.myext', 'my-folder')

    expect(mkdirSyncSpy).toHaveBeenCalledWith(DATA_DIR, { recursive: true })
    expect(callOrder).toEqual(['mkdir', 'cpSync'])
  })
})

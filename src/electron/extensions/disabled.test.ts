import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

describe('disabled extensions list', () => {
  let tmpDir: string
  let originalDataDir: string | undefined

  beforeEach(() => {
    originalDataDir = process.env.NUXY_DATA_DIR
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuxy-disabled-test-'))
    process.env.NUXY_DATA_DIR = tmpDir
    vi.resetModules()
  })

  afterEach(() => {
    if (originalDataDir === undefined) {
      delete process.env.NUXY_DATA_DIR
    } else {
      process.env.NUXY_DATA_DIR = originalDataDir
    }
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns an empty set when no file exists', async () => {
    const { readDisabledList } = await import('./disabled.js')

    const list = readDisabledList()

    expect(list).toBeInstanceOf(Set)
    expect(list.size).toBe(0)
  })

  it('adds an extension id when disabled, then reflects it on read', async () => {
    const { readDisabledList, setExtensionEnabled } = await import('./disabled.js')

    setExtensionEnabled('com.nuxy.clipboard', false)

    const list = readDisabledList()
    expect(list.has('com.nuxy.clipboard')).toBe(true)
  })

  it('removes an extension id when re-enabled', async () => {
    const { readDisabledList, setExtensionEnabled } = await import('./disabled.js')

    setExtensionEnabled('com.nuxy.clipboard', false)
    expect(readDisabledList().has('com.nuxy.clipboard')).toBe(true)

    setExtensionEnabled('com.nuxy.clipboard', true)
    expect(readDisabledList().has('com.nuxy.clipboard')).toBe(false)
  })

  it('migrates a legacy disabled list to the new location', async () => {
    const legacyDir = path.join(tmpDir, 'com.nuxy.settings')
    fs.mkdirSync(legacyDir, { recursive: true })
    const legacyFile = path.join(legacyDir, 'disabled-extensions.json')
    fs.writeFileSync(legacyFile, JSON.stringify(['com.nuxy.legacy-tool']))

    const { readDisabledList } = await import('./disabled.js')

    const list = readDisabledList()

    expect(list.has('com.nuxy.legacy-tool')).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'disabled-extensions.json'))).toBe(true)
    expect(fs.existsSync(legacyFile)).toBe(false)
  })

  it('falls back to an empty set when the disabled file contains invalid JSON', async () => {
    fs.mkdirSync(tmpDir, { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'disabled-extensions.json'), 'not valid json{{')

    const { readDisabledList } = await import('./disabled.js')

    expect(() => readDisabledList()).not.toThrow()
    expect(readDisabledList().size).toBe(0)
  })

  it('falls back to an empty set when the disabled file contains a non-array JSON value', async () => {
    fs.mkdirSync(tmpDir, { recursive: true })
    fs.writeFileSync(
      path.join(tmpDir, 'disabled-extensions.json'),
      JSON.stringify({ not: 'an array' })
    )

    const { readDisabledList } = await import('./disabled.js')

    expect(readDisabledList().size).toBe(0)
  })

  it('persists multiple disabled extensions independently', async () => {
    const { readDisabledList, setExtensionEnabled } = await import('./disabled.js')

    setExtensionEnabled('com.nuxy.a', false)
    setExtensionEnabled('com.nuxy.b', false)

    const list = readDisabledList()
    expect(list.has('com.nuxy.a')).toBe(true)
    expect(list.has('com.nuxy.b')).toBe(true)
    expect(list.size).toBe(2)
  })
})

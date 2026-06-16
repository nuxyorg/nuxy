import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { resolveExtensionFile, pickBestExtractFolder, scoreExtensionFolder } from './resolve.js'
import { registerExtension, clearRegistry } from '../extensions/registry.js'
import type { LoadedExtension } from '@nuxyorg/core'

describe('resolveExtensionFile', () => {
  let tmpRoot: string

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nuxy-ext-'))
    clearRegistry()
    const extDir = path.join(tmpRoot, 'clipboard')
    fs.mkdirSync(extDir, { recursive: true })
    fs.writeFileSync(path.join(extDir, 'frontend.js'), 'export default {}')

    const ext: LoadedExtension = {
      id: 'com.nuxy.clipboard',
      folderName: 'clipboard',
      manifest: {
        id: 'com.nuxy.clipboard',
        name: 'Clipboard',
        version: '1.0.0',
        type: 'tool',
        entry: { frontend: 'frontend.js' },
      },
    }
    registerExtension(ext)
  })

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
    clearRegistry()
  })

  it('resolves by manifest id', () => {
    const r = resolveExtensionFile('com.nuxy.clipboard', 'frontend.js', tmpRoot)
    expect(r).not.toBeNull()
    expect(r!.extensionId).toBe('com.nuxy.clipboard')
    expect(r!.absolutePath).toBe(path.join(tmpRoot, 'clipboard', 'frontend.js'))
    expect(r!.extDir).toBe(path.join(tmpRoot, 'clipboard'))
  })

  it('prefers _frontend.bundle.mjs when frontend.js is missing', () => {
    fs.rmSync(path.join(tmpRoot, 'clipboard', 'frontend.js'))
    fs.writeFileSync(path.join(tmpRoot, 'clipboard', '_frontend.bundle.mjs'), 'export {}')

    const r = resolveExtensionFile('com.nuxy.clipboard', 'frontend.js', tmpRoot)
    expect(r).not.toBeNull()
    expect(r!.absolutePath).toBe(path.join(tmpRoot, 'clipboard', '_frontend.bundle.mjs'))
  })

  it('pickBestExtractFolder prefers versioned extract with frontend bundle', () => {
    const legacyDir = path.join(tmpRoot, 'com.nuxy.clipboard')
    const versionedDir = path.join(tmpRoot, 'com.nuxy.clipboard-1.0.0')
    fs.rmSync(legacyDir, { recursive: true, force: true })
    fs.mkdirSync(legacyDir)
    fs.mkdirSync(versionedDir)
    fs.writeFileSync(
      path.join(legacyDir, 'manifest.json'),
      JSON.stringify({ id: 'com.nuxy.clipboard', version: '0.9.0' })
    )
    fs.writeFileSync(
      path.join(versionedDir, 'manifest.json'),
      JSON.stringify({ id: 'com.nuxy.clipboard', version: '1.0.0' })
    )
    fs.writeFileSync(path.join(versionedDir, '_frontend.bundle.mjs'), 'export {}')

    expect(pickBestExtractFolder('com.nuxy.clipboard', tmpRoot)).toBe('com.nuxy.clipboard-1.0.0')
    expect(scoreExtensionFolder(versionedDir, 'com.nuxy.clipboard-1.0.0')).toBeGreaterThan(
      scoreExtensionFolder(legacyDir, 'com.nuxy.clipboard')
    )
  })

  it('resolves by folder name', () => {
    const r = resolveExtensionFile('clipboard', 'frontend.js', tmpRoot)
    expect(r).not.toBeNull()
    expect(r!.folderName).toBe('clipboard')
  })

  it('blocks path traversal', () => {
    const r = resolveExtensionFile('com.nuxy.clipboard', '../../../etc/passwd', tmpRoot)
    expect(r).toBeNull()
  })

  it('returns null for missing file', () => {
    const r = resolveExtensionFile('com.nuxy.clipboard', 'missing.js', tmpRoot)
    expect(r).toBeNull()
  })

  it('blocks ext-id with path traversal segments (../)', () => {
    const r = resolveExtensionFile('../../etc', 'passwd', tmpRoot)
    expect(r).toBeNull()
  })

  it('blocks ext-id with null bytes', () => {
    const r = resolveExtensionFile('com.nuxy\x00evil', 'frontend.js', tmpRoot)
    expect(r).toBeNull()
  })
})

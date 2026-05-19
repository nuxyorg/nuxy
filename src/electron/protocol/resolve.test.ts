import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { resolveExtensionFile } from './resolve.js'
import { registerExtension, clearRegistry } from '../extensions/registry.js'
import type { LoadedExtension } from '@nuxy/core'

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
        entry: { frontend: 'frontend.js' }
      }
    }
    registerExtension(ext)
  })

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
    clearRegistry()
  })

  it('resolves by manifest id', () => {
    const r = resolveExtensionFile(
      'com.nuxy.clipboard',
      'frontend.js',
      tmpRoot
    )
    expect(r).not.toBeNull()
    expect(r!.extensionId).toBe('com.nuxy.clipboard')
    expect(r!.absolutePath).toBe(
      path.join(tmpRoot, 'clipboard', 'frontend.js')
    )
  })

  it('resolves by folder name', () => {
    const r = resolveExtensionFile('clipboard', 'frontend.js', tmpRoot)
    expect(r).not.toBeNull()
    expect(r!.folderName).toBe('clipboard')
  })

  it('blocks path traversal', () => {
    const r = resolveExtensionFile(
      'com.nuxy.clipboard',
      '../../../etc/passwd',
      tmpRoot
    )
    expect(r).toBeNull()
  })

  it('returns null for missing file', () => {
    const r = resolveExtensionFile(
      'com.nuxy.clipboard',
      'missing.js',
      tmpRoot
    )
    expect(r).toBeNull()
  })
})

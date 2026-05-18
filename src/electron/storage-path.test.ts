import { describe, it, expect } from 'vitest'
import path from 'path'
import { resolveStoragePath } from './storage-path.js'

describe('resolveStoragePath', () => {
  const dataDir = '/home/user/.nuxy/data/com.nuxy.test'

  it('resolves a normal file inside the data dir', () => {
    const resolved = resolveStoragePath(dataDir, 'history.json')
    expect(resolved).toBe(path.resolve(dataDir, 'history.json'))
  })

  it('blocks parent traversal', () => {
    expect(() => resolveStoragePath(dataDir, '../other/secret.json')).toThrow(
      /Path traversal/
    )
  })

  it('blocks absolute paths outside the jail', () => {
    expect(() => resolveStoragePath(dataDir, '/etc/passwd')).toThrow(
      /Path traversal/
    )
  })
})

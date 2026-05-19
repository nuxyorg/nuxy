import { describe, it, expect } from 'vitest'
import path from 'path'
import { bundledExtensionsDir } from './seed-bundled.js'

describe('seed-bundled', () => {
  it('returns null when resourcesPath has no extensions', () => {
    const prev = process.resourcesPath
    process.resourcesPath = path.join('/tmp', 'nuxy-test-no-extensions')
    expect(bundledExtensionsDir()).toBeNull()
    process.resourcesPath = prev
  })
})

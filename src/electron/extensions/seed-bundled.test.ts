import { describe, it, expect } from 'vitest'
import path from 'path'
import { bundledExtensionsDir } from './seed-bundled.js'

describe('seed-bundled', () => {
  it('returns null when resourcesPath has no extensions', () => {
    const prev = process.resourcesPath
    Object.defineProperty(process, 'resourcesPath', {
      value: path.join('/tmp', 'nuxy-test-no-extensions'),
      writable: true,
      configurable: true
    })
    expect(bundledExtensionsDir()).toBeNull()
    Object.defineProperty(process, 'resourcesPath', {
      value: prev,
      writable: true,
      configurable: true
    })
  })
})

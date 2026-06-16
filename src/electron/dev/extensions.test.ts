import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { findWorkspaceExtensionsDir, shouldSyncPath } from './extensions.js'

describe('findWorkspaceExtensionsDir', () => {
  it('finds repo extensions/ from electron/dev', () => {
    const devDir = fileURLToPath(new URL('.', import.meta.url))
    const found = findWorkspaceExtensionsDir(devDir)
    expect(found).toBeTruthy()
    expect(found).toBe(path.resolve(devDir, '../../../extensions'))
    expect(path.basename(found!)).toBe('extensions')
  })
})

describe('shouldSyncPath', () => {
  it('excludes node_modules (pnpm workspace symlinks)', () => {
    expect(shouldSyncPath('/repo/extensions/calculator/node_modules/@nuxyorg/extension-sdk')).toBe(
      false
    )
  })

  it('includes extension source files', () => {
    expect(shouldSyncPath('/repo/extensions/calculator/backend.js')).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { findWorkspaceExtensionsDir } from './extensions.js'

describe('findWorkspaceExtensionsDir', () => {
  it('finds repo extensions/ from electron/dev', () => {
    const devDir = fileURLToPath(new URL('.', import.meta.url))
    const found = findWorkspaceExtensionsDir(devDir)
    expect(found).toBeTruthy()
    expect(found).toBe(
      path.resolve(devDir, '../../../extensions')
    )
    expect(path.basename(found!)).toBe('extensions')
  })
})

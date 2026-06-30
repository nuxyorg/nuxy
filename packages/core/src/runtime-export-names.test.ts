import { describe, it, expect } from 'vitest'
import { listNuxyCoreRuntimeExportNames } from './runtime-export-names.js'

describe('listNuxyCoreRuntimeExportNames', () => {
  it('includes common renderer exports', () => {
    const names = listNuxyCoreRuntimeExportNames()
    expect(names).toContain('logCaughtError')
    expect(names).toContain('LitElement')
    expect(names).toContain('safeHTML')
    expect(names).toContain('safeSVG')
  })

  it('excludes unsafe lit directives', () => {
    const names = listNuxyCoreRuntimeExportNames()
    expect(names).not.toContain('unsafeHTML')
    expect(names).not.toContain('unsafeSVG')
  })
})

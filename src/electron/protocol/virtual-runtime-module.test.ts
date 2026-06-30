import { describe, it, expect } from 'vitest'
import { listNuxyCoreRuntimeExportNames } from '@nuxyorg/core/runtime-export-names'
import { listNuxySdkRuntimeExportNames } from '@nuxyorg/extension-sdk/runtime-export-names'
import { buildRuntimeVirtualModule } from './virtual-runtime-module.js'

describe('buildRuntimeVirtualModule', () => {
  it('re-exports every listed @nuxyorg/core runtime symbol', () => {
    const names = listNuxyCoreRuntimeExportNames()
    const script = buildRuntimeVirtualModule('NuxyCore', names)
    for (const name of names) {
      expect(script).toContain(name)
    }
    expect(script).toContain('logCaughtError')
    expect(script).toContain('LitElement')
    expect(script).not.toContain('unsafeHTML')
    expect(script).not.toContain('unsafeSVG')
  })

  it('re-exports every listed @nuxyorg/extension-sdk runtime symbol', () => {
    const names = listNuxySdkRuntimeExportNames()
    const script = buildRuntimeVirtualModule('NuxySdk', names)
    for (const name of names) {
      expect(script).toContain(name)
    }
    expect(script).toContain('invokeExtensionIpc')
  })

  it('binds to the window global at runtime', () => {
    const script = buildRuntimeVirtualModule('NuxyCore', ['sampleExport'])
    expect(script).toContain('const NuxyCore = window.NuxyCore || {}')
    expect(script).toContain('sampleExport')
  })
})

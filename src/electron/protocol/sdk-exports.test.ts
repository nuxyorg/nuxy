import { describe, it, expect } from 'vitest'
import { listNuxySdkRuntimeExportNames } from '@nuxyorg/extension-sdk/runtime-export-names'
import { buildRuntimeVirtualModule } from './virtual-runtime-module.js'

describe('nuxy-ext sdk virtual module exports', () => {
  it('re-exports invokeExtensionIpc for extension frontend IPC helpers', () => {
    const script = buildRuntimeVirtualModule('NuxySdk', listNuxySdkRuntimeExportNames())
    expect(script).toContain('invokeExtensionIpc')
  })
})

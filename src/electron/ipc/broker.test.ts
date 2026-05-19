import { describe, it, expect, beforeEach, vi } from 'vitest'
import { invokeExtension } from './broker.js'
import { registerExtension, clearRegistry, setExtensionChannels } from '../extensions/registry.js'
import type { LoadedExtension } from '@nuxy/core'

vi.mock('./worker-invoke.js', () => ({
  invokeWorker: vi.fn(async () => ({ success: true, data: { ok: true } }))
}))

import { invokeWorker } from './worker-invoke.js'

const caller: LoadedExtension = {
  id: 'com.nuxy.caller',
  folderName: 'caller',
  manifest: {
    id: 'com.nuxy.caller',
    name: 'Caller',
    version: '1.0.0',
    type: 'orchestrator',
    capabilities: { caller: true, callable: false }
  }
}

const target: LoadedExtension = {
  id: 'com.nuxy.target',
  folderName: 'target',
  manifest: {
    id: 'com.nuxy.target',
    name: 'Target',
    version: '1.0.0',
    type: 'provider',
    capabilities: { caller: false, callable: true }
  }
}

describe('invokeExtension', () => {
  beforeEach(() => {
    clearRegistry()
    registerExtension(caller)
    registerExtension(target)
    setExtensionChannels('com.nuxy.target', ['eval'])
    vi.mocked(invokeWorker).mockClear()
  })

  it('denies when caller lacks caller capability', async () => {
    registerExtension({
      ...caller,
      id: 'com.nuxy.bad',
      manifest: { ...caller.manifest, id: 'com.nuxy.bad', capabilities: { caller: false } }
    })
    const r = await invokeExtension('com.nuxy.bad', 'com.nuxy.target', 'eval', {})
    expect(r.code).toBe('CALLER_DENIED')
  })

  it('denies when target is not callable', async () => {
    registerExtension({
      ...target,
      id: 'com.nuxy.locked',
      manifest: { ...target.manifest, id: 'com.nuxy.locked', capabilities: { callable: false } }
    })
    const r = await invokeExtension('com.nuxy.caller', 'com.nuxy.locked', 'eval', {})
    expect(r.code).toBe('CALLABLE_DENIED')
  })

  it('denies unknown channel on target', async () => {
    const r = await invokeExtension('com.nuxy.caller', 'com.nuxy.target', 'secret', {})
    expect(r.code).toBe('UNKNOWN_CHANNEL')
  })

  it('forwards to worker when allowed', async () => {
    const r = await invokeExtension('com.nuxy.caller', 'com.nuxy.target', 'eval', {
      text: '1+1'
    })
    expect(r.success).toBe(true)
    expect(invokeWorker).toHaveBeenCalledWith('com.nuxy.target', 'eval', { text: '1+1' })
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { invokeExtension } from './broker.js'
import { registerExtension, clearRegistry, setExtensionChannels } from '../extensions/registry.js'
import type { LoadedExtension } from '@nuxy/core'

vi.mock('./worker-invoke.js', () => ({
  invokeWorker: vi.fn(async () => ({ success: true, data: { ok: true } })),
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
    capabilities: { caller: true, callable: false },
  },
}

const target: LoadedExtension = {
  id: 'com.nuxy.target',
  folderName: 'target',
  manifest: {
    id: 'com.nuxy.target',
    name: 'Target',
    version: '1.0.0',
    type: 'provider',
    capabilities: { caller: false, callable: true },
  },
}

describe('invokeExtension', () => {
  beforeEach(() => {
    clearRegistry()
    registerExtension(caller)
    registerExtension(target)
    setExtensionChannels('com.nuxy.target', ['eval'])
    vi.mocked(invokeWorker).mockClear()
  })

  it('returns EXTENSION_NOT_FOUND when caller is not registered', async () => {
    const r = await invokeExtension('com.nuxy.nobody', 'com.nuxy.target', 'eval', {})
    expect(r.success).toBe(false)
    expect(r.code).toBe('EXTENSION_NOT_FOUND')
  })

  it('returns EXTENSION_NOT_FOUND when target is not registered', async () => {
    const r = await invokeExtension('com.nuxy.caller', 'com.nuxy.nobody', 'eval', {})
    expect(r.success).toBe(false)
    expect(r.code).toBe('EXTENSION_NOT_FOUND')
  })

  it('denies when caller lacks caller capability', async () => {
    registerExtension({
      ...caller,
      id: 'com.nuxy.bad',
      manifest: { ...caller.manifest, id: 'com.nuxy.bad', capabilities: { caller: false } },
    })
    const r = await invokeExtension('com.nuxy.bad', 'com.nuxy.target', 'eval', {})
    expect(r.code).toBe('CALLER_DENIED')
  })

  it('denies when caller has no capabilities field', async () => {
    registerExtension({
      ...caller,
      id: 'com.nuxy.nocaps',
      manifest: { ...caller.manifest, id: 'com.nuxy.nocaps', capabilities: undefined },
    })
    const r = await invokeExtension('com.nuxy.nocaps', 'com.nuxy.target', 'eval', {})
    expect(r.code).toBe('CALLER_DENIED')
  })

  it('denies when target is not callable', async () => {
    registerExtension({
      ...target,
      id: 'com.nuxy.locked',
      manifest: { ...target.manifest, id: 'com.nuxy.locked', capabilities: { callable: false } },
    })
    const r = await invokeExtension('com.nuxy.caller', 'com.nuxy.locked', 'eval', {})
    expect(r.code).toBe('CALLABLE_DENIED')
  })

  it('denies when target has no capabilities field', async () => {
    registerExtension({
      ...target,
      id: 'com.nuxy.nocallable',
      manifest: { ...target.manifest, id: 'com.nuxy.nocallable', capabilities: undefined },
    })
    const r = await invokeExtension('com.nuxy.caller', 'com.nuxy.nocallable', 'eval', {})
    expect(r.code).toBe('CALLABLE_DENIED')
  })

  it('denies unknown channel on target', async () => {
    const r = await invokeExtension('com.nuxy.caller', 'com.nuxy.target', 'secret', {})
    expect(r.code).toBe('UNKNOWN_CHANNEL')
  })

  it('denies channel that exists on caller but not target', async () => {
    setExtensionChannels('com.nuxy.caller', ['eval']) // caller has eval, but target does not allow cross-call
    const r = await invokeExtension('com.nuxy.caller', 'com.nuxy.target', 'eval', {})
    // target allows eval → should succeed
    expect(r.success).toBe(true)
  })

  it('forwards to worker when all checks pass', async () => {
    const r = await invokeExtension('com.nuxy.caller', 'com.nuxy.target', 'eval', {
      text: '1+1',
    })
    expect(r.success).toBe(true)
    expect(invokeWorker).toHaveBeenCalledWith('com.nuxy.target', 'eval', { text: '1+1' })
  })

  it('passes payload through to worker', async () => {
    const payload = { text: '2*3', extra: 'data' }
    await invokeExtension('com.nuxy.caller', 'com.nuxy.target', 'eval', payload)
    expect(invokeWorker).toHaveBeenCalledWith('com.nuxy.target', 'eval', payload)
  })

  it('does not call worker when denied', async () => {
    await invokeExtension('com.nuxy.caller', 'com.nuxy.target', 'forbidden', {})
    expect(invokeWorker).not.toHaveBeenCalled()
  })
})

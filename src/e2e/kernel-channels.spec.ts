import { test, expect } from '@playwright/test'
import {
  validateExtInvokeArgs,
  validateWindowResize
} from '../electron/ipc/validate.js'
import {
  clearRegistry,
  registerExtension,
  setExtensionChannels
} from '../electron/extensions/registry.js'
import type { LoadedExtension } from '@nuxy/core'

const sample: LoadedExtension = {
  id: 'com.nuxy.e2e',
  folderName: 'e2e',
  manifest: {
    id: 'com.nuxy.e2e',
    name: 'E2E',
    version: '1.0.0',
    type: 'provider'
  }
}

test.describe('kernel IPC validation (unit-style e2e)', () => {
  test.beforeEach(() => {
    clearRegistry()
    registerExtension(sample)
    setExtensionChannels('com.nuxy.e2e', ['eval'])
  })

  test('listOrchestrators kernel channel is allowed', () => {
    const r = validateExtInvokeArgs('kernel', 'listOrchestrators', {})
    expect(r.ok).toBe(true)
  })

  test('provider eval channel requires allowlist', () => {
    const ok = validateExtInvokeArgs('com.nuxy.e2e', 'eval', { text: '1+1' })
    expect(ok.ok).toBe(true)
    const bad = validateExtInvokeArgs('com.nuxy.e2e', 'nope', {})
    expect(bad.ok).toBe(false)
  })

  test('window resize accepts finite dimensions', () => {
    const r = validateWindowResize(400, 200)
    expect(r.ok).toBe(true)
  })
})

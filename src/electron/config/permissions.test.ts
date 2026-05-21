import { describe, it, expect } from 'vitest'
import { assertHostPermission, effectivePermissions } from './permissions.js'
import { HostChannel } from '@nuxy/core'
import type { ExtensionManifest } from '@nuxy/core'

const base: ExtensionManifest = {
  id: 'com.nuxy.test',
  name: 'Test',
  version: '1.0.0',
  type: 'tool',
}

describe('effectivePermissions', () => {
  it('defaults to storage only', () => {
    expect(effectivePermissions(base)).toEqual(['storage'])
  })

  it('uses manifest permissions when set', () => {
    expect(
      effectivePermissions({
        ...base,
        permissions: ['clipboard', 'storage'],
      })
    ).toEqual(['clipboard', 'storage'])
  })
})

describe('assertHostPermission', () => {
  it('allows clipboard when permitted', () => {
    expect(
      assertHostPermission(
        { ...base, permissions: ['clipboard', 'storage'] },
        HostChannel.CLIPBOARD_READ
      )
    ).toBeNull()
  })

  it('denies clipboard without permission', () => {
    const r = assertHostPermission(base, HostChannel.CLIPBOARD_READ)
    expect(r?.code).toBe('PERMISSION_DENIED')
  })

  it('allows storage by default', () => {
    expect(assertHostPermission(base, HostChannel.STORAGE_READ)).toBeNull()
  })
})

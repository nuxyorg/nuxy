import { describe, it, expect } from 'vitest'
import { resolveDeeplinkSectionId } from '../meta.ts'
import type { RenderSection } from '../types.ts'

function section(id: string): RenderSection {
  return { id, label: id, isExtension: true, resolvedRows: [] }
}

describe('resolveDeeplinkSectionId', () => {
  const sections = [section('general'), section('nyaa'), section('com.nuxy.clipboard')]

  it('resolves "extension/:extId" to the matching section id', () => {
    expect(resolveDeeplinkSectionId('extension/nyaa', sections)).toBe('nyaa')
  })

  it('resolves an extId containing dots', () => {
    expect(resolveDeeplinkSectionId('extension/com.nuxy.clipboard', sections)).toBe(
      'com.nuxy.clipboard'
    )
  })

  it('decodes percent-encoded extId segments', () => {
    const withEncoded = [...sections, section('weird id')]
    expect(resolveDeeplinkSectionId('extension/weird%20id', withEncoded)).toBe('weird id')
  })

  it('returns null when the extId has no matching section', () => {
    expect(resolveDeeplinkSectionId('extension/does-not-exist', sections)).toBeNull()
  })

  it('returns null for a path that is not "extension/:extId" shaped', () => {
    expect(resolveDeeplinkSectionId('general', sections)).toBeNull()
    expect(resolveDeeplinkSectionId('', sections)).toBeNull()
    expect(resolveDeeplinkSectionId('extension/nyaa/extra', sections)).toBeNull()
  })
})

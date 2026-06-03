import { describe, it, expect } from 'vitest'
import { filterExtensions, buildNavSections, permissionVariant, TABS } from './storeFilter.ts'
import type { ExtensionListItem } from '../types.ts'

const makeExt = (overrides: Partial<ExtensionListItem>): ExtensionListItem => ({
  id: 'com.test.ext',
  name: 'Test Extension',
  description: 'A test extension',
  version: '1.0.0',
  type: 'tool',
  author: 'Test Author',
  downloadUrl: 'https://example.com/ext.zip',
  permissions: [],
  installed: false,
  installedVersion: undefined,
  canUpdate: false,
  isSystem: false,
  ...overrides,
})

const TOOL = makeExt({ id: 'com.test.tool', name: 'My Tool', type: 'tool' })
const THEME = makeExt({ id: 'com.test.theme', name: 'Dark Theme', type: 'theme' })
const INSTALLED = makeExt({ id: 'com.test.installed', name: 'Installed Ext', type: 'tool', installed: true, installedVersion: '1.0.0' })
const UPDATABLE = makeExt({ id: 'com.test.update', name: 'Update Me', type: 'tool', installed: true, installedVersion: '0.9.0', canUpdate: true })

describe('filterExtensions', () => {
  const all = [TOOL, THEME, INSTALLED, UPDATABLE]

  it('returns all extensions for the "all" tab with no query', () => {
    expect(filterExtensions(all, 'all', '')).toHaveLength(4)
  })

  it('filters by type tab', () => {
    const result = filterExtensions(all, 'theme', '')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('com.test.theme')
  })

  it('filters to installed only', () => {
    const result = filterExtensions(all, 'installed', '')
    expect(result.every((e) => e.installed)).toBe(true)
  })

  it('filters to updatable only', () => {
    const result = filterExtensions(all, 'updates', '')
    expect(result.every((e) => e.canUpdate)).toBe(true)
    expect(result).toHaveLength(1)
  })

  it('applies search query by name', () => {
    const result = filterExtensions(all, 'all', 'my tool')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('com.test.tool')
  })

  it('applies search query by description', () => {
    const result = filterExtensions(all, 'all', 'test extension')
    expect(result).toHaveLength(4)
  })

  it('applies search query by author', () => {
    const result = filterExtensions(all, 'all', 'test author')
    expect(result).toHaveLength(4)
  })

  it('returns empty when query matches nothing', () => {
    const result = filterExtensions(all, 'all', 'zzznomatch')
    expect(result).toHaveLength(0)
  })

  it('combines tab and search query filters', () => {
    const result = filterExtensions(all, 'tool', 'my tool')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('com.test.tool')
  })
})

describe('buildNavSections', () => {
  const all = [TOOL, THEME, INSTALLED, UPDATABLE]

  it('returns one entry per TABS entry', () => {
    const sections = buildNavSections(all)
    expect(sections).toHaveLength(TABS.length)
  })

  it('counts all extensions in the "all" section', () => {
    const sections = buildNavSections(all)
    const allSection = sections.find((s) => s.id === 'all')!
    expect(allSection.itemCount).toBe(4)
  })

  it('counts correctly for installed tab', () => {
    const sections = buildNavSections(all)
    const installed = sections.find((s) => s.id === 'installed')!
    expect(installed.itemCount).toBe(2)
  })

  it('counts correctly for updates tab', () => {
    const sections = buildNavSections(all)
    const updates = sections.find((s) => s.id === 'updates')!
    expect(updates.itemCount).toBe(1)
  })
})

describe('permissionVariant', () => {
  it('returns danger for shell and fs', () => {
    expect(permissionVariant('shell')).toBe('danger')
    expect(permissionVariant('fs')).toBe('danger')
  })

  it('returns warning for network and clipboard', () => {
    expect(permissionVariant('network')).toBe('warning')
    expect(permissionVariant('clipboard')).toBe('warning')
  })

  it('returns success for storage and db', () => {
    expect(permissionVariant('storage')).toBe('success')
    expect(permissionVariant('db')).toBe('success')
  })

  it('returns default for unknown permissions', () => {
    expect(permissionVariant('media')).toBe('default')
    expect(permissionVariant('unknown')).toBe('default')
  })
})

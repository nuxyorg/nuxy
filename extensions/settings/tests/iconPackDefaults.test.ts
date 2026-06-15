import { describe, it, expect } from 'vitest'
import { buildIconPackOptions, resolveSingleIconPack } from '../utils/iconPackDefaults.ts'
import { DEFAULT_SETTINGS } from '../utils/settingsOptions.ts'

describe('buildIconPackOptions', () => {
  it('returns only the pack when a single pack is installed', () => {
    expect(buildIconPackOptions(['default-icons'])).toEqual([
      { value: 'default-icons', label: 'default-icons' },
    ])
  })

  it('includes an empty default option when multiple packs are installed', () => {
    expect(buildIconPackOptions(['a', 'b'])).toEqual([
      { value: '', label: '' },
      { value: 'a', label: 'a' },
      { value: 'b', label: 'b' },
    ])
  })
})

describe('resolveSingleIconPack', () => {
  it('selects the only pack when iconPack is empty', () => {
    const resolved = resolveSingleIconPack({ ...DEFAULT_SETTINGS, iconPack: '' }, ['default-icons'])
    expect(resolved).toEqual({ ...DEFAULT_SETTINGS, iconPack: 'default-icons' })
  })

  it('returns null when multiple packs are installed', () => {
    expect(resolveSingleIconPack(DEFAULT_SETTINGS, ['a', 'b'])).toBeNull()
  })

  it('returns null when the single pack is already selected', () => {
    expect(
      resolveSingleIconPack({ ...DEFAULT_SETTINGS, iconPack: 'default-icons' }, ['default-icons'])
    ).toBeNull()
  })
})

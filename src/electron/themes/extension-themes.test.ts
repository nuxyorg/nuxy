import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerExtensionTheme,
  getExtensionTheme,
  listExtensionThemeNames,
  clearExtensionThemes,
} from './extension-themes.js'
import type { ThemeDefinition } from '@nuxy/core'

const ocean: ThemeDefinition = {
  name: 'ocean',
  version: 1,
  colors: { bg: '#001122' },
  tokens: { radius: '8px' },
}

const forest: ThemeDefinition = {
  name: 'forest',
  version: 1,
  colors: { bg: '#001100' },
  tokens: {},
}

describe('registerExtensionTheme', () => {
  beforeEach(() => clearExtensionThemes())

  it('makes the theme retrievable by name', () => {
    registerExtensionTheme(ocean)
    expect(getExtensionTheme('ocean')).toBe(ocean)
  })

  it('registers multiple themes', () => {
    registerExtensionTheme(ocean)
    registerExtensionTheme(forest)
    expect(getExtensionTheme('ocean')).toBe(ocean)
    expect(getExtensionTheme('forest')).toBe(forest)
  })

  it('overwrites a theme registered with the same name', () => {
    registerExtensionTheme(ocean)
    const updated = { ...ocean, colors: { bg: '#ffffff' } }
    registerExtensionTheme(updated)
    expect(getExtensionTheme('ocean')?.colors?.bg).toBe('#ffffff')
  })
})

describe('getExtensionTheme', () => {
  beforeEach(() => clearExtensionThemes())

  it('returns undefined for unknown name', () => {
    expect(getExtensionTheme('nonexistent')).toBeUndefined()
  })

  it('returns undefined when registry is empty', () => {
    expect(getExtensionTheme('ocean')).toBeUndefined()
  })

  it('returns the registered theme object', () => {
    registerExtensionTheme(forest)
    expect(getExtensionTheme('forest')).toStrictEqual(forest)
  })
})

describe('listExtensionThemeNames', () => {
  beforeEach(() => clearExtensionThemes())

  it('returns empty array when no themes registered', () => {
    expect(listExtensionThemeNames()).toEqual([])
  })

  it('returns names of registered themes', () => {
    registerExtensionTheme(ocean)
    registerExtensionTheme(forest)
    const names = listExtensionThemeNames()
    expect(names).toContain('ocean')
    expect(names).toContain('forest')
    expect(names).toHaveLength(2)
  })
})

describe('clearExtensionThemes', () => {
  it('removes all registered themes', () => {
    registerExtensionTheme(ocean)
    clearExtensionThemes()
    expect(listExtensionThemeNames()).toEqual([])
    expect(getExtensionTheme('ocean')).toBeUndefined()
  })
})

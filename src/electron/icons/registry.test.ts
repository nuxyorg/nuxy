import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerIconPack,
  getIcon,
  listIconPacks,
  getDefaultPackName,
  clearIconRegistry,
} from './registry.js'

const samplePack = {
  name: 'test-icons',
  version: 1,
  icons: {
    search: '<svg>search</svg>',
    close: '<svg>close</svg>',
    star: '<svg>star</svg>',
  },
}

const altPack = {
  name: 'alt-icons',
  version: 1,
  icons: {
    search: '<svg>alt-search</svg>',
    home: '<svg>home</svg>',
  },
}

describe('registerIconPack', () => {
  beforeEach(() => clearIconRegistry())

  it('registers a pack and makes it retrievable', () => {
    registerIconPack(samplePack)
    expect(listIconPacks()).toContain('test-icons')
  })

  it('first registered pack becomes the default', () => {
    registerIconPack(samplePack)
    expect(getDefaultPackName()).toBe('test-icons')
  })

  it('explicit isDefault=true overrides the default', () => {
    registerIconPack(samplePack)
    registerIconPack(altPack, true)
    expect(getDefaultPackName()).toBe('alt-icons')
  })

  it('registers multiple packs', () => {
    registerIconPack(samplePack)
    registerIconPack(altPack)
    const packs = listIconPacks()
    expect(packs).toContain('test-icons')
    expect(packs).toContain('alt-icons')
  })
})

describe('getIcon', () => {
  beforeEach(() => {
    clearIconRegistry()
    registerIconPack(samplePack)
  })

  it('returns SVG string for a known icon', () => {
    expect(getIcon('search')).toBe('<svg>search</svg>')
  })

  it('returns null for unknown icon', () => {
    expect(getIcon('nonexistent')).toBeNull()
  })

  it('returns null when no packs are registered', () => {
    clearIconRegistry()
    expect(getIcon('search')).toBeNull()
  })

  it('uses the specified pack when packName is given', () => {
    registerIconPack(altPack)
    expect(getIcon('search', 'alt-icons')).toBe('<svg>alt-search</svg>')
    expect(getIcon('search', 'test-icons')).toBe('<svg>search</svg>')
  })

  it('falls back to default pack when no packName given', () => {
    registerIconPack(altPack, true)
    expect(getIcon('search')).toBe('<svg>alt-search</svg>')
  })

  it('returns null for unknown pack name', () => {
    expect(getIcon('search', 'does-not-exist')).toBeNull()
  })
})

describe('listIconPacks', () => {
  beforeEach(() => clearIconRegistry())

  it('returns empty array when no packs registered', () => {
    expect(listIconPacks()).toEqual([])
  })

  it('returns pack names in insertion order', () => {
    registerIconPack(samplePack)
    registerIconPack(altPack)
    expect(listIconPacks()).toEqual(['test-icons', 'alt-icons'])
  })
})

describe('clearIconRegistry', () => {
  it('removes all packs and clears default', () => {
    registerIconPack(samplePack)
    clearIconRegistry()
    expect(listIconPacks()).toEqual([])
    expect(getDefaultPackName()).toBeUndefined()
    expect(getIcon('search')).toBeNull()
  })
})

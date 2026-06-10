import { describe, it, expect } from 'vitest'
import {
  buildFontFamilyMap,
  buildFontOptions,
  getRowCurrentValue,
  FONT_OPTIONS_STATIC,
  DEFAULT_SETTINGS,
  BOOL_OPTIONS,
  ZOOM_OPTIONS,
} from '../utils/settingsOptions.ts'
import type { AnyRow, NuxySettings } from '../types.ts'

describe('buildFontFamilyMap', () => {
  it('includes static entries for system and monospace', () => {
    const map = buildFontFamilyMap([])
    expect(map.system).toContain('-apple-system')
    expect(map.monospace).toBe('monospace')
  })

  it('adds system fonts with quoted family names', () => {
    const map = buildFontFamilyMap(['Inter', 'Roboto'])
    expect(map['Inter']).toBe("'Inter', sans-serif")
    expect(map['Roboto']).toBe("'Roboto', sans-serif")
  })

  it('does not mutate when called with empty array', () => {
    const map = buildFontFamilyMap([])
    expect(Object.keys(map)).toEqual(['system', 'monospace'])
  })
})

describe('buildFontOptions', () => {
  it('starts with static options', () => {
    const opts = buildFontOptions([])
    expect(opts).toEqual(FONT_OPTIONS_STATIC)
  })

  it('appends system fonts as options', () => {
    const opts = buildFontOptions(['Inter', 'Roboto'])
    expect(opts.length).toBe(FONT_OPTIONS_STATIC.length + 2)
    expect(opts[2]).toEqual({ value: 'Inter', label: 'Inter' })
    expect(opts[3]).toEqual({ value: 'Roboto', label: 'Roboto' })
  })
})

describe('getRowCurrentValue', () => {
  const settings: NuxySettings = {
    ...DEFAULT_SETTINGS,
    theme: 'ocean',
    preferredLanguages: ['en', 'fr'],
  }
  const extValues: Record<string, Record<string, unknown>> = {
    'com.nuxy.calculator': { precision: 4 },
  }
  const installed = [
    { id: 'com.nuxy.calculator', manifest: { name: 'Calculator', type: 'tool' }, disabled: false },
    { id: 'com.nuxy.notes', manifest: { name: 'Notes', type: 'tool' }, disabled: true },
  ]

  it('returns settings value for a base row', () => {
    const row: AnyRow = { key: 'theme', label: 'Theme', options: [], isExtension: false } as any
    expect(getRowCurrentValue(row, settings, extValues, installed)).toBe('ocean')
  })

  it('returns empty string for a language slot (managed externally)', () => {
    const row: AnyRow = {
      key: 'lang:0',
      label: 'First',
      options: [],
      isExtension: false,
      isLanguage: true,
      searchable: true,
    }
    expect(getRowCurrentValue(row, settings, extValues, installed)).toBe('')
  })

  it('returns empty string for an out-of-range language slot', () => {
    const row: AnyRow = {
      key: 'lang:5',
      label: 'Sixth',
      options: [],
      isExtension: false,
      isLanguage: true,
      searchable: true,
    }
    expect(getRowCurrentValue(row, settings, extValues, installed)).toBe('')
  })

  it('returns enabled=true for a non-disabled ext toggle row', () => {
    const row: AnyRow = {
      key: 'ext-toggle:com.nuxy.calculator',
      label: 'Calculator',
      options: BOOL_OPTIONS,
      isExtension: false,
      isExtToggle: true,
      extId: 'com.nuxy.calculator',
    }
    expect(getRowCurrentValue(row, settings, extValues, installed)).toBe(true)
  })

  it('returns enabled=false for a disabled ext toggle row', () => {
    const row: AnyRow = {
      key: 'ext-toggle:com.nuxy.notes',
      label: 'Notes',
      options: BOOL_OPTIONS,
      isExtension: false,
      isExtToggle: true,
      extId: 'com.nuxy.notes',
    }
    expect(getRowCurrentValue(row, settings, extValues, installed)).toBe(false)
  })

  it('returns ext value for an extension row', () => {
    const row: AnyRow = {
      key: 'com.nuxy.calculator:precision',
      label: 'Precision',
      options: [],
      isExtension: true,
      extId: 'com.nuxy.calculator',
      fieldKey: 'precision',
      type: 'select',
    }
    expect(getRowCurrentValue(row, settings, extValues, installed)).toBe(4)
  })

  it('returns default for an extension row with no saved value', () => {
    const row: AnyRow = {
      key: 'com.nuxy.calculator:mode',
      label: 'Mode',
      options: [],
      isExtension: true,
      extId: 'com.nuxy.calculator',
      fieldKey: 'mode',
      type: 'select',
      default: 'basic',
    }
    expect(getRowCurrentValue(row, settings, extValues, installed)).toBe('basic')
  })
})

describe('ZOOM_OPTIONS', () => {
  it('contains 100% entry', () => {
    expect(ZOOM_OPTIONS.some((o) => o.value === '100%')).toBe(true)
  })
})

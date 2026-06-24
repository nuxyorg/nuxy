/* cspell:ignore angrysearch */
import { describe, it, expect } from 'vitest'
import { computeSettingsMeta, type ComputeSettingsMetaParams } from '../meta.ts'

const t = (key: string) => key

function baseParams(overrides: Partial<ComputeSettingsMetaParams> = {}): ComputeSettingsMetaParams {
  return {
    themes: [],
    iconPacks: [],
    systemFonts: [],
    extSchemas: [],
    installedExtensions: [],
    ollamaModelOptions: [],
    preferredLanguages: [],
    extValues: {},
    t,
    ...overrides,
  }
}

describe('computeSettingsMeta — type: "list" fields', () => {
  const extSchemas = [
    {
      extId: 'com.nuxy.angrysearch',
      name: 'ANGRYsearch',
      schema: {
        fields: [
          {
            key: 'ignoredRoots',
            label: 'Ignored Directories',
            type: 'list',
            placeholder: '/proc',
          },
        ],
      },
    },
  ]

  it('emits one add row and no remove rows when the list is empty', () => {
    const meta = computeSettingsMeta(baseParams({ extSchemas }))
    const section = meta.extSections.find((s) => s.id === 'com.nuxy.angrysearch')!
    expect(section.resolvedRows).toHaveLength(1)
    const [addRow] = section.resolvedRows
    expect(addRow).toMatchObject({
      isExtListAdd: true,
      extId: 'com.nuxy.angrysearch',
      fieldKey: 'ignoredRoots',
    })
  })

  it('emits a remove row per saved item, reading from the new array shape', () => {
    const meta = computeSettingsMeta(
      baseParams({
        extSchemas,
        extValues: { 'com.nuxy.angrysearch': { ignoredRoots: ['/proc', '/dev'] } },
      })
    )
    const section = meta.extSections.find((s) => s.id === 'com.nuxy.angrysearch')!
    expect(section.resolvedRows).toHaveLength(3)
    const removeRows = section.resolvedRows.slice(1)
    expect(removeRows.every((r) => 'isExtListRemove' in r && r.isExtListRemove)).toBe(true)
    expect(removeRows.map((r) => (r as { itemValue: string }).itemValue)).toEqual(['/proc', '/dev'])
  })

  it('migrates a legacy comma-separated string value into remove rows', () => {
    const meta = computeSettingsMeta(
      baseParams({
        extSchemas,
        extValues: { 'com.nuxy.angrysearch': { ignoredRoots: '/proc,/dev,/sys' } },
      })
    )
    const section = meta.extSections.find((s) => s.id === 'com.nuxy.angrysearch')!
    const removeRows = section.resolvedRows.slice(1)
    expect(removeRows.map((r) => (r as { itemValue: string }).itemValue)).toEqual([
      '/proc',
      '/dev',
      '/sys',
    ])
  })

  it('includes list rows in allRows and sectionsToRender', () => {
    const meta = computeSettingsMeta(
      baseParams({
        extSchemas,
        extValues: { 'com.nuxy.angrysearch': { ignoredRoots: ['/proc'] } },
      })
    )
    expect(meta.allRows.filter((r) => 'isExtListAdd' in r || 'isExtListRemove' in r)).toHaveLength(
      2
    )
    const renderSection = meta.sectionsToRender.find((s) => s.id === 'com.nuxy.angrysearch')!
    expect(renderSection.resolvedRows).toHaveLength(2)
  })
})

describe('computeSettingsMeta — type: "priority-list" fields', () => {
  const extSchemas = [
    {
      extId: 'com.nuxy.nyaa',
      name: 'Nyaa Search',
      schema: {
        fields: [
          {
            key: 'enterActionPriority',
            label: 'Enter Key Action Priority',
            type: 'priority-list',
            options: [
              { value: 'torrentClient', label: 'Add via qBittorrent' },
              { value: 'copyMagnet', label: 'Copy Magnet Link' },
            ],
          },
        ],
      },
    },
  ]

  it('emits a single extension row for the priority list field', () => {
    const meta = computeSettingsMeta(baseParams({ extSchemas }))
    const section = meta.extSections.find((s) => s.id === 'com.nuxy.nyaa')!
    expect(section.resolvedRows).toHaveLength(1)
    expect(section.resolvedRows[0]).toMatchObject({
      isExtension: true,
      type: 'priority-list',
      fieldKey: 'enterActionPriority',
      options: [
        { value: 'torrentClient', label: 'Add via qBittorrent' },
        { value: 'copyMagnet', label: 'Copy Magnet Link' },
      ],
    })
  })
})

describe('computeSettingsMeta — conditional fields via showIf', () => {
  const extSchemas = [
    {
      extId: 'com.nuxy.qbittorrent',
      name: 'qBittorrent',
      schema: {
        fields: [
          {
            key: 'authMethod',
            label: 'Login Method',
            type: 'select',
            default: 'credentials',
            options: [
              { value: 'credentials', label: 'Username & Password' },
              { value: 'apikey', label: 'API Key' },
            ],
          },
          {
            key: 'username',
            label: 'Username',
            type: 'text',
            showIf: { key: 'authMethod', equals: 'credentials' },
          },
          {
            key: 'apiKey',
            label: 'API Key',
            type: 'text',
            showIf: { key: 'authMethod', equals: 'apikey' },
          },
        ],
      },
    },
  ]

  it('renders only the field matching the default value of the controlling field', () => {
    const meta = computeSettingsMeta(baseParams({ extSchemas }))
    const section = meta.extSections.find((s) => s.id === 'com.nuxy.qbittorrent')!
    const keys = section.resolvedRows.map((r) => (r as { fieldKey: string }).fieldKey)
    expect(keys).toEqual(['authMethod', 'username'])
  })

  it('switches the rendered field when the controlling value changes', () => {
    const meta = computeSettingsMeta(
      baseParams({
        extSchemas,
        extValues: { 'com.nuxy.qbittorrent': { authMethod: 'apikey' } },
      })
    )
    const section = meta.extSections.find((s) => s.id === 'com.nuxy.qbittorrent')!
    const keys = section.resolvedRows.map((r) => (r as { fieldKey: string }).fieldKey)
    expect(keys).toEqual(['authMethod', 'apiKey'])
  })
})

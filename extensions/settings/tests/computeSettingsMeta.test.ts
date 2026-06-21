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

import { describe, it, expect } from 'vitest'
import { filterSettingsByQuery, type SettingsMeta } from '../meta.ts'
import type { AnyRow, RenderSection } from '../types.ts'

function makeMeta(sections: RenderSection[]): SettingsMeta {
  const allRows = sections.flatMap((s) => s.resolvedRows)
  const navSections = sections.map((s) => ({
    id: s.id,
    label: s.label,
    itemCount: s.resolvedRows.length,
  }))
  const sectionStartIndex: Record<string, number> = {}
  let offset = 0
  for (const s of navSections) {
    sectionStartIndex[s.id] = offset
    offset += s.itemCount
  }
  return {
    fontFamilyMap: {},
    fontOptions: [],
    allSections: [],
    extSections: [],
    extToggleRows: [],
    sectionsToRender: sections,
    allRows,
    navSections,
    sectionStartIndex,
  }
}

function row(label: string, key = label): AnyRow {
  return { key, label, options: [], isExtension: false as const }
}

describe('filterSettingsByQuery', () => {
  it('returns meta unchanged when query is empty', () => {
    const meta = makeMeta([
      { id: 'general', label: 'General', isExtension: false, resolvedRows: [row('Theme')] },
    ])
    expect(filterSettingsByQuery(meta, '')).toBe(meta)
    expect(filterSettingsByQuery(meta, '   ')).toBe(meta)
  })

  it('filters rows by label case-insensitively', () => {
    const meta = makeMeta([
      {
        id: 'general',
        label: 'General',
        isExtension: false,
        resolvedRows: [row('Theme'), row('Font')],
      },
      {
        id: 'window',
        label: 'Window',
        isExtension: false,
        resolvedRows: [row('Opacity')],
      },
    ])
    const filtered = filterSettingsByQuery(meta, 'the')
    expect(filtered.sectionsToRender).toHaveLength(1)
    expect(filtered.sectionsToRender[0]?.resolvedRows.map((r) => r.label)).toEqual(['Theme'])
    expect(filtered.allRows).toHaveLength(1)
  })

  it('drops sections with no matching rows', () => {
    const meta = makeMeta([
      {
        id: 'general',
        label: 'General',
        isExtension: false,
        resolvedRows: [row('Theme')],
      },
      {
        id: 'window',
        label: 'Window',
        isExtension: false,
        resolvedRows: [row('Opacity')],
      },
    ])
    const filtered = filterSettingsByQuery(meta, 'opacity')
    expect(filtered.sectionsToRender.map((s) => s.id)).toEqual(['window'])
    expect(filtered.navSections.map((s) => s.id)).toEqual(['window'])
    expect(filtered.sectionStartIndex.window).toBe(0)
  })
})

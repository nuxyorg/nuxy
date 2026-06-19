import { describe, it, expect } from 'vitest'
import { reconcileSelectedRowAfterMetaChange } from '../meta.ts'
import type { RenderSection } from '../types.ts'

function section(id: string, rowCount: number): RenderSection {
  return {
    id,
    label: id,
    resolvedRows: Array.from({ length: rowCount }, () => ({ key: `${id}-row`, label: 'row' })),
  } as RenderSection
}

describe('reconcileSelectedRowAfterMetaChange', () => {
  it('preserves first-row deeplink selection when sectionStartIndex shifts', () => {
    const prevMeta = {
      sectionsToRender: [section('com.nuxy.nyaa', 4)],
      sectionStartIndex: { 'com.nuxy.nyaa': 37 },
    }
    const nextMeta = {
      sectionsToRender: [section('com.nuxy.nyaa', 4)],
      sectionStartIndex: { 'com.nuxy.nyaa': 39 },
    }

    expect(reconcileSelectedRowAfterMetaChange('com.nuxy.nyaa', 37, prevMeta, nextMeta)).toBe(39)
  })

  it('preserves relative offset within the section', () => {
    const prevMeta = {
      sectionsToRender: [section('com.nuxy.nyaa', 4)],
      sectionStartIndex: { 'com.nuxy.nyaa': 37 },
    }
    const nextMeta = {
      sectionsToRender: [section('com.nuxy.nyaa', 4)],
      sectionStartIndex: { 'com.nuxy.nyaa': 39 },
    }

    expect(reconcileSelectedRowAfterMetaChange('com.nuxy.nyaa', 38, prevMeta, nextMeta)).toBe(40)
  })

  it('leaves selectedRow unchanged when still in bounds', () => {
    const meta = {
      sectionsToRender: [section('general', 7)],
      sectionStartIndex: { general: 0 },
    }

    expect(reconcileSelectedRowAfterMetaChange('general', 2, meta, meta)).toBe(2)
  })
})

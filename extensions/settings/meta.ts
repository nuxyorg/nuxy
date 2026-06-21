import type {
  SelectOption,
  SectionDef,
  ResolvedSection,
  NavSection,
  ExtSettingsInfo,
  ExtFieldDef,
  ExtSectionRow,
  ExtToggleRow,
  ExtListAddRow,
  ExtListRemoveRow,
  LanguageRow,
  LanguageRemoveRow,
  BaseRow,
  SectionRow,
  AnyRow,
  RenderSection,
} from './types.ts'
import type { InstalledExtension } from './data.ts'
import {
  BOOL_OPTIONS,
  SECTIONS,
  LANGUAGE_OPTIONS,
  buildFontFamilyMap,
  buildFontOptions,
} from './utils/settingsOptions.ts'
import { parseListFieldValue } from './utils/listField.ts'

const OLLAMA_EXT_ID = 'com.nuxy.ollama'

export interface SettingsMeta {
  fontFamilyMap: Record<string, string>
  fontOptions: SelectOption<string>[]
  allSections: ResolvedSection[]
  extSections: Array<{ id: string; label: string; resolvedRows: AnyRow[] }>
  extToggleRows: ExtToggleRow[]
  sectionsToRender: RenderSection[]
  allRows: AnyRow[]
  navSections: NavSection[]
  sectionStartIndex: Record<string, number>
}

export interface ComputeSettingsMetaParams {
  themes: SelectOption[]
  iconPacks: SelectOption[]
  systemFonts: string[]
  extSchemas: ExtSettingsInfo[]
  installedExtensions: InstalledExtension[]
  ollamaModelOptions: SelectOption[]
  preferredLanguages: string[]
  extValues: Record<string, Record<string, unknown>>
  t: (key: string) => string
}

export function computeSettingsMeta(params: ComputeSettingsMetaParams): SettingsMeta {
  const {
    themes,
    iconPacks,
    systemFonts,
    extSchemas,
    installedExtensions,
    ollamaModelOptions,
    preferredLanguages,
    extValues,
    t,
  } = params

  const fontFamilyMap = buildFontFamilyMap(systemFonts)
  const fontOptions = buildFontOptions(systemFonts)

  const allSections: ResolvedSection[] = SECTIONS.map((s: SectionDef) => ({
    ...s,
    label: t('nav.' + s.id),
    resolvedRows: s.rows(themes, iconPacks, fontOptions).map((r) => {
      const translatedOptions = r.options?.map((opt) => {
        let optLabel = opt.label
        if (r.key === 'escAction' || r.key === 'blurAction') {
          optLabel = t('escAction.' + opt.value)
        } else if (r.key === 'windowPosition') {
          const keyMap: Record<string, string> = {
            '1/2, 1/6': 'topCenter',
            '1/6, 1/2': 'leftCenter',
            '1/2, 1/2': 'screenCenterDefault',
            '5/6, 1/2': 'rightCenter',
            '1/2, 5/6': 'bottomCenter',
            '1/6, 1/6': 'topLeft',
            '5/6, 1/6': 'topRight',
            '1/6, 5/6': 'bottomLeft',
            '5/6, 5/6': 'bottomRight',
            '1/2, 1/3': 'upperCenter',
          }
          const k = keyMap[String(opt.value)]
          if (k) optLabel = t('windowPosition.' + k)
        } else if (r.key === 'backgroundBehavior') {
          optLabel = t('backgroundBehavior.' + opt.value)
        } else if (typeof opt.value === 'boolean') {
          optLabel = t('bool.' + (opt.value ? 'yes' : 'no'))
        } else if (r.key === 'font') {
          if (opt.value === 'system') optLabel = t('font.systemDefault')
          else if (opt.value === 'monospace') optLabel = t('font.monospace')
        } else if (r.key === 'fontWeight') {
          optLabel = t('fontWeight.' + opt.value)
        } else if (r.key === 'iconPack' && opt.value === '') {
          optLabel = t('iconPack.default')
        } else if (r.key === 'kbdScheme') {
          optLabel = t('kbdScheme.' + opt.value)
        } else if (r.key === 'holdMs') {
          optLabel = t('holdMs.' + opt.value)
        }
        return { ...opt, label: optLabel }
      })
      return {
        ...r,
        label: t(s.id + '.' + r.key),
        options: translatedOptions,
      }
    }),
  }))

  const extSections = extSchemas.map((info: ExtSettingsInfo) => {
    const resolvedRows: AnyRow[] = info.schema.fields.flatMap((field: ExtFieldDef): AnyRow[] => {
      if (field.type === 'list') {
        const items = parseListFieldValue(extValues[info.extId]?.[field.key])
        const addRow: ExtListAddRow = {
          key: `${info.extId}:${field.key}:add`,
          label: field.label,
          options: [],
          isExtension: false as const,
          isExtListAdd: true as const,
          extId: info.extId,
          fieldKey: field.key,
          placeholder: field.placeholder,
        }
        const removeRows: ExtListRemoveRow[] = items.map((item) => ({
          key: `${info.extId}:${field.key}:remove:${item}`,
          label: item,
          options: [],
          isExtension: false as const,
          isExtListRemove: true as const,
          extId: info.extId,
          fieldKey: field.key,
          itemValue: item,
        }))
        return [addRow, ...removeRows]
      }

      const selectKey = `${info.extId}:${field.key}`
      const selectOptions: SelectOption[] =
        field.type === 'toggle'
          ? BOOL_OPTIONS.map((opt) => ({
              ...opt,
              label: t('bool.' + (opt.value ? 'yes' : 'no')),
            }))
          : info.extId === OLLAMA_EXT_ID && field.key === 'model' && ollamaModelOptions.length > 0
            ? ollamaModelOptions
            : field.options || []
      const row: ExtSectionRow = {
        key: selectKey,
        label: field.label,
        options: selectOptions,
        isExtension: true as const,
        extId: info.extId,
        fieldKey: field.key,
        type: field.type,
        description: field.description,
        placeholder: field.placeholder,
        default: field.default,
      }
      return [row]
    })
    return { id: info.extId, label: info.name, resolvedRows }
  })

  const languageAddRow: LanguageRow = {
    key: 'lang:add',
    label: t('language.addLanguage'),
    options: LANGUAGE_OPTIONS,
    isExtension: false as const,
    isLanguage: true as const,
    searchable: true,
  }

  const languageRemoveRows: LanguageRemoveRow[] = preferredLanguages
    .filter(Boolean)
    .map((code) => ({
      key: `lang:remove:${code}`,
      label: LANGUAGE_OPTIONS.find((o) => o.value === code)?.label ?? code,
      options: [],
      isExtension: false as const,
      isLanguageRemove: true as const,
      langCode: code,
    }))

  const translatedBoolOptions = BOOL_OPTIONS.map((opt) => ({
    ...opt,
    label: t('bool.' + (opt.value ? 'yes' : 'no')),
  }))

  const extToggleRows: ExtToggleRow[] = installedExtensions
    .filter(
      (ext) =>
        !ext.manifest.bootstrap && ext.id !== 'com.nuxy.settings' && ext.manifest.type !== 'uikit'
    )
    .map((ext) => ({
      key: `ext-toggle:${ext.id}`,
      label: ext.manifest.name,
      options: translatedBoolOptions,
      isExtension: false as const,
      isExtToggle: true as const,
      extId: ext.id,
    }))

  const sectionsToRender: RenderSection[] = (() => {
    const base: RenderSection[] = allSections.map((s) => ({
      id: s.id,
      label: s.label,
      isExtension: false,
      resolvedRows: s.resolvedRows.map((r: SectionRow) => ({ ...r, isExtension: false as const })),
    }))
    const langSection: RenderSection = {
      id: 'language',
      label: t('nav.language'),
      isExtension: false,
      resolvedRows: [languageAddRow, ...languageRemoveRows],
    }
    const extToggleSection: RenderSection | null =
      extToggleRows.length > 0
        ? {
            id: 'extensions',
            label: t('nav.extensions'),
            isExtension: false,
            resolvedRows: extToggleRows,
          }
        : null
    const ext: RenderSection[] = extSections.map((s) => ({
      id: s.id,
      label: s.label,
      isExtension: true,
      resolvedRows: s.resolvedRows,
    }))
    return [...base, langSection, ...(extToggleSection ? [extToggleSection] : []), ...ext]
  })()

  const allRows: AnyRow[] = (() => {
    const base: BaseRow[] = allSections.flatMap((s) =>
      s.resolvedRows.map((r: SectionRow) => ({ ...r, isExtension: false as const }))
    )
    const ext: AnyRow[] = extSections.flatMap((s) => s.resolvedRows)
    return [...base, languageAddRow, ...languageRemoveRows, ...extToggleRows, ...ext]
  })()

  const navSections: NavSection[] = (() => {
    const base = allSections.map((s) => ({
      id: s.id,
      label: s.label,
      itemCount: s.resolvedRows.length,
    }))
    base.push({
      id: 'language',
      label: t('nav.language'),
      itemCount: 1 + languageRemoveRows.length,
    })
    if (extToggleRows.length > 0) {
      base.push({
        id: 'extensions',
        label: t('nav.extensions'),
        itemCount: extToggleRows.length,
      })
    }
    extSections.forEach((s) => {
      base.push({ id: s.id, label: s.label, itemCount: s.resolvedRows.length })
    })
    return base
  })()

  const sectionStartIndex: Record<string, number> = {}
  let offset = 0
  for (const s of navSections) {
    sectionStartIndex[s.id] = offset
    offset += s.itemCount
  }

  return {
    fontFamilyMap,
    fontOptions,
    allSections,
    extSections,
    extToggleRows,
    sectionsToRender,
    allRows,
    navSections,
    sectionStartIndex,
  }
}

function rowMatchesQuery(row: AnyRow, query: string): boolean {
  const needle = query.toLowerCase()
  if (row.label.toLowerCase().includes(needle)) return true
  if ('description' in row && row.description) {
    if (String(row.description).toLowerCase().includes(needle)) return true
  }
  return false
}

/** Filter visible settings rows/sections by omnibar query. Returns meta unchanged when query is blank. */
export function filterSettingsByQuery(meta: SettingsMeta, query: string): SettingsMeta {
  const trimmed = query.trim()
  if (!trimmed) return meta

  const sectionsToRender = meta.sectionsToRender
    .map((section) => ({
      ...section,
      resolvedRows: section.resolvedRows.filter((row) => rowMatchesQuery(row, trimmed)),
    }))
    .filter((section) => section.resolvedRows.length > 0)

  const allRows = sectionsToRender.flatMap((section) => section.resolvedRows)
  const navSections = sectionsToRender.map((section) => ({
    id: section.id,
    label: section.label,
    itemCount: section.resolvedRows.length,
  }))

  const sectionStartIndex: Record<string, number> = {}
  let offset = 0
  for (const section of navSections) {
    sectionStartIndex[section.id] = offset
    offset += section.itemCount
  }

  return {
    ...meta,
    sectionsToRender,
    allRows,
    navSections,
    sectionStartIndex,
  }
}

type SectionIndexMeta = Pick<SettingsMeta, 'sectionsToRender' | 'sectionStartIndex'>

/**
 * Keeps `selectedRow` aligned with `selectedSectionId` when async loads shift
 * `sectionStartIndex` (e.g. extension setting values arriving after a deeplink
 * panel selection). Preserves the row's offset within its section.
 */
export function reconcileSelectedRowAfterMetaChange(
  selectedSectionId: string | null,
  selectedRow: number,
  prevMeta: SectionIndexMeta | null,
  nextMeta: SectionIndexMeta
): number {
  if (!selectedSectionId || selectedRow < 0) return selectedRow

  const section = nextMeta.sectionsToRender.find((s) => s.id === selectedSectionId)
  const newStart = nextMeta.sectionStartIndex[selectedSectionId]
  if (!section || newStart === undefined) return selectedRow

  const newEnd = newStart + section.resolvedRows.length
  if (selectedRow >= newStart && selectedRow < newEnd) return selectedRow

  let relativeIndex = 0
  if (prevMeta) {
    const oldStart = prevMeta.sectionStartIndex[selectedSectionId]
    if (oldStart !== undefined && selectedRow >= oldStart) {
      const oldSection = prevMeta.sectionsToRender.find((s) => s.id === selectedSectionId)
      const oldLen = oldSection?.resolvedRows.length ?? 0
      relativeIndex = Math.min(selectedRow - oldStart, Math.max(0, oldLen - 1))
    }
  }

  const clampedRelative = Math.min(
    Math.max(0, relativeIndex),
    Math.max(0, section.resolvedRows.length - 1)
  )
  return newStart + clampedRelative
}

/**
 * Resolves the settings section id targeted by a `nuxy://settings/<path>`
 * deeplink path (e.g. "extension/nyaa" -> "nyaa"), validated against the
 * currently rendered sections. Returns `null` when the path doesn't match
 * the `extension/:extId` shape or the extId has no matching section.
 *
 * Extension panel section ids equal their manifest id 1:1 (see
 * `computeSettingsMeta`: extension sections are built with `id: info.extId`).
 */
export function resolveDeeplinkSectionId(
  path: string,
  sectionsToRender: RenderSection[]
): string | null {
  const match = /^extension\/([^/]+)$/.exec(path)
  if (!match) return null
  const extId = decodeURIComponent(match[1])
  return sectionsToRender.some((s) => s.id === extId) ? extId : null
}

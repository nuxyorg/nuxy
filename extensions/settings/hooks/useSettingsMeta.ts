const React = window.React

import type {
  SelectOption,
  SectionDef,
  ResolvedSection,
  NavSection,
  ExtSettingsInfo,
  ExtFieldDef,
  ExtSectionRow,
  ExtToggleRow,
  LanguageRow,
  BaseRow,
  SectionRow,
  AnyRow,
  RenderSection,
} from '../types.ts'
import type { InstalledExtension } from './useSettingsData.ts'
import {
  BOOL_OPTIONS,
  SECTIONS,
  LANGUAGE_OPTIONS,
  LANGUAGE_SLOT_LABELS,
  buildFontFamilyMap,
  buildFontOptions,
} from '../utils/settingsOptions.ts'

export interface SettingsMeta {
  fontFamilyMap: Record<string, string>
  fontOptions: SelectOption<string>[]
  allSections: ResolvedSection[]
  extSections: Array<{ id: string; label: string; resolvedRows: ExtSectionRow[] }>
  languageRows: LanguageRow[]
  extToggleRows: ExtToggleRow[]
  sectionsToRender: RenderSection[]
  allRows: AnyRow[]
  navSections: NavSection[]
}

interface Params {
  themes: SelectOption[]
  iconPacks: SelectOption[]
  systemFonts: string[]
  extSchemas: ExtSettingsInfo[]
  installedExtensions: InstalledExtension[]
}

export function useSettingsMeta({
  themes,
  iconPacks,
  systemFonts,
  extSchemas,
  installedExtensions,
}: Params): SettingsMeta {
  const fontFamilyMap = React.useMemo(() => buildFontFamilyMap(systemFonts), [systemFonts])
  const fontOptions = React.useMemo(() => buildFontOptions(systemFonts), [systemFonts])

  const allSections = React.useMemo<ResolvedSection[]>(
    () =>
      SECTIONS.map((s: SectionDef) => ({
        ...s,
        resolvedRows: s.rows(themes, iconPacks, fontOptions),
      })),
    [themes, iconPacks, fontOptions]
  )

  const extSections = React.useMemo<
    Array<{ id: string; label: string; resolvedRows: ExtSectionRow[] }>
  >(() => {
    return extSchemas.map((info: ExtSettingsInfo) => {
      const resolvedRows: ExtSectionRow[] = info.schema.fields.map((field: ExtFieldDef) => {
        const selectKey = `${info.extId}:${field.key}`
        const selectOptions: SelectOption[] =
          field.type === 'toggle' ? BOOL_OPTIONS : field.options || []
        return {
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
      })
      return { id: info.extId, label: info.name, resolvedRows }
    })
  }, [extSchemas])

  const languageRows = React.useMemo<LanguageRow[]>(
    () =>
      LANGUAGE_SLOT_LABELS.map((label, index) => ({
        key: `lang:${index}`,
        label,
        options: LANGUAGE_OPTIONS,
        isExtension: false as const,
        isLanguage: true as const,
        langIndex: index,
        searchable: true,
      })),
    []
  )

  const extToggleRows = React.useMemo<ExtToggleRow[]>(() => {
    return installedExtensions
      .filter((ext) => !ext.manifest.bootstrap && ext.id !== 'com.nuxy.settings')
      .map((ext) => ({
        key: `ext-toggle:${ext.id}`,
        label: ext.manifest.name,
        options: BOOL_OPTIONS,
        isExtension: false as const,
        isExtToggle: true as const,
        extId: ext.id,
      }))
  }, [installedExtensions])

  const sectionsToRender = React.useMemo<RenderSection[]>(() => {
    const base: RenderSection[] = allSections.map((s: ResolvedSection) => ({
      id: s.id,
      label: s.label,
      isExtension: false,
      resolvedRows: s.resolvedRows.map((r: SectionRow) => ({ ...r, isExtension: false as const })),
    }))
    const langSection: RenderSection = {
      id: 'language',
      label: 'Language',
      isExtension: false,
      resolvedRows: languageRows,
    }
    const extToggleSection: RenderSection | null =
      extToggleRows.length > 0
        ? { id: 'extensions', label: 'Extensions', isExtension: false, resolvedRows: extToggleRows }
        : null
    const ext: RenderSection[] = extSections.map((s) => ({
      id: s.id,
      label: s.label,
      isExtension: true,
      resolvedRows: s.resolvedRows,
    }))
    return [...base, langSection, ...(extToggleSection ? [extToggleSection] : []), ...ext]
  }, [allSections, extSections, languageRows, extToggleRows])

  const allRows = React.useMemo<AnyRow[]>(() => {
    const base: BaseRow[] = allSections.flatMap((s: ResolvedSection) =>
      s.resolvedRows.map((r: SectionRow) => ({ ...r, isExtension: false as const }))
    )
    const ext: ExtSectionRow[] = extSections.flatMap((s) => s.resolvedRows)
    return [...base, ...languageRows, ...extToggleRows, ...ext]
  }, [allSections, extSections, languageRows, extToggleRows])

  const navSections = React.useMemo<NavSection[]>(() => {
    const base = allSections.map((s: ResolvedSection) => ({
      id: s.id,
      label: s.label,
      itemCount: s.resolvedRows.length,
    }))
    base.push({ id: 'language', label: 'Language', itemCount: languageRows.length })
    if (extToggleRows.length > 0) {
      base.push({ id: 'extensions', label: 'Extensions', itemCount: extToggleRows.length })
    }
    extSections.forEach((s) => {
      base.push({ id: s.id, label: s.label, itemCount: s.resolvedRows.length })
    })
    return base
  }, [allSections, extSections, languageRows, extToggleRows])

  return {
    fontFamilyMap,
    fontOptions,
    allSections,
    extSections,
    languageRows,
    extToggleRows,
    sectionsToRender,
    allRows,
    navSections,
  }
}

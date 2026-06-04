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
  LanguageRemoveRow,
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
  LANGUAGE_ADD_LABEL,
  buildFontFamilyMap,
  buildFontOptions,
} from '../utils/settingsOptions.ts'

const OLLAMA_EXT_ID = 'com.nuxy.ollama'

export interface SettingsMeta {
  fontFamilyMap: Record<string, string>
  fontOptions: SelectOption<string>[]
  allSections: ResolvedSection[]
  extSections: Array<{ id: string; label: string; resolvedRows: ExtSectionRow[] }>
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
  ollamaModelOptions: SelectOption[]
  preferredLanguages: string[]
  t: (key: string) => string
}

export function useSettingsMeta({
  themes,
  iconPacks,
  systemFonts,
  extSchemas,
  installedExtensions,
  ollamaModelOptions,
  preferredLanguages,
  t,
}: Params): SettingsMeta {
  const fontFamilyMap = React.useMemo(() => buildFontFamilyMap(systemFonts), [systemFonts])
  const fontOptions = React.useMemo(() => buildFontOptions(systemFonts), [systemFonts])

  // Returns translated string if translation exists, otherwise the fallback
  const tr = React.useCallback(
    (key: string, fallback: string) => {
      const v = t(key)
      return v === key ? fallback : v
    },
    [t]
  )

  const allSections = React.useMemo<ResolvedSection[]>(
    () =>
      SECTIONS.map((s: SectionDef) => ({
        ...s,
        label: tr('nav.' + s.id, s.label),
        resolvedRows: s.rows(themes, iconPacks, fontOptions).map((r) => {
          const translatedOptions = r.options?.map((opt) => {
            let optLabel = opt.label
            if (r.key === 'escAction' || r.key === 'blurAction') {
              optLabel = tr('escAction.' + opt.value, opt.label)
            } else if (r.key === 'windowPosition') {
              const keyMap: Record<string, string> = {
                '1/2, 1/6': 'topCenter',
                '1/6, 1/2': 'leftCenter',
                '1/2, 1/2': 'screenCenter',
                '5/6, 1/2': 'rightCenter',
                '1/2, 5/6': 'bottomCenter',
                '1/6, 1/6': 'topLeft',
                '5/6, 1/6': 'topRight',
                '1/6, 5/6': 'bottomLeft',
                '5/6, 5/6': 'bottomRight',
                '1/2, 1/3': 'upperCenterDefault',
              }
              const k = keyMap[String(opt.value)]
              if (k) optLabel = tr('windowPosition.' + k, opt.label)
            } else if (r.key === 'backgroundBehavior') {
              optLabel = tr('backgroundBehavior.' + opt.value, opt.label)
            } else if (typeof opt.value === 'boolean') {
              const k = opt.value ? 'yes' : 'no'
              optLabel = tr('bool.' + k, opt.label)
            } else if (r.key === 'font') {
              if (opt.value === 'system') optLabel = tr('font.systemDefault', opt.label)
              else if (opt.value === 'monospace') optLabel = tr('font.monospace', opt.label)
            }
            return { ...opt, label: optLabel }
          })
          return {
            ...r,
            label: tr(s.id + '.' + r.key, r.label),
            options: translatedOptions,
          }
        }),
      })),
    [themes, iconPacks, fontOptions, tr]
  )

  const extSections = React.useMemo<
    Array<{ id: string; label: string; resolvedRows: ExtSectionRow[] }>
  >(() => {
    return extSchemas.map((info: ExtSettingsInfo) => {
      const resolvedRows: ExtSectionRow[] = info.schema.fields.map((field: ExtFieldDef) => {
        const selectKey = `${info.extId}:${field.key}`
        const selectOptions: SelectOption[] =
          field.type === 'toggle'
            ? BOOL_OPTIONS.map((opt) => ({
                ...opt,
                label: tr('bool.' + (opt.value ? 'yes' : 'no'), opt.label),
              }))
            : info.extId === OLLAMA_EXT_ID && field.key === 'model' && ollamaModelOptions.length > 0
              ? ollamaModelOptions
              : field.options || []
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
  }, [extSchemas, ollamaModelOptions, tr])

  const languageAddRow = React.useMemo<LanguageRow>(
    () => ({
      key: 'lang:add',
      label: tr('language.addLanguage', LANGUAGE_ADD_LABEL),
      options: LANGUAGE_OPTIONS,
      isExtension: false as const,
      isLanguage: true as const,
      searchable: true,
    }),
    [tr]
  )

  const languageRemoveRows = React.useMemo<LanguageRemoveRow[]>(
    () =>
      preferredLanguages.filter(Boolean).map((code) => ({
        key: `lang:remove:${code}`,
        label: LANGUAGE_OPTIONS.find((o) => o.value === code)?.label ?? code,
        options: [],
        isExtension: false as const,
        isLanguageRemove: true as const,
        langCode: code,
      })),
    [preferredLanguages]
  )

  const extToggleRows = React.useMemo<ExtToggleRow[]>(() => {
    const translatedBoolOptions = BOOL_OPTIONS.map((opt) => ({
      ...opt,
      label: tr('bool.' + (opt.value ? 'yes' : 'no'), opt.label),
    }))
    return installedExtensions
      .filter((ext) => !ext.manifest.bootstrap && ext.id !== 'com.nuxy.settings')
      .map((ext) => ({
        key: `ext-toggle:${ext.id}`,
        label: ext.manifest.name,
        options: translatedBoolOptions,
        isExtension: false as const,
        isExtToggle: true as const,
        extId: ext.id,
      }))
  }, [installedExtensions, tr])

  const sectionsToRender = React.useMemo<RenderSection[]>(() => {
    const base: RenderSection[] = allSections.map((s: ResolvedSection) => ({
      id: s.id,
      label: s.label,
      isExtension: false,
      resolvedRows: s.resolvedRows.map((r: SectionRow) => ({ ...r, isExtension: false as const })),
    }))
    const langSection: RenderSection = {
      id: 'language',
      label: tr('nav.language', 'Language'),
      isExtension: false,
      resolvedRows: [languageAddRow, ...languageRemoveRows],
    }
    const extToggleSection: RenderSection | null =
      extToggleRows.length > 0
        ? {
            id: 'extensions',
            label: tr('nav.extensions', 'Extensions'),
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
  }, [allSections, extSections, languageAddRow, languageRemoveRows, extToggleRows, tr])

  const allRows = React.useMemo<AnyRow[]>(() => {
    const base: BaseRow[] = allSections.flatMap((s: ResolvedSection) =>
      s.resolvedRows.map((r: SectionRow) => ({ ...r, isExtension: false as const }))
    )
    const ext: ExtSectionRow[] = extSections.flatMap((s) => s.resolvedRows)
    return [...base, languageAddRow, ...languageRemoveRows, ...extToggleRows, ...ext]
  }, [allSections, extSections, languageAddRow, languageRemoveRows, extToggleRows])

  const navSections = React.useMemo<NavSection[]>(() => {
    const base = allSections.map((s: ResolvedSection) => ({
      id: s.id,
      label: s.label,
      itemCount: s.resolvedRows.length,
    }))
    base.push({
      id: 'language',
      label: tr('nav.language', 'Language'),
      itemCount: 1 + languageRemoveRows.length,
    })
    if (extToggleRows.length > 0) {
      base.push({
        id: 'extensions',
        label: tr('nav.extensions', 'Extensions'),
        itemCount: extToggleRows.length,
      })
    }
    extSections.forEach((s) => {
      base.push({ id: s.id, label: s.label, itemCount: s.resolvedRows.length })
    })
    return base
  }, [allSections, extSections, languageRemoveRows, extToggleRows, tr])

  return {
    fontFamilyMap,
    fontOptions,
    allSections,
    extSections,
    extToggleRows,
    sectionsToRender,
    allRows,
    navSections,
  }
}

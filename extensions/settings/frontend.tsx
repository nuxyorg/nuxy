const React = window.React
const { useState, useEffect, useRef, useMemo } = React

import type {
  NuxySettings,
  SelectOption,
  SectionRow,
  SectionDef,
  ResolvedSection,
  NavSection,
  StateSnapshot,
  ExtFieldDef,
  ExtSettingsInfo,
  BaseRow,
  ExtSectionRow,
  ExtToggleRow,
  LanguageRow,
  AnyRow,
  RenderSection,
} from './types.ts'
import type { UseTwoPanelNavResult } from '@nuxy/ui'

const EXT_ID = 'com.nuxy.settings'

const _useTwoPanelNav =
  (window.UI || {}).useTwoPanelNav ||
  (({ sections }: { sections: NavSection[] }) => ({
    focusArea: 'right' as const,
    setFocusArea: () => {},
    activeSectionId: sections[0]?.id ?? '',
    goToSection: () => {},
    sectionStartIndex: {} as Record<string, number>,
    getSectionIdForIndex: () => sections[0]?.id ?? '',
    onItemSelected: () => {},
    setActiveSection: () => {},
  }))

interface Props {
  query: string
}

const ZOOM_OPTIONS: SelectOption<string>[] = [
  { value: '75%', label: '75%' },
  { value: '90%', label: '90%' },
  { value: '100%', label: '100%' },
  { value: '110%', label: '110%' },
  { value: '125%', label: '125%' },
  { value: '150%', label: '150%' },
]

const FONT_OPTIONS_STATIC: SelectOption<string>[] = [
  { value: 'system', label: 'System Default' },
  { value: 'monospace', label: 'Monospace' },
]

const ESC_ACTION_OPTIONS: SelectOption<string>[] = [
  { value: 'hide', label: 'Hide' },
  { value: 'minimize', label: 'Minimize' },
  { value: 'quit', label: 'Quit' },
  { value: 'none', label: 'Do Nothing' },
]

const WINDOW_WIDTH_OPTIONS: SelectOption<number>[] = [
  { value: 600, label: '600px' },
  { value: 700, label: '700px' },
  { value: 800, label: '800px' },
  { value: 900, label: '900px' },
  { value: 1000, label: '1000px' },
  { value: 1200, label: '1200px' },
]

const WINDOW_MAX_HEIGHT_OPTIONS: SelectOption<number>[] = [
  { value: 400, label: '400px' },
  { value: 500, label: '500px' },
  { value: 600, label: '600px' },
  { value: 700, label: '700px' },
  { value: 800, label: '800px' },
]

const WINDOW_POSITION_OPTIONS: SelectOption<string>[] = [
  { value: '1/2, 1/6', label: 'Top Center' },
  { value: '1/6, 1/2', label: 'Left Center' },
  { value: '1/2, 1/2', label: 'Screen Center' },
  { value: '5/6, 1/2', label: 'Right Center' },
  { value: '1/2, 5/6', label: 'Bottom Center' },
  { value: '1/6, 1/6', label: 'Top Left' },
  { value: '5/6, 1/6', label: 'Top Right' },
  { value: '1/6, 5/6', label: 'Bottom Left' },
  { value: '5/6, 5/6', label: 'Bottom Right' },
  { value: '1/2, 1/3', label: 'Upper Center (default)' },
]

const OPACITY_OPTIONS: SelectOption<number>[] = [
  { value: 0.7, label: '70%' },
  { value: 0.8, label: '80%' },
  { value: 0.9, label: '90%' },
  { value: 1, label: '100%' },
]

const BOOL_OPTIONS: SelectOption<boolean>[] = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
]

const LANGUAGE_OPTIONS: SelectOption<string>[] = [
  { value: '', label: '— (none)' },
  { value: 'ar', label: 'Arabic (العربية)' },
  { value: 'zh-Hans', label: 'Chinese, Simplified (简体中文)' },
  { value: 'zh-Hant', label: 'Chinese, Traditional (繁體中文)' },
  { value: 'cs', label: 'Czech (čeština)' },
  { value: 'da', label: 'Danish (dansk)' },
  { value: 'nl', label: 'Dutch (Nederlands)' },
  { value: 'en', label: 'English' },
  { value: 'fi', label: 'Finnish (suomi)' },
  { value: 'fr', label: 'French (français)' },
  { value: 'de', label: 'German (Deutsch)' },
  { value: 'el', label: 'Greek (ελληνικά)' },
  { value: 'he', label: 'Hebrew (עברית)' },
  { value: 'hi', label: 'Hindi (हिन्दी)' },
  { value: 'hu', label: 'Hungarian (magyar)' },
  { value: 'id', label: 'Indonesian (Bahasa Indonesia)' },
  { value: 'it', label: 'Italian (italiano)' },
  { value: 'ja', label: 'Japanese (日本語)' },
  { value: 'ko', label: 'Korean (한국어)' },
  { value: 'ms', label: 'Malay (Bahasa Melayu)' },
  { value: 'no', label: 'Norwegian (norsk)' },
  { value: 'fa', label: 'Persian (فارسی)' },
  { value: 'pl', label: 'Polish (polski)' },
  { value: 'pt', label: 'Portuguese (português)' },
  { value: 'ro', label: 'Romanian (română)' },
  { value: 'ru', label: 'Russian (русский)' },
  { value: 'sk', label: 'Slovak (slovenčina)' },
  { value: 'es', label: 'Spanish (español)' },
  { value: 'sv', label: 'Swedish (svenska)' },
  { value: 'th', label: 'Thai (ภาษาไทย)' },
  { value: 'tr', label: 'Turkish (Türkçe)' },
  { value: 'uk', label: 'Ukrainian (українська)' },
  { value: 'vi', label: 'Vietnamese (tiếng Việt)' },
]

const LANGUAGE_SLOT_LABELS = [
  'Preferred Language (1st)',
  'Preferred Language (2nd)',
  'Preferred Language (3rd)',
]

function buildFontFamilyMap(systemFonts: string[]): Record<string, string> {
  const base: Record<string, string> = {
    system: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
    monospace: 'monospace',
  }
  systemFonts.forEach((name) => {
    base[name] = `'${name}', sans-serif`
  })
  return base
}

function buildFontOptions(systemFonts: string[]): SelectOption<string>[] {
  return [...FONT_OPTIONS_STATIC, ...systemFonts.map((name) => ({ value: name, label: name }))]
}

function getRowOptions(row: AnyRow, state: StateSnapshot): SelectOption[] {
  const isLang = 'isLanguage' in row && row.isLanguage
  const isExtToggle = 'isExtToggle' in row && row.isExtToggle
  if (isLang || isExtToggle || !row.isExtension) {
    return row.options
  }
  // extension row
  return row.options
}

function getRowCurrentValue(
  row: AnyRow,
  settings: NuxySettings,
  extValues: Record<string, Record<string, unknown>>,
  installedExtensions: Array<{ id: string; manifest: { name: string; bootstrap?: boolean; type: string }; disabled?: boolean }>
): unknown {
  const isLanguageRow = 'isLanguage' in row && row.isLanguage
  const isExtToggleRow = 'isExtToggle' in row && row.isExtToggle
  if (isLanguageRow) return settings.preferredLanguages?.[row.langIndex] ?? ''
  if (isExtToggleRow) return !(installedExtensions.find((e) => e.id === row.extId)?.disabled ?? false)
  if (row.isExtension) return extValues[row.extId]?.[row.fieldKey] ?? row.default ?? ''
  return settings[row.key]
}

const DEFAULT_SETTINGS: NuxySettings = {
  theme: 'dark',
  iconPack: '',
  zoom: '100%',
  font: 'system',
  escAction: 'hide',
  blurAction: 'hide',
  windowWidth: 800,
  windowMaxHeight: 600,
  alwaysOnTop: false,
  opacity: 1,
  showInTaskbar: false,
  showOnStartup: false,
  windowPosition: '1/2, 1/3',
  preferredLanguages: [],
}

const SECTIONS: SectionDef[] = [
  {
    id: 'general',
    label: 'General',
    rows: (themes, iconPacks, fontOptions) => [
      { key: 'theme', label: 'Theme', options: themes },
      { key: 'iconPack', label: 'Icon Pack', options: iconPacks },
      { key: 'zoom', label: 'Zoom', options: ZOOM_OPTIONS },
      { key: 'font', label: 'Font', options: fontOptions, searchable: true },
    ],
  },
  {
    id: 'window',
    label: 'Window',
    rows: () => [
      { key: 'escAction', label: 'Esc Key Action', options: ESC_ACTION_OPTIONS },
      { key: 'blurAction', label: 'Focus-Out Action', options: ESC_ACTION_OPTIONS },
      { key: 'windowWidth', label: 'Window Width', options: WINDOW_WIDTH_OPTIONS },
      { key: 'windowMaxHeight', label: 'Max Height', options: WINDOW_MAX_HEIGHT_OPTIONS },
      { key: 'windowPosition', label: 'Launch Position', options: WINDOW_POSITION_OPTIONS },
      { key: 'opacity', label: 'Opacity', options: OPACITY_OPTIONS },
      { key: 'alwaysOnTop', label: 'Always on Top', options: BOOL_OPTIONS },
      { key: 'showInTaskbar', label: 'Show in Taskbar', options: BOOL_OPTIONS },
      { key: 'showOnStartup', label: 'Show on Startup', options: BOOL_OPTIONS },
    ],
  },
]

interface SettingRowProps {
  row: AnyRow
  value: unknown
  options: SelectOption[]
  isOpen: boolean
  focusedIndex: number
  globalIdx: number
  selectedRow: number
  focusArea: string
  activeSectionId: string
  sectionId: string
  activeSelect: string | null
  inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>
  onSelect: (v: unknown) => void
  onOpen: (idx: number) => void
  onClose: () => void
  onItemClick: () => void
  onExtInputChange: (v: string) => void
  onExtInputBlur: (v: string) => void
}

function SettingRow({
  row,
  value,
  options,
  isOpen,
  focusedIndex,
  globalIdx,
  selectedRow,
  focusArea,
  activeSectionId,
  sectionId,
  activeSelect,
  inputRefs,
  onSelect,
  onOpen,
  onClose,
  onItemClick,
  onExtInputChange,
  onExtInputBlur,
}: SettingRowProps) {
  const { ListItem, ListItemBody, ListItemText, ListItemActions, SelectBox, Input } = window.UI || {}
  if (!ListItem) return null

  const isLanguageRow = 'isLanguage' in row && row.isLanguage
  const isExtToggleRow = 'isExtToggle' in row && row.isExtToggle
  const isSelectType =
    isLanguageRow || isExtToggleRow || !row.isExtension || row.type === 'select' || row.type === 'toggle'

  return (
    <ListItem
      key={row.key}
      active={
        focusArea === 'right' &&
        globalIdx === selectedRow &&
        activeSelect === null &&
        sectionId === activeSectionId
      }
      onClick={onItemClick}
    >
      {ListItemBody && (
        <ListItemBody>
          {ListItemText && <ListItemText>{row.label}</ListItemText>}
          {row.isExtension && row.description && (
            <span style={{ fontSize: '0.75em', opacity: 0.6 }}>{row.description}</span>
          )}
        </ListItemBody>
      )}
      {ListItemActions && (
        <ListItemActions>
          {isSelectType && SelectBox ? (
            <SelectBox
              options={options}
              value={value}
              open={isOpen}
              focusedIndex={focusedIndex}
              placeholder={options?.length === 0 ? '(none)' : '—'}
              searchable={isLanguageRow ? true : row.isExtension ? false : ('searchable' in row ? row.searchable : false) || false}
              onSelect={onSelect}
              onClose={onClose}
              onOpen={onOpen}
            />
          ) : (
            Input &&
            row.isExtension && (
              <Input
                ref={(el: HTMLInputElement | null) => {
                  inputRefs.current[row.key] = el
                }}
                type={row.type === 'color' ? 'color' : 'text'}
                value={String(value)}
                placeholder={('placeholder' in row ? row.placeholder : '') || ''}
                style={{ width: row.type === 'color' ? '2.5em' : '10em' }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onExtInputChange(e.target.value)}
                onBlur={(e: React.FocusEvent<HTMLInputElement>) => onExtInputBlur(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    e.currentTarget.blur()
                  }
                }}
              />
            )
          )}
        </ListItemActions>
      )}
    </ListItem>
  )
}

export default function SettingsView({ query: _query }: Props) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemActions,
    SelectBox,
    TwoPanel,
    TabBar,
    SectionHeader,
    ScrollArea,
    Input,
  } = window.UI || {}

  const [themes, setThemes] = useState<SelectOption[]>([])
  const [iconPacks, setIconPacks] = useState<SelectOption[]>([])
  const [systemFonts, setSystemFonts] = useState<string[]>([])
  const [settings, setSettings] = useState<NuxySettings>(DEFAULT_SETTINGS)
  const [selectedRow, setSelectedRow] = useState<number>(-1)
  const [activeSelect, setActiveSelect] = useState<string | null>(null)
  const [selectFocused, setSelectFocused] = useState<number>(0)
  const [extSchemas, setExtSchemas] = useState<ExtSettingsInfo[]>([])
  const [extValues, setExtValues] = useState<Record<string, Record<string, unknown>>>({})
  const [installedExtensions, setInstalledExtensions] = useState<
    Array<{ id: string; manifest: { name: string; bootstrap?: boolean; type: string }; disabled?: boolean }>
  >([])

  const fontFamilyMap = useMemo(() => buildFontFamilyMap(systemFonts), [systemFonts])
  const fontOptions = useMemo(() => buildFontOptions(systemFonts), [systemFonts])

  const rightPanelRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const extSections = useMemo<
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
      return {
        id: info.extId,
        label: info.name,
        resolvedRows,
      }
    })
  }, [extSchemas])

  const extToggleRows = useMemo<ExtToggleRow[]>(() => {
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

  const allSections = useMemo<ResolvedSection[]>(
    () =>
      SECTIONS.map((s: SectionDef) => ({
        ...s,
        resolvedRows: s.rows(themes, iconPacks, fontOptions),
      })),
    [themes, iconPacks, fontOptions]
  )

  const languageRows = useMemo<LanguageRow[]>(
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

  const sectionsToRender = useMemo<RenderSection[]>(() => {
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

  const allRows = useMemo<AnyRow[]>(() => {
    const base: BaseRow[] = allSections.flatMap((s: ResolvedSection) =>
      s.resolvedRows.map((r: SectionRow) => ({ ...r, isExtension: false as const }))
    )
    const ext: ExtSectionRow[] = extSections.flatMap((s) => s.resolvedRows)
    return [...base, ...languageRows, ...extToggleRows, ...ext]
  }, [allSections, extSections, languageRows, extToggleRows])

  const navSections = useMemo<NavSection[]>(() => {
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

  const stateRef = useRef<StateSnapshot>({} as StateSnapshot)
  stateRef.current = {
    settings,
    selectedRow,
    activeSelect,
    selectFocused,
    allRows,
    extValues,
    sectionsToRender,
  }

  const rightPanelActions = useMemo(() => {
    const actions = [
      {
        key: 'ArrowUp',
        label: 'Previous setting',
        hint: '↑↓',
        handler: () => {
          const { activeSelect } = stateRef.current
          if (activeSelect !== null) {
            setSelectFocused((i: number) => Math.max(i - 1, 0))
          } else {
            setSelectedRow((prev) => {
              if (prev > 0) {
                const nextIdx = prev - 1
                navRef.current?.onItemSelected(nextIdx)
                return nextIdx
              }
              if (prev === 0) {
                return -1
              }
              return prev
            })
          }
        },
      },
      {
        key: 'ArrowDown',
        label: 'Next setting',
        handler: () => {
          const { activeSelect, allRows } = stateRef.current
          if (activeSelect !== null) {
            const row = allRows.find((r: AnyRow) => r.key === activeSelect)
            if (row) setSelectFocused((i: number) => Math.min(i + 1, row.options.length - 1))
          } else {
            setSelectedRow((prev) => {
              if (prev < 0) {
                const nextIdx = 0
                navRef.current?.onItemSelected(nextIdx)
                return nextIdx
              }
              if (prev < allRows.length - 1) {
                const nextIdx = prev + 1
                navRef.current?.onItemSelected(nextIdx)
                return nextIdx
              }
              return prev
            })
          }
        },
      },
      {
        key: 'Enter',
        label: 'Open setting',
        hint: '↵',
        handler: () => {
          const { selectedRow, activeSelect, selectFocused, allRows, extValues, settings } =
            stateRef.current
          if (activeSelect !== null) {
            const row = allRows.find((r: AnyRow) => r.key === activeSelect)
            if (row) {
              const opt = row.options[selectFocused]
              if (opt) {
                const isLang = 'isLanguage' in row && row.isLanguage
                const isToggle = 'isExtToggle' in row && row.isExtToggle
                if (isLang) {
                  updateLanguageSlot(row.langIndex, opt.value as string)
                } else if (isToggle) {
                  toggleExtension(row.extId, opt.value as boolean)
                } else if (row.isExtension) {
                  updateExtSetting(row.extId, row.fieldKey, opt.value)
                } else {
                  updateSetting(activeSelect as keyof NuxySettings, opt.value)
                }
              }
              setActiveSelect(null)
            }
          } else {
            const row = allRows[selectedRow]
            if (row) {
              const isLang = 'isLanguage' in row && row.isLanguage
              if (!isLang && row.isExtension && row.type !== 'select' && row.type !== 'toggle') {
                inputRefs.current[row.key]?.focus()
                inputRefs.current[row.key]?.select()
              } else if (row.options && row.options.length > 0) {
                const currentValue = isLang
                  ? (settings.preferredLanguages?.[row.langIndex] ?? '')
                  : row.isExtension
                    ? (extValues[row.extId]?.[row.fieldKey] ?? row.default ?? '')
                    : settings[row.key]
                const currentIdx = row.options.findIndex(
                  (o: SelectOption) => String(o.value) === String(currentValue)
                )
                setSelectFocused(Math.max(0, currentIdx))
                setActiveSelect(row.key)
              }
            }
          }
        },
      },
    ]

    if (activeSelect !== null) {
      actions.push({
        key: 'Escape',
        label: 'Close setting',
        hint: 'Esc',
        handler: () => setActiveSelect(null),
      })
    }

    return actions
  }, [activeSelect])

  // navRef avoids referencing nav before assignment inside onFocusRight closure
  const navRef = useRef<UseTwoPanelNavResult | null>(null)

  const nav = _useTwoPanelNav({
    sections: navSections,
    selectOpen: activeSelect !== null,
    initialFocusArea: 'right',
    onSectionChange: (id: string) => {
      const el = sectionRefs.current[id]
      if (el && rightPanelRef.current) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    },
    onFocusRight: (id: string) => {
      const startIdx = navRef.current?.sectionStartIndex[id] ?? 0
      setSelectedRow(startIdx)
      setActiveSelect(null)
    },
    rightPanelActions,
  })
  navRef.current = nav

  const focusArea: string = nav.focusArea ?? 'right'
  const activeSectionId: string = nav.activeSectionId ?? SECTIONS[0].id

  const applyTheme = (name: string): void => {
    if (!name || !window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke('kernel', 'getThemeByName', { name })
      .then((res) => {
        const r = res as {
          success: boolean
          data?: { colors?: Record<string, string>; tokens?: Record<string, string> }
        }
        if (!r?.success || !r.data) return
        const { colors, tokens } = r.data
        const root = document.documentElement
        if (colors) Object.entries(colors).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
        if (tokens) Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
      })
      .catch(() => {})
  }

  const applySettings = (s: NuxySettings): void => {
    if (s.zoom) document.documentElement.style.zoom = s.zoom
    if (s.font) document.body.style.fontFamily = fontFamilyMap[s.font] || String(s.font)
    if (s.theme) applyTheme(String(s.theme))
  }

  const updateSetting = (key: keyof NuxySettings, value: unknown): void => {
    const next: NuxySettings = { ...stateRef.current.settings, [key]: value }
    setSettings(next)
    applySettings(next)
    setActiveSelect(null)

    window.dispatchEvent(new CustomEvent('nuxy-settings-updated', { detail: next }))
    if (key === 'preferredLanguages') {
      window.dispatchEvent(new CustomEvent('nuxy-locale-changed'))
    }

    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'saveSettings', next)
      .then(() => {
        window.core.ipc.invoke('kernel', 'applyWindowSettings', next).catch(() => {})
      })
      .catch(() => {})
  }

  const updateLanguageSlot = (langIndex: number, value: string): void => {
    const langs = [...(stateRef.current.settings.preferredLanguages || [])]
    if (value === '') {
      langs.splice(langIndex, 1)
    } else {
      langs[langIndex] = value
    }
    // Deduplicate while preserving order
    const seen = new Set<string>()
    const cleaned = langs.filter((l) => {
      if (!l || seen.has(l)) return false
      seen.add(l)
      return true
    })
    updateSetting('preferredLanguages', cleaned)
  }

  const updateExtSetting = (extId: string, key: string, value: unknown): void => {
    const next = { ...(extValues[extId] || {}), [key]: value }
    setExtValues((prev: Record<string, Record<string, unknown>>) => ({ ...prev, [extId]: next }))
    setActiveSelect(null)
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'saveExtensionSettingValues', { extId, values: next })
      .catch(() => {})
  }

  const toggleExtension = (extId: string, enabled: boolean): void => {
    setActiveSelect(null)
    if (!window.core?.ipc?.invoke) return
    window.core.ipc.invoke('kernel', 'setExtensionEnabled', { extId, enabled }).catch(() => {})
  }

  // Effect 1: Load themes
  useEffect(() => {
    window.core.themes
      ?.list()
      .then((res) => {
        const r = res as { success: boolean; data?: unknown[] }
        if (r?.success && Array.isArray(r.data)) {
          setThemes(r.data.map((name) => ({ value: name as string, label: name as string })))
        }
      })
      .catch(() => {})
  }, [])

  // Effect 2: Load icon packs
  useEffect(() => {
    window.core.icons
      ?.listPacks()
      .then((res) => {
        const r = res as { success: boolean; data?: unknown[] }
        if (r?.success && Array.isArray(r.data)) {
          setIconPacks(r.data.map((name) => ({ value: name as string, label: name as string })))
        }
      })
      .catch(() => {})
  }, [])

  // Effect 3: Load system fonts
  useEffect(() => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke('kernel', 'listSystemFonts', {})
      .then((res) => {
        const r = res as { success: boolean; data?: unknown[] }
        if (r?.success && Array.isArray(r.data)) {
          setSystemFonts(r.data as string[])
        }
      })
      .catch(() => {})
  }, [])

  // Effect 4: Load settings values
  useEffect(() => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'getSettings', {})
      .then((res) => {
        const r = res as { success: boolean; data?: NuxySettings }
        if (r?.success && r.data) {
          setSettings(r.data)
          applySettings(r.data)
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Effect 5: Load extension schemas + per-extension values
  useEffect(() => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke('kernel', 'listInstalledExtensions', {})
      .then((res) => {
        const r = res as { success: boolean; data?: unknown[] }
        if (r?.success && Array.isArray(r.data)) {
          setInstalledExtensions(r.data as typeof installedExtensions)
        }
      })
      .catch(() => {})

    window.core.ipc
      .invoke('kernel', 'getExtensionSettingsSchemas', {})
      .then((res) => {
        const r = res as { success: boolean; data?: ExtSettingsInfo[] }
        if (r?.success && Array.isArray(r.data) && r.data.length > 0) {
          setExtSchemas(r.data)
          r.data.forEach((info: ExtSettingsInfo) => {
            window.core.ipc
              .invoke(EXT_ID, 'getExtensionSettingValues', info.extId)
              .then((vRes) => {
                const vr = vRes as { success: boolean; data?: Record<string, unknown> }
                if (vr?.success && vr.data) {
                  setExtValues((prev: Record<string, Record<string, unknown>>) => ({
                    ...prev,
                    [info.extId]: vr.data!,
                  }))
                }
              })
              .catch(() => {})
          })
        }
      })
      .catch(() => {})
  }, [])

  if (!TwoPanel) return null

  const left = TabBar ? (
    <TabBar
      tabs={navSections}
      active={activeSectionId}
      orientation="vertical"
      onChange={(id: string) => {
        const startIdx = nav.sectionStartIndex[id] ?? 0
        setSelectedRow(startIdx - 1)
        nav.goToSection(id)
        setActiveSelect(null)
      }}
    />
  ) : null

  const right = ScrollArea ? (
    <ScrollArea ref={rightPanelRef} style={{ flex: 1 }}>
      {sectionsToRender.map((section: RenderSection) => {
        const sectionOffset = nav.sectionStartIndex[section.id] ?? 0
        return (
          <React.Fragment key={section.id}>
            {SectionHeader && (
              <SectionHeader
                ref={(el: HTMLDivElement | null) => {
                  sectionRefs.current[section.id] = el
                }}
                label={section.label}
              />
            )}
            {List && (
              <List>
                {section.resolvedRows.map((row: AnyRow, i: number) => {
                  const globalIdx = sectionOffset + i
                  const isLanguageRow = 'isLanguage' in row && row.isLanguage
                  const isExtToggleRow = 'isExtToggle' in row && row.isExtToggle
                  const currentValue = getRowCurrentValue(row, settings, extValues, installedExtensions)
                  const options = getRowOptions(row, stateRef.current)

                  return (
                    <SettingRow
                      key={row.key}
                      row={row}
                      value={currentValue}
                      options={options}
                      isOpen={activeSelect === row.key}
                      focusedIndex={selectFocused}
                      globalIdx={globalIdx}
                      selectedRow={selectedRow}
                      focusArea={focusArea}
                      activeSectionId={activeSectionId}
                      sectionId={section.id}
                      activeSelect={activeSelect}
                      inputRefs={inputRefs}
                      onSelect={(v: unknown) => {
                        if (isLanguageRow) {
                          updateLanguageSlot(row.langIndex, v as string)
                        } else if (isExtToggleRow) {
                          toggleExtension(row.extId, v as boolean)
                        } else if (row.isExtension) {
                          updateExtSetting(row.extId, row.fieldKey, v)
                        } else {
                          updateSetting(row.key, v)
                        }
                      }}
                      onClose={() => setActiveSelect(null)}
                      onOpen={(idx: number) => {
                        setSelectedRow(globalIdx)
                        nav.onItemSelected(globalIdx)
                        nav.setFocusArea('right')
                        setSelectFocused(idx)
                        setActiveSelect(row.key)
                      }}
                      onItemClick={() => {
                        setSelectedRow(globalIdx)
                        nav.onItemSelected(globalIdx)
                        nav.setFocusArea('right')
                      }}
                      onExtInputChange={(v: string) => {
                        setExtValues(
                          (prev: Record<string, Record<string, unknown>>) => ({
                            ...prev,
                            [(row as any).extId]: {
                              ...(prev[(row as any).extId] || {}),
                              [(row as any).fieldKey]: v,
                            },
                          })
                        )
                        if (row.isExtension && row.type === 'color')
                          updateExtSetting((row as any).extId, (row as any).fieldKey, v)
                      }}
                      onExtInputBlur={(v: string) => {
                        if (row.isExtension) updateExtSetting(row.extId, row.fieldKey, v)
                      }}
                    />
                  )
                })}
              </List>
            )}
          </React.Fragment>
        )
      })}
    </ScrollArea>
  ) : null

  return <TwoPanel left={left} right={right} split="auto" />
}

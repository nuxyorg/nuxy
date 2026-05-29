const React = window.React
const { useState, useEffect, useRef, useMemo } = React

import type { NuxySettings } from './types.ts'

const _useTwoPanelNav = (window.UI || {}).useTwoPanelNav || null

const EXT_ID = 'com.nuxy.settings'

interface SelectOption<T = unknown> {
  value: T
  label: string
}

interface SectionRow {
  key: keyof NuxySettings
  label: string
  options: SelectOption[]
  searchable?: boolean
}

interface SectionDef {
  id: string
  label: string
  rows: (
    themes: SelectOption[],
    iconPacks: SelectOption[],
    fontOptions: SelectOption[]
  ) => SectionRow[]
}

interface ResolvedSection extends SectionDef {
  resolvedRows: SectionRow[]
}

interface NavSection {
  id: string
  label: string
  itemCount: number
}

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
  { value: '1/2, 1/6', label: '↑  Top Center' },
  { value: '1/6, 1/2', label: '←  Left Center' },
  { value: '1/2, 1/2', label: '⊙  Screen Center' },
  { value: '5/6, 1/2', label: '→  Right Center' },
  { value: '1/2, 5/6', label: '↓  Bottom Center' },
  { value: '1/6, 1/6', label: '↖  Top Left' },
  { value: '5/6, 1/6', label: '↗  Top Right' },
  { value: '1/6, 5/6', label: '↙  Bottom Left' },
  { value: '5/6, 5/6', label: '↘  Bottom Right' },
  { value: '1/2, 1/3', label: '◎  Upper Center (default)' },
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
  const extras = systemFonts.map((name) => ({ value: name, label: name }))
  return [...FONT_OPTIONS_STATIC, ...extras]
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
  } = window.UI || {}

  const [themes, setThemes] = useState<SelectOption[]>([])
  const [iconPacks, setIconPacks] = useState<SelectOption[]>([])
  const [systemFonts, setSystemFonts] = useState<string[]>([])
  const [settings, setSettings] = useState<NuxySettings>(DEFAULT_SETTINGS)
  const [selectedRow, setSelectedRow] = useState<number>(0)
  const [activeSelect, setActiveSelect] = useState<string | null>(null)
  const [selectFocused, setSelectFocused] = useState<number>(0)

  const fontFamilyMap = buildFontFamilyMap(systemFonts)
  const fontOptions = buildFontOptions(systemFonts)

  // Scroll refs
  const rightPanelRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Resolve rows per section
  const allSections = useMemo<ResolvedSection[]>(
    () => SECTIONS.map((s) => ({ ...s, resolvedRows: s.rows(themes, iconPacks, fontOptions) })),
    [themes, iconPacks, fontOptions]
  )

  const allRows = useMemo<SectionRow[]>(() => allSections.flatMap((s) => s.resolvedRows), [allSections])

  // useTwoPanelNav — shared UIkit hook
  const navSections = useMemo<NavSection[]>(
    () => allSections.map((s) => ({ id: s.id, label: s.label, itemCount: s.resolvedRows.length })),
    [allSections]
  )

  interface StateSnapshot {
    settings: NuxySettings
    selectedRow: number
    activeSelect: string | null
    selectFocused: number
    allRows: SectionRow[]
  }

  const stateRef = useRef<StateSnapshot>({} as StateSnapshot)
  stateRef.current = { settings, selectedRow, activeSelect, selectFocused, allRows }

  // Right-panel Up/Down/Enter actions (passed into the hook)
  const rightPanelActions = useMemo(() => [
    {
      key: 'ArrowUp',
      label: 'Previous setting',
      hint: '↑↓',
      handler: () => {
        const { activeSelect } = stateRef.current
        if (activeSelect !== null) {
          setSelectFocused((i: number) => Math.max(i - 1, 0))
        } else {
          setSelectedRow((i: number) => Math.max(i - 1, 0))
        }
      },
    },
    {
      key: 'ArrowDown',
      label: 'Next setting',
      handler: () => {
        const { activeSelect, allRows } = stateRef.current
        if (activeSelect !== null) {
          const row = allRows.find((r) => r.key === activeSelect)
          if (row) setSelectFocused((i: number) => Math.min(i + 1, row.options.length - 1))
        } else {
          setSelectedRow((i: number) => Math.min(i + 1, allRows.length - 1))
        }
      },
    },
    {
      key: 'Enter',
      label: 'Open setting',
      hint: '↵',
      handler: () => {
        const { selectedRow, activeSelect, selectFocused, allRows } = stateRef.current
        if (activeSelect !== null) {
          const row = allRows.find((r) => r.key === activeSelect)
          if (row) {
            const opt = row.options[selectFocused]
            if (opt) updateSetting(activeSelect as keyof NuxySettings, opt.value)
            else setActiveSelect(null)
          }
        } else {
          const row = allRows[selectedRow]
          if (row && row.options.length > 0) {
            const currentIdx = row.options.findIndex(
              (o) => String(o.value) === String(stateRef.current.settings[row.key])
            )
            setSelectFocused(Math.max(0, currentIdx))
            setActiveSelect(row.key)
          }
        }
      },
    },
    {
      key: 'Escape',
      label: 'Close setting',
      hint: 'Esc',
      handler: () => setActiveSelect(null),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [])

  const nav = _useTwoPanelNav
    ? _useTwoPanelNav({
        sections: navSections,
        selectOpen: activeSelect !== null,
        initialFocusArea: 'left',
        onSectionChange: (id: string) => {
          const el = sectionRefs.current[id]
          if (el && rightPanelRef.current) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        },
        onFocusRight: (id: string) => {
          const startIdx = nav?.sectionStartIndex[id] ?? 0
          setSelectedRow(startIdx)
          setActiveSelect(null)
        },
        rightPanelActions,
      })
    : null

  const focusArea: string = nav?.focusArea ?? 'right'
  const activeSectionId: string = nav?.activeSectionId ?? SECTIONS[0].id

  const applyTheme = (name: string): void => {
    if (!name || !window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke('kernel', 'getThemeByName', { name })
      .then((res) => {
        const r = res as { success: boolean; data?: { colors?: Record<string, string>; tokens?: Record<string, string> } }
        if (!r?.success || !r.data) return
        const { colors, tokens } = r.data
        const root = document.documentElement
        if (colors) Object.entries(colors).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
        if (tokens) Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
      })
      .catch(console.error)
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

    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'saveSettings', next)
      .then(() => {
        window.core.ipc.invoke('kernel', 'applyWindowSettings', next).catch(console.error)
      })
      .catch(console.error)
  }

  useEffect(() => {
    if (!window.core?.ipc?.invoke) return

    window.core.themes
      ?.list()
      .then((res) => {
        const r = res as { success: boolean; data?: unknown[] }
        if (r?.success && Array.isArray(r.data)) {
          setThemes(r.data.map((name) => ({ value: name as string, label: name as string })))
        }
      })
      .catch(console.error)

    window.core.icons
      ?.listPacks()
      .then((res) => {
        const r = res as { success: boolean; data?: unknown[] }
        if (r?.success && Array.isArray(r.data)) {
          setIconPacks(r.data.map((name) => ({ value: name as string, label: name as string })))
        }
      })
      .catch(console.error)

    window.core?.ipc
      ?.invoke('kernel', 'listSystemFonts', {})
      .then((res) => {
        const r = res as { success: boolean; data?: unknown[] }
        if (r?.success && Array.isArray(r.data)) {
          setSystemFonts(r.data as string[])
        }
      })
      .catch(console.error)

    window.core.ipc
      .invoke(EXT_ID, 'getSettings', {})
      .then((res) => {
        const r = res as { success: boolean; data?: NuxySettings }
        if (r?.success && r.data) {
          setSettings(r.data)
          applySettings(r.data)
        }
      })
      .catch(console.error)
  }, [])

  const tabs = SECTIONS.map((s) => ({ id: s.id, label: s.label }))

  const left = TabBar ? (
    <TabBar
      tabs={tabs}
      active={activeSectionId}
      orientation="vertical"
      style={{ borderRight: 'none', height: '100%' }}
      onChange={(id: string) => {
        // Jump to the first row of that section
        const startIdx = nav?.sectionStartIndex[id] ?? 0
        setSelectedRow(startIdx)
        nav?.goToSection(id)
        setActiveSelect(null)
      }}
    />
  ) : null

  let globalRowOffset = 0
  const right = (
    <div ref={rightPanelRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {List &&
        allSections.map((section) => {
          const sectionOffset = globalRowOffset
          globalRowOffset += section.resolvedRows.length
          return (
            <div key={section.id} ref={(el: HTMLDivElement | null) => (sectionRefs.current[section.id] = el)} style={{ marginBottom: 8 }}>
              {SectionHeader ? (
                <SectionHeader label={section.label} />
              ) : (
                <div style={{ padding: '6px 12px', fontSize: 12, opacity: 0.5, fontWeight: 500 }}>
                  {section.label}
                </div>
              )}
              <List>
                {section.resolvedRows.map((row, i) => {
                  const globalIdx = sectionOffset + i
                  return (
                    ListItem && (
                      <ListItem
                        key={row.key}
                        active={focusArea === 'right' && globalIdx === selectedRow && activeSelect === null}
                        onClick={() => {
                          setSelectedRow(globalIdx)
                          nav?.onItemSelected(globalIdx)
                          nav?.setFocusArea('right')
                        }}
                      >
                        {ListItemBody && (
                          <ListItemBody>
                            {ListItemText && <ListItemText>{row.label}</ListItemText>}
                          </ListItemBody>
                        )}
                        {ListItemActions && (
                          <ListItemActions>
                            {SelectBox && (
                              <SelectBox
                                options={row.options}
                                value={settings[row.key]}
                                open={activeSelect === row.key}
                                focusedIndex={selectFocused}
                                placeholder={row.options.length === 0 ? '(none)' : '—'}
                                searchable={row.searchable || false}
                                onSelect={(v: unknown) => updateSetting(row.key, v)}
                                onClose={() => setActiveSelect(null)}
                                onOpen={(idx: number) => {
                                  setSelectedRow(globalIdx)
                                  nav?.onItemSelected(globalIdx)
                                  setSelectFocused(idx)
                                  setActiveSelect(row.key)
                                }}
                              />
                            )}
                          </ListItemActions>
                        )}
                      </ListItem>
                    )
                  )
                })}
              </List>
            </div>
          )
        })}
    </div>
  )

  if (TwoPanel) {
    return <TwoPanel left={left} right={right} split="auto" style={{ flex: 1, minHeight: 0 }} />
  }

  return <div>{right}</div>
}

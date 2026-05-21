const React = window.React
const { useState, useEffect, useRef } = React

const EXT_ID = 'com.nuxy.settings'

const ZOOM_OPTIONS = [
  { value: '75%', label: '75%' },
  { value: '90%', label: '90%' },
  { value: '100%', label: '100%' },
  { value: '110%', label: '110%' },
  { value: '125%', label: '125%' },
  { value: '150%', label: '150%' },
]

const FONT_OPTIONS_STATIC = [
  { value: 'system', label: 'System Default' },
  { value: 'monospace', label: 'Monospace' },
]

const ESC_ACTION_OPTIONS = [
  { value: 'hide', label: 'Hide' },
  { value: 'minimize', label: 'Minimize' },
  { value: 'quit', label: 'Quit' },
  { value: 'none', label: 'Do Nothing' },
]

const WINDOW_WIDTH_OPTIONS = [
  { value: 600, label: '600px' },
  { value: 700, label: '700px' },
  { value: 800, label: '800px' },
  { value: 900, label: '900px' },
  { value: 1000, label: '1000px' },
  { value: 1200, label: '1200px' },
]

const WINDOW_MAX_HEIGHT_OPTIONS = [
  { value: 400, label: '400px' },
  { value: 500, label: '500px' },
  { value: 600, label: '600px' },
  { value: 700, label: '700px' },
  { value: 800, label: '800px' },
]

const OPACITY_OPTIONS = [
  { value: 0.7, label: '70%' },
  { value: 0.8, label: '80%' },
  { value: 0.9, label: '90%' },
  { value: 1, label: '100%' },
]

const BOOL_OPTIONS = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
]

function buildFontFamilyMap(systemFonts) {
  const base = {
    system: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
    monospace: 'monospace',
  }
  systemFonts.forEach((name) => {
    base[name] = `'${name}', sans-serif`
  })
  return base
}

function buildFontOptions(systemFonts) {
  const extras = systemFonts.map((name) => ({ value: name, label: name }))
  return [...FONT_OPTIONS_STATIC, ...extras]
}

const DEFAULT_SETTINGS = {
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

const SECTIONS = [
  {
    label: 'General',
    rows: (themes, iconPacks, fontOptions) => [
      { key: 'theme', label: 'Theme', options: themes },
      { key: 'iconPack', label: 'Icon Pack', options: iconPacks },
      { key: 'zoom', label: 'Zoom', options: ZOOM_OPTIONS },
      { key: 'font', label: 'Font', options: fontOptions, searchable: true },
    ],
  },
  {
    label: 'Window',
    rows: () => [
      { key: 'escAction', label: 'Esc Key Action', options: ESC_ACTION_OPTIONS },
      { key: 'blurAction', label: 'Focus-Out Action', options: ESC_ACTION_OPTIONS },
      { key: 'windowWidth', label: 'Window Width', options: WINDOW_WIDTH_OPTIONS },
      { key: 'windowMaxHeight', label: 'Max Height', options: WINDOW_MAX_HEIGHT_OPTIONS },
      { key: 'opacity', label: 'Opacity', options: OPACITY_OPTIONS },
      { key: 'alwaysOnTop', label: 'Always on Top', options: BOOL_OPTIONS },
      { key: 'showInTaskbar', label: 'Show in Taskbar', options: BOOL_OPTIONS },
      { key: 'showOnStartup', label: 'Show on Startup', options: BOOL_OPTIONS },
    ],
  },
]

export default function SettingsView() {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemActions,
    Kbd,
    SelectBox,
  } = window.UI || {}

  const [themes, setThemes] = useState([])
  const [iconPacks, setIconPacks] = useState([])
  const [systemFonts, setSystemFonts] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [selectedRow, setSelectedRow] = useState(0)
  const [activeSelect, setActiveSelect] = useState(null)
  const [selectFocused, setSelectFocused] = useState(0)

  const fontFamilyMap = buildFontFamilyMap(systemFonts)
  const fontOptions = buildFontOptions(systemFonts)

  const stateRef = useRef({})

  // Build flat rows with section boundaries for navigation
  const allRows = [...SECTIONS[0].rows(themes, iconPacks, fontOptions), ...SECTIONS[1].rows()]

  stateRef.current = { settings, selectedRow, activeSelect, selectFocused, allRows }

  const applyTheme = (name) => {
    if (!name || !window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke('kernel', 'getThemeByName', { name })
      .then((res) => {
        if (!res?.success || !res.data) return
        const { colors, tokens } = res.data
        const root = document.documentElement
        if (colors) Object.entries(colors).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
        if (tokens) Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
      })
      .catch(console.error)
  }

  const applySettings = (s) => {
    if (s.zoom) document.documentElement.style.zoom = s.zoom
    if (s.font) document.body.style.fontFamily = fontFamilyMap[s.font] || s.font
    if (s.theme) applyTheme(s.theme)
  }

  const updateSetting = (key, value) => {
    const next = { ...stateRef.current.settings, [key]: value }
    setSettings(next)
    applySettings(next)
    setActiveSelect(null)

    console.log('[Settings] dispatching nuxy-settings-updated', next)
    window.dispatchEvent(new CustomEvent('nuxy-settings-updated', { detail: next }))

    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'saveSettings', next)
      .then(() => {
        // Notify kernel to apply window-level settings immediately
        window.core.ipc.invoke('kernel', 'applyWindowSettings', next).catch(console.error)
      })
      .catch(console.error)
  }

  useEffect(() => {
    if (!window.core?.ipc?.invoke) return

    window.core.themes
      ?.list()
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setThemes(res.data.map((name) => ({ value: name, label: name })))
        }
      })
      .catch(console.error)

    window.core.icons
      ?.listPacks()
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setIconPacks(res.data.map((name) => ({ value: name, label: name })))
        }
      })
      .catch(console.error)

    window.core?.ipc
      ?.invoke('kernel', 'listSystemFonts', {})
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setSystemFonts(res.data)
        }
      })
      .catch(console.error)

    window.core.ipc
      .invoke(EXT_ID, 'getSettings', {})
      .then((res) => {
        if (res?.success && res.data) {
          setSettings(res.data)
          applySettings(res.data)
        }
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    const handleKey = (e) => {
      const { key } = e.detail
      const { selectedRow, activeSelect, selectFocused, allRows } = stateRef.current

      if (activeSelect !== null) {
        const row = allRows.find((r) => r.key === activeSelect)
        if (!row) return

        if (key === 'ArrowDown') {
          setSelectFocused((i) => Math.min(i + 1, row.options.length - 1))
        } else if (key === 'ArrowUp') {
          setSelectFocused((i) => Math.max(i - 1, 0))
        } else if (key === 'Enter') {
          const opt = row.options[selectFocused]
          if (opt) updateSetting(activeSelect, opt.value)
          else setActiveSelect(null)
        } else if (key === 'Escape') {
          setActiveSelect(null)
        }
        return
      }

      if (key === 'ArrowDown') {
        setSelectedRow((i) => Math.min(i + 1, allRows.length - 1))
      } else if (key === 'ArrowUp') {
        setSelectedRow((i) => Math.max(i - 1, 0))
      } else if (key === 'Enter') {
        const row = allRows[selectedRow]
        if (row && row.options.length > 0) {
          const currentIdx = row.options.findIndex(
            (o) => String(o.value) === String(stateRef.current.settings[row.key])
          )
          setSelectFocused(Math.max(0, currentIdx))
          setActiveSelect(row.key)
        }
      } else if (key === 'Escape') {
        setActiveSelect(null)
      }
    }

    window.addEventListener('nuxy-shell-omni-bar-keydown', handleKey)
    return () => window.removeEventListener('nuxy-shell-omni-bar-keydown', handleKey)
  }, [])

  useEffect(() => {
    const hints = (
      <>
        <Kbd>↑↓</Kbd>
        <span>navigate</span>
        <Kbd style={{ marginLeft: 6 }}>↵</Kbd>
        <span>open</span>
        <Kbd style={{ marginLeft: 6 }}>Esc</Kbd>
        <span>close</span>
      </>
    )
    window.dispatchEvent(new CustomEvent('nuxy-shell-footer-hints', { detail: hints }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-footer-hints', { detail: null }))
    }
  }, [])

  const sectionStyle = {
    padding: '6px 16px 4px',
    fontSize: 'var(--font-xs)',
    fontFamily: 'monospace',
    color: 'var(--syntax-keyword)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    borderBottom: '1px solid var(--syntax-comment)',
  }

  // Calculate row offsets for selectedRow mapping per section
  let rowOffset = 0

  return (
    <div>
      {SECTIONS.map((section) => {
        const sectionRows = section.rows(themes, iconPacks, fontOptions)
        const sectionStart = rowOffset
        rowOffset += sectionRows.length

        return (
          <div key={section.label}>
            <div style={sectionStyle}>{section.label}</div>

            {List && (
              <List>
                {sectionRows.map((row, i) => {
                  const globalIdx = sectionStart + i
                  return (
                    ListItem && (
                      <ListItem
                        key={row.key}
                        active={globalIdx === selectedRow && activeSelect === null}
                        onClick={() => setSelectedRow(globalIdx)}
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
                                onSelect={(v) => updateSetting(row.key, v)}
                                onClose={() => setActiveSelect(null)}
                                onOpen={(idx) => {
                                  setSelectedRow(globalIdx)
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
            )}
          </div>
        )
      })}

    </div>
  )
}

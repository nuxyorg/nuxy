# Refactoring Assessment: `extensions/settings/frontend.tsx`

**Date**: 2026-06-02  
**Analyst**: Senior Software Architect (Claude Sonnet 4.6)  
**Target**: `/home/xava/Documents/nuxy/extensions/settings/frontend.tsx`  
**Project**: Nuxy — TypeScript/React Electron launcher (monorepo)

---

## 1. Executive Summary

| Metric                                                | Value                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| Total lines                                           | 768                                                                            |
| Exported components                                   | 1 (`SettingsView`)                                                             |
| Internal functions                                    | 4 (`buildFontFamilyMap`, `buildFontOptions`, `applyTheme`, `applySettings`)    |
| `useState` calls                                      | 9                                                                              |
| `useMemo` calls                                       | 9                                                                              |
| `useRef` calls                                        | 5                                                                              |
| `useEffect` calls                                     | 1 (but it contains 5 distinct async IPC branches)                              |
| `useCallback` calls                                   | 0                                                                              |
| Module-level constants                                | 11 (options arrays + `LANGUAGE_SLOT_LABELS` + `DEFAULT_SETTINGS` + `SECTIONS`) |
| `window.core` call-sites                              | 12                                                                             |
| IPC `.invoke(...)` call-sites                         | 8                                                                              |
| Row type discriminations (`isLanguage`/`isExtension`) | 22 (across 6 distinct code sites)                                              |
| Estimated cyclomatic complexity (SettingsView render) | ~18–22                                                                         |
| Maximum JSX nesting depth                             | 11 levels                                                                      |

**Risk Level**: MEDIUM — the component owns all settings read/write state and is covered by a thorough e2e suite. Extracting sub-components is low-risk; extracting the IPC layer into a hook is medium-risk (must not break the `stateRef` snapshot pattern).

**Estimated Refactoring Effort**:

- Phase 1 (constants + helpers to own file): 0.5 day
- Phase 2 (`useSettings` hook): 1 day
- Phase 3 (SettingRow renderer component): 0.5 day
- Phase 4 (per-section sub-components or section registry): 1 day
- Total: ~3 developer-days

---

## 2. Settings Inventory

All 13 core settings grouped by their logical section and 3 language slots:

### Section: General (4 settings)

| Key        | Label     | Control                | Notes                                                |
| ---------- | --------- | ---------------------- | ---------------------------------------------------- |
| `theme`    | Theme     | SelectBox              | Dynamic options from `window.core.themes.list()`     |
| `iconPack` | Icon Pack | SelectBox              | Dynamic options from `window.core.icons.listPacks()` |
| `zoom`     | Zoom      | SelectBox              | 6 fixed options                                      |
| `font`     | Font      | SelectBox (searchable) | 2 static + N system fonts from IPC                   |

### Section: Window (9 settings)

| Key               | Label            | Control   | Notes                                       |
| ----------------- | ---------------- | --------- | ------------------------------------------- |
| `escAction`       | Esc Key Action   | SelectBox | 4 options (shared with blurAction)          |
| `blurAction`      | Focus-Out Action | SelectBox | 4 options (same `ESC_ACTION_OPTIONS` array) |
| `windowWidth`     | Window Width     | SelectBox | 6 options                                   |
| `windowMaxHeight` | Max Height       | SelectBox | 5 options                                   |
| `windowPosition`  | Launch Position  | SelectBox | 10 options                                  |
| `opacity`         | Opacity          | SelectBox | 4 options                                   |
| `alwaysOnTop`     | Always on Top    | SelectBox | BOOL_OPTIONS                                |
| `showInTaskbar`   | Show in Taskbar  | SelectBox | BOOL_OPTIONS                                |
| `showOnStartup`   | Show on Startup  | SelectBox | BOOL_OPTIONS                                |

### Section: Language (3 virtual rows)

| Key      | Label                    | Control                | Notes      |
| -------- | ------------------------ | ---------------------- | ---------- |
| `lang:0` | Preferred Language (1st) | SelectBox (searchable) | 35 options |
| `lang:1` | Preferred Language (2nd) | SelectBox (searchable) | 35 options |
| `lang:2` | Preferred Language (3rd) | SelectBox (searchable) | 35 options |

### Dynamic sections: Extension Settings (N sections, N rows each)

- One section per installed extension that publishes a `settings.json` schema
- Each field maps to either: `SelectBox` (select/toggle type) or `Input` (text/color/number type)
- Values stored per `extId` in `extValues` state, saved via `saveExtensionSettingValues` IPC

---

## 3. Component / Function Inventory Table

| Name                                       | Kind                             | Lines   | LOC | Responsibility                                   |
| ------------------------------------------ | -------------------------------- | ------- | --- | ------------------------------------------------ |
| `SettingsView`                             | React component (default export) | 206–768 | 563 | All state, all IPC, full render tree             |
| `buildFontFamilyMap`                       | Pure function                    | 146–155 | 10  | Maps font name → CSS font-family string          |
| `buildFontOptions`                         | Pure function                    | 157–159 | 3   | Builds `SelectOption[]` for font picker          |
| `applyTheme` (inside SettingsView)         | Inner function                   | 479–495 | 17  | Fetches and applies theme CSS vars               |
| `applySettings` (inside SettingsView)      | Inner function                   | 497–501 | 5   | Applies zoom/font/theme to DOM                   |
| `updateSetting` (inside SettingsView)      | Inner function                   | 503–521 | 19  | Updates setting state + persists via IPC         |
| `updateLanguageSlot` (inside SettingsView) | Inner function                   | 523–538 | 16  | Deduplicates language list + calls updateSetting |
| `updateExtSetting` (inside SettingsView)   | Inner function                   | 540–548 | 9   | Updates ext value state + persists via IPC       |
| `_useTwoPanelNav` (module-level shim)      | Hook shim                        | 24–35   | 12  | Fallback when `window.UI.useTwoPanelNav` absent  |

**Observation**: All 5 inner functions plus 9 `useMemo` blocks and 9 `useState` declarations live inside the single `SettingsView` function body. There are no sub-components at all — the 563-line component renders everything inline.

---

## 4. Code Smell Analysis Table

| Smell                                 | Location(s)                                               | Severity | Description                                                                                                                                                                                                               |
| ------------------------------------- | --------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| God Component                         | `SettingsView` (entire file)                              | HIGH     | Single component owns all data fetching, all state, keyboard navigation, and the complete render tree.                                                                                                                    |
| Row type discrimination repeated 6×   | Lines 406, 409, 420, 427, 654–661, 698–705                | HIGH     | `isLanguage`/`isExtension` switch-on-type logic is duplicated across the `rightPanelActions` useMemo, the `Enter` handler, the render loop's value getter, the isSelectType check, and the SelectBox `onSelect` callback. |
| Inline handler functions in JSX       | Lines 674–680, 699–715, 721–752                           | HIGH     | `onClick`, `onSelect`, `onClose`, `onOpen`, `onChange`, `onBlur`, `onKeyDown` all defined inline per row inside `.map()`. Creates new function objects on every render.                                                   |
| Monolithic `useEffect`                | Lines 550–618                                             | HIGH     | Five independent async operations (themes, iconPacks, systemFonts, getSettings, getExtensionSettingsSchemas + per-ext value loads) in a single `useEffect` with `[]` dep array. Hard to test, hard to retry individually. |
| `stateRef` snapshot anti-pattern      | Lines 333–342                                             | MEDIUM   | A `stateRef` is manually kept in sync on every render to work around stale closure issues in `useMemo`-defined keyboard handlers. A custom hook or `useReducer` would eliminate this pattern cleanly.                     |
| 11-level JSX nesting                  | Lines 637–763                                             | MEDIUM   | `ScrollArea > Fragment > SectionHeader + List > ListItem > ListItemBody > ListItemText / ListItemActions > SelectBox / Input`. Deeply nested JSX kills readability and makes extraction mechanically obvious.             |
| Duplicated `DEFAULT_SETTINGS` object  | `frontend.tsx:161` and `backend.ts:4`                     | MEDIUM   | The same default values are defined in both the backend and the frontend. A single source of truth in `types.ts` or a shared constants file would eliminate the risk of drift.                                            |
| Module-level constants bloat          | Lines 41–144                                              | LOW      | 11 constant arrays (options, labels) totalling ~100 lines live at module scope in the same file as the component. They are logically distinct and belong in a `constants.ts` sibling file.                                |
| Missing `useCallback`                 | `updateSetting`, `updateLanguageSlot`, `updateExtSetting` | LOW      | Three frequently-called mutation functions are re-created on every render. They should be `useCallback`-wrapped or extracted into a hook.                                                                                 |
| Implicit `window.UI` destructuring    | Lines 207–219                                             | LOW      | All 11 UI components are destructured from `window.UI` inside the component body on every render, producing 11 variables whose stability is not guaranteed. A module-level getter would be cleaner.                       |
| `inputRefs` indentation inconsistency | Line 236                                                  | LOW      | Missing 2-space indent (minor formatting regression).                                                                                                                                                                     |

---

## 5. Complexity Metrics Table

| Scope                                           | Estimated Cyclomatic Complexity | Max Nesting Depth | Notes                                |
| ----------------------------------------------- | ------------------------------- | ----------------- | ------------------------------------ |
| `SettingsView` (full)                           | 22                              | 11 (JSX)          | Includes all inner functions         |
| `rightPanelActions` useMemo (Enter handler)     | 8                               | 5                 | isLang × isExtension × type checks   |
| `rightPanelActions` useMemo (ArrowDown handler) | 4                               | 3                 | activeSelect branch + row check      |
| `updateSetting`                                 | 4                               | 3                 | key-specific dispatches              |
| `updateLanguageSlot`                            | 3                               | 2                 | splice/dedup                         |
| `applyTheme`                                    | 3                               | 3                 | optional chain guards                |
| Row render (inside `.map()`)                    | 7                               | 6                 | isLanguageRow × isExtension × type   |
| `useEffect` (init)                              | 6                               | 4                 | 5 async branches, per-ext inner loop |
| `extSections` useMemo                           | 2                               | 2                 | map + field.type check               |
| `sectionsToRender` useMemo                      | 2                               | 2                 | base + lang + ext concat             |

The Enter keyboard handler alone has complexity 8, which exceeds the conventional limit of 5 for a single function. Combined with the render method's complexity, this component scores well above safe thresholds.

---

## 6. IPC Call Inventory

All calls to `window.core` APIs discovered in the file:

| #   | Location                  | Target               | Channel                       | Direction | Purpose                                |
| --- | ------------------------- | -------------------- | ----------------------------- | --------- | -------------------------------------- |
| 1   | `applyTheme()` L481       | `kernel`             | `getThemeByName`              | read      | Fetch CSS vars for selected theme      |
| 2   | `updateSetting()` L515    | `com.nuxy.settings`  | `saveSettings`                | write     | Persist full settings object           |
| 3   | `updateSetting()` L518    | `kernel`             | `applyWindowSettings`         | write     | Apply window config to Electron        |
| 4   | `updateExtSetting()` L545 | `com.nuxy.settings`  | `saveExtensionSettingValues`  | write     | Persist ext field values               |
| 5   | `useEffect` L553          | `window.core.themes` | `list()`                      | read      | Load available theme names             |
| 6   | `useEffect` L563          | `window.core.icons`  | `listPacks()`                 | read      | Load available icon packs              |
| 7   | `useEffect` L573          | `kernel`             | `listSystemFonts`             | read      | Load system font list                  |
| 8   | `useEffect` L583          | `com.nuxy.settings`  | `getSettings`                 | read      | Load persisted settings on mount       |
| 9   | `useEffect` L594          | `kernel`             | `getExtensionSettingsSchemas` | read      | Load ext schema definitions            |
| 10  | `useEffect` L601          | `com.nuxy.settings`  | `getExtensionSettingValues`   | read      | Load values per ext (one call per ext) |

**Note**: Calls 5–10 all fire inside a single `useEffect`. Call 10 fires N times (once per discovered extension) inside a loop within that same effect.

---

## 7. Extraction Proposals

### 7.1 Extract constants to `constants.ts`

**Risk**: None. Pure refactor.

```
// BEFORE: frontend.tsx, lines 41–176 — 11 constant declarations inline
const ZOOM_OPTIONS: SelectOption<string>[] = [...]
const FONT_OPTIONS_STATIC = [...]
// ... 9 more

// AFTER: extensions/settings/constants.ts
export const ZOOM_OPTIONS: SelectOption<string>[] = [...]
export const DEFAULT_SETTINGS: NuxySettings = { ... }
// ... all 11 constants

// frontend.tsx — top import
import {
  ZOOM_OPTIONS, FONT_OPTIONS_STATIC, ESC_ACTION_OPTIONS,
  WINDOW_WIDTH_OPTIONS, WINDOW_MAX_HEIGHT_OPTIONS,
  WINDOW_POSITION_OPTIONS, OPACITY_OPTIONS, BOOL_OPTIONS,
  LANGUAGE_OPTIONS, LANGUAGE_SLOT_LABELS, DEFAULT_SETTINGS, SECTIONS
} from './constants.ts'
```

**Impact**: Removes ~140 lines from `frontend.tsx`. Enables backend and frontend to share `DEFAULT_SETTINGS` from a single source.

---

### 7.2 Extract `useSettings` hook

**Risk**: MEDIUM. Must preserve `stateRef` snapshot semantics and the `applySettings` DOM side-effect pattern.

```typescript
// BEFORE: 9 useState + 1 useEffect + 3 mutation functions inline in SettingsView

// AFTER: extensions/settings/useSettings.ts
export interface UseSettingsReturn {
  settings: NuxySettings
  themes: SelectOption[]
  iconPacks: SelectOption[]
  systemFonts: string[]
  extSchemas: ExtSettingsInfo[]
  extValues: Record<string, Record<string, unknown>>
  updateSetting: (key: keyof NuxySettings, value: unknown) => void
  updateLanguageSlot: (langIndex: number, value: string) => void
  updateExtSetting: (extId: string, key: string, value: unknown) => void
  setExtValues: React.Dispatch<React.SetStateAction<Record<string, Record<string, unknown>>>>
}

export function useSettings(fontFamilyMap: Record<string, string>): UseSettingsReturn {
  const [themes, setThemes] = useState<SelectOption[]>([])
  const [iconPacks, setIconPacks] = useState<SelectOption[]>([])
  const [systemFonts, setSystemFonts] = useState<string[]>([])
  const [settings, setSettings] = useState<NuxySettings>(DEFAULT_SETTINGS)
  const [extSchemas, setExtSchemas] = useState<ExtSettingsInfo[]>([])
  const [extValues, setExtValues] = useState<Record<string, Record<string, unknown>>>({})

  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const applyTheme = useCallback((name: string) => { ... }, [])
  const applySettings = useCallback((s: NuxySettings) => { ... }, [fontFamilyMap])
  const updateSetting = useCallback((key, value) => { ... }, [fontFamilyMap])
  const updateLanguageSlot = useCallback((idx, value) => { ... }, [updateSetting])
  const updateExtSetting = useCallback((extId, key, value) => { ... }, [])

  useEffect(() => {
    /* load themes */
  }, [])
  useEffect(() => {
    /* load iconPacks */
  }, [])
  useEffect(() => {
    /* load systemFonts */
  }, [])
  useEffect(() => {
    /* load settings */
    /* load extSchemas + extValues */
  }, [])

  return { settings, themes, iconPacks, systemFonts, extSchemas, extValues,
           updateSetting, updateLanguageSlot, updateExtSetting, setExtValues }
}

// SettingsView becomes:
export default function SettingsView({ query: _query }: Props) {
  const fontFamilyMap = useMemo(() => buildFontFamilyMap(systemFonts), [systemFonts])
  // ↑ chicken-and-egg: systemFonts comes from the hook, fontFamilyMap goes in.
  // Resolution: pass fontFamilyMap setter or keep fontFamilyMap computation inside the hook.
  const { settings, themes, ... } = useSettings()
  ...
}
```

**Impact**: Removes ~120 lines from `SettingsView`. Makes data-loading independently testable with `renderHook`. Splits the `useEffect` monolith into up to 4 focused effects (themes, iconPacks, systemFonts, settings+exts).

---

### 7.3 Extract `SettingRow` render component

**Risk**: LOW–MEDIUM. Pure rendering, no state owned. Must receive all callbacks as props.

```tsx
// BEFORE: lines 663–758 — inline per-row render inside .map()

// AFTER: extensions/settings/SettingRow.tsx
interface SettingRowProps {
  row: AnyRow
  globalIdx: number
  isActive: boolean
  activeSelect: string | null
  selectFocused: number
  currentValue: unknown
  settings: NuxySettings
  extValues: Record<string, Record<string, unknown>>
  nav: UseTwoPanelNavResult
  onSelect: (v: unknown) => void
  onClose: () => void
  onOpen: (idx: number) => void
  onInputChange: (v: string) => void
  onInputBlur: (v: string) => void
  setSelectedRow: (idx: number) => void
}

function SettingRow({ row, globalIdx, isActive, ... }: SettingRowProps) {
  const isLanguageRow = 'isLanguage' in row && row.isLanguage
  const isSelectType = isLanguageRow || !row.isExtension ||
                       row.type === 'select' || row.type === 'toggle'
  return (
    <ListItem active={isActive} onClick={...}>
      <ListItemBody>
        <ListItemText>{row.label}</ListItemText>
        {row.isExtension && row.description && <span ...>{row.description}</span>}
      </ListItemBody>
      <ListItemActions>
        {isSelectType ? <SelectBox ... /> : <Input ... />}
      </ListItemActions>
    </ListItem>
  )
}
```

**Impact**: Reduces inline JSX nesting from 11 to ~7 levels in `SettingsView`. Isolates the row-type discrimination logic to one location. Enables memoization per-row with `React.memo`.

---

### 7.4 Extract `SettingsSection` render component

**Risk**: LOW. Pure rendering, wraps `SectionHeader` + `List` + row map.

```tsx
// BEFORE: lines 638–762 — sectionsToRender.map() inlined in the ScrollArea

// AFTER: extensions/settings/SettingsSection.tsx
interface SettingsSectionProps {
  section: RenderSection
  sectionOffset: number
  selectedRow: number
  activeSelect: string | null
  selectFocused: number
  focusArea: string
  activeSectionId: string
  settings: NuxySettings
  extValues: Record<string, Record<string, unknown>>
  nav: UseTwoPanelNavResult
  sectionRef: React.RefCallback<HTMLDivElement>
  onUpdateSetting: (key: keyof NuxySettings, v: unknown) => void
  onUpdateExtSetting: (extId: string, key: string, v: unknown) => void
  onUpdateLanguageSlot: (idx: number, v: string) => void
  setSelectedRow: (idx: number) => void
  setActiveSelect: (key: string | null) => void
  setSelectFocused: (idx: number) => void
  setExtValues: React.Dispatch<...>
}

function SettingsSection(props: SettingsSectionProps) {
  return (
    <React.Fragment key={props.section.id}>
      <SectionHeader ref={props.sectionRef} label={props.section.label} />
      <List>
        {props.section.resolvedRows.map((row, i) => (
          <SettingRow key={row.key} row={row} globalIdx={props.sectionOffset + i} ... />
        ))}
      </List>
    </React.Fragment>
  )
}
```

**Impact**: `SettingsView` render section shrinks from ~130 lines to ~20 lines.

---

### 7.5 Unify row-type discrimination with a helper function

**Risk**: NONE. Pure logic refactor, no React surface changes.

```typescript
// BEFORE: `isLanguage in row && row.isLanguage` appears 4 times;
//         `row.isExtension` branching appears at 6 sites.

// AFTER: extensions/settings/row-utils.ts
export function getRowCurrentValue(
  row: AnyRow,
  settings: NuxySettings,
  extValues: Record<string, Record<string, unknown>>
): unknown {
  if ('isLanguage' in row && row.isLanguage)
    return settings.preferredLanguages?.[row.langIndex] ?? ''
  if (row.isExtension) return extValues[row.extId]?.[row.fieldKey] ?? row.default ?? ''
  return settings[row.key]
}

export function isSelectTypeRow(row: AnyRow): boolean {
  if ('isLanguage' in row && row.isLanguage) return true
  if (!row.isExtension) return true
  return row.type === 'select' || row.type === 'toggle'
}

export function handleRowSelectCallback(
  row: AnyRow,
  value: unknown,
  callbacks: { updateSetting; updateLanguageSlot; updateExtSetting }
): void {
  if ('isLanguage' in row && row.isLanguage) {
    callbacks.updateLanguageSlot(row.langIndex, value as string)
  } else if (row.isExtension) {
    callbacks.updateExtSetting(row.extId, row.fieldKey, value)
  } else {
    callbacks.updateSetting(row.key, value)
  }
}
```

**Impact**: Eliminates all 6 duplicated discrimination sites. Centralises the 22 occurrences into 3 utility functions, each with a single decision path. Simplifies the Enter-key handler significantly.

---

### 7.6 Split `useEffect` monolith into focused effects

**Risk**: LOW — with careful ordering. Each fetch is independent.

```typescript
// BEFORE: one useEffect([]) with 5+ async branches

// AFTER (inside useSettings hook):
useEffect(() => {
  /* fetch themes */
}, [])
useEffect(() => {
  /* fetch iconPacks */
}, [])
useEffect(() => {
  /* fetch systemFonts */
}, [])
useEffect(() => {
  /* fetch getSettings, then getExtensionSettingsSchemas, then per-ext values */
}, [])
```

The settings + extension schemas must stay in one effect since ext-value loading depends on the schema response. Themes, icon packs, and system fonts are all independent.

---

## 8. Risk Matrix

| Extraction                                                  | Risk   | Why Safe / Why Risky                                                                                         | Mitigation                                                                                            |
| ----------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Constants to `constants.ts`                                 | NONE   | No logic change, pure file move                                                                              | Run `pnpm -C src test` to confirm no import breakage                                                  |
| `buildFontFamilyMap` / `buildFontOptions` to `constants.ts` | NONE   | Already pure functions                                                                                       | Same                                                                                                  |
| Row discrimination to `row-utils.ts`                        | NONE   | Pure functions, fully testable                                                                               | Add unit tests before extracting                                                                      |
| `SettingRow` component                                      | LOW    | No state, receives all props; risk is prop count explosion                                                   | Use a `callbacks` object to reduce prop surface                                                       |
| `SettingsSection` component                                 | LOW    | Composes `SettingRow`; same as above                                                                         | Memoize with `React.memo` keyed on section id                                                         |
| `useSettings` hook                                          | MEDIUM | Must preserve `applySettings` side-effect timing; must not break stateRef pattern                            | Extract after unit tests for `updateSetting` exist; validate with e2e                                 |
| Splitting `useEffect`                                       | MEDIUM | Order matters for `applySettings` call (settings must load before applying)                                  | Load settings in its own effect, add an `isLoaded` ref to gate `applySettings`                        |
| Changing keyboard handler shape                             | HIGH   | e2e tests assert exact keyboard nav sequences; the `rightPanelActions` shape is consumed by `useTwoPanelNav` | Do NOT change the `actions` array shape or key names; only reorganise how the handler body dispatches |
| Moving `DEFAULT_SETTINGS` to shared file                    | LOW    | Backend and frontend both define it; unifying removes drift risk                                             | Must ensure the shared file is importable from both Worker context and renderer context               |

### Settings That Require Special Care During Refactoring

| Setting              | Why Risky                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `preferredLanguages` | Triggers `nuxy-locale-changed` custom event in addition to normal save; dedup logic in `updateLanguageSlot` must not be broken |
| `theme`              | Triggers `applyTheme()` which calls `getThemeByName` IPC and patches CSS variables on `document.documentElement`               |
| `font`               | Writes to `document.body.style.fontFamily` using the `fontFamilyMap` lookup                                                    |
| `zoom`               | Writes to `document.documentElement.style.zoom` immediately on change                                                          |
| Any setting          | All settings trigger `applyWindowSettings` kernel IPC call after save                                                          |

---

## 9. Step-by-Step Execution Plan

### Phase 1: Safe Groundwork (0.5 day, zero behavioral change)

**Step 1.1** — Extract all module-level constants and pure functions to `extensions/settings/constants.ts`:

- Move: `ZOOM_OPTIONS`, `FONT_OPTIONS_STATIC`, `ESC_ACTION_OPTIONS`, `WINDOW_WIDTH_OPTIONS`, `WINDOW_MAX_HEIGHT_OPTIONS`, `WINDOW_POSITION_OPTIONS`, `OPACITY_OPTIONS`, `BOOL_OPTIONS`, `LANGUAGE_OPTIONS`, `LANGUAGE_SLOT_LABELS`, `DEFAULT_SETTINGS`, `SECTIONS`, `buildFontFamilyMap`, `buildFontOptions`
- Import them in `frontend.tsx`
- Remove duplicate `DEFAULT_SETTINGS` from `backend.ts` by importing from `constants.ts`

**Step 1.2** — Fix the indentation regression on line 236 (`inputRefs`).

**Step 1.3** — Run full test suite: `pnpm -C src test`

---

### Phase 2: Row Discrimination Helpers (0.5 day)

**Step 2.1** — Create `extensions/settings/row-utils.ts` with:

- `getRowCurrentValue(row, settings, extValues): unknown`
- `isSelectTypeRow(row): boolean`
- `handleRowSelectCallback(row, value, callbacks): void`

**Step 2.2** — Write unit tests for all three functions in `extensions/settings/row-utils.test.ts`.

**Step 2.3** — Replace all 6 discrimination sites in `frontend.tsx` with calls to the utilities.

**Step 2.4** — Simplify the `Enter` key handler body (currently complexity 8 → target ≤ 4).

**Step 2.5** — Run tests.

---

### Phase 3: `useSettings` Hook (1 day)

**Step 3.1** — Create `extensions/settings/useSettings.ts`.

**Step 3.2** — Move these items into the hook:

- All 6 data `useState` declarations (`themes`, `iconPacks`, `systemFonts`, `settings`, `extSchemas`, `extValues`)
- `applyTheme` inner function
- `applySettings` inner function
- `updateSetting` inner function
- `updateLanguageSlot` inner function
- `updateExtSetting` inner function
- The `useEffect` (split into ≤4 focused effects as described in §7.6)
- The `fontFamilyMap` and `fontOptions` memos (or move to hook, accept systemFonts as return)

**Step 3.3** — Wrap mutation functions in `useCallback`.

**Step 3.4** — Expose a `settingsRef` from the hook (or return a `getSnapshot()` function) to replace the manual `stateRef.current = {...}` pattern in `SettingsView`.

**Step 3.5** — Update `SettingsView` to consume the hook.

**Step 3.6** — Run full test suite + e2e: `pnpm -C src test` then `pnpm -C src test:e2e:core`.

---

### Phase 4: Sub-Components (1 day)

**Step 4.1** — Create `extensions/settings/SettingRow.tsx`:

- Props: row, globalIdx, isActive, currentValue, activeSelect, selectFocused, callbacks object, nav ref
- Internals: calls `isSelectTypeRow`, `handleRowSelectCallback` from `row-utils.ts`
- Export as `React.memo(SettingRow)`

**Step 4.2** — Create `extensions/settings/SettingsSection.tsx`:

- Props: section, sectionOffset, sectionRef, and all row-level props passed through
- Renders `SectionHeader` + `List` + `section.resolvedRows.map(SettingRow)`

**Step 4.3** — Replace the `sectionsToRender.map()` block in `SettingsView` (lines 638–763) with:

```tsx
{sectionsToRender.map((section) => (
  <SettingsSection key={section.id} section={section} ... />
))}
```

**Step 4.4** — Keep `selectedRow`, `activeSelect`, `selectFocused`, `navSections`, `allRows`, and `rightPanelActions` in `SettingsView` — these belong to navigation state that is tightly coupled to `useTwoPanelNav`.

**Step 4.5** — Run full test suite + e2e.

---

### Phase 5: Polish (0.25 day)

**Step 5.1** — Remove `stateRef` pattern from `SettingsView` once hook exposes a `getSnapshot()` or the keyboard action closures reference stable callbacks from the hook.

**Step 5.2** — Add JSDoc to the hook's return type and all three `row-utils` functions.

**Step 5.3** — Run `pnpm format` to ensure consistent style across new files.

---

## 10. Target File Structure After Refactoring

```
extensions/settings/
  manifest.json
  types.ts              — (unchanged)
  constants.ts          — NEW: all options arrays + DEFAULT_SETTINGS + SECTIONS
  row-utils.ts          — NEW: getRowCurrentValue, isSelectTypeRow, handleRowSelectCallback
  row-utils.test.ts     — NEW: unit tests for row-utils
  useSettings.ts        — NEW: data loading + mutation hook
  SettingRow.tsx         — NEW: single-row render component
  SettingsSection.tsx    — NEW: section render component
  frontend.tsx          — SHRINKS: ~768 → ~180 lines (navigation state + layout only)
  backend.ts            — MINOR: import DEFAULT_SETTINGS from constants.ts
  backend.test.ts       — (unchanged)
  e2e.spec.ts           — (unchanged — all behavioral contracts preserved)
  locales/
    en.json
    tr.json
```

**Projected `frontend.tsx` line count after all phases**: ~170–200 lines (navigation state, useMemo for derived data, left/right panel JSX, TwoPanel return).

---

## 11. TodoWrite-Compatible JSON Task List

```json
[
  {
    "id": "settings-refactor-1.1",
    "content": "Extract all module-level constants and pure helpers from extensions/settings/frontend.tsx to extensions/settings/constants.ts. Update backend.ts to import DEFAULT_SETTINGS from constants.ts.",
    "status": "pending",
    "priority": "high"
  },
  {
    "id": "settings-refactor-1.2",
    "content": "Fix indentation regression on line 236 of frontend.tsx (inputRefs declaration missing 2-space indent).",
    "status": "pending",
    "priority": "low"
  },
  {
    "id": "settings-refactor-1.3",
    "content": "Run pnpm -C src test after Phase 1 to confirm no regressions from constant extraction.",
    "status": "pending",
    "priority": "high"
  },
  {
    "id": "settings-refactor-2.1",
    "content": "Create extensions/settings/row-utils.ts with: getRowCurrentValue(row, settings, extValues), isSelectTypeRow(row), handleRowSelectCallback(row, value, callbacks).",
    "status": "pending",
    "priority": "high"
  },
  {
    "id": "settings-refactor-2.2",
    "content": "Write unit tests for all three row-utils functions in extensions/settings/row-utils.test.ts before integrating them into frontend.tsx.",
    "status": "pending",
    "priority": "high"
  },
  {
    "id": "settings-refactor-2.3",
    "content": "Replace all 6 row-type discrimination sites (isLanguage/isExtension branching) in frontend.tsx with calls to row-utils functions.",
    "status": "pending",
    "priority": "high"
  },
  {
    "id": "settings-refactor-2.4",
    "content": "Simplify the Enter-key handler inside rightPanelActions useMemo using row-utils helpers. Target cyclomatic complexity <= 4 (down from ~8).",
    "status": "pending",
    "priority": "medium"
  },
  {
    "id": "settings-refactor-3.1",
    "content": "Create extensions/settings/useSettings.ts. Move: all 6 data useState declarations, applyTheme, applySettings, updateSetting, updateLanguageSlot, updateExtSetting, fontFamilyMap/fontOptions memos, and the monolithic useEffect (split into <= 4 focused effects).",
    "status": "pending",
    "priority": "high"
  },
  {
    "id": "settings-refactor-3.2",
    "content": "Wrap updateSetting, updateLanguageSlot, updateExtSetting in useCallback inside the useSettings hook.",
    "status": "pending",
    "priority": "medium"
  },
  {
    "id": "settings-refactor-3.3",
    "content": "Replace the manual stateRef.current = {...} snapshot pattern in SettingsView with a getSnapshot() or stable-ref approach from the useSettings hook.",
    "status": "pending",
    "priority": "medium"
  },
  {
    "id": "settings-refactor-3.4",
    "content": "Update SettingsView to consume useSettings hook. Run pnpm -C src test and pnpm -C src test:e2e:core to validate Phase 3.",
    "status": "pending",
    "priority": "high"
  },
  {
    "id": "settings-refactor-4.1",
    "content": "Create extensions/settings/SettingRow.tsx as a React.memo component. It receives row, globalIdx, isActive, currentValue, activeSelect, selectFocused, a callbacks object, and nav ref as props.",
    "status": "pending",
    "priority": "medium"
  },
  {
    "id": "settings-refactor-4.2",
    "content": "Create extensions/settings/SettingsSection.tsx. It renders SectionHeader + List + rows.map(SettingRow). Pass sectionRef via ref callback prop.",
    "status": "pending",
    "priority": "medium"
  },
  {
    "id": "settings-refactor-4.3",
    "content": "Replace the sectionsToRender.map() block in SettingsView (lines 638-763) with SettingsSection components. Target frontend.tsx line count: <= 200.",
    "status": "pending",
    "priority": "medium"
  },
  {
    "id": "settings-refactor-4.4",
    "content": "Run full suite pnpm -C src test + pnpm -C src test:e2e:core after Phase 4 to verify e2e keyboard navigation tests still pass.",
    "status": "pending",
    "priority": "high"
  },
  {
    "id": "settings-refactor-5.1",
    "content": "Run pnpm format on all new and modified files in extensions/settings/ to enforce consistent style.",
    "status": "pending",
    "priority": "low"
  }
]
```

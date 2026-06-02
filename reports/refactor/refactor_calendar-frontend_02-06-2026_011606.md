# Refactoring Assessment: `extensions/calendar/frontend.tsx`

**Generated:** 2026-06-02  
**File:** `/home/xava/Documents/nuxy/extensions/calendar/frontend.tsx`  
**Analyst:** Senior Software Architect (Claude Sonnet 4.6)

---

## 1. Executive Summary

| Metric | Value |
|---|---|
| Total lines | 1,016 |
| Exported components | 1 (`CalendarApp`) |
| Internal render functions | 1 (`renderMonthGrid`) |
| Module-level utility functions | 8 |
| `useState` calls | 16 |
| `useEffect` calls | 8 (9 including lines with `useEffect`) |
| `useMemo` calls | 3 |
| `useRef` calls | 2 |
| IPC call sites | 8 |
| Inline `style={{}}` objects | 22 |
| Confirmed bugs | 2 |
| Code duplications with `calendar-utils.ts` | 4 functions |
| **Risk level** | **MEDIUM** |
| **Estimated refactor effort** | **3-5 days (solo)** |

### Hard Constraint

`EXTENSION_GUIDE.md §5` mandates: **"frontend.tsx must be a single self-contained file — no relative imports."**

This is the most important constraint for the refactoring plan. Sub-components, custom hooks, and utility functions **may not be extracted to sibling files**. All extracted logic must stay inside `frontend.tsx` itself, restructured within the single file. The 4 utility functions duplicated in `calendar-utils.ts` cannot be imported — they exist in backend-consumed modules, not the browser context.

---

## 2. Component and Function Inventory

### 2.1 React Components

| Name | Type | Lines | Line Count | Responsibility |
|---|---|---|---|---|
| `CalendarApp` | Default export, god component | 139–1016 | 877 | Everything: state management, data loading, keyboard routing, 4 view renders |
| _(month grid inline)_ | Render function `renderMonthGrid()` | 601–745 | 144 | Month grid JSX + click handlers |
| _(search list inline)_ | JSX block in `CalendarApp` | 750–802 | 52 | Search results list |
| _(day view inline)_ | JSX block in `CalendarApp` | 808–858 | 50 | Day event list |
| _(create view inline)_ | JSX block in `CalendarApp` | 860–950 | 90 | Create event form |
| _(detail view inline)_ | JSX block in `CalendarApp` | 952–1013 | 61 | Edit event reminder |

**No sub-components are extracted**. All 4 views are rendered as conditional JSX branches directly inside the god component.

### 2.2 Module-Level Utility Functions

| Name | Lines | Duplicated in `calendar-utils.ts`? |
|---|---|---|
| `getDaysInMonth(year, month)` | 29–31 | YES — exact duplicate of `calendar-utils.ts:12` |
| `buildGrid(year, month, weekStart)` | 33–43 | PARTIAL — returns `GridCell[]` with `monthOffset` for overflow days; `buildCalendarGrid` in utils returns `(number\|null)[]` without overflow info |
| `shiftDays(year, month, day, delta)` | 47–55 | YES — equivalent to `navigateDays()` in utils |
| `eventsForDay(events, year, month, day)` | 57–61 | YES — equivalent to `filterEventsByDay()` in utils |
| `daysWithEvents(events, year, month)` | 63–70 | YES — equivalent to `getEventDays()` in utils |
| `ipcCall(channel, payload)` | 118–124 | NO — calendar-specific wrapper |
| `showOmniBar()` | 126–130 | NO — shell event dispatch |
| `hideOmniBar()` | 132–136 | NO — shell event dispatch |

### 2.3 Functions Defined Inside `CalendarApp`

| Name | Lines | Purpose |
|---|---|---|
| `loadMonthEvents(year, month)` | 247–253 | IPC: fetch events for a month |
| `loadSearchRange()` | 255–261 | IPC: fetch 6-month range for search |
| `enterCalendarMode()` | 317–322 | Nav: omnibox → calendar/month |
| `returnToOmnibox()` | 324–329 | Nav: calendar → omnibox |
| `navigateBy(delta)` | 331–340 | Nav: arrow key day shift with animation trigger |
| `enterDayView()` | 342–345 | Nav: month → day |
| `enterCreate()` | 347–354 | Nav: → create form |
| `enterDetail(evt)` | 356–362 | Nav: → detail view |
| `backToMonth()` | 364–369 | Nav: day/create/detail → month |
| `backToDay()` | 371–378 | Nav: create/detail → day |
| `getSelectOptions(field)` | 379–381 | Lookup: options array for a select field |
| `getSelectValue(field)` | 383–385 | Read: current value via stateRef |
| `setSelectValue(field, val)` | 387–390 | Write: set time or reminder value |

---

## 3. Hook Usage Analysis

### 3.1 State Variables (16 `useState` calls)

| State | Init | Lines | Concern |
|---|---|---|---|
| `mode` | `'omnibox'` | 158 | Core view mode |
| `monthEnterDir` | `null` | 159 | Animation direction — transient, never reset after use |
| `calYear` | `todayYear` | 161 | Calendar navigation |
| `calMonth` | `todayMonth` | 162 | Calendar navigation |
| `selectedDay` | `todayDate` | 163 | Calendar navigation |
| `calView` | `'month'` | 164 | View routing |
| `monthEvents` | `[]` | 166 | Remote data |
| `searchEvents` | `[]` | 167 | Remote data |
| `listIdx` | `-1` | 169 | List cursor |
| `editingEvent` | `null` | 170 | Detail view subject |
| `weekStart` | `1` | 172 | Config |
| `defaultReminderMin` | `0` | 173 | Config — STALE CLOSURE BUG (see §5) |
| `timeValue` | `'10'` | 176 | Create form |
| `reminderValue` | `'0'` | 177 | Create/detail form |
| `formFieldIdx` | `0` | 178 | Form field focus |
| `activeSelect` | `null` | 179 | Dropdown open state |
| `selectFocused` | `0` | 180 | Dropdown cursor |

### 3.2 Derived State (3 `useMemo` calls)

| Derived | Dependencies | Lines |
|---|---|---|
| `dayEvents` | `monthEvents, calYear, calMonth, selectedDay` | 183–186 |
| `filteredSearch` | `searchEvents, query` | 188–192 |
| `eventDays` | `monthEvents, calYear, calMonth` | 194–197 |

### 3.3 Effects (8 `useEffect` calls)

| # | Deps | Purpose | Issues |
|---|---|---|---|
| 1 | `[]` | Load config (`weekStart`, `defaultReminderMin`) | None |
| 2 | `[calYear, calMonth]` | Load month events | `loadMonthEvents` not stable (plain function) |
| 3 | `[hasQuery]` | Load search range on query presence | None |
| 4 | `[mode]` | Reset view/index on mode change | None |
| 5 | `[]` | Inject slide animation CSS once | Direct DOM mutation, coupling |
| 6 | `[]` | Restore last result on mount | Direct `window.core.ipc.invoke` bypass of `ipcCall` |
| 7 | `[mode, calView, listIdx, activeSelect, formFieldIdx, selectedDay]` | Dispatch key-hints event | None |
| 8 | `[mode, calView, listIdx, dayEvents, editingEvent, calYear, calMonth, selectedDay, timeValue, reminderValue, query, activeSelect]` | Register shell actions | **STALE CLOSURE BUG** (see §5) |

### 3.4 Refs (2 `useRef` calls)

| Name | Purpose | Issue |
|---|---|---|
| `stateRef` | Snapshot of all state for stale-closure-safe key handlers | 17-field bulk snapshot — brittle |
| _(implicit in `_useToolKeyActions`)_ | Managed inside hook | None |

---

## 4. Code Smell Analysis

| Smell | Location | Severity | Description |
|---|---|---|---|
| **God component** | `CalendarApp` (877 lines) | HIGH | Single component owns all state, all data loading, all keyboard routing, and renders 4 distinct views. No separation of concerns. |
| **Stale closure in action effect** | L529–598, specifically `enterCreate` | HIGH | `enterCreate` closes over `defaultReminderMin` which is NOT in the dependency array of the action `useEffect`. When config loads asynchronously, the registered "Save Event" action calls `enterCreate` with the stale initial value (`0`) until a listed dep changes. |
| **Duplicate utility functions** | L29–70 | MEDIUM | Four module-level functions (`getDaysInMonth`, `eventsForDay`, `daysWithEvents`, `shiftDays`) are exact or near-exact duplicates of functions already in `calendar-utils.ts`. Since frontend cannot import from `calendar-utils.ts` (extension constraint), these cannot be removed — but they need a comment explaining the intentional duplication. |
| **Duplicate JSX block** | L785–795 and L841–851 | MEDIUM | The `IconBell` rendering inside `ListItemActions` is identical in both the search-list view and the day-list view. Could be a local `EventReminderBadge` const component inside the file. |
| **Mixed concerns in `renderMonthGrid()`** | L601–745 | MEDIUM | Combines grid computation, animation trigger logic, click handlers with navigation side-effects, and all cell styling. A 144-line render function with a nested 69-line click handler. |
| **`setTimeout` for state coordination** | L691, L699, L768–770 | MEDIUM | Three `setTimeout(..., 0)` calls to sequence state updates across the current-month vs. next-month click paths. This is a code smell indicating missing `startTransition` or state consolidation. |
| **`monthEnterDir` never reset** | L159, L335, L667 | LOW | `monthEnterDir` is set to `'fromTop'/'fromBottom'` before month change but never reset to `null` afterwards. The animation CSS `key` prop on the grid div forces remount, so the animation still plays, but the ref remains dirty between renders. |
| **`todayObj` recomputed every render** | L152–156 | LOW | `todayYear`, `todayMonth`, `todayDate` are derived from `new Date()` on every render without memoization. They're used in effects and `renderMonthGrid`. Should be `useMemo(() => {...}, [])` or module-level constants. |
| **`CREATE_SELECT_FIELDS` diverges from `calendar-create-form.ts`** | L75–76 | LOW | Frontend defines `['time', 'reminder']` but `calendar-create-form.ts` defines `CREATE_FORM_FIELDS = ['title', 'time', 'reminder']`. The `formFieldIdx` state is indexed against different arrays in different modules, making tests of key navigation and form field logic non-portable. |
| **Bypass of `ipcCall` wrapper** | L292–294 | LOW | The "restore last result" effect calls `window.core.ipc.invoke(EXT_ID, 'getLastResult')` directly instead of using the local `ipcCall()` wrapper. The response shape is also re-typed inline (`{ success, data }`) rather than using the wrapper's error handling. |
| **Inline error erasure** | L243, L252, L260, etc. | LOW | All `.catch(() => {})` calls silently discard errors. No user-facing error state, no logging. |
| **17-field `stateRef` bulk snapshot** | L200–234 | LOW | The stateRef contains every piece of state to avoid stale closures in key handlers. This is a known and valid pattern for `_useToolKeyActions`, but the sheer breadth (17 fields) indicates the component has too much state for a single unit. |
| **`window.UI` components destructured inside function** | L140–150 | LOW | Components are re-destructured on every render call rather than at module level. This is fine for correctness (components are stable window references), but adds noise and could be module-level. |

---

## 5. Complexity Metrics

### 5.1 Cyclomatic Complexity per Major Block

| Block | if/else | Ternary | && | || | Estimated CC |
|---|---|---|---|---|---|
| `buildGrid` | 1 | 0 | 0 | 0 | 2 |
| `CalendarApp` state init + refs | 0 | 2 | 0 | 3 | 5 |
| Config load effect | 1 | 2 | 1 | 0 | 4 |
| `_useToolKeyActions` registration | 9 | 1 | 10 | 4 | 24 |
| Action registration `useEffect` | 5 | 2 | 5 | 1 | 13 |
| `renderMonthGrid` | 4 | 7 | 5 | 1 | 17 |
| Search list render branch | 1 | 1 | 3 | 0 | 5 |
| Day view render branch | 1 | 1 | 2 | 0 | 4 |
| Create view render branch | 2 | 2 | 4 | 0 | 8 |
| Detail view render branch | 1 | 2 | 2 | 0 | 5 |
| **Total file CC** | **31** | **26** | **43** | **16** | **~87** |

CC > 50 for a single component is the typical "needs extraction" threshold. `CalendarApp` at ~87 CC is almost entirely concentrated in the key action registration (24 CC) and month grid render (17 CC).

### 5.2 Nesting Depth

| Location | Max Depth | Context |
|---|---|---|
| `IconBell` inside `ListItemActions` inside `ListItem` inside `List` inside search/day view JSX | **7 levels** | Line 789 — deepest point in the file |
| Nested `onClick` handler in month grid cell | 5 levels | Lines 680–700 |
| Action `useEffect` save callback | 5 levels | Lines 560–590 |

A nesting depth of 7 is common in JSX-heavy code but signals that inline sub-components would improve readability.

---

## 6. IPC Call Map

| Call Site | Line | Channel | Trigger |
|---|---|---|---|
| `ipcCall('calendar:getConfig', {})` | 237 | Config load | Mount |
| `ipcCall('calendar:list', { from, to })` | 250 | Month events | `[calYear, calMonth]` |
| `ipcCall('calendar:list', { from, to })` | 258 | Search range | `[hasQuery]` |
| `window.core.ipc.invoke(EXT_ID, 'getLastResult')` | 292 | Restore last | Mount — **bypasses `ipcCall` wrapper** |
| `ipcCall('calendar:delete', { id })` | 549 | Delete event | Action execution |
| `ipcCall('calendar:create', {...})` | 567 | Create event | Action execution |
| `ipcCall('calendar:update', {...})` | 580 | Update reminder | Action execution |

All 7 distinct call sites (8 occurrences) operate correctly, but the `getLastResult` bypass is inconsistent.

---

## 7. Dependency and Import Analysis

### 7.1 File-Level Imports

```
window.React                  → useState, useEffect, useMemo, useRef
window.UI                     → List, ListItem, ListItemBody, ListItemText,
                                ListItemMeta, ListItemActions, EmptyState,
                                SelectBox, IconBell
window.UI.useToolKeyActions   → _useToolKeyActions (keyboard dispatch)
window.core.ipc.invoke        → all IPC communication
window.core                   → (checked for existence at L291)
window.dispatchEvent          → nuxy-shell-omni-bar-control, nuxy-key-hints-changed,
                                nuxy-register-actions, nuxy-register-key-actions (via hook)
```

### 7.2 Related Files (NOT imported — extension constraint prevents it)

| File | Relation | Import Blocked? |
|---|---|---|
| `calendar-utils.ts` | 4 duplicate functions | YES — no relative imports |
| `calendar-key-conditions.ts` | Key condition predicates extracted for testing | YES |
| `calendar-create-form.ts` | Form field constants | YES |
| `types.ts` | `CalendarEvent` interface | YES — frontend redeclares it locally |
| `backend.ts` | IPC channels | None (runtime only) |

### 7.3 Cross-Extension Pattern Reuse

The following patterns appear identically in `notes`, `n8n`, `ollama`, and `bitwarden` frontends:

| Pattern | Extensions Using It | Status |
|---|---|---|
| `function ipcCall(channel, payload)` wrapper | notes, n8n, bitwarden | Each re-implements in isolation — no shared location possible |
| `window.dispatchEvent(new CustomEvent('nuxy-shell-omni-bar-control', ...))` | notes, ollama | Identical boilerplate |
| `window.dispatchEvent(new CustomEvent('nuxy-register-actions', ...))` | notes, ollama | Identical boilerplate |
| `stateRef` bulk snapshot for key handlers | notes (partial) | calendar is most extreme (17 fields) |

The ipc wrapper and omnibar dispatch helpers are prime candidates for a shared `ui-default` utility hook (e.g., `useShellActions`), but that work is outside the scope of this file.

---

## 8. Extraction Proposals

Given the hard constraint (no relative imports), all extractions are **within-file restructurings**.

### 8.1 Sub-Component: `EventListItem`

**Source lines:** 757–797 (search) and 831–856 (day) — two identical blocks  
**Before:**
```tsx
// Duplicated in BOTH search and day view:
<ListItem key={evt.id} active={idx === listIdx} onClick={...}>
  <ListItemBody>
    <ListItemText>{evt.title}</ListItemText>
    <ListItemMeta>{formatted date}</ListItemMeta>
  </ListItemBody>
  {evt.remindMin > 0 && IconBell && ListItemActions && (
    <ListItemActions>
      <IconBell style={{ width:'14px', height:'14px', color:'var(--color-warning, #eab308)' }} />
    </ListItemActions>
  )}
</ListItem>
```
**After (defined above `CalendarApp`):**
```tsx
function EventListItem({ evt, idx, listIdx, onClick, dateFormat, UI }) {
  const { ListItem, ListItemBody, ListItemText, ListItemMeta, ListItemActions, IconBell } = UI
  return (
    <ListItem key={evt.id} active={idx === listIdx} onClick={onClick}>
      <ListItemBody>
        <ListItemText>{evt.title}</ListItemText>
        <ListItemMeta>{new Date(evt.datetime).toLocaleString(undefined, dateFormat)}</ListItemMeta>
      </ListItemBody>
      {evt.remindMin > 0 && IconBell && ListItemActions && (
        <ListItemActions>
          <IconBell style={{ width:'14px', height:'14px', color:'var(--color-warning, #eab308)' }} />
        </ListItemActions>
      )}
    </ListItem>
  )
}
```
**Savings:** Eliminates ~40 duplicate lines. Both views become a clean `.map(EventListItem)`.

### 8.2 Sub-Component: `SelectFormRow`

**Source lines:** 901–944 (create view select field rows)  
**Description:** The map over `CREATE_SELECT_FIELDS` renders a `<ListItem>` with `<SelectBox>`. The detail view (L970–1008) renders the same pattern for a single `reminder` field. Extract to a `SelectFormRow` component.

**Before:**
```tsx
{CREATE_SELECT_FIELDS.map((field, idx) => {
  // 43 lines of ListItem + SelectBox JSX
})}
```
**After:**
```tsx
function SelectFormRow({ field, idx, formFieldIdx, activeSelect, value, opts, onSelect, onOpen, onClose, UI }) {
  // ~25 lines, unified for both create and detail
}
```
**Savings:** ~60 lines of near-duplicate JSX collapsed.

### 8.3 Sub-Component: `DayViewHeader`

**Source lines:** 861–880 (create view header) and 810–825 (day view header)  
**Description:** Both views render a `<div>` with a formatted date label and the same padding/opacity style. Extract to:

```tsx
function ViewHeader({ label, subtitle }: { label: string; subtitle?: string }) {
  return (
    <div style={{ padding: 'var(--space-3) var(--space-4) var(--space-1)' }}>
      {subtitle && <div style={{ fontWeight: 600, fontSize: 'var(--font-md)' }}>{subtitle}</div>}
      <div style={{ fontSize: 'var(--font-sm)', opacity: 0.55, marginTop: subtitle ? 'var(--space-1)' : 0 }}>
        {label}
      </div>
    </div>
  )
}
```
**Savings:** ~20 lines; eliminates 3 near-identical header blocks across day, create, and detail views.

### 8.4 Custom Hook: `useCalendarData`

**Description:** Extract data loading state and effects into an in-file hook.

**State moved:** `monthEvents`, `searchEvents`, `weekStart`, `defaultReminderMin`  
**Effects moved:** config load (L236–244), month events load (L263–265), search range load (L268–270)  
**Functions moved:** `loadMonthEvents`, `loadSearchRange`

```tsx
function useCalendarData(calYear: number, calMonth: number, hasQuery: boolean) {
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([])
  const [searchEvents, setSearchEvents] = useState<CalendarEvent[]>([])
  const [weekStart, setWeekStart] = useState(1)
  const [defaultReminderMin, setDefaultReminderMin] = useState(0)

  function loadMonth(y: number, m: number) { ... }
  function loadSearch() { ... }

  useEffect(() => { /* config */ }, [])
  useEffect(() => { loadMonth(calYear, calMonth) }, [calYear, calMonth])
  useEffect(() => { if (hasQuery) loadSearch() }, [hasQuery])

  return { monthEvents, searchEvents, weekStart, defaultReminderMin, loadMonth }
}
```
**Savings in main component:** Removes ~40 lines of state + 3 effects from `CalendarApp`.  
**Side benefit:** `defaultReminderMin` is now a returned value from the hook, making it easier to include correctly in the action effect dependency array, which **fixes the stale closure bug**.

### 8.5 Custom Hook: `useCalendarNavigation`

**Description:** Group the 5 navigation state variables and all 10 navigation functions into one place.

**State moved:** `mode`, `calView`, `calYear`, `calMonth`, `selectedDay`, `monthEnterDir`, `listIdx`, `editingEvent`  
**Functions moved:** All `enterX()`, `backToX()`, `navigateBy()`, `returnToOmnibox()`, `enterCalendarMode()`

```tsx
function useCalendarNavigation(defaultReminderMin: number, setReminderValue: ..., ...) {
  // all nav state + functions
  return { mode, calView, calYear, calMonth, selectedDay, selectedDay, listIdx,
           editingEvent, monthEnterDir, setListIdx,
           enterCalendarMode, returnToOmnibox, navigateBy, enterDayView,
           enterCreate, enterDetail, backToMonth, backToDay }
}
```
**Estimated output:** ~100 lines extracted from `CalendarApp`.

### 8.6 Fix: Memoize `today` Values

**Source:** L152–156  
**Proposal:**
```tsx
const TODAY = useMemo(() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return { year: d.getFullYear(), month: d.getMonth(), date: d.getDate() }
}, [])
```
This prevents `new Date()` on every render and gives a stable reference.

### 8.7 Fix: Inline `stateRef` Fields for `activeSelect` and `calView` in Escape Handler

**Source:** L516–526  
The Escape key handler reads `stateRef.current.activeSelect` and `stateRef.current.calView` which is correct via the ref pattern. However, the actions inside (`setActiveSelect(null)`, `backToMonth()`, `backToDay()`) are called via closure — this is fine since those setters are stable. No change needed in logic, but the comment clarifying this is missing.

---

## 9. Bug Findings

### Bug 1: Stale Closure — `defaultReminderMin` in Action Effect (HIGH)

**Location:** `useEffect` at L529, dep array at L598  
**Description:** The action effect closes over `enterCreate`, which itself closes over `defaultReminderMin` (a state variable). `defaultReminderMin` is not listed in the action effect's dependency array. The config loads asynchronously in a mount-time effect; when it resolves and sets `defaultReminderMin` (e.g., to `15`), the action effect does NOT re-run unless one of its 12 listed deps changes. As a result, the "New Event" action's `onExecute` may use `defaultReminderMin = 0` (the initial value) instead of the configured value.

**Fix:** Add `defaultReminderMin` to the action effect's dependency array, OR inline the `setReminderValue(String(defaultReminderMin))` call directly inside the action effect's `onExecute` (reading `defaultReminderMin` from the dep scope).

### Bug 2: `monthEnterDir` Never Reset (LOW)

**Location:** L335 (`setMonthEnterDir(...)`) and L667 (consumed in animation style)  
**Description:** `monthEnterDir` is set to `'fromTop'` or `'fromBottom'` to trigger the CSS animation when the user navigates to a different month. It is never reset to `null`. The animation CSS is applied to a div with `key={calYear-calMonth}` which causes React to remount the element — this means the animation plays correctly on first trigger. However, `monthEnterDir` will retain its last value across renders until the next navigation, meaning that if the component re-renders for an unrelated reason after a navigation (e.g., a new event loads), the animation style is still in the non-null state and would play again on any future remount.

**Fix:** Add `setMonthEnterDir(null)` in a cleanup or use `useLayoutEffect` to reset it after the DOM has updated.

---

## 10. Risk Matrix

| Refactoring Step | Risk | Mitigation | Test Coverage |
|---|---|---|---|
| Extract `EventListItem` inline component | LOW | Pure JSX restructure; no logic change | None (no frontend.tsx tests) |
| Extract `SelectFormRow` inline component | LOW | Props pass-through; logic identical | None |
| Extract `ViewHeader` inline component | LOW | Pure JSX; no state | None |
| Extract `useCalendarData` hook | MEDIUM | Must correctly thread `loadMonth` return for action callbacks | Manual regression |
| Extract `useCalendarNavigation` hook | MEDIUM-HIGH | 8 state vars + 10 fns; dependency cascade risk | None |
| Fix stale closure (dep array) | LOW | Adding one dep; action effect re-runs more often (harmless) | Manual: verify default reminder in new events |
| Fix `monthEnterDir` reset | LOW | Adds a setter call | Visual/manual test |
| Memoize `today` | LOW | Pure computation change | None |
| Remove duplicate utility functions | BLOCKED | Cannot import from `calendar-utils.ts` | N/A |

### Overall Risk: MEDIUM

- No existing `frontend.tsx` test file (tests only exist for `calendar-utils.ts`, `calendar-key-conditions.ts`, `calendar-create-form.ts`, and `backend.ts`)
- All rendering behavior must be manually validated
- The state threading in `useCalendarNavigation` is the highest-risk step due to the interdependencies between navigation, data loading, and form state

---

## 11. Step-by-Step Execution Plan

**Prerequisites:** Read this full assessment. Do NOT touch source files until step 0 is complete.

### Phase 0: Baseline and Tests (Day 0)

1. **Write a manual regression checklist** covering: omnibox search, calendar navigation, create event, delete event, reminder editing, month animation, day navigation.
2. **Run the existing test suite** (`pnpm -C src test`) to confirm green baseline.

### Phase 1: Housekeeping (Day 1, Low Risk)

3. **Add explanatory comments** above the 4 duplicated utility functions (L29–70) explaining why they exist in the frontend (no relative imports allowed) and which `calendar-utils.ts` equivalent they correspond to.
4. **Memoize `today`** (L152–156) using `useMemo(..., [])` to produce `{ year, month, date }`. Update all 4 call sites.
5. **Fix the `ipcCall` bypass** at L292 — replace the inline `window.core.ipc.invoke(EXT_ID, 'getLastResult')` call with `ipcCall('getLastResult', {})` for consistency.
6. **Fix Bug 1 (stale closure):** Add `defaultReminderMin` to the action effect dependency array at L598. Verify manually that new events receive the configured reminder value.
7. **Fix Bug 2 (monthEnterDir):** After the animation key resets (i.e., on the next render after a month change), reset `monthEnterDir` to `null` via a `useLayoutEffect`.

### Phase 2: Inline Component Extractions (Day 1–2, Low-Medium Risk)

8. **Extract `ViewHeader` component** above `CalendarApp`. Replace the 3 header blocks in day/create/detail views.
9. **Extract `EventListItem` component** above `CalendarApp`. Replace the duplicate list item blocks in search (L757–797) and day view (L831–856).
10. **Extract `SelectFormRow` component** above `CalendarApp`. Replace the select field rendering in create view (L897–944) and the single-field detail view (L970–1008).

Run `pnpm format` after each extraction step. Manually verify all 4 views still render correctly.

### Phase 3: Data Hook Extraction (Day 2–3, Medium Risk)

11. **Extract `useCalendarData(calYear, calMonth, hasQuery)` hook** inside `frontend.tsx` (above `CalendarApp`). Move `monthEvents`, `searchEvents`, `weekStart`, `defaultReminderMin` state and their 3 effects plus `loadMonthEvents`/`loadSearchRange` functions into it.
12. **Thread `loadMonth`** as a returned function from the hook. Update all call sites inside action handlers.
13. **Verify** that `dayEvents`, `filteredSearch`, `eventDays` `useMemo` calls in `CalendarApp` still receive the correct data.

### Phase 4: Navigation Hook Extraction (Day 3–4, Medium-High Risk)

14. **Plan the hook interface** before coding: identify all state and setters that `useCalendarNavigation` must expose and consume from its caller.
15. **Extract `useCalendarNavigation` hook** inside `frontend.tsx`. Move `mode`, `calView`, `calYear`, `calMonth`, `selectedDay`, `monthEnterDir`, `listIdx`, `editingEvent` and all 10 navigation functions.
16. **Verify `stateRef`** still captures all necessary fields (the hook returns values that must be kept in sync with the ref).
17. **Run full manual regression** against the checklist from Phase 0.

### Phase 5: Form State Consolidation (Day 4–5, Low Risk)

18. **Consolidate form state** (`timeValue`, `reminderValue`, `formFieldIdx`, `activeSelect`, `selectFocused`) into a `useCreateFormState` hook or a single `formState` object with a reducer, reducing the 5 separate `useState` calls.
19. **Align `CREATE_SELECT_FIELDS` usage** with `calendar-create-form.ts` conventions (or add a comment explaining why they differ — the frontend skips `title` since it comes from the omnibar query prop).

### Phase 6: Cleanup (Day 5)

20. **Add `.catch` error handling** — at minimum, log errors to `console.error` for the IPC calls that silently discard failures.
21. **Run `pnpm format` and `pnpm -C src test`** to confirm no regressions.
22. **Update `calendar-utils.ts`** to export a `buildGridWithOverflow` function that matches the `buildGrid` behavior (returning `GridCell[]`) so the frontend version can be replaced in a future step when the constraint allows it.

---

## 12. TodoWrite-Compatible JSON Task List

```json
[
  {
    "id": "cal-fe-0a",
    "title": "Establish regression checklist for calendar frontend",
    "priority": "high",
    "phase": 0,
    "risk": "none",
    "description": "Document manual test cases: omnibox search, month navigation, day navigation, create event with config reminder, delete event from day view, delete event from detail view, edit reminder in detail view, month slide animation."
  },
  {
    "id": "cal-fe-0b",
    "title": "Run baseline tests and confirm green",
    "priority": "high",
    "phase": 0,
    "risk": "none",
    "description": "Run pnpm -C src test. All existing calendar tests (backend, utils, key-conditions, key-exclusivity, create-form) must pass before any changes."
  },
  {
    "id": "cal-fe-1a",
    "title": "Add comments to the 4 duplicated utility functions in frontend.tsx",
    "priority": "medium",
    "phase": 1,
    "risk": "low",
    "description": "Add comments above getDaysInMonth (L29), shiftDays (L47), eventsForDay (L57), daysWithEvents (L63) noting their calendar-utils.ts equivalents and explaining why they are duplicated (no relative imports in frontend.tsx per EXTENSION_GUIDE §5)."
  },
  {
    "id": "cal-fe-1b",
    "title": "Memoize today date values",
    "priority": "medium",
    "phase": 1,
    "risk": "low",
    "description": "Replace L152-156 with useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return { year: d.getFullYear(), month: d.getMonth(), date: d.getDate() } }, []). Update all 4 call sites: calYear/calMonth/calDate init, loadSearchRange, renderMonthGrid isCurrentCalMonth and isToday checks."
  },
  {
    "id": "cal-fe-1c",
    "title": "Fix ipcCall bypass in getLastResult effect",
    "priority": "low",
    "phase": 1,
    "risk": "low",
    "description": "Replace the inline window.core.ipc.invoke(EXT_ID, 'getLastResult') at L292 with ipcCall('getLastResult', {}). Remove the inline response type cast and use the wrapper's error handling."
  },
  {
    "id": "cal-fe-1d",
    "title": "Fix Bug 1: stale closure — add defaultReminderMin to action effect dependency array",
    "priority": "high",
    "phase": 1,
    "risk": "low",
    "description": "Add defaultReminderMin to the dependency array on L598. This fixes the stale closure where enterCreate always used the initial value (0) as the reminder when the action effect was registered before config loaded. Manually verify that new events created after config loads receive the configured default reminder value."
  },
  {
    "id": "cal-fe-1e",
    "title": "Fix Bug 2: reset monthEnterDir after animation",
    "priority": "low",
    "phase": 1,
    "risk": "low",
    "description": "Add useLayoutEffect(() => { if (monthEnterDir !== null) setMonthEnterDir(null) }, [calYear, calMonth]) to reset monthEnterDir after each month navigation. This prevents the dirty animation state persisting across unrelated re-renders."
  },
  {
    "id": "cal-fe-2a",
    "title": "Extract ViewHeader inline component",
    "priority": "medium",
    "phase": 2,
    "risk": "low",
    "description": "Define function ViewHeader({ label, subtitle }) above CalendarApp. Replace the 3 nearly-identical header div blocks in day view (L810-825), create view (L871-880), and detail view (L963-967). Manually verify all three views still show the correct header text."
  },
  {
    "id": "cal-fe-2b",
    "title": "Extract EventListItem inline component",
    "priority": "medium",
    "phase": 2,
    "risk": "low",
    "description": "Define function EventListItem({ evt, idx, listIdx, onClick, dateFormat, UI }) above CalendarApp. Replace the duplicate ListItem+IconBell JSX blocks in search view (L757-797) and day view (L831-856). Verify both views correctly show title, formatted date, and bell icon for events with reminders."
  },
  {
    "id": "cal-fe-2c",
    "title": "Extract SelectFormRow inline component",
    "priority": "medium",
    "phase": 2,
    "risk": "low",
    "description": "Define function SelectFormRow({ field, idx, label, value, opts, isFieldFocused, activeSelect, selectFocused, onSelect, onOpen, onClose, onRowClick, UI }) above CalendarApp. Replace the map body in create view (L897-944) and the single-field block in detail view (L970-1008). Verify SelectBox open/close and value selection in both views."
  },
  {
    "id": "cal-fe-3a",
    "title": "Extract useCalendarData custom hook",
    "priority": "high",
    "phase": 3,
    "risk": "medium",
    "description": "Define function useCalendarData(calYear, calMonth, hasQuery) above CalendarApp. Move: monthEvents, searchEvents, weekStart, defaultReminderMin state; loadMonthEvents, loadSearchRange functions; config load effect (dep []), month events effect (dep [calYear, calMonth]), search range effect (dep [hasQuery]). Return { monthEvents, searchEvents, weekStart, defaultReminderMin, loadMonth }. Update all call sites in CalendarApp."
  },
  {
    "id": "cal-fe-3b",
    "title": "Verify derived memos still work after useCalendarData extraction",
    "priority": "high",
    "phase": 3,
    "risk": "low",
    "description": "Confirm dayEvents, filteredSearch, and eventDays useMemo calls in CalendarApp still receive correct inputs after extraction. Run full regression checklist."
  },
  {
    "id": "cal-fe-4a",
    "title": "Plan useCalendarNavigation hook interface before coding",
    "priority": "high",
    "phase": 4,
    "risk": "low",
    "description": "Before writing code, document the full set of: (a) state vars to move into the hook, (b) state vars that must stay in CalendarApp, (c) setters and functions the hook must return, (d) inputs the hook needs from its caller, (e) stateRef fields still needed in CalendarApp. Review with a fresh read of the file."
  },
  {
    "id": "cal-fe-4b",
    "title": "Extract useCalendarNavigation custom hook",
    "priority": "medium",
    "phase": 4,
    "risk": "high",
    "description": "Define function useCalendarNavigation(defaultReminderMin, setReminderValue, setTimeValue, setFormFieldIdx, setActiveSelect) above CalendarApp. Move: mode, calView, calYear, calMonth, selectedDay, monthEnterDir, listIdx, editingEvent state; enterCalendarMode, returnToOmnibox, navigateBy, enterDayView, enterCreate, enterDetail, backToMonth, backToDay functions. Return all state and all functions. Update stateRef in CalendarApp to use returned values."
  },
  {
    "id": "cal-fe-4c",
    "title": "Run full manual regression after navigation hook extraction",
    "priority": "high",
    "phase": 4,
    "risk": "medium",
    "description": "Systematically test every navigation path: omnibox to calendar, month navigation (all 4 arrow directions), enter day, enter create, back to month, enter detail, back to day, search result click to day+detail, month boundary crossing with animation. Confirm stateRef is still correctly capturing all 17 fields."
  },
  {
    "id": "cal-fe-5a",
    "title": "Consolidate form state into useCreateFormState hook or reducer",
    "priority": "low",
    "phase": 5,
    "risk": "low",
    "description": "Group timeValue, reminderValue, formFieldIdx, activeSelect, selectFocused into a single useReducer or useCreateFormState hook. This reduces 5 separate useState calls to 1. Verify create and detail views still function correctly."
  },
  {
    "id": "cal-fe-5b",
    "title": "Document CREATE_SELECT_FIELDS vs CREATE_FORM_FIELDS divergence",
    "priority": "low",
    "phase": 5,
    "risk": "none",
    "description": "Add a comment at L75-76 explaining that CREATE_SELECT_FIELDS (frontend) is a subset of CREATE_FORM_FIELDS (calendar-create-form.ts): the frontend omits 'title' because it comes from the omnibar query prop, not from a form input. formFieldIdx in the frontend indexes into CREATE_SELECT_FIELDS, not CREATE_FORM_FIELDS."
  },
  {
    "id": "cal-fe-6a",
    "title": "Add error logging to all .catch(() => {}) sites",
    "priority": "low",
    "phase": 6,
    "risk": "low",
    "description": "Replace all silent .catch(() => {}) handlers with .catch((err) => console.error('[calendar]', err)). This does not change user-visible behavior but makes debugging possible."
  },
  {
    "id": "cal-fe-6b",
    "title": "Run pnpm format and full test suite",
    "priority": "high",
    "phase": 6,
    "risk": "none",
    "description": "Run pnpm format then pnpm -C src test. Confirm all calendar tests still pass. Run manual regression one final time."
  },
  {
    "id": "cal-fe-6c",
    "title": "Add buildGridWithOverflow to calendar-utils.ts for future alignment",
    "priority": "low",
    "phase": 6,
    "risk": "low",
    "description": "Add an exported function buildGridWithOverflow(year, month, weekStart) to calendar-utils.ts that returns GridCell[] (matching the frontend's buildGrid behavior). Add tests. This enables future elimination of the frontend duplicate once the no-relative-imports constraint is lifted or a bundler alias is introduced."
  }
]
```

---

## Appendix A: Current State Summary

```
frontend.tsx (1016 lines)
├── Interfaces: CalendarEvent, SelectOption, GridCell, Props           L7–27
├── Pure helpers (4 duplicated from calendar-utils.ts):
│   ├── getDaysInMonth                                                  L29–31
│   ├── buildGrid (GridCell[], different from utils version)            L33–43
│   ├── shiftDays                                                       L47–55
│   ├── eventsForDay                                                    L57–61
│   └── daysWithEvents                                                  L63–70
├── Constants: CREATE_SELECT_FIELDS, MONTH_NAMES, TIME_OPTIONS,
│             REMINDER_OPTIONS                                          L72–115
├── Shell helpers: ipcCall, showOmniBar, hideOmniBar                   L118–136
└── CalendarApp (877 lines — god component)                            L139–1016
    ├── UI destructure                                                  L140–150
    ├── today computation (not memoized)                                L152–156
    ├── 16 useState calls                                               L158–180
    ├── 3 useMemo (derived state)                                       L183–197
    ├── stateRef (17 fields)                                            L200–234
    ├── 8 useEffect calls                                               L236–315
    ├── 10 navigation functions                                         L317–390
    ├── _useToolKeyActions (15 action descriptors)                      L393–527
    ├── Action registration useEffect (12 deps + BUG)                  L529–598
    ├── renderMonthGrid() (144 lines)                                   L601–745
    └── Render branches:
        ├── isSearching (search list)                                   L750–802
        ├── omnibox or month view (renderMonthGrid)                     L804–806
        ├── day view                                                    L809–858
        ├── create view                                                 L861–950
        └── detail view                                                 L952–1013
```

## Appendix B: Target State After Full Refactoring

```
frontend.tsx (~650 lines estimated)
├── Interfaces + Types                                                  ~30 lines
├── Pure helpers (kept, comments added)                                 ~50 lines
├── Constants                                                           ~45 lines
├── Shell helpers                                                       ~20 lines
├── ViewHeader component                                                ~15 lines
├── EventListItem component                                             ~20 lines
├── SelectFormRow component                                             ~30 lines
├── useCalendarData hook                                                ~60 lines
├── useCalendarNavigation hook                                          ~80 lines
└── CalendarApp (~300 lines)
    ├── Hook calls + derived state
    ├── stateRef (trimmed)
    ├── _useToolKeyActions
    ├── Action registration useEffect (simplified, bug fixed)
    └── Render branches (using extracted components)
```

Estimated line reduction: **~35% (360 lines)** through inline restructuring alone, without violating the no-relative-imports constraint.

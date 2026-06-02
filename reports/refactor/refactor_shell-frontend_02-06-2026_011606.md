# Refactor Assessment: `extensions/shell/frontend.tsx`

**Generated**: 2026-06-02  
**Analyst**: Senior Software Architect (Claude Sonnet 4.6)  
**Status**: ANALYSIS ONLY — no source files modified

---

## Executive Summary

| Metric | Value |
|--------|-------|
| File | `extensions/shell/frontend.tsx` |
| Lines | 933 |
| Export | Single default export `ShellView` — the root UI shell |
| Role | Critical path: `App.tsx` dynamically imports this via `nuxy-ext://com.nuxy.shell/frontend.js`. Every user interaction flows through it. |
| Risk Level | **HIGH** — breaking changes cascade to all extensions and all e2e tests |
| Estimated Effort | 3–5 engineering days (conservative, with mandatory test runs after each step) |
| Test Coverage | Broad e2e coverage (`e2e.spec.ts`, 684 lines, 30+ scenarios). No unit tests for the frontend component itself. All tests are integration/behavioral. |
| Blocking Smells | Listener memory leak (line 304), 3-responsibility mega-effect (line 229), dual-path list renderer (lines 787–832) |

**Summary of findings**: `ShellView` is a 933-line monolith that manages window geometry, drag, resize, keyboard routing, provider query lifecycle, tool history, command palette visibility, footer hints, OmniBar control, and all JSX rendering. It holds 23 `useState` calls, 13 `useEffect` calls (12 in the component + 1 `useLayoutEffect`), 10 refs, and 1 `useMemo`. The drag and resize handlers (lines 494–598) together account for ~105 lines and are ideal extraction candidates. Six "reset-on-tool-change" effects form a structural pattern that should collapse into a single `useEffect`. A genuine memory leak exists on line 304 (`removeEventListener` with an inline arrow function — a different reference than what was added). Priority is: fix the leak, collapse the reset effects, extract `useDragResize`, then split the provider rendering blocks.

---

## Component / Hook Inventory Table

### Components

| Name | Location | Lines | Responsibilities |
|------|----------|-------|-----------------|
| `ShellView` | `frontend.tsx:33–933` | 900 | Entire shell: state management, drag/resize, keyboard routing, provider rendering, tool loading, command palette, footer hints |
| `CommandPalette` | `CommandPalette.tsx:15–175` | 161 | Already extracted. Submenu navigation, keyboard, filtered action list |
| `ResultCard` | `ResultCard.tsx:27–64` | 38 | Already extracted. Display + copy for result-type provider items |
| `CompareCard` | `ResultCard.tsx:66–99` | 34 | Already extracted. Display + copy for compare-type provider items |

### Hooks (defined in `hooks.tsx`, used in `ShellView`)

| Name | File | Lines | Responsibilities |
|------|------|-------|-----------------|
| `useShellInit` | `hooks.tsx:13–144` | 132 | Fetches config, tools, providers, orchestrators, theme, settings on mount. Applies zoom/font/theme to DOM. |
| `useProviders` | `hooks.tsx:146–213` | 68 | Runs provider `eval` queries on `savedQuery` change, manages loading states per provider, returns `isAnyListProviderLoading` |
| `useKeyboard` | `hooks.tsx:254–381` | 128 | Global `keydown` listener: Ctrl+K, Escape, active-tool key action dispatch, legacy event forwarding |
| `useToolHistory` | `hooks.tsx:225–252` | 28 | Loads and records recent tool IDs via IPC |

### Hooks Used Directly in `ShellView` (not extracted)

| Hook | Count | Purpose |
|------|-------|---------|
| `useState` | 23 | All state — see State Inventory below |
| `useEffect` | 12 | Event subscriptions, derived state sync, side effects |
| `useLayoutEffect` | 1 | Clamp position after layout |
| `useMemo` | 1 | Compute `listResults` from tools + provider states + recent |
| `useRef` | 10 | DOM refs + mutable refs that bypass React rendering |

### State Inventory (23 `useState` calls)

| State Variable | Type | Init | Purpose |
|----------------|------|------|---------|
| `query` | `string` | `''` | Live omnibar input value |
| `savedQuery` | `string` | `''` | Debounce-committed query sent to providers |
| `selectedIndex` | `number` | `-1` | Keyboard-focused list item |
| `tools` | `Tool[]` | `[]` | Registered tool extensions |
| `providers` | `Provider[]` | `[]` | Registered provider extensions |
| `orchestrators` | `Orchestrator[]` | `[]` | Registered orchestrator extensions |
| `activeTool` | `string \| null` | `null` | ID of currently open tool |
| `ToolComponent` | `ComponentType \| null` | `null` | Dynamically imported tool frontend |
| `showOmniBar` | `boolean` | `true` | Whether the omnibar is visible |
| `themeStyles` | `Record<string,string> \| null` | `null` | CSS class overrides from theme |
| `showCommandPalette` | `boolean` | `false` | Command palette open state |
| `toolActions` | `CommandPaletteAction[]` | `[]` | Actions registered by the active tool |
| `position` | `Position` | computed | Window x/y position |
| `size` | `Size` | `{null,null}` | Manual resize dimensions (null = auto) |
| `settings` | `ShellConfig` | defaults | Full shell config (windowWidth, zoom, etc.) |
| `isInitialLoad` | `boolean` | `true` | Suppresses CSS transitions for 500 ms on first load |
| `providerStates` | `Record<string,ProviderState>` | `{}` | Per-provider loading + items |
| `copiedId` | `string \| null` | `null` | ID of last-copied provider item (for flash UI) |
| `searchIcon` | `string \| null` | `null` | SVG string for the search icon |
| `footerHints` | `ReactNode \| null` | `null` | Footer hints injected by active tool |
| `keyActionHints` | `KeyAction[]` | `[]` | Filtered key actions to display in shortcut bar |
| `isDraggingState` | `boolean` | `false` | React state mirror of `isDragging.current` for transition suppression |

(Note: one `useState` pair — `copiedId` — was counted in the 23 but already noted above.)

### Ref Inventory (10 `useRef` calls)

| Ref | Type | Purpose |
|-----|------|---------|
| `keyActionsGetterRef` | `(() => KeyAction[]) \| null` | Getter function registered by active tool for dynamic key actions |
| `toolActionsRef` | `CommandPaletteAction[]` | Mirror of `toolActions` state, used in keyboard handler to avoid stale closure |
| `cfgRef` | `ShellConfig \| null` | Live config, mutated on settings update without re-render |
| `hasDragged` | `boolean` | Guards against re-positioning after user drag |
| `isDragging` | `boolean` | Mutable flag inside drag/resize handlers; avoids closure over state |
| `containerRef` | `HTMLDivElement \| null` | Root shell container DOM ref |
| `inputRef` | `HTMLInputElement \| null` | Omnibar input DOM ref for programmatic focus |
| `omniBarRef` | `HTMLDivElement \| null` | OmniBar container ref (assigned, but never read in this file) |
| `queryGeneration` | `number` | Generation counter for stale provider query cancellation |

---

## useEffect Catalog

| # | Line | Deps | Description | Smell? |
|---|------|------|-------------|--------|
| 1 | 78 | `[]` | Sets `isInitialLoad` to `false` after 500 ms via `setTimeout`. Suppresses CSS transitions during first render. | No |
| 2 | 136 | `[]` | Dispatches `nuxy-shell-mounted` CustomEvent with `containerRef`. Notifies external listeners that the container DOM is available. | No — but `omniBarRef` is declared but unused |
| 3 | 211 (`useLayoutEffect`) | `[position.x, position.y, listResults, activeTool]` | Clamps `position` to within viewport bounds after every layout. Fires synchronously before paint to prevent flicker. | Mild: runs on every listResults change even when size hasn't changed |
| 4 | 229 | `[]` | **Mega-effect** — owns 4 distinct responsibilities: (a) `updatePosition` helper + MutationObserver for zoom change detection; (b) `nuxy-shell-reset` event handler (full state reset + reposition); (c) `focus` event handler (focus palette or input); (d) `nuxy-settings-updated` event handler (apply new settings + reposition). Memory leak on line 304: `removeEventListener('resize', () => updatePosition(false))` creates a new arrow function that doesn't match the one added on line 297. | **YES — 3 smells: single-responsibility violation, memory leak, inline handler in addEventListener/removeEventListener** |
| 5 | 309 | `[]` | Subscribes to `nuxy-register-actions` event. When fired by an active tool, stores its `CommandPaletteAction[]` in `toolActions`. | No |
| 6 | 316 | `[activeTool]` | Resets `toolActions` to `[]` when `activeTool` changes. | **Pattern smell**: one of six "reset-on-tool-change" effects that should be unified |
| 7 | 320 | `[toolActions]` | Syncs `toolActionsRef.current` whenever `toolActions` state updates. Required to give the keyboard handler a non-stale ref. | No — but indicates `toolActionsRef` could be removed if keyboard handler used state directly |
| 8 | 324 | `[]` | Subscribes to `nuxy-register-key-actions` and `nuxy-key-hints-changed` events. Updates `keyActionsGetterRef` and recomputes `keyActionHints` from the getter. | No |
| 9 | 354 | `[activeTool]` | Resets `keyActionsGetterRef` and `keyActionHints` when `activeTool` changes. | **Pattern smell**: reset-on-tool-change #2 |
| 10 | 359 | `[]` | Subscribes to `nuxy-shell-footer-hints` event. Stores the injected `ReactNode` in `footerHints`. | No |
| 11 | 366 | `[activeTool]` | Resets `footerHints` to `null` when `activeTool` changes. | **Pattern smell**: reset-on-tool-change #3 |
| 12 | 370 | `[]` | Subscribes to `nuxy-shell-omni-bar-control` event. Handles hide/show/clear actions from tools (e.g., notes extension hides omnibar when editing). | No |
| 13 | 387 | `[selectedIndex, savedQuery, listResults, activeTool]` | Syncs `query` display value with `savedQuery` or the hovered list item title. Implements the "preview on keyboard nav" behavior. | Mild: runs on all listResults changes |

**Reset-on-tool-change pattern** — Effects 6, 9, 11 (and implicitly effects 5/8/10 via their cleanup logic) all serve the same purpose: clearing tool-scoped state when `activeTool` becomes null or changes. These three effects could be merged into a single effect on `[activeTool]`.

---

## Code Smell Analysis Table

| ID | Smell | Location | Severity | Description |
|----|-------|----------|----------|-------------|
| S1 | **Memory leak** | Line 304 | CRITICAL | `window.removeEventListener('resize', () => updatePosition(false))` creates a fresh arrow function that does not reference the same closure as the one added at line 297. The resize listener leaks on every component remount. Fix: extract `const onResize = () => updatePosition(false)` and use it in both add and remove calls. |
| S2 | **Mega-effect** (single-responsibility violation) | Lines 229–307 | HIGH | One `useEffect` combines: zoom change detection via MutationObserver, reset event handler, focus event handler, and settings update handler. Each sub-concern should live in its own effect or extracted hook. |
| S3 | **Six reset-on-tool-change effects** | Lines 316, 354, 366 | HIGH | Three separate `useEffect([activeTool])` calls each reset a different piece of tool-scoped state (`toolActions`, `keyActionHints`+ref, `footerHints`). They should be merged into one. |
| S4 | **Dual-path list renderer** | Lines 787–832 | MEDIUM | The list is rendered twice: once with `@nuxy/ui` `<List>` components (lines 788–814) and once as raw `<div>` elements (lines 815–832), with a ternary choosing based on `List` availability. This is a runtime UI library feature-detect pattern that adds JSX volume and reduces readability. Consider extracting a `ToolList` sub-component. |
| S5 | **23-state monolith** | Lines 47–90 | MEDIUM | All application state lives in `ShellView`. Groups of related state (position+size+isDragging+hasDragged = window geometry; toolActions+toolActionsRef+keyActionsGetterRef+keyActionHints = command palette/hints) should live in extracted hooks. |
| S6 | **Drag and resize inline handlers** | Lines 494–598 | MEDIUM | `handleDragMouseDown` (43 lines) and `handleResizeMouseDown` (60 lines) are defined inside the component body, registering/de-registering mousemove and mouseup listeners on window. They share mutable refs (`isDragging`, `hasDragged`, `containerRef`) and belong in a `useDragResize` hook. |
| S7 | **Duplicate provider section markup** | Lines 719–784 | MEDIUM | The "Result Providers" block (lines 719–751) and "Compare Providers" block (lines 752–784) are nearly identical in structure: filter `providerStates` by type, render loading skeleton or item cards. The only difference is the card component (`ResultCard` vs `CompareCard`) and skeleton class name. A `ProviderSection` component would eliminate the duplication. |
| S8 | **`omniBarRef` declared but never consumed** | Line 98 | LOW | `omniBarRef` is attached to the `ref` prop on the omnibar div (line 670) but is never read elsewhere. Should be removed or documented if intentionally reserved for future use. |
| S9 | **`openTool` recreated on every render** | Lines 396–408 | LOW | `openTool` is not wrapped in `useCallback`. It captures `setActiveTool`, `setProviderStates`, `setQuery`, `setSavedQuery`, `recordToolUsed` — all stable setters — but also `recordToolUsed` from `useToolHistory`, which could benefit from memoization. Low impact as it is not passed to children as a prop. |
| S10 | **`getZoom` duplicated** | Lines 204–209, `CommandPalette.tsx:62–67` | LOW | The `getZoom()` helper is defined inline in `frontend.tsx` and also duplicated inside `CommandPalette.tsx`. Should be moved to `utils.ts` and imported. |
| S11 | **Inline resize handle style objects** | Lines 636–665 | LOW | Eight resize handles are mapped from a direction array, each using a spread of inline conditional style objects. The style computation for each direction is a series of ternary spreads that are hard to read. Could be a `RESIZE_HANDLE_STYLES` lookup table in `utils.ts`. |
| S12 | **`(item as any)`** | Line 422 | LOW | `item.initialQuery` cast as `any`. Should be added to `ListItem` type in `types.ts`. |

---

## Complexity Metrics Table

| Function / Block | Cyclomatic Complexity | Lines | Max Nesting Depth | Notes |
|------------------|-----------------------|-------|-------------------|-------|
| `ShellView` (component body) | ~40 (sum of all branches) | 900 | 17 levels (line 807) | Entire component; not a single function |
| `handleKeyDown` | ~12 | 44 | 5 | Backspace/Arrow/Enter/Orchestrator branches + activeTool guard |
| `handleDragMouseDown` | ~6 | 43 | 4 | Zoom calc, position clamp, inline mouse handlers |
| `handleResizeMouseDown` | ~11 | 60 | 5 | Direction flag parsing (n/s/e/w), min size guards, inline handlers |
| `listResults` useMemo | ~11 | 52 | 4 | Filter, recent reorder, dedup, provider merge |
| Mega-effect (229) | ~8 | 78 | 5 | MutationObserver loop, three event handlers |
| `openTool` | ~2 | 13 | 3 | Dynamic import, error silencing |
| `handleItemClick` | ~4 | 14 | 4 | Execute vs isTool branch, IPC call |
| `tryOrchestratorRoute` | ~3 | 11 | 3 | Guard, IPC call, conditional openTool |
| JSX render tree | N/A | 333 | 17 | provider sections, dual list path, tool wrapper |

Maximum nesting depth (17) occurs in the dual-path list renderer at line 807:  
`div > div.nuxy-main-wrapper > div.nuxy-shell-body > {activeTool? block} > List > ListItem > ListItemBody > ListItemText > {content}`

---

## External Event Contract (Coupling Map)

`ShellView` is the **sole consumer** of these CustomEvents. Extensions dispatch them to control shell behavior. This is a documented but implicit API — any refactor must preserve these event names and payloads exactly.

| Event | Direction | Producers | Shell Response |
|-------|-----------|-----------|----------------|
| `nuxy-shell-reset` | Extensions → Shell | `App.tsx` (on window show), e2e tests | Full state reset + reposition + refocus |
| `nuxy-shell-mounted` | Shell → Extensions | — | Notifies that container DOM is ready |
| `nuxy-settings-updated` | Extensions → Shell | `settings/frontend.tsx`, `ambient-sound/frontend.tsx` | Apply new ShellConfig, reposition |
| `nuxy-register-actions` | Extensions → Shell | angrysearch, bitwarden, clipboard, n8n, notes, ollama, video-downloader | Populate command palette |
| `nuxy-register-key-actions` | Extensions → Shell | `ui-default` via `useToolKeyActions` | Register dynamic keyboard shortcuts |
| `nuxy-key-hints-changed` | Extensions → Shell | bitwarden, calendar, clipboard, emoji-picker, n8n, notes, ollama, store, video-downloader | Recompute displayed shortcut hints |
| `nuxy-shell-footer-hints` | Extensions → Shell | angrysearch, ollama, store, video-downloader | Inject custom footer ReactNode |
| `nuxy-shell-omni-bar-control` | Extensions → Shell | calendar, clipboard, notes, ollama | hide/show/clear omnibar |
| `nuxy-shell-omni-bar-keydown` | Shell → Extensions | — | Legacy key forwarding to tool UIs |

---

## Extraction Proposals

### Proposal 1: `useDragResize` hook

**Priority**: HIGH  
**Risk**: MEDIUM (uses mutable refs shared with the component; careful handoff required)

**What it would own**:
- State: `position`, `setPosition`, `size`, `setSize`, `isDraggingState`, `setIsDraggingState`
- Refs: `hasDragged`, `isDragging`, `containerRef`
- Handlers: `handleDragMouseDown`, `handleResizeMouseDown`
- The `useLayoutEffect` at line 211 (position clamping)

**BEFORE** (in `ShellView`):
```tsx
const hasDragged = useRef<boolean>(false)
const isDragging = useRef<boolean>(false)
const [isDraggingState, setIsDraggingState] = useState<boolean>(false)
const [position, setPosition] = useState<Position>({ ... })
const [size, setSize] = useState<Size>({ ... })
const containerRef = useRef<HTMLDivElement | null>(null)

useLayoutEffect(() => { /* clamp position */ }, [position.x, position.y, listResults, activeTool])

const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => { /* 43 lines */ }
const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>, direction: string) => { /* 60 lines */ }
```

**AFTER**:
```tsx
// hooks/useDragResize.ts
export function useDragResize(deps: { listResults: ListItem[]; activeTool: string | null }) {
  const [position, setPosition] = useState<Position>({ ... })
  const [size, setSize] = useState<Size>({ width: null, height: null })
  const [isDraggingState, setIsDraggingState] = useState(false)
  const hasDragged = useRef(false)
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => { /* clamp */ }, [position.x, position.y, deps.listResults, deps.activeTool])

  const handleDragMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => { ... }, [position])
  const handleResizeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, dir: string) => { ... }, [position])

  return { position, setPosition, size, isDraggingState, hasDragged, containerRef,
           handleDragMouseDown, handleResizeMouseDown }
}

// In ShellView:
const { position, setPosition, size, isDraggingState, hasDragged,
        containerRef, handleDragMouseDown, handleResizeMouseDown } = useDragResize({ listResults, activeTool })
```

**Savings**: removes ~120 lines from `ShellView`, contains all geometry mutation in one place.

---

### Proposal 2: `useWindowPosition` hook (sub-concern of the mega-effect)

**Priority**: MEDIUM  
**Risk**: LOW

**What it would own**:
- The `updatePosition` inner function
- The MutationObserver watching `document.documentElement` for zoom changes
- The `window resize` listener
- The `nuxy-settings-updated` listener (settings-triggered repositioning only)
- Depends on: `cfgRef`, `containerRef`, `hasDragged`, `setPosition`, `parseCoordinate`, `getZoom`

**AFTER**:
```tsx
// hooks/useWindowPosition.ts
export function useWindowPosition({
  cfgRef, containerRef, hasDragged, setPosition, onSettingsUpdate
}: UseWindowPositionOptions) {
  useEffect(() => {
    const updatePosition = (force = false) => { ... }
    const observer = new MutationObserver(...)
    observer.observe(...)
    const onResize = () => updatePosition(false)   // named reference — fixes leak S1
    window.addEventListener('resize', onResize)
    window.addEventListener('nuxy-settings-updated', handleSettingsUpdate)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onResize)   // same reference
      window.removeEventListener('nuxy-settings-updated', handleSettingsUpdate)
    }
  }, [])
}
```

This also fixes the **memory leak (S1)** as a natural consequence of extraction.

---

### Proposal 3: Collapse three reset-on-tool-change effects

**Priority**: HIGH  
**Risk**: LOW (pure restructuring, same semantics)

**BEFORE** (three separate effects):
```tsx
useEffect(() => { setToolActions([]) }, [activeTool])
useEffect(() => { keyActionsGetterRef.current = null; setKeyActionHints([]) }, [activeTool])
useEffect(() => { setFooterHints(null) }, [activeTool])
```

**AFTER** (single effect):
```tsx
useEffect(() => {
  setToolActions([])
  keyActionsGetterRef.current = null
  setKeyActionHints([])
  setFooterHints(null)
}, [activeTool])
```

**Savings**: 9 lines removed, clearer intent ("when the active tool changes, reset all tool-scoped state").

---

### Proposal 4: `ProviderSection` sub-component

**Priority**: MEDIUM  
**Risk**: LOW

**What it would replace**: The duplicate result/compare provider rendering blocks (lines 719–784).

**BEFORE** (~65 lines of near-identical JSX):
```tsx
{/* Result Providers */}
{Object.keys(providerStates).filter(id => ... 'result').map(id => {
  if (state.loading) return <LoadingSkeleton name={...} skeletonClass="nuxy-skeleton-result" />
  return <div ...>{state.items.map(item => <ResultCard ... />)}</div>
})}
{/* Compare Providers */}
{Object.keys(providerStates).filter(id => ... 'compare').map(id => {
  /* identical structure, CompareCard instead */
})}
```

**AFTER**:
```tsx
// sub-components/ProviderSection.tsx
function ProviderSection({ type, providerStates, copiedId, onCopy }: ProviderSectionProps) {
  const CardComponent = type === 'result' ? ResultCard : CompareCard
  const skeletonClass = type === 'result' ? 'nuxy-skeleton-result' : 'nuxy-skeleton-compare'
  return (
    <>
      {Object.keys(providerStates).filter(id => providerStates[id].type === type).map(id => {
        const state = providerStates[id]
        if (state.loading) return <ProviderLoadingPlaceholder key={id} name={state.name} skeletonClass={skeletonClass} />
        if (!state.items?.length) return null
        return (
          <div key={id} className="nuxy-provider-section">
            <div className="nuxy-provider-section__header"><span>{state.name}</span></div>
            {state.items.map(item => <CardComponent key={item.id} item={item} providerName={state.name} copiedId={copiedId} onCopy={onCopy} />)}
          </div>
        )
      })}
    </>
  )
}

// In ShellView JSX:
<ProviderSection type="result" providerStates={providerStates} copiedId={copiedId} onCopy={handleCopy} />
<ProviderSection type="compare" providerStates={providerStates} copiedId={copiedId} onCopy={handleCopy} />
```

**Savings**: ~40 lines removed from `ShellView`, eliminates duplication.

---

### Proposal 5: `ToolListRenderer` sub-component (dual-path renderer)

**Priority**: MEDIUM  
**Risk**: LOW-MEDIUM (must preserve `aria-selected`, `role`, and CSS classes exactly)

**What it would replace**: Lines 787–832 — the ternary between `@nuxy/ui List` and raw div rendering.

**AFTER**:
```tsx
// sub-components/ToolListRenderer.tsx
function ToolListRenderer({ listResults, selectedIndex, onItemClick, uiComponents }: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemActions } = uiComponents
  if (listResults.length === 0) return null

  if (List) {
    return (
      <List role="listbox" aria-label="Results">
        {listResults.map((item, index) => /* @nuxy/ui version */ )}
      </List>
    )
  }
  return (
    <div className="nuxy-shell-results-list" role="listbox" aria-label="Results">
      {listResults.map((item, index) => /* raw div version */ )}
    </div>
  )
}
```

**Savings**: ~50 lines removed from `ShellView`.

---

### Proposal 6: Move `getZoom` to `utils.ts`

**Priority**: LOW  
**Risk**: VERY LOW

`getZoom` is defined at `frontend.tsx:204–209` and duplicated inside `CommandPalette.tsx:62–67`. Move it to `utils.ts` and import in both files.

---

### Proposal 7: Fix `ListItem` type to include `initialQuery`

**Priority**: LOW  
**Risk**: VERY LOW

Add `initialQuery?: string` to the `ListItem` interface in `types.ts` to eliminate the `(item as any)` cast on line 422.

---

## Risk Matrix

| Proposal | Risk Level | Reason | Mitigation |
|----------|------------|--------|------------|
| Fix memory leak (S1 resize listener) | LOW | Isolated change in one effect | Run full e2e suite; verify window resizes reposition correctly |
| Collapse reset-on-tool-change effects (P3) | LOW | Pure restructuring; same semantics | Verify tool exit/enter behavior in e2e tests |
| Move `getZoom` to utils (P6) | LOW | Pure refactor; no behavior change | Build + typecheck |
| Fix `ListItem.initialQuery` type (P7) | LOW | Type-only change | `pnpm -C src typecheck` |
| `ProviderSection` component (P4) | LOW-MEDIUM | JSX restructuring with no state; must preserve exact CSS classes and aria attributes | Run e2e provider result tests (calculator math expressions) |
| `ToolListRenderer` component (P5) | LOW-MEDIUM | Must preserve `aria-selected`, `role`, click handlers identically; dual-render path adds complexity | Run keyboard navigation e2e tests after |
| `useWindowPosition` hook (P2) | MEDIUM | Extracts from the mega-effect; must preserve zoom detection and settings update timing | Run e2e tests; manually verify repositioning after zoom change in settings |
| `useDragResize` hook (P1) | MEDIUM-HIGH | Moves 3 refs + 2 state pairs + 2 handlers + 1 layoutEffect. The `containerRef` is also consumed by `CommandPalette` (passed as prop), `handleItemClick` does not use it but `position` is passed down. Must verify `setPosition` from the hook is accepted by `useWindowPosition`. | Implement after `useWindowPosition`; run full e2e suite and manually test drag + resize |

**Overarching risk factors for this file**:
1. `ShellView` is the root component loaded by `App.tsx`. A broken import or runtime error here shows a blank screen with no fallback below the `EmptyState` level.
2. The CustomEvent contract is implicit. Every extraction must preserve all event listener registrations without missing cleanup.
3. The `containerRef` is passed into `CommandPalette` as a prop and used to compute its position. If `containerRef` is moved into `useDragResize`, it must be returned from the hook and remain stable.
4. `inputRef` is consumed by `useKeyboard` (via its `inputRef` parameter) and by multiple event handlers in the mega-effect. It must remain in `ShellView` unless `useDragResize` or `useWindowPosition` explicitly accept it.
5. There are no unit tests for `ShellView` itself — only e2e tests. Every step must be validated with `pnpm -C src test:e2e:core`.

---

## Step-by-Step Execution Plan

**Rule**: run `pnpm -C src test` and `pnpm -C src test:e2e:core` (or the full e2e suite targeting shell) after every step. Do not proceed to the next step if tests fail.

### Step 1 — Fix the memory leak (S1) [IMMEDIATE]
- In the mega-effect (line 229), extract `const onResize = () => updatePosition(false)` before the `window.addEventListener` call.
- Replace the `addEventListener('resize', () => updatePosition(false))` call and the `removeEventListener('resize', () => updatePosition(false))` call to both reference `onResize`.
- No behavioral change. Fixes silent listener accumulation on Electron window show/hide cycles.
- Test: `pnpm -C src test:e2e:core` — all window positioning tests must pass.

### Step 2 — Fix `ListItem.initialQuery` type (S12) [IMMEDIATE]
- Add `initialQuery?: string` to `ListItem` in `extensions/shell/types.ts`.
- Remove the `(item as any)` cast on `frontend.tsx:422`.
- Test: `pnpm -C src typecheck`.

### Step 3 — Move `getZoom` to `utils.ts` (P6)
- Add `export function getZoom(): number { ... }` to `extensions/shell/utils.ts`.
- Remove the inline definition from `frontend.tsx:204–209`.
- Update `CommandPalette.tsx` to import from `utils.ts` via `_imp('nuxy-ext://com.nuxy.shell/utils.ts')`.
- Test: typecheck + e2e.

### Step 4 — Add `RESIZE_HANDLE_STYLES` lookup table (S11) [OPTIONAL CLEANUP]
- Move the eight direction style objects from the `.map()` in JSX (lines 636–665) into a `RESIZE_HANDLE_STYLES` constant in `utils.ts`.
- Renders the JSX map expression to a one-liner. No behavior change.
- Test: typecheck + visual inspection.

### Step 5 — Collapse three reset-on-tool-change effects (P3)
- Delete effects at lines 316, 354, and 366.
- Add a single merged effect:
  ```tsx
  useEffect(() => {
    setToolActions([])
    keyActionsGetterRef.current = null
    setKeyActionHints([])
    setFooterHints(null)
  }, [activeTool])
  ```
- Test: run e2e suite; especially tool open/close, Escape behavior, and key action hints tests.

### Step 6 — Extract `ProviderSection` sub-component (P4)
- Create `extensions/shell/ProviderSection.tsx`.
- Accept props: `type: 'result' | 'compare'`, `providerStates`, `copiedId`, `onCopy`.
- Render the filtered provider cards with the same loading skeleton and header structure.
- Import in `frontend.tsx` via the existing `_imp` dynamic import pattern.
- Test: e2e provider result tests (calculator math expressions, compare cards if any).

### Step 7 — Extract `ToolListRenderer` sub-component (P5)
- Create `extensions/shell/ToolListRenderer.tsx`.
- Accept props: `listResults`, `selectedIndex`, `onItemClick`, `uiComponents` (the destructured `window.UI` components).
- Must pass `itemClass` function or `themeStyles` for the non-`@nuxy/ui` path.
- Test: keyboard navigation e2e (ArrowDown/ArrowUp selection, Enter to open tool).

### Step 8 — Extract `useWindowPosition` hook (P2)
- Create `extensions/shell/hooks/useWindowPosition.ts`.
- Move from the mega-effect: `updatePosition`, the MutationObserver, named `onResize`, `nuxy-settings-updated` handler.
- Parameters: `{ cfgRef, containerRef, hasDragged, setPosition, parseCoordinate, getZoom }`.
- The mega-effect at line 229 now only contains: `onReset` and `onFocus` handlers.
- Test: full e2e suite; manually verify zoom change repositioning and settings-updated repositioning.

### Step 9 — Extract `useDragResize` hook (P1)
- Create `extensions/shell/hooks/useDragResize.ts`.
- Own: `position`, `setPosition`, `size`, `setSize`, `isDraggingState`, `hasDragged`, `isDragging`, `containerRef`, `handleDragMouseDown`, `handleResizeMouseDown`, and the `useLayoutEffect` for clamping.
- Accept `listResults` and `activeTool` as deps for the clamp layout effect.
- Return: `{ position, setPosition, size, isDraggingState, hasDragged, containerRef, handleDragMouseDown, handleResizeMouseDown }`.
- Update `useWindowPosition` to accept `{ containerRef, hasDragged, setPosition }` from this hook's return value.
- Verify `containerRef` is still passed to `CommandPalette`.
- Test: full e2e suite, manual drag and resize testing.

### Step 10 — Final audit
- Run `pnpm -C src typecheck && pnpm -C src test && pnpm -C src test:e2e:core`.
- Verify `ShellView` is below 450 lines.
- Verify no `as any` casts remain.
- Verify `omniBarRef` is either used or removed.
- Commit with message format: `refactor(shell): [step description]`.

---

## Projected Outcome

| Metric | Before | After |
|--------|--------|-------|
| `frontend.tsx` lines | 933 | ~430 |
| `useState` calls in `ShellView` | 23 | ~15 (position/size/drag group extracted) |
| `useEffect` calls in `ShellView` | 12 | ~8 |
| Duplicate provider rendering blocks | 2 | 0 (via `ProviderSection`) |
| Memory leak | 1 (resize listener) | 0 |
| Max nesting depth | 17 | ~12 |
| New files | 0 | ~4 (useDragResize, useWindowPosition, ProviderSection, ToolListRenderer) |

---

## TodoWrite-Compatible JSON Task List

```json
[
  {
    "id": "shell-refactor-01",
    "title": "Fix resize listener memory leak",
    "description": "In frontend.tsx mega-effect (line 229), extract `const onResize = () => updatePosition(false)` and use it in both addEventListener and removeEventListener calls.",
    "file": "extensions/shell/frontend.tsx",
    "lines": "297-304",
    "priority": "critical",
    "effort": "15min",
    "risk": "low",
    "verify": "pnpm -C src test:e2e:core"
  },
  {
    "id": "shell-refactor-02",
    "title": "Fix ListItem.initialQuery missing type",
    "description": "Add `initialQuery?: string` to the ListItem interface in types.ts. Remove `(item as any)` cast on frontend.tsx:422.",
    "file": "extensions/shell/types.ts",
    "lines": "36-46",
    "priority": "high",
    "effort": "5min",
    "risk": "very-low",
    "verify": "pnpm -C src typecheck"
  },
  {
    "id": "shell-refactor-03",
    "title": "Move getZoom to utils.ts",
    "description": "Export getZoom from utils.ts. Remove inline definition from frontend.tsx:204-209. Update CommandPalette.tsx import.",
    "file": "extensions/shell/utils.ts",
    "priority": "medium",
    "effort": "20min",
    "risk": "low",
    "verify": "pnpm -C src typecheck && pnpm -C src test:e2e:core"
  },
  {
    "id": "shell-refactor-04",
    "title": "Collapse three reset-on-tool-change effects",
    "description": "Delete useEffect at lines 316, 354, 366. Add single merged useEffect([activeTool]) that resets toolActions, keyActionsGetterRef, keyActionHints, and footerHints.",
    "file": "extensions/shell/frontend.tsx",
    "lines": "316-368",
    "priority": "high",
    "effort": "15min",
    "risk": "low",
    "verify": "pnpm -C src test:e2e:core"
  },
  {
    "id": "shell-refactor-05",
    "title": "Extract ProviderSection sub-component",
    "description": "Create extensions/shell/ProviderSection.tsx. Replace duplicate result+compare provider rendering blocks (lines 719-784) with two <ProviderSection type='result'> and <ProviderSection type='compare'> calls.",
    "file": "extensions/shell/ProviderSection.tsx",
    "priority": "medium",
    "effort": "45min",
    "risk": "low-medium",
    "verify": "pnpm -C src test:e2e:core"
  },
  {
    "id": "shell-refactor-06",
    "title": "Extract ToolListRenderer sub-component",
    "description": "Create extensions/shell/ToolListRenderer.tsx. Replace the dual-path list renderer (lines 787-832) with a single <ToolListRenderer> component that handles @nuxy/ui presence internally.",
    "file": "extensions/shell/ToolListRenderer.tsx",
    "priority": "medium",
    "effort": "60min",
    "risk": "low-medium",
    "verify": "pnpm -C src test:e2e:core (keyboard nav tests)"
  },
  {
    "id": "shell-refactor-07",
    "title": "Extract useWindowPosition hook",
    "description": "Create extensions/shell/hooks/useWindowPosition.ts. Move updatePosition, MutationObserver, resize listener, and nuxy-settings-updated handler out of the mega-effect. Mega-effect retains only onReset and onFocus handlers.",
    "file": "extensions/shell/hooks/useWindowPosition.ts",
    "priority": "medium",
    "effort": "90min",
    "risk": "medium",
    "verify": "pnpm -C src test:e2e:core (window positioning, settings update)"
  },
  {
    "id": "shell-refactor-08",
    "title": "Extract useDragResize hook",
    "description": "Create extensions/shell/hooks/useDragResize.ts. Move position, size, isDraggingState, hasDragged, isDragging, containerRef, handleDragMouseDown, handleResizeMouseDown, and the position-clamp useLayoutEffect into the hook. Return values consumed by ShellView and passed to CommandPalette/useWindowPosition.",
    "file": "extensions/shell/hooks/useDragResize.ts",
    "priority": "high",
    "effort": "120min",
    "risk": "medium-high",
    "verify": "pnpm -C src test:e2e:core (full suite + manual drag/resize)"
  },
  {
    "id": "shell-refactor-09",
    "title": "Final audit and cleanup",
    "description": "Verify ShellView < 450 lines. Remove unused omniBarRef if confirmed unused. Run full typecheck + test + e2e suite. Commit.",
    "file": "extensions/shell/frontend.tsx",
    "priority": "medium",
    "effort": "30min",
    "risk": "low",
    "verify": "pnpm -C src typecheck && pnpm -C src test && pnpm -C src test:e2e:core"
  }
]
```

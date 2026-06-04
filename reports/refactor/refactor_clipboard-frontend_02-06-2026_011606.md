# Refactoring Assessment: `extensions/clipboard/frontend.tsx`

**Date**: 2026-06-02  
**Analyst**: Claude (claude-sonnet-4-6)  
**Target file**: `/home/xava/Documents/nuxy/extensions/clipboard/frontend.tsx`  
**Project**: Nuxy – TypeScript/React monorepo, Electron app

---

## 1. Executive Summary

| Metric                         | Value                                                                       |
| ------------------------------ | --------------------------------------------------------------------------- |
| Total lines                    | 728                                                                         |
| Components defined             | 4 (1 main, 3 helpers)                                                       |
| Top-level helper functions     | 8                                                                           |
| `useState` calls               | 5                                                                           |
| `useEffect` calls              | 7                                                                           |
| `useMemo` calls                | 1                                                                           |
| `useCallback` calls            | 0                                                                           |
| IPC channels used              | 6                                                                           |
| Keyboard action registrations  | 3                                                                           |
| Max nesting depth              | 8 (rightPanel IIFE → conditional chains)                                    |
| Largest single construct       | `rightPanel` inline JSX block, ~215 lines                                   |
| Test coverage (frontend)       | **None** — `backend.test.ts` only covers backend; no `.test.tsx` for the UI |
| Comparison (next largest ext.) | `notes/frontend.tsx` 506 lines, `n8n/frontend.tsx` 286 lines                |
| **Risk level**                 | **Medium**                                                                  |
| **Estimated effort**           | 4–6 focused hours (pure extraction, no logic changes)                       |

The file is the largest frontend in the codebase by 44 %. It is a single monolithic export function (`ClipboardView`) that contains five distinct concerns: IPC data-fetching, search/filter logic, keyboard action registration, omnibar lifecycle management, and rendering of two visually complex panels. None of these concerns are tested in isolation. The refactoring risk is medium rather than high because: (a) the logic itself is straightforward with no tricky async flows, (b) the helper functions at the top of the file are already pure and can be extracted verbatim, and (c) backend tests are comprehensive and will continue to guard the data contract.

---

## 2. Component / Function Inventory

| Name                                    | Kind            | Lines               | Responsibilities                                                            |
| --------------------------------------- | --------------- | ------------------- | --------------------------------------------------------------------------- |
| `getItemType`                           | Pure function   | 16–25 (10 L)        | Classify a `ClipboardItem` as image / color / url / file / text             |
| `getFilename`                           | Pure function   | 27–29 (3 L)         | Extract filename from a path string                                         |
| `getParentDir`                          | Pure function   | 31–35 (5 L)         | Extract parent directory from a path string                                 |
| `getFileExtension`                      | Pure function   | 37–41 (5 L)         | Extract lowercase extension from a path                                     |
| `getFileIconType`                       | Pure function   | 43–84 (42 L)        | Map extension string → `FileIconType` enum-like value; big allowlist arrays |
| `FileIconFor`                           | React component | 86–95 (10 L)        | Renders the correct `window.UI` icon for a file extension                   |
| `ClipboardItemLeading`                  | React component | 99–136 (38 L)       | Renders `ItemLeading` (thumbnail, color swatch, file icon, globe)           |
| `getListLabel`                          | Pure function   | 140–146 (7 L)       | Compute display label for a list item                                       |
| `getListMeta`                           | Pure function   | 148–164 (17 L)      | Compute subtitle/meta text for a list item                                  |
| **`ClipboardView`**                     | React component | **168–728 (561 L)** | **Everything else** — state, IPC, keyboard, search, both panels             |
| `loadHistory` (inside ClipboardView)    | Inline function | 192–212 (21 L)      | Polls backend `getHistory`, deduplicates with prev-state comparison         |
| `handleCopy` (inside ClipboardView)     | Inline function | 273–287 (15 L)      | Invokes `copyItem`, sets feedback state, hides window                       |
| `handleCopyFile` (inside ClipboardView) | Inline function | 289–303 (15 L)      | Invokes `copyFile`, same feedback pattern as `handleCopy`                   |
| `handlePin` (inside ClipboardView)      | Inline function | 305–315 (11 L)      | Invokes `pinItem`, updates item list                                        |
| `handleUnpin` (inside ClipboardView)    | Inline function | 317–327 (11 L)      | Invokes `unpinItem`, updates item list                                      |
| `handleDelete` (inside ClipboardView)   | Inline function | 329–349 (21 L)      | Invokes `deleteItem`, adjusts `selectedIndex` post-deletion                 |
| `timeAgo` (inside ClipboardView)        | Inline function | 409–417 (9 L)       | Relative time formatter (now / Nm / Nh / date)                              |
| `leftPanel` JSX                         | Inline variable | 421–462 (42 L)      | List of clipboard items with pin icon, label, meta                          |
| `rightPanel` JSX                        | Inline variable | 464–677 (214 L)     | Detail preview: image / color / text / file + PropertiesPanel               |

**`ClipboardView` alone accounts for 77 % of the file.**

---

## 3. Code Smell Analysis

| #   | Smell                                                       | Location                                               | Severity | Description                                                                                                                                  |
| --- | ----------------------------------------------------------- | ------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **God Component**                                           | `ClipboardView` (L168–728)                             | Critical | 561-line export function doing data-fetching, search, keyboard, omnibar control, and rendering                                               |
| 2   | **Duplicated IPC boilerplate**                              | `handleCopy` vs `handleCopyFile` (L273–303)            | High     | Near-identical guard + invoke + setState + setTimeout pattern repeated in 6 handler functions                                                |
| 3   | **Inline IIFE for rightPanel**                              | L465–663                                               | High     | `rightPanel = selectedItem ? (() => { … })() : …` — IIFE as a workaround for scoping; should be a component                                  |
| 4   | **Duplicated PropertiesPanel fallback**                     | L560–659                                               | High     | `PropertiesPanel` unavailable branch manually reimplements the same grid with ~60 lines of inline JSX. Creates a long-term maintenance split |
| 5   | **Missing `useCallback` on handlers**                       | `handleCopy`, `handleDelete`, etc.                     | Medium   | Functions recreated every render, passed as callbacks to `_useToolKeyActions` and `useEffect` deps                                           |
| 6   | **Polling interval (not event-driven)**                     | `loadHistory` at L192, interval at L214–218            | Medium   | Backend is polled every 1 500 ms rather than using an IPC push event; causes continuous re-renders                                           |
| 7   | **`filteredItems` length recomputed inside `handleDelete`** | L340–345                                               | Medium   | Duplicates the filter logic from `filteredItems` useMemo, divergence risk                                                                    |
| 8   | **Inline `timeAgo` defined inside component**               | L409–417                                               | Low      | Pure function with no closure dependencies; should be a module-level utility                                                                 |
| 9   | **Raw `window.UI` destructuring at top of ClipboardView**   | L169–181                                               | Low      | Repeated in every extension; candidate for a shared pattern or hook                                                                          |
| 10  | **Inconsistent optional chaining on IPC**                   | `window.core?.ipc?.invoke` vs `window.core.ipc.invoke` | Low      | Some handlers use full optional chain (L264–265), others guard with `if (!window.core?.ipc?.invoke) return` — inconsistent and noisy         |

---

## 4. Complexity Metrics

| Function / Block                | Estimated Cyclomatic Complexity | Max Nesting Depth | Notes                                                                                               |
| ------------------------------- | ------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| `getItemType`                   | 6                               | 2                 | 5 if-branches over regex tests                                                                      |
| `getFileIconType`               | 7                               | 2                 | 6 if-branches; largest is `code` allowlist (25 exts)                                                |
| `ClipboardItemLeading`          | 5                               | 3                 | 4 type checks, each with nested JSX                                                                 |
| `getListMeta`                   | 6                               | 2                 | 5 type checks                                                                                       |
| `loadHistory`                   | 5                               | 4                 | Nested: invoke → then → setItems with loop                                                          |
| `handleDelete`                  | 4                               | 4                 | Nested: invoke → then → setItems callback → ternary                                                 |
| `rightPanel` JSX block          | **10**                          | **8**             | type === image / color / else; PropertiesPanel vs fallback; each branch has nested conditional rows |
| `leftPanel` JSX block           | 3                               | 4                 | EmptyState vs map; item type checks inside map                                                      |
| Key action `Enter` handler      | 3                               | 3                 | selectedIndex guard + type check                                                                    |
| `useEffect` for omnibar control | 2                               | 2                 | Straight dispatch                                                                                   |
| **Overall file**                | **~51**                         | **8**             | Summed; rightPanel is the dominating factor                                                         |

**Industry threshold for a single function is CC ≤ 10. The rightPanel JSX block at CC ≈ 10 with depth 8 is at the boundary and should be extracted immediately.**

---

## 5. Hook Usage Inventory

| Hook                 | Count | Calls                                                                                                                            |
| -------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| `React.useState`     | 5     | `items`, `copiedId`, `selectedIndex`, `imageDimensions`, `fileExists`                                                            |
| `React.useEffect`    | 7     | loadHistory interval, searchQuery reset, omnibar control, omnibar cleanup, image dimensions, file exists check, register actions |
| `React.useMemo`      | 1     | `filteredItems`                                                                                                                  |
| `React.useCallback`  | **0** | — (none; handlers are recreated every render)                                                                                    |
| `_useToolKeyActions` | 1     | Arrow navigation + Enter                                                                                                         |

**All hooks are used directly via `React.useState` etc. (no destructured imports), which is the file's convention since `React = window.React`. The notes extension destructures `{ useState, useEffect … } = React` at the top — clipboard should adopt the same pattern for consistency.**

---

## 6. IPC API Surface (from `backend.ts`)

All IPC calls in the frontend and their backend handlers:

| Frontend Call | Backend Handler                    | Payload            | Returns           |
| ------------- | ---------------------------------- | ------------------ | ----------------- |
| `getHistory`  | `core.ipc.handle('getHistory', …)` | none               | `ClipboardItem[]` |
| `copyItem`    | `core.ipc.handle('copyItem', …)`   | item `id: string`  | `ClipboardItem[]` |
| `copyFile`    | `core.ipc.handle('copyFile', …)`   | item `id: string`  | `ClipboardItem[]` |
| `pinItem`     | `core.ipc.handle('pinItem', …)`    | item `id: string`  | `ClipboardItem[]` |
| `unpinItem`   | `core.ipc.handle('unpinItem', …)`  | item `id: string`  | `ClipboardItem[]` |
| `deleteItem`  | `core.ipc.handle('deleteItem', …)` | item `id: string`  | `ClipboardItem[]` |
| `checkFile`   | `core.ipc.handle('checkFile', …)`  | file path `string` | `boolean`         |

**Note**: `clearHistory` is implemented in the backend but is NOT called from the frontend. It is a dormant IPC endpoint — candidate for either wiring up a "Clear History" action or documenting as intentionally omitted.

---

## 7. Extraction Proposals

### 7.1 Extract: `useClipboardIpc` hook

**Rationale**: Centralises all IPC calls, the polling loop, and the `items` state. Eliminates duplicated guard-invoke-setState pattern.

**BEFORE** (scattered across `ClipboardView`):

```tsx
// ~6 inline functions + 2 useEffects + 5 useState calls mixed in ClipboardView
const [items, setItems] = React.useState<ClipboardItemData[]>([])
const [copiedId, setCopiedId] = React.useState<string | null>(null)

const loadHistory = (): void => {
  if (!window.core?.ipc?.invoke) return
  window.core.ipc.invoke(EXT_ID, 'getHistory').then((res) => { … }).catch(() => {})
}
React.useEffect(() => {
  loadHistory()
  const interval = setInterval(loadHistory, 1500)
  return () => clearInterval(interval)
}, [])

const handleCopy = (id: string, eStop?) => { … invoke copyItem … }
const handleCopyFile = (id: string, eStop?) => { … invoke copyFile … }
const handlePin = (id: string, eStop?) => { … invoke pinItem … }
const handleUnpin = (id: string, eStop?) => { … invoke unpinItem … }
const handleDelete = (id: string, eStop?) => { … invoke deleteItem … }
```

**AFTER**:

```tsx
// hooks/useClipboardIpc.ts
export function useClipboardIpc() {
  const [items, setItems] = React.useState<ClipboardItemData[]>([])
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  const invoke = React.useCallback(
    async <T,>(channel: string, payload?: unknown): Promise<T | null> => {
      if (!window.core?.ipc?.invoke) return null
      try {
        const res = await window.core.ipc.invoke(EXT_ID, channel, payload)
        const r = res as { success: boolean; data?: T } | null
        if (r?.success) return (r.data ?? null) as T | null
        return null
      } catch { return null }
    }, []
  )

  const refreshItems = React.useCallback(async (newItems: ClipboardItemData[]) => {
    setItems(newItems)
  }, [])

  // loadHistory, copy, copyFile, pin, unpin, delete handlers all via invoke
  // useEffect for polling interval

  return { items, copiedId, handleCopy, handleCopyFile, handlePin, handleUnpin, handleDelete }
}

// ClipboardView becomes:
const { items, copiedId, handleCopy, … } = useClipboardIpc()
```

**Lines saved in main component**: ~120 lines  
**Testability**: The hook can be tested with `renderHook` from `@testing-library/react-hooks`, mocking `window.core.ipc.invoke`.

---

### 7.2 Extract: `useClipboardSearch` hook

**Rationale**: Encapsulates the `filteredItems` memo and the selectedIndex-on-query-change reset effect.

**BEFORE**:

```tsx
const filteredItems = React.useMemo(() => {
  if (!searchQuery.trim()) return items
  const q = searchQuery.toLowerCase()
  return items.filter((item) => item.text?.toLowerCase().includes(q))
}, [items, searchQuery])

React.useEffect(() => {
  setSelectedIndex(-1)
}, [searchQuery])
```

**AFTER**:

```tsx
// hooks/useClipboardSearch.ts
export function useClipboardSearch(items: ClipboardItemData[], query: string) {
  const [selectedIndex, setSelectedIndex] = React.useState(-1)

  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter((item) => item.text?.toLowerCase().includes(q))
  }, [items, query])

  React.useEffect(() => {
    setSelectedIndex(-1)
  }, [query])

  return { filteredItems, selectedIndex, setSelectedIndex }
}
```

**Lines saved in main component**: ~12 lines (small but improves logical coherence)

---

### 7.3 Extract: `ClipboardDetailPanel` component

**Rationale**: The `rightPanel` block is 214 lines with CC ≈ 10 and max depth 8. It has its own derived locals (`type`, `txt`) and manages `imageDimensions` display and `fileExists` feedback. Extracting it makes both components testable in isolation.

**BEFORE**:

```tsx
// Inside ClipboardView render — 214 lines inline IIFE
const rightPanel = selectedItem ? (() => {
  const type = getItemType(selectedItem)
  const txt = selectedItem.text?.trim() || ''
  return (
    <div style={{ … }}>
      {/* 8-level deep conditional JSX */}
    </div>
  )
})() : <div>Select an item to preview</div>
```

**AFTER**:

```tsx
// ClipboardDetailPanel.tsx (or inline at bottom of file — single-file rule still applies)
interface DetailPanelProps {
  item: ClipboardItemData
  imageDimensions: string | null
}

function ClipboardDetailPanel({ item, imageDimensions }: DetailPanelProps) {
  const { PropertiesPanel } = window.UI || {}
  const type = getItemType(item)
  const txt = item.text?.trim() || ''
  // Renders image/color/text preview + properties panel
}

// In ClipboardView:
const rightPanel = selectedItem
  ? <ClipboardDetailPanel item={selectedItem} imageDimensions={imageDimensions} />
  : <div style={{ … }}>Select an item to preview</div>
```

**Note**: Extension guide mandates `frontend.tsx` be a single self-contained file. Both the hook extractions and the component extraction must remain within `frontend.tsx` — they are module-level declarations above the export, not separate files. The "hook" extractions become `function useClipboardIpc()` etc. declared in the same file.

**Lines saved in main component**: ~215 lines (moved to a component function in same file)

---

### 7.4 Extract: `ClipboardListItem` component

**Rationale**: The list-item rendering inside the `.map()` is embedded in `leftPanel`. Extracting it enables per-item memoization with `React.memo` and makes the list render logic independently readable.

**BEFORE**:

```tsx
filteredItems.map((item, idx) => {
  const isCopied = copiedId === item.id
  const isActive = idx === selectedIndex
  const isCurrent = items.length > 0 && item.id === items[0].id
  const type = getItemType(item)
  return (
    <ListItem key={item.id} active={isActive}>
      <ClipboardItemLeading item={item} type={type} />
      <ListItemBody>
        <ListItemText variant={isCopied ? 'success' : 'default'}>
          {item.pinned && IconPin && <IconPin … />}
          {getListLabel(item, type, isCopied)}
        </ListItemText>
        <ListItemMeta>{getListMeta(item, type, isCurrent, timeAgo)}</ListItemMeta>
      </ListItemBody>
    </ListItem>
  )
})
```

**AFTER**:

```tsx
function ClipboardListItemRow({ item, idx, selectedIndex, copiedId, firstItemId, timeAgo }) {
  const { ListItem, ListItemBody, ListItemText, ListItemMeta, IconPin } = window.UI || {}
  const isCopied = copiedId === item.id
  const isActive = idx === selectedIndex
  const isCurrent = item.id === firstItemId
  const type = getItemType(item)
  return (
    <ListItem key={item.id} active={isActive}>
      …
    </ListItem>
  )
}

// In leftPanel:
filteredItems.map((item, idx) => (
  <ClipboardListItemRow
    key={item.id}
    item={item}
    idx={idx}
    selectedIndex={selectedIndex}
    copiedId={copiedId}
    firstItemId={items[0]?.id ?? null}
    timeAgo={timeAgo}
  />
))
```

**Lines saved in main component**: ~25 lines (minor but enables `React.memo` wrapping)

---

### 7.5 Promote `timeAgo` to module level

**BEFORE** (inside `ClipboardView`, L409–417):

```tsx
const timeAgo = (dateString: string): string => {
  if (!dateString) return ''
  const m = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000)
  …
}
```

**AFTER** (at module level, near other helpers):

```tsx
// After getListMeta at L164
function timeAgo(dateString: string): string {
  if (!dateString) return ''
  const m = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000)
  …
}
```

**Zero functional change. Lines saved in component**: 9 lines.

---

### 7.6 Collapse `handleCopy` / `handleCopyFile` duplication

Both handlers are structurally identical (guard → invoke → setItems → setCopiedId → setTimeout × 2). Extracting a shared `executeAndFeedback` private function reduces the pair to ~5 lines each.

**BEFORE**: 30 lines total  
**AFTER** (conceptual):

```tsx
function executeAndFeedback(channel: string, id: string, eStop?: { stopPropagation: () => void }) {
  if (eStop) eStop.stopPropagation()
  if (!window.core?.ipc?.invoke) return
  window.core.ipc
    .invoke(EXT_ID, channel, id)
    .then((res) => {
      const r = res as { success: boolean; data?: ClipboardItemData[] } | null
      if (!r?.success) return
      setItems(r.data || [])
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1800)
      setTimeout(() => window.core?.window?.hide?.(), 150)
    })
    .catch(() => {})
}

const handleCopy = (id: string, eStop?) => executeAndFeedback('copyItem', id, eStop)
const handleCopyFile = (id: string, eStop?) => executeAndFeedback('copyFile', id, eStop)
```

**Lines saved**: ~18 lines

---

## 8. Cross-Cutting Pattern Opportunities

These patterns appear in 3–4 extension frontends and are candidates for shared utilities — either in `@nuxy/ui` or a `window.UI` hook that extensions can consume.

### 8.1 IPC invoke wrapper

**Pattern** seen in: `notes/frontend.tsx` (L79–84), `n8n/frontend.tsx` (L17–22), clipboard (repeated inline in every handler).

Notes and n8n both define a local `invoke<T>()` wrapper that resolves the `{ success, data }` envelope and throws on failure. Clipboard inlines the envelope-unwrap logic in every handler individually without throwing.

**Opportunity**: The notes/n8n pattern is strictly better. Clipboard should adopt a local `invoke<T>()` wrapper (same single-file constraint). The pattern is mature enough to be promoted to `window.UI.useIpc(extId)` or `window.core.ipc.invokeTyped()`.

### 8.2 `nuxy-register-actions` dispatch pattern

**Pattern** seen in: clipboard (L383–407), notes (L354–395), n8n (L179–181), angrysearch (L122–123).

All four extensions dispatch `nuxy-register-actions` with an array and return a cleanup that dispatches `[]`. This is boilerplate that could be extracted into a `useRegisterActions(actions, deps)` hook in `@nuxy/ui`.

```tsx
// Hypothetical shared hook
function useRegisterActions(actions: Action[], deps: unknown[]) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
  }, deps)
}
```

### 8.3 Omnibar lifecycle control

**Pattern** seen in: clipboard (L230–243), notes (L307, L322, L341), potentially others.

The `nuxy-shell-omni-bar-control` `show`/`hide`/`clear` pattern appears in both clipboard and notes. A `useOmnibarControl()` hook returning `{ show, hide, clear }` would eliminate the raw `window.dispatchEvent(new CustomEvent(…))` boilerplate.

### 8.4 `PropertiesPanel` missing-UI fallback duplication

**Pattern**: Clipboard duplicates ~60 lines of inline grid JSX as a fallback when `window.UI.PropertiesPanel` is undefined (L598–659). This suggests `PropertiesPanel` was added to `@nuxy/ui` after the clipboard extension was written. The fallback should be removed once `PropertiesPanel` is confirmed stable in `@nuxy/ui`.

---

## 9. Risk Matrix

| Extraction                              | Logic Change?                | Test Coverage Risk                                                                 | Breaking Change Risk                                  | Migration Complexity                     |
| --------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| `timeAgo` to module level               | No                           | None                                                                               | None (pure refactor)                                  | Trivial                                  |
| `useClipboardSearch` hook               | No                           | Low — untested either way                                                          | None                                                  | Low                                      |
| `ClipboardDetailPanel` component        | No                           | Low — untested either way                                                          | None                                                  | Low                                      |
| `ClipboardListItemRow` component        | No                           | Low — untested either way                                                          | None                                                  | Low                                      |
| `executeAndFeedback` (handler collapse) | Minor                        | Low — untested                                                                     | None                                                  | Low                                      |
| `useClipboardIpc` hook                  | No                           | **High** — polling loop is stateful; a logic error here will silently fail in prod | None                                                  | **Medium**                               |
| Remove `PropertiesPanel` fallback       | Yes (UI degradation removed) | Low                                                                                | Low — fallback only fires when `window.UI` incomplete | Low after confirming `@nuxy/ui` coverage |
| Add `useRegisterActions` to `@nuxy/ui`  | No (new utility)             | **Medium** — must update all 4 extension callers                                   | None                                                  | Medium (multi-extension touch)           |

**Highest risk item**: `useClipboardIpc` — the polling interval + prev-state comparison logic in `loadHistory` (L200–208) is subtle. The deduplication guard (`prev[i].id !== newData[i].id`) prevents infinite re-renders. Any refactoring of this section must preserve that guard exactly. Write integration tests for this hook before extracting.

---

## 10. Step-by-Step Execution Plan

### Phase 1: No-risk, immediate wins (no logic change)

**Step 1** — Promote `timeAgo` to module level

- Move lines 409–417 above `ClipboardView` (near `getListMeta`)
- Remove the variable declaration form, use a named function
- Verify: no behaviour change, `getListMeta` and `ClipboardDetailPanel` can both import it

**Step 2** — Extract `ClipboardDetailPanel` component (inline, same file)

- Define `function ClipboardDetailPanel({ item, imageDimensions })` above `ClipboardView`
- Cut the IIFE block (L464–663) into the new function body
- Replace `rightPanel` IIFE with `<ClipboardDetailPanel item={selectedItem} imageDimensions={imageDimensions} />`
- Move the `fileExists` state and its `useEffect` (L256–271) into `ClipboardDetailPanel` — it is purely a panel concern
- Move the `imageDimensions` state and its `useEffect` (L245–254) into `ClipboardDetailPanel` as well
- Expected result: ClipboardView drops ~215 + 30 = ~245 lines; component drops from 561 to ~316 lines

**Step 3** — Extract `ClipboardListItemRow` component (inline, same file)

- Define `function ClipboardListItemRow({ item, idx, … })` above `ClipboardView`
- Cut the map callback body into it
- Wrap with `React.memo` to prevent re-render on unrelated state changes
- Expected: saves ~25 lines in ClipboardView, enables future perf optimization

**Step 4** — Promote `timeAgo` argument removal from `getListMeta`

- After step 1, `timeAgo` is module-level; remove the `timeAgo` parameter from `getListMeta`
- Calls to `getListMeta` drop one argument

### Phase 2: Logic consolidation (low risk)

**Step 5** — Add local `invoke<T>()` helper (same pattern as notes / n8n)

- Define at top of `ClipboardView` (or module level):
  ```tsx
  function invoke<T>(channel: string, payload?: unknown): Promise<T> { … }
  ```
- Rewrite all 6 handlers to use it (removes repeated guard + envelope unwrap)

**Step 6** — Collapse `handleCopy` / `handleCopyFile` with `executeAndFeedback`

- Define `executeAndFeedback(channel, id, eStop?)` using the new `invoke<T>` helper
- Replace `handleCopy` and `handleCopyFile` bodies

**Step 7** — Extract `useClipboardSearch` hook (inline, same file)

- Define `function useClipboardSearch(items, query)` returning `{ filteredItems, selectedIndex, setSelectedIndex }`
- Move the `filteredItems` useMemo and the query-change `useEffect`
- **Fix the diverged filter in `handleDelete` (L340–345)** to use `filteredItems` from the hook instead of recomputing inline

### Phase 3: Major extraction (write tests first)

**Step 8** — Write frontend integration tests before extracting `useClipboardIpc`

- Create `extensions/clipboard/frontend.test.tsx` (or a hook test file)
- Test: initial load, polling update with deduplication, copy feedback state, delete with index adjustment
- Use `vi.useFakeTimers()` mirroring `backend.test.ts` pattern

**Step 9** — Extract `useClipboardIpc` hook (inline, same file)

- Define `function useClipboardIpc()` returning `{ items, copiedId, handleCopy, handleCopyFile, handlePin, handleUnpin, handleDelete }`
- Move: `items` state, `copiedId` state, `loadHistory`, polling `useEffect`, all six handlers
- Verify tests from Step 8 still pass

### Phase 4: Remove dead code / shared infrastructure

**Step 10** — Remove `PropertiesPanel` fallback

- Audit `@nuxy/ui` to confirm `PropertiesPanel` is always present
- Delete the fallback grid block (L598–659) — reduces `ClipboardDetailPanel` by ~60 lines

**Step 11** — Wire `clearHistory` action

- Backend handles `clearHistory` (confirmed in `backend.ts` L128–136) but no frontend call exists
- Add a "Clear History" command palette action in the `nuxy-register-actions` effect
- This is a new feature, not a refactor — flag as optional

**Step 12** (cross-extension) — Propose `useRegisterActions` for `@nuxy/ui`

- Draft the hook in `packages/ui`
- Update clipboard, notes, n8n, angrysearch frontends to use it
- Requires coordinated PR touching 4 files

---

## 11. Projected Line Count After Refactoring

| After Step                | `ClipboardView` lines | Total file lines                      |
| ------------------------- | --------------------- | ------------------------------------- |
| Current                   | 561                   | 728                                   |
| After Phase 1 (steps 1–4) | ~316                  | ~728 (same file, components moved up) |
| After Phase 2 (steps 5–7) | ~256                  | ~728                                  |
| After Phase 3 (steps 8–9) | ~160                  | ~728                                  |
| After Phase 4 (step 10)   | ~100                  | ~670                                  |

The file length stays roughly the same because all extractions are inline per the single-file rule. The benefit is architectural: `ClipboardView` drops from 561 lines to ~100 lines, becoming a thin composition layer, while the extracted components and hooks each have a single clear responsibility.

---

## 12. JSON Task List (TodoWrite-compatible)

```json
[
  {
    "id": "CB-R-01",
    "phase": 1,
    "priority": "high",
    "title": "Promote timeAgo to module level",
    "file": "extensions/clipboard/frontend.tsx",
    "description": "Move timeAgo function (L409-417) above ClipboardView. Convert to named function declaration. Remove timeAgo parameter from getListMeta signature and all call sites.",
    "breaking": false,
    "tests_required": false
  },
  {
    "id": "CB-R-02",
    "phase": 1,
    "priority": "high",
    "title": "Extract ClipboardDetailPanel component",
    "file": "extensions/clipboard/frontend.tsx",
    "description": "Define function ClipboardDetailPanel({ item, imageDimensions }) above ClipboardView. Cut the rightPanel IIFE block into it. Move imageDimensions state + useEffect and fileExists state + useEffect into the component. Replace rightPanel variable with JSX element.",
    "breaking": false,
    "tests_required": false
  },
  {
    "id": "CB-R-03",
    "phase": 1,
    "priority": "medium",
    "title": "Extract ClipboardListItemRow component",
    "file": "extensions/clipboard/frontend.tsx",
    "description": "Define function ClipboardListItemRow({ item, idx, selectedIndex, copiedId, firstItemId, timeAgo }) above ClipboardView. Wrap with React.memo. Cut map callback body into it. Update leftPanel map call.",
    "breaking": false,
    "tests_required": false
  },
  {
    "id": "CB-R-04",
    "phase": 2,
    "priority": "high",
    "title": "Add local invoke<T> helper and refactor all IPC handlers",
    "file": "extensions/clipboard/frontend.tsx",
    "description": "Define invoke<T>(channel, payload?) at top of ClipboardView using the notes/n8n pattern. Rewrite handleCopy, handleCopyFile, handlePin, handleUnpin, handleDelete, loadHistory to use it. Standardise optional chaining.",
    "breaking": false,
    "tests_required": false
  },
  {
    "id": "CB-R-05",
    "phase": 2,
    "priority": "medium",
    "title": "Collapse handleCopy/handleCopyFile duplication",
    "file": "extensions/clipboard/frontend.tsx",
    "description": "Define private executeAndFeedback(channel, id, eStop?) helper that both handlers delegate to after CB-R-04 adds invoke<T>.",
    "breaking": false,
    "tests_required": false
  },
  {
    "id": "CB-R-06",
    "phase": 2,
    "priority": "medium",
    "title": "Extract useClipboardSearch hook",
    "file": "extensions/clipboard/frontend.tsx",
    "description": "Define function useClipboardSearch(items, query) returning { filteredItems, selectedIndex, setSelectedIndex }. Move filteredItems useMemo and query-change useEffect into it. Fix the diverged filter expression in handleDelete (L340-345) to use filteredItems from hook.",
    "breaking": false,
    "tests_required": false
  },
  {
    "id": "CB-R-07",
    "phase": 3,
    "priority": "high",
    "title": "Write frontend tests for ClipboardView IPC and polling",
    "file": "extensions/clipboard/frontend.test.tsx",
    "description": "Create frontend.test.tsx. Test: initial load sets items, polling deduplication guard (prev state comparison), copy feedback state (copiedId set/cleared), delete updates selectedIndex correctly. Use vi.useFakeTimers and mock window.core.ipc.invoke.",
    "breaking": false,
    "tests_required": true
  },
  {
    "id": "CB-R-08",
    "phase": 3,
    "priority": "high",
    "title": "Extract useClipboardIpc hook",
    "file": "extensions/clipboard/frontend.tsx",
    "description": "After tests pass (CB-R-07), define function useClipboardIpc() returning { items, copiedId, handleCopy, handleCopyFile, handlePin, handleUnpin, handleDelete }. Move items state, copiedId state, loadHistory, polling useEffect, all six handlers into it. Depends on CB-R-04 (invoke helper).",
    "breaking": false,
    "tests_required": true,
    "depends_on": ["CB-R-07", "CB-R-04"]
  },
  {
    "id": "CB-R-09",
    "phase": 4,
    "priority": "low",
    "title": "Remove PropertiesPanel fallback block",
    "file": "extensions/clipboard/frontend.tsx",
    "description": "Audit @nuxy/ui to confirm PropertiesPanel is always exported. Delete fallback grid block (approx L598-659). ClipboardDetailPanel renders null for the properties section if PropertiesPanel is unavailable, or rely on the guaranteed presence.",
    "breaking": false,
    "tests_required": false,
    "prerequisite": "Confirm PropertiesPanel in @nuxy/ui"
  },
  {
    "id": "CB-R-10",
    "phase": 4,
    "priority": "low",
    "title": "Wire clearHistory to command palette",
    "file": "extensions/clipboard/frontend.tsx",
    "description": "Add 'Clear History' entry to the nuxy-register-actions dispatch in the selectedItem useEffect. Invoke clearHistory IPC channel. This is a new feature surfacing an existing backend handler.",
    "breaking": false,
    "tests_required": false
  },
  {
    "id": "CB-R-11",
    "phase": 4,
    "priority": "low",
    "title": "Propose useRegisterActions shared hook for @nuxy/ui",
    "file": "packages/ui/src/hooks/useRegisterActions.ts",
    "description": "Draft useRegisterActions(actions, deps) hook in @nuxy/ui. Update clipboard, notes, n8n, angrysearch frontends to use it. Requires coordinated PR.",
    "breaking": false,
    "tests_required": true
  }
]
```

# Refactor Assessment: extensions/video-downloader/frontend.tsx

**Date**: 2026-06-02  
**Analyst**: Claude Sonnet 4.6 (senior architect review)  
**File**: `/home/xava/Documents/nuxy/extensions/video-downloader/frontend.tsx`  
**Companion files reviewed**: `backend.ts`, `types.ts`, `backend.test.ts`, `e2e.spec.ts`, `manifest.json`

---

## 1. Executive Summary

| Metric                                 | Value                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Total lines                            | 931                                                                                                     |
| React components defined               | 1 (monolithic `VideoDownloader`)                                                                        |
| JSX consts (should be components)      | 4 (`fullScreenDownloadsView`, `metaCard`, `formatList`, `left`/`right` layout pieces)                   |
| `useState` calls                       | 10                                                                                                      |
| `useEffect` calls                      | 7                                                                                                       |
| `useMemo` calls                        | 3                                                                                                       |
| `useCallback` calls                    | 0                                                                                                       |
| `useRef` calls                         | 3                                                                                                       |
| IPC channels called                    | 6 (`ytdlp:status`, `ytdlp:getFormats`, `ytdlp:download`, `ytdlp:cancel`, `ytdlp:history`, `ytdlp:open`) |
| Confirmed stale-closure eslint-disable | Yes — `rightPanelActions` useMemo, line 546                                                             |
| Frontend unit tests                    | **None** (only backend.test.ts + e2e.spec.ts)                                                           |
| E2E tests                              | 14 scenarios in `e2e.spec.ts`                                                                           |
| **Risk level**                         | **HIGH** — no unit tests for any frontend logic                                                         |
| **Estimated refactor effort**          | 3–4 developer-days (including writing tests first)                                                      |

The file is a 931-line single-component monolith. All state, all IPC calls, all keyboard handling, all layout variants, and all format-filtering logic live inside one `VideoDownloader` function. This creates very high cognitive load and a fragile coupling between orthogonal concerns. The stale-closure workaround (`stateRef`) is a symptom of the root problem: too many responsibilities in one render scope.

---

## 2. Component / Function Inventory

### 2.1 React Components

| Name              | Lines               | Declared as               | Issue                           |
| ----------------- | ------------------- | ------------------------- | ------------------------------- |
| `VideoDownloader` | 141–931 (790 lines) | `export default function` | Monolith — all concerns coupled |

### 2.2 JSX Constants (should be components)

| Name                       | Lines   | Line count | Declared as           |
| -------------------------- | ------- | ---------- | --------------------- |
| `fullScreenDownloadsView`  | 681–758 | 78 lines   | `const` inside render |
| `metaCard`                 | 809–822 | 14 lines   | `const` inside render |
| `formatList`               | 825–882 | 58 lines   | `const` inside render |
| `left` (TabBar panel)      | 885–894 | 10 lines   | `const` inside render |
| `right` (ScrollArea panel) | 896–910 | 15 lines   | `const` inside render |

**Total JSX-const surface**: ~175 lines of render-time JSX that cannot be independently tested.

### 2.3 Pure Utility Functions (module-level, good)

| Name                      | Lines  | Purpose                       |
| ------------------------- | ------ | ----------------------------- |
| `ipc<T>`                  | 42–50  | Typed IPC wrapper             |
| `fmtSize`                 | 52–56  | Byte formatting               |
| `fmtDuration`             | 58–66  | Seconds → hh:mm:ss            |
| `truncate`                | 68–70  | String truncation             |
| `getVideoAndAudioFormats` | 72–93  | Format filter + sort          |
| `getRecommendedFormats`   | 95–125 | Build recommended preset list |

These are well-isolated and already independently testable. `truncate` is defined but never called in this file (potential dead code).

### 2.4 Async Handler Functions (defined inside component, closure-heavy)

| Name            | Lines   | Reads stateRef                  | Sets state                                                                                |
| --------------- | ------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| `loadHistory`   | 200–207 | No                              | `setHistory`                                                                              |
| `getFormats`    | 334–351 | `stateRef.current.url`          | `setError`, `setMetadata`, `setLastUrl`, `setLoading`, `setActiveTab`, `setSelectedIndex` |
| `startDownload` | 353–396 | `stateRef.current.*` (4 fields) | `setJobs`, `setPreviousFormatTab`, `setActiveTab`, `setDownloadSelectedIndex`             |
| `cancelJob`     | 398–402 | No                              | `setJobs`                                                                                 |

### 2.5 State Inventory

| State variable          | Initial value   | Used in                                       |
| ----------------------- | --------------- | --------------------------------------------- |
| `ytdlpInstalled`        | `null`          | early-return guard                            |
| `metadata`              | `null`          | format filtering, metaCard                    |
| `activeTab`             | `'recommended'` | tab switching, downloads view                 |
| `loading`               | `false`         | loading state guard                           |
| `error`                 | `null`          | error state guard                             |
| `jobs`                  | `[]`            | downloads list, poll trigger                  |
| `lastUrl`               | `''`            | URL change detection                          |
| `selectedIndex`         | `0`             | format list cursor                            |
| `jobSelectedIndex`      | `0`             | jobs cursor (partially used — see smell §4.3) |
| `history`               | `[]`            | combined list                                 |
| `downloadSelectedIndex` | `0`             | downloads view cursor                         |
| `previousFormatTab`     | `'recommended'` | Escape-key back-navigation                    |

---

## 3. Code Smell Analysis

### 3.1 Stale Closure — `rightPanelActions` (CRITICAL)

**Location**: Lines 410–548

```tsx
const rightPanelActions = useMemo(
  () => [
    {
      key: 'ArrowUp',
      handler: () => {
        const { activeTab, metadata } = stateRef.current   // ← reads from ref
        ...
      },
    },
    // ... 6 more action objects
  ],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []  // ← intentionally empty dep array
)
```

**The problem**: `rightPanelActions` is a stable array object (memoized with `[]` deps) passed to `_useTwoPanelNav`. The handlers inside it would normally close over the state values at the time of their creation — all `null`/`0`/`[]` initial values — making every handler completely broken after any state update.

**The workaround**: A `stateRef` ref object is created (lines 185–198) and kept in sync via a synchronous assignment at line 319–332 on every render:

```tsx
stateRef.current = {
  metadata,
  url: lastUrl || url,
  loading,
  selectedIndex,
  filteredFormats,
  jobs,
  jobSelectedIndex,
  activeTab,
  history,
  downloadSelectedIndex,
  previousFormatTab,
  combinedList,
}
```

This is a valid React pattern, but its necessity here exposes that `rightPanelActions` is doing too much. The `eslint-disable` on line 546 suppresses the `react-hooks/exhaustive-deps` warning, which is a red flag that reviewers will encounter and question.

**Why it was done this way**: `_useTwoPanelNav` presumably needs a stable action array reference. Re-creating the array on every render would either cause infinite re-renders (if the hook uses the array as a dep) or require the hook to be redesigned. The stateRef pattern is the least-invasive fix.

**Correct fix options** (see §6):

1. Wrap each handler in `useCallback` with all actual deps, accepting a new stable reference per meaningful state change.
2. Extract a `useKeyboardHandlers` custom hook that owns the stateRef internally, hiding it from `VideoDownloader`.
3. If `_useTwoPanelNav` accepts a `getState` function instead of an array, pass a stable getter and avoid the problem entirely.

### 3.2 `fullScreenDownloadsView` — JSX Const Instead of Component (HIGH)

**Location**: Lines 681–758 (78 lines)

```tsx
const fullScreenDownloadsView =
  Box && Stack && Text && List && ScrollArea ? (
    <Box ...>
      ...
      {combinedList.map((item, idx) => { ... })}
    </Box>
  ) : null

if (activeTab === 'downloads') {
  return fullScreenDownloadsView
}
```

**Why it's a const**: The author correctly identified that this view needs to be computed before the early-return guards (`ytdlpInstalled`, `loading`, `error`, `!metadata`) so that the downloads tab is accessible even when no URL metadata is loaded. However, computing JSX before a conditional return violates the Rules of Hooks only if hooks were involved — plain JSX is fine.

**The real reason**: The downloads view closes over `combinedList`, `downloadSelectedIndex`, `Badge`, `MediaPreview`, `EmptyState`, `List`, etc., all of which live in the component scope. As a standalone component, these would need to be passed as props or obtained via context.

**Impact**:

- Cannot be unit-tested in isolation.
- Any bug in the downloads list rendering requires testing the full `VideoDownloader` component.
- The `combinedList` computation (lines 275–316, a 42-line useMemo) is only consumed by this const — tight coupling.

### 3.3 `metaCard` and `formatList` — Inline JSX Consts (MEDIUM)

**Location**: Lines 809–882

Same pattern as `fullScreenDownloadsView` but smaller. `metaCard` (14 lines) and `formatList` (58 lines) close over `metadata`, `filteredFormats`, `focusArea`, `selectedIndex`, and various UI component refs. Both are straightforward extraction candidates.

### 3.4 `UI` Destructuring at Top of Component (LOW-MEDIUM)

**Location**: Lines 143–167

```tsx
const {
  List,
  ListItem,
  ListItemBody,
  ...MediaPreview // 18 identifiers
} = window.UI || {}
```

Every one of these can be `undefined` (the `|| {}` fallback), leading to:

- Null-guard chains scattered throughout: `Box && Stack && Text && List && ScrollArea ? (...) : null`
- Repetitive `Component && <Component .../>` patterns
- Guards that silently hide UI when `window.UI` is partially loaded

This is an architectural decision of the extension system (UI loaded via `window.UI`), but it inflates every JSX const with conditional complexity.

### 3.5 `jobSelectedIndex` — Partially Dead State (LOW)

**Location**: Lines 178, 423–425, 439–441

`jobSelectedIndex` is set via `setJobSelectedIndex` in the ArrowUp/ArrowDown handlers when `jobs.length > 0`, but it is **never read in any rendered JSX**. The active-state class on job list items uses `downloadSelectedIndex`, not `jobSelectedIndex`. This state either:

- Was meant to be used in a jobs-in-progress list that was later folded into `fullScreenDownloadsView`, or
- Is dead code that increments state with no visual effect, causing unnecessary re-renders.

### 3.6 `combinedList` Timestamp Bug (LOW)

**Location**: Lines 287

```tsx
timestamp: Date.now(),  // ← for active jobs
```

Active jobs receive `Date.now()` as their timestamp, meaning on every re-render (every poll tick = 1 second) their timestamp changes. Since `combinedList` is sorted by `b.timestamp - a.timestamp`, this is stable for running jobs (they always sort to the top anyway), but it also means the `useMemo` for `combinedList` always recomputes on poll ticks even when the job list hasn't changed meaningfully.

### 3.7 `useEffect` with Missing Dependencies (MEDIUM)

**Location**: Lines 564–574 (activeSectionId sync effect)

```tsx
useEffect(() => {
  if (activeSectionId !== activeTab) {
    ...
    setActiveTab(activeSectionId as TabId)
  }
}, [activeSectionId])  // ← activeTab missing from deps
```

`activeTab` is read inside the effect but not listed as a dependency. The linter would flag this if `react-hooks/exhaustive-deps` were enabled on this file. The workaround is intentional (reading-but-not-depending-on `activeTab` to avoid cycles), but it's undocumented and fragile.

---

## 4. Complexity Metrics

### 4.1 Cyclomatic Complexity (estimated per function)

| Function / Block                     | Cyclomatic Complexity | Notes                                     |
| ------------------------------------ | --------------------- | ----------------------------------------- |
| `getVideoAndAudioFormats`            | 5                     | 2 filters + sort + regex + conditional    |
| `getRecommendedFormats`              | 4                     | forEach + switch-like set membership      |
| `filteredFormats` useMemo            | 6                     | switch with 5 cases                       |
| `combinedList` useMemo               | 6                     | 2 loops + 3 sort conditions + null checks |
| `rightPanelActions[Enter].handler`   | 8                     | 4 branches × 2 sub-conditions             |
| `rightPanelActions[Escape].handler`  | 3                     | 2 conditions                              |
| `startDownload`                      | 4                     | try/catch + format find + conditional     |
| `formatList` JSX const               | 7                     | map + 4 badge variant branches            |
| `fullScreenDownloadsView` JSX const  | 6                     | map + 4 status branches + null guards     |
| **`VideoDownloader` function total** | **~45**               | Sum of all internal complexity            |

A cyclomatic complexity of ~45 for the outer function is extremely high. The safe threshold for a single function is typically 10–15.

### 4.2 Maximum Nesting Depth

The deepest nesting occurs in `fullScreenDownloadsView` (lines 700–757):

```
VideoDownloader
  ↳ fullScreenDownloadsView (JSX const)
    ↳ Box
      ↳ ScrollArea
        ↳ List
          ↳ combinedList.map()
            ↳ ListItem
              ↳ ListItemBody
                ↳ MediaPreview (prop: badge)
                  ↳ Badge (inside prop expression)
```

**Depth: 9 levels** of nesting from the component root to the innermost expression. JSX nesting of 7+ is a recognized readability smell.

### 4.3 Hook Count Summary

| Hook          | Count  |
| ------------- | ------ |
| `useState`    | 10     |
| `useEffect`   | 7      |
| `useMemo`     | 3      |
| `useRef`      | 3      |
| `useCallback` | 0      |
| **Total**     | **23** |

23 hooks in a single component function is well above the practical limit for maintainability (~6–8 hooks per component is a reasonable ceiling before extraction is warranted).

---

## 5. IPC Surface Analysis

All IPC calls are routed through the local `ipc<T>` wrapper (lines 42–50), which is well-designed.

| Channel            | Called from                         | Direction | Notes                                 |
| ------------------ | ----------------------------------- | --------- | ------------------------------------- |
| `ytdlp:status`     | init `useEffect`                    | → backend | Once on mount                         |
| `ytdlp:queue`      | init `useEffect` + poll interval    | → backend | Also polled every 1s when running     |
| `ytdlp:getFormats` | `getFormats()`                      | → backend | On Enter with URL                     |
| `ytdlp:download`   | `startDownload()`                   | → backend | On Enter with format                  |
| `ytdlp:cancel`     | `cancelJob()`                       | → backend | On Enter in downloads view            |
| `ytdlp:history`    | `loadHistory()` + effect            | → backend | On mount + on tab switch to downloads |
| `ytdlp:open`       | Enter handler + Shift+Enter handler | → backend | Opens file or folder                  |

**Not called from frontend**: `ytdlp:configure` (settings-only channel).

---

## 6. Extraction Proposals

### 6.1 Extract `FullScreenDownloadsView` Component

**BEFORE** (lines 681–762):

```tsx
// inside VideoDownloader render body
const fullScreenDownloadsView = Box && Stack && ... ? (
  <Box ...>
    <Stack ...><Heading>Downloads & History</Heading></Stack>
    <ScrollArea>
      {combinedList.length === 0 ? ... : (
        <List>
          {combinedList.map((item, idx) => (
            <ListItem key={item.jobId} active={idx === downloadSelectedIndex}>
              ...
            </ListItem>
          ))}
        </List>
      )}
    </ScrollArea>
  </Box>
) : null

if (activeTab === 'downloads') return fullScreenDownloadsView
```

**AFTER**:

```tsx
// New component (can be in same file or split to DownloadsView.tsx)
interface DownloadsViewProps {
  combinedList: CombinedListItem[]
  selectedIndex: number
  UI: typeof window.UI
}

function DownloadsView({ combinedList, selectedIndex, UI }: DownloadsViewProps) {
  const { Box, Stack, ScrollArea, List, ListItem, ListItemBody,
          ListItemActions, Heading, EmptyState, Badge, Text, MediaPreview } = UI || {}
  if (!Box || !Stack || !ScrollArea) return null
  return (
    <Box ...>
      <Stack ...><Heading>Downloads & History</Heading></Stack>
      <ScrollArea>
        {combinedList.length === 0
          ? (EmptyState && <EmptyState message="No downloads yet." />)
          : (
            <List>
              {combinedList.map((item, idx) => (
                <DownloadListItem
                  key={item.jobId}
                  item={item}
                  isActive={idx === selectedIndex}
                  UI={UI}
                />
              ))}
            </List>
          )}
      </ScrollArea>
    </Box>
  )
}
```

**Benefit**: `DownloadsView` and `DownloadListItem` become independently unit-testable with mock props. The downloads view logic is fully decoupled from the format-selection state.

---

### 6.2 Extract `FormatList` Component

**BEFORE** (lines 825–882, ~58 lines of inline JSX const):

```tsx
const formatList = List && Text ? (
  filteredFormats.length === 0 ? ... : (
    <List>
      {filteredFormats.map((f, idx) => { ... })}
    </List>
  )
) : null
```

**AFTER**:

```tsx
interface FormatListProps {
  formats: VideoFormat[]
  selectedIndex: number
  focusArea: string
  UI: typeof window.UI
}

function FormatList({ formats, selectedIndex, focusArea, UI }: FormatListProps) {
  const { List, Text, Badge, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState } =
    UI || {}
  if (!List || !Text) return null
  if (formats.length === 0) return EmptyState ? <EmptyState message="No matching formats." /> : null
  return (
    <List>
      {formats.map((f, idx) => (
        <FormatListItem
          key={f.formatId + '-' + idx}
          format={f}
          isActive={focusArea === 'right' && idx === selectedIndex}
          UI={UI}
        />
      ))}
    </List>
  )
}
```

**Benefit**: Badge variant logic (the 4-branch `badgeVariant` computation) becomes testable in isolation without rendering the full tool.

---

### 6.3 Extract `useVideoDownloaderState` Custom Hook

This is the highest-value extraction. Currently `VideoDownloader` owns 10 state vars + 7 effects + 2 async functions that interact with state. A custom hook isolates all the data-layer logic:

```tsx
// useVideoDownloaderState.ts
export function useVideoDownloaderState(url: string) {
  const [ytdlpInstalled, setYtdlpInstalled] = useState<boolean | null>(null)
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('recommended')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<DownloadJobPublic[]>([])
  const [lastUrl, setLastUrl] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [downloadSelectedIndex, setDownloadSelectedIndex] = useState(0)
  const [previousFormatTab, setPreviousFormatTab] = useState<TabId>('recommended')

  // all useEffects for polling, history loading, URL change detection
  // filteredFormats useMemo
  // combinedList useMemo
  // getFormats, startDownload, cancelJob, loadHistory

  return {
    ytdlpInstalled,
    metadata,
    activeTab,
    setActiveTab,
    loading,
    error,
    jobs,
    filteredFormats,
    combinedList,
    selectedIndex,
    setSelectedIndex,
    downloadSelectedIndex,
    setDownloadSelectedIndex,
    previousFormatTab,
    setPreviousFormatTab,
    getFormats,
    startDownload,
    cancelJob,
  }
}
```

**Benefit**: The hook is fully unit-testable with vitest + mock IPC (same pattern as backend tests use `createMockCore`). The `VideoDownloader` component becomes a thin rendering shell of ~100 lines.

---

### 6.4 Extract `useKeyboardHandlers` — Fix for Stale Closure

The `stateRef` + `eslint-disable` pattern should be encapsulated:

```tsx
// useKeyboardHandlers.ts
export function useKeyboardHandlers({
  getState,  // stable getter function returning current state snapshot
  setters,   // stable set-function refs
  nav,       // stable nav object
  toast,
}: KeyboardHandlerOptions) {
  // stateRef lives HERE, not in VideoDownloader
  const stateRef = useRef(getState())

  // sync on every render via useLayoutEffect
  useLayoutEffect(() => {
    stateRef.current = getState()
  })

  return useMemo(() => [
    { key: 'ArrowUp', handler: () => { const s = stateRef.current; ... } },
    // ... other handlers
  ], []) // eslint-disable stays here, documented, contained
}
```

**Benefit**:

- The stale-closure workaround is contained in one hook with a clear name and documented intent.
- `VideoDownloader` no longer needs a `stateRef` at all.
- The handler logic becomes testable by calling the hook in a test harness.

---

### 6.5 Extract Format Utility Functions to `utils.ts`

**Candidates** (already module-level, just move the file):

- `getVideoAndAudioFormats`
- `getRecommendedFormats`
- `fmtSize`
- `fmtDuration`
- `truncate` (verify it's actually used, otherwise delete)

These are already pure functions. Moving them to a `utils.ts` file decouples them from the frontend module and makes them importable in tests without a React render environment.

---

## 7. Test Requirements Before Safe Refactoring

### 7.1 Current Coverage

| Test file         | Scope                           | Frontend unit coverage |
| ----------------- | ------------------------------- | ---------------------- |
| `backend.test.ts` | Backend IPC handlers            | None                   |
| `e2e.spec.ts`     | Full Electron app, 14 scenarios | Integration only       |

**Frontend unit test coverage: 0%**

The e2e tests provide meaningful behavioral coverage (keyboard nav, tab switching, download flow, open-file, Shift+Enter folder, Escape back-nav), but they:

- Run against a full Electron app (slow, CI-heavy)
- Cannot test edge cases like `null` metadata, partial `window.UI`, error states
- Cannot test the format-filtering logic (`getVideoAndAudioFormats`, `getRecommendedFormats`) with specific format arrays

### 7.2 Required Tests Before Refactoring

**Priority 1 — Pure utility functions** (zero risk, write first):

```
frontend.utils.test.ts
  ✓ fmtSize: null → '?'
  ✓ fmtSize: bytes < 1MB → KB
  ✓ fmtSize: bytes >= 1MB → MB
  ✓ fmtDuration: null → ''
  ✓ fmtDuration: 90 → '1:30'
  ✓ fmtDuration: 3661 → '1:01:01'
  ✓ truncate: short string → unchanged
  ✓ truncate: long string → ellipsis at max
  ✓ getVideoAndAudioFormats: audio-only formats filtered out of vcodec='none'
  ✓ getVideoAndAudioFormats: video-only gets +bestaudio suffix added
  ✓ getVideoAndAudioFormats: sorted descending by resolution height
  ✓ getRecommendedFormats: always includes Best Quality + audio preset
  ✓ getRecommendedFormats: includes standard resolutions present in formats
  ✓ getRecommendedFormats: does not duplicate resolution heights
```

**Priority 2 — `useVideoDownloaderState` hook** (after extraction):

```
useVideoDownloaderState.test.ts
  ✓ initial state: all nulls/empty
  ✓ getFormats: sets loading=true while pending
  ✓ getFormats: sets metadata on success
  ✓ getFormats: sets error on failure
  ✓ startDownload: adds job optimistically with status 'running'
  ✓ startDownload: switches activeTab to 'downloads'
  ✓ cancelJob: removes job from jobs array
  ✓ poll: starts interval when a running job exists
  ✓ poll: clears interval when no running jobs
  ✓ URL change: clears metadata and error
  ✓ combinedList: running jobs appear before history items
  ✓ combinedList: deduplicates by jobId
  ✓ filteredFormats: 'recommended' tab uses getRecommendedFormats
  ✓ filteredFormats: 'audio_only' filters vcodec='none'
```

**Priority 3 — Component rendering** (after component extraction):

```
DownloadsView.test.tsx
  ✓ renders EmptyState when combinedList is empty
  ✓ renders list item for running download with progress badge
  ✓ renders list item for done download with 'Open Video' hint
  ✓ renders list item for error download with ERROR badge
  ✓ active item has nuxy-list-item--active class

FormatList.test.tsx
  ✓ renders EmptyState when formats is empty
  ✓ AUDIO badge on audio-only format
  ✓ SILENT badge on video-only format without audio
  ✓ success badge variant on 1080p/2160p/1440p
  ✓ active item has nuxy-list-item--active class
```

---

## 8. Risk Matrix

| Refactor step                                | Risk   | Mitigated by                         | Residual risk                                        |
| -------------------------------------------- | ------ | ------------------------------------ | ---------------------------------------------------- |
| Move utility fns to `utils.ts`               | Low    | Pure functions, no side effects      | Import path update in frontend                       |
| Extract `FormatList` component               | Low    | E2E covers format tab navigation     | Minor prop interface design risk                     |
| Extract `DownloadsView` component            | Medium | E2E covers downloads flow end-to-end | `combinedList` sort ordering must be preserved       |
| Extract `useVideoDownloaderState`            | High   | Must write unit tests first          | Poll timing, state ordering between effects          |
| Fix stale closure / `useKeyboardHandlers`    | High   | E2E covers all keyboard scenarios    | Nav handler behavior regression if deps change       |
| Remove `jobSelectedIndex` dead state         | Low    | Confirmed no JSX reads it            | None after grep verification                         |
| Fix `combinedList` timestamp for active jobs | Medium | Needs new unit test to pin behavior  | Sort order change could affect E2E test expectations |

**Overall risk level without prior unit tests: HIGH**  
**Overall risk level after writing Priority 1+2 tests: MEDIUM**

---

## 9. Step-by-Step Execution Plan

### Phase 0: Freeze (No refactoring, tests only)

**Step 1**: Run existing tests to establish green baseline.

```bash
pnpm -C src test -- extensions/video-downloader/backend.test.ts
```

**Step 2**: Write `frontend.utils.test.ts` for all 6 pure functions (14 test cases from §7.2 Priority 1). Commit as "test: add unit tests for video-downloader format utilities".

**Step 3**: Verify all 14 e2e scenarios still pass after Step 2 (no source changes, just confirms test environment).

---

### Phase 1: Safe Extractions (Low Risk)

**Step 4**: Move `fmtSize`, `fmtDuration`, `truncate`, `getVideoAndAudioFormats`, `getRecommendedFormats` to `extensions/video-downloader/utils.ts`. Import them in `frontend.tsx`. Run all tests. Commit.

**Step 5**: Remove `truncate` if confirmed unused (grep for all call sites in frontend.tsx first).

**Step 6**: Extract `FormatList` as a named function inside `frontend.tsx` (same file, not a separate file, due to extension single-file rule from EXTENSION_GUIDE). Pass `formats`, `selectedIndex`, `focusArea`, and UI components as props. Write `FormatList.test.tsx` unit tests (Priority 3a). Commit.

**Step 7**: Extract `DownloadListItem` helper inside `frontend.tsx` — the inner map callback in `fullScreenDownloadsView`. This reduces nesting depth from 9 to 6.

**Step 8**: Extract `FullScreenDownloadsView` as a named function inside `frontend.tsx`. Pass `combinedList`, `downloadSelectedIndex`, and UI refs as props. Write unit tests (Priority 3b). Commit.

---

### Phase 2: Hook Extraction (Medium Risk)

**Step 9**: Create `extensions/video-downloader/useVideoDownloaderState.ts`. Move all 10 state vars, all 7 effects, `combinedList` useMemo, `filteredFormats` useMemo, and the 4 async functions into the hook. Write unit tests (Priority 2, 14 test cases). **Do not change behavior, only move code.**

**Step 10**: Replace the state block in `VideoDownloader` with `const { ... } = useVideoDownloaderState(url)`. Run all tests (unit + e2e). Commit.

---

### Phase 3: Stale Closure Fix (High Risk — do last)

**Step 11**: Create `extensions/video-downloader/useKeyboardHandlers.ts`. Move `stateRef`, its synchronous update block (lines 319–332), and `rightPanelActions` into the new hook. The `eslint-disable` comment moves with it and is documented. Remove `stateRef` from `VideoDownloader`. Run all e2e tests. Commit.

**Step 12**: Remove `jobSelectedIndex` state if confirmed dead. Verify no visual regression in e2e tests. Commit.

---

### Phase 4: Review and Cleanup

**Step 13**: Run `pnpm -C src typecheck` to verify no TypeScript regressions.

**Step 14**: Audit `combinedList` timestamp issue (§3.6). Add a `startTime` field to `DownloadJob` so active jobs use a stable timestamp for sorting. Write a test that pins sort order. Commit.

**Step 15**: Document the `stateRef` / keyboard handler pattern in a code comment at the top of `useKeyboardHandlers.ts`.

---

## 10. TodoWrite-Compatible Task List (JSON)

```json
[
  {
    "id": "vd-test-baseline",
    "phase": 0,
    "priority": "critical",
    "title": "Run existing test suite to confirm green baseline",
    "command": "pnpm -C src test -- extensions/video-downloader/backend.test.ts",
    "blocked_by": []
  },
  {
    "id": "vd-test-utils",
    "phase": 0,
    "priority": "critical",
    "title": "Write frontend.utils.test.ts for fmtSize, fmtDuration, truncate, getVideoAndAudioFormats, getRecommendedFormats",
    "file": "extensions/video-downloader/frontend.utils.test.ts",
    "test_count": 14,
    "blocked_by": ["vd-test-baseline"]
  },
  {
    "id": "vd-extract-utils",
    "phase": 1,
    "priority": "high",
    "title": "Move pure utility functions to utils.ts and import in frontend.tsx",
    "files_changed": [
      "extensions/video-downloader/utils.ts (new)",
      "extensions/video-downloader/frontend.tsx (import added)"
    ],
    "blocked_by": ["vd-test-utils"]
  },
  {
    "id": "vd-remove-truncate",
    "phase": 1,
    "priority": "low",
    "title": "Verify truncate() is unused and remove if so",
    "blocked_by": ["vd-extract-utils"]
  },
  {
    "id": "vd-extract-formatlist",
    "phase": 1,
    "priority": "high",
    "title": "Extract FormatList named function inside frontend.tsx with props interface",
    "blocked_by": ["vd-extract-utils"]
  },
  {
    "id": "vd-test-formatlist",
    "phase": 1,
    "priority": "high",
    "title": "Write FormatList unit tests (5 cases: empty, AUDIO badge, SILENT badge, success badge, active class)",
    "blocked_by": ["vd-extract-formatlist"]
  },
  {
    "id": "vd-extract-downloadlistitem",
    "phase": 1,
    "priority": "medium",
    "title": "Extract DownloadListItem helper inside frontend.tsx to reduce nesting depth",
    "blocked_by": ["vd-extract-formatlist"]
  },
  {
    "id": "vd-extract-downloadsview",
    "phase": 1,
    "priority": "high",
    "title": "Extract FullScreenDownloadsView named function inside frontend.tsx with props interface",
    "blocked_by": ["vd-extract-downloadlistitem"]
  },
  {
    "id": "vd-test-downloadsview",
    "phase": 1,
    "priority": "high",
    "title": "Write DownloadsView unit tests (5 cases: empty state, running/done/error items, active class)",
    "blocked_by": ["vd-extract-downloadsview"]
  },
  {
    "id": "vd-extract-state-hook",
    "phase": 2,
    "priority": "high",
    "title": "Create useVideoDownloaderState.ts and move all state, effects, memos, and async handlers",
    "file": "extensions/video-downloader/useVideoDownloaderState.ts (new)",
    "blocked_by": ["vd-test-downloadsview"]
  },
  {
    "id": "vd-test-state-hook",
    "phase": 2,
    "priority": "critical",
    "title": "Write useVideoDownloaderState unit tests (14 cases covering all state transitions)",
    "blocked_by": ["vd-extract-state-hook"]
  },
  {
    "id": "vd-wire-state-hook",
    "phase": 2,
    "priority": "high",
    "title": "Replace state block in VideoDownloader with useVideoDownloaderState hook call",
    "blocked_by": ["vd-test-state-hook"]
  },
  {
    "id": "vd-extract-keyboard-hook",
    "phase": 3,
    "priority": "medium",
    "title": "Create useKeyboardHandlers.ts and move stateRef + rightPanelActions",
    "file": "extensions/video-downloader/useKeyboardHandlers.ts (new)",
    "blocked_by": ["vd-wire-state-hook"]
  },
  {
    "id": "vd-remove-dead-state",
    "phase": 3,
    "priority": "low",
    "title": "Remove jobSelectedIndex state after confirming it is not read in any JSX",
    "blocked_by": ["vd-extract-keyboard-hook"]
  },
  {
    "id": "vd-fix-timestamp",
    "phase": 4,
    "priority": "low",
    "title": "Fix combinedList timestamp bug: use stable startTime on DownloadJob instead of Date.now() on each render",
    "blocked_by": ["vd-remove-dead-state"]
  },
  {
    "id": "vd-typecheck",
    "phase": 4,
    "priority": "high",
    "title": "Run pnpm -C src typecheck to confirm no regressions",
    "command": "pnpm -C src typecheck",
    "blocked_by": ["vd-fix-timestamp"]
  },
  {
    "id": "vd-e2e-final",
    "phase": 4,
    "priority": "critical",
    "title": "Run all 14 e2e scenarios to confirm no behavioral regressions",
    "command": "pnpm -C src test:e2e:core -- e2e/video-downloader.spec.ts",
    "blocked_by": ["vd-typecheck"]
  }
]
```

---

## Appendix A: File Size Projection After Refactoring

| File                              | Current lines | Projected lines             |
| --------------------------------- | ------------- | --------------------------- |
| `frontend.tsx`                    | 931           | ~300 (thin rendering shell) |
| `utils.ts`                        | —             | ~90                         |
| `useVideoDownloaderState.ts`      | —             | ~200                        |
| `useKeyboardHandlers.ts`          | —             | ~100                        |
| `frontend.utils.test.ts`          | —             | ~120                        |
| `useVideoDownloaderState.test.ts` | —             | ~200                        |
| **Total**                         | **931**       | **~1010**                   |

The total line count increases slightly, but each file is independently understandable, testable, and modifiable. The monolith is broken into files with single responsibilities.

---

## Appendix B: Files Not Requiring Changes

- `backend.ts` — well-structured, good test coverage, no changes needed
- `types.ts` — clean type definitions, no changes needed
- `manifest.json` — correct, no changes needed
- `backend.test.ts` — comprehensive coverage, no changes needed
- `e2e.spec.ts` — solid integration coverage, no changes needed (may need minor updates if component class names change in Phase 1–2)

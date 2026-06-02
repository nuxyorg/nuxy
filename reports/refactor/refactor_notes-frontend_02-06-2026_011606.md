# Refactor Assessment: `extensions/notes/frontend.tsx`

**Date**: 2026-06-02  
**Analyst**: Senior Software Architect (Claude Sonnet 4.6)  
**File**: `/home/xava/Documents/nuxy/extensions/notes/frontend.tsx`  
**Report ID**: refactor_notes-frontend_02-06-2026_011606

---

## 1. Executive Summary

| Attribute | Value |
|-----------|-------|
| File size | 506 lines |
| Exported components | 1 (`NotesApp`) |
| Total functions / closures defined | 12 |
| `useState` calls | 8 |
| `useEffect` calls | 7 |
| `useMemo` calls | 2 |
| `useRef` calls | 3 |
| IPC channels invoked | 5 (`notes:list`, `notes:create`, `notes:update`, `notes:delete`, `notes:transcribe`, `notes:getConfig`) |
| Keyboard actions registered | 7 |
| Confirmed debug log | Line 276 — `console.log('[DEBUG] Delete key action triggered...')` |
| Risk level | **Medium** |
| Estimated refactor effort | 3–5 focused hours (non-breaking if extraction is interface-compatible) |
| Test coverage (backend) | Excellent — 9 `describe` blocks covering all IPC channels |
| Test coverage (frontend) | **Zero unit tests** — only Playwright e2e (`e2e.spec.ts`) covering keyboard flows |
| Breaking change risk | Low for internal extractions; Medium if `IpcResponse` wrapper changes |

### Risk Classification Rationale

The file is a single 506-line monolithic component with **no frontend unit tests**. All safety net is provided by e2e tests (which are valuable but slow and infrastructure-dependent). Any extraction must maintain the same IPC contract and the same event-dispatch API (`nuxy-register-actions`, `nuxy-key-hints-changed`, `nuxy-shell-omni-bar-control`) used by the shell.

---

## 2. Quick Wins

These can be applied immediately, independently of any larger refactor, with zero risk:

| # | Item | Location | Action | Risk |
|---|------|----------|--------|------|
| QW-1 | **Debug log** | Line 276 | Remove `console.log('[DEBUG] Delete key action triggered...')` inside the `Delete` key action handler | None |
| QW-2 | **`notes:getConfig` fires on every `selected` change** | Lines 103–109 | The second `useEffect` has `[selected]` in its dependency array but only reads config (font size). This causes a redundant IPC call on every note selection. Change dependency to `[]` (mount-only) since config is not note-specific | Very Low |
| QW-3 | **Duplicated filter logic in `handleSave`** | Lines 181–189 | `handleSave` manually re-implements the `filteredNotes` filter inline after saving. This duplicates the `useMemo` logic. It should recompute from the new `list` using the same derived logic (or use `useMemo` after `setNotes`) | Low |
| QW-4 | **`invoke` defined inside render** | Lines 79–84 | The `invoke` helper is defined as an arrow function inside the component body on every render. It should be either extracted as a module-level factory (parameterized by `EXT_ID`) or wrapped in `useCallback` | Low |
| QW-5 | **Inline `<style>` tag in JSX** | Lines 494–497 | The CSS for hiding the left panel in edit mode is rendered inline on every render cycle. This should be a static CSS string outside the component or moved to a stylesheet | Very Low |
| QW-6 | **`e2e.spec.ts` debug logs** | Lines 20–35, 150–153 | `console.log` statements in e2e helper functions (`openNotes`) and the Delete test body are leftover debug artifacts. Not source file changes, but clean-up recommended | None |

---

## 3. Component / Function Inventory Table

| Name | Type | Lines | Line Count | Description |
|------|------|--------|-----------|-------------|
| `ErrorBoundary` | Class component | 8–27 | 20 | Renders error fallback for `MarkdownText`; reused pattern (identical in other extensions) |
| `deriveTitle` | Pure function | 41–49 | 9 | Derives a title from note body (first non-empty line, max 40 chars). **Duplicated** — also exists in `backend.ts` (lines 68–79) |
| `NotesApp` | Function component | 51–506 | 456 | Monolith: renders TwoPanel layout, manages all state, all event handlers, all keyboard logic, all IPC calls |
| `handleNew` | Async handler (inside `NotesApp`) | 163–171 | 9 | Creates a new note via IPC then re-fetches list |
| `handleSave` | Async handler (inside `NotesApp`) | 173–197 | 25 | Saves current note body, derives title, re-fetches list, updates selectedIndex |
| `handleDelete` | Async handler (inside `NotesApp`) | 199–210 | 12 | Deletes selected note, resets state, re-fetches list |
| `handleRecord` | Async handler (inside `NotesApp`) | 212–241 | 30 | Accesses microphone, starts `MediaRecorder`, auto-stops after 10 s, transcribes via IPC |
| `handleStopRecord` | Sync handler (inside `NotesApp`) | 243–247 | 5 | Stops active `MediaRecorder` |
| `keyActions` (useMemo) | Derived value | 250–350 | 101 | Defines 7 keyboard shortcut descriptors passed to `_useToolKeyActions` |
| `leftPanel` | JSX variable | 401–432 | 32 | Note list with `SectionHeader`, "New Note" item, and `filteredNotes` mapping |
| `rightPanel` | JSX variable | 436–490 | 55 | Conditional: edit textarea, markdown preview, or empty state |
| Root render | JSX return | 492–505 | 14 | Wraps panels in `TwoPanel` with class-toggle and inline style |

**Total inside `NotesApp`**: ~456 lines for a single function component — the primary problem.

---

## 4. Code Smell Analysis Table

| Smell | Location | Severity | Description |
|-------|----------|----------|-------------|
| God Component | `NotesApp` (all 456 lines) | High | Single component owns state, IPC calls, MediaRecorder lifecycle, keyboard registration, command palette registration, layout — violates Single Responsibility |
| Debug log in production | Line 276 | High | `console.log('[DEBUG]...')` shipped in source; leaks internal state to browser console |
| Logic duplication (`filteredNotes`) | Lines 87–93 vs 181–189 | Medium | Filter predicate appears twice: once in `useMemo`, once inlined in `handleSave` |
| Logic duplication (`deriveTitle`) | `frontend.tsx:41–49` vs `backend.ts:68–79` | Medium | Identical function in two files; a types/utils package should own it |
| `invoke` defined inside render | Lines 79–84 | Medium | New function reference on every render; not memoized; silently closes over `EXT_ID` constant but looks like it could have hidden coupling |
| Config fetched on selection change | Lines 103–109 (`[selected]` dep) | Medium | Fires an IPC round-trip on every note selection even though font size config is not per-note |
| Inline `<style>` tag | Lines 494–497 | Low | Dynamic CSS injection on every render cycle; should be static |
| 101-line `useMemo` for keyboard actions | Lines 250–350 | Medium | Keyboard shortcut descriptors embedded directly in the component make the file much harder to scan; they belong in a separate `useNotesKeyActions` hook |
| `keyActions` captures `body` but `body` is never used by any key handler | Line 350 | Low | `body` is in the `useMemo` dependency array but no keyAction actually reads it; dead dependency causes unnecessary re-memos |
| `useEffect` for `nuxy-key-hints-changed` fires on every `selectedIndex` change | Lines 397–399 | Low | This event is cheap to fire, but it fires whenever `selectedIndex` changes (e.g., arrow navigation), which may exceed what the shell actually needs |
| No `useCallback` on async handlers | Lines 163–247 | Low | `handleNew`, `handleSave`, `handleDelete`, `handleRecord`, `handleStopRecord` are recreated on every render; they are captured in `useMemo(keyActions)` and `useEffect` dependency arrays |
| `MediaRecorder` auto-stop timeout not cleared | Line 237 | Low | `setTimeout` for 10-second auto-stop is never cancelled if user manually stops or component unmounts; potential state update on unmounted component |

---

## 5. Complexity Metrics Table

### Cyclomatic Complexity (approximate, counting branch points)

| Function | Branches | Complexity (CC) | Assessment |
|----------|----------|-----------------|------------|
| `deriveTitle` | 2 | 3 | Fine |
| `handleNew` | 0 | 1 | Fine |
| `handleSave` | 3 | 4 | Acceptable |
| `handleDelete` | 1 | 2 | Fine |
| `handleRecord` (inner `onstop`) | 3 | 4 | Acceptable |
| `handleRecord` (outer) | 2 | 3 | Fine |
| `keyActions[Delete].activeOn` | 2 | 3 | Fine |
| `keyActions[Enter].handler` | 2 | 3 | Fine |
| `keyActions[Escape].handler` | 2 | 3 | Fine |
| `keyActions[ArrowUp].handler` | 1 | 2 | Fine |
| `keyActions[ArrowDown].handler` | 3 | 4 | Acceptable |
| `useEffect(query/notes/filteredNotes)` | 3 | 4 | Acceptable |
| `useEffect(selectedIndex/filteredNotes)` | 3 | 4 | Acceptable |
| `rightPanel` JSX conditional | 2 | 3 | Fine |
| **`NotesApp` as a whole** | **~25** | **~26** | **High — exceeds recommended 10** |

### Nesting Depth

| Location | Max nesting depth |
|----------|------------------|
| `handleRecord` (onstop async) | 5 (function → recorder.onstop → try → catch → finally) |
| `keyActions[ArrowDown].handler` | 4 (useMemo → handler → setSelectedIndex → if/if) |
| `useEffect(query handler)` | 4 (effect → if → if → setSelectedIndex) |
| `rightPanel` JSX (edit branch) | 5 (div → Editor) |
| `leftPanel` filteredNotes map | 4 (List → conditional → map → ListItem → ListItemBody) |

Maximum nesting depth: **5 levels**. Not alarming in isolation, but combined with the overall length it degrades readability significantly.

---

## 6. Extraction Proposals

### 6.1 `useNotesIpc` Hook

**Problem**: The `invoke` helper and all 5 IPC-calling async functions live in the component body.  
**Proposal**: Extract them into a `useNotesIpc` hook file.

**BEFORE** (in `NotesApp` body):
```tsx
const invoke = <T = unknown,>(channel: string, payload?: unknown): Promise<T> =>
  window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
    const r = res as IpcResponse<T>
    if (!r?.success) throw new Error(r?.error || 'IPC call failed')
    return r.data as T
  })

async function handleNew(): Promise<void> {
  const note = await invoke<Note>('notes:create', { title: 'New Note', body: '' })
  const updated = await invoke<Note[]>('notes:list', {})
  // ...
}
// + handleSave, handleDelete, handleRecord, handleStopRecord
```

**AFTER** (`extensions/notes/useNotesIpc.ts`):
```tsx
import type { Note } from './types.ts'

const EXT_ID = 'com.nuxy.notes'

interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  return window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
    const r = res as IpcResponse<T>
    if (!r?.success) throw new Error(r?.error || 'IPC call failed')
    return r.data as T
  })
}

export function useNotesIpc() {
  const listNotes = () => invoke<Note[]>('notes:list', {})
  const createNote = (title: string, body: string) => invoke<Note>('notes:create', { title, body })
  const updateNote = (id: string, title: string, body: string) => invoke<Note>('notes:update', { id, title, body })
  const deleteNote = (id: string) => invoke<void>('notes:delete', { id })
  const getConfig = () => invoke<{ fontSize: string }>('notes:getConfig', {})
  const transcribe = (audioBuffer: number[]) => invoke<{ transcript: string }>('notes:transcribe', { audioBuffer })

  return { listNotes, createNote, updateNote, deleteNote, getConfig, transcribe }
}
```

**Impact**: Removes ~50 lines from `NotesApp`. The IPC contract is fully encapsulated; test coverage for this hook can be added independently.

---

### 6.2 `NoteList` Component

**Problem**: `leftPanel` (lines 401–432) is a 32-line inline JSX variable mixing layout and data concerns.  
**Proposal**: Extract to `NoteList.tsx`.

**BEFORE** (inline JSX variable in `NotesApp`):
```tsx
const leftPanel = (
  <>
    {SectionHeader && <SectionHeader label="Notes" />}
    <List>
      <ListItem active={selectedIndex === 0} onClick={() => setSelectedIndex(0)}>
        ...
      </ListItem>
      {filteredNotes.length === 0 ? (
        <EmptyState ... />
      ) : (
        filteredNotes.map((note, idx) => (
          <ListItem key={note.id} active={idx + 1 === selectedIndex} onClick={() => setSelectedIndex(idx + 1)}>
            ...
          </ListItem>
        ))
      )}
    </List>
  </>
)
```

**AFTER** (`extensions/notes/NoteList.tsx`):
```tsx
interface NoteListProps {
  notes: Note[]
  selectedIndex: number
  query: string
  onSelectIndex: (idx: number) => void
}

export function NoteList({ notes, selectedIndex, query, onSelectIndex }: NoteListProps) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState, SectionHeader } = window.UI || {}
  return (
    <>
      {SectionHeader && <SectionHeader label="Notes" />}
      <List>
        <ListItem active={selectedIndex === 0} onClick={() => onSelectIndex(0)}>
          ...
        </ListItem>
        {notes.length === 0 ? (
          <EmptyState message={query ? 'No matching notes.' : 'No notes yet.'} hint="Use ⌃N to create a new note." />
        ) : (
          notes.map((note, idx) => (
            <ListItem key={note.id} active={idx + 1 === selectedIndex} onClick={() => onSelectIndex(idx + 1)}>
              <ListItemBody>
                <ListItemText>{note.title}</ListItemText>
                <ListItemMeta>{note.body.slice(0, 60)}</ListItemMeta>
              </ListItemBody>
            </ListItem>
          ))
        )}
      </List>
    </>
  )
}
```

**Impact**: `NoteList` is a pure display component — no state, no IPC, easily unit-testable.

---

### 6.3 `NoteEditor` Component

**Problem**: `rightPanel` (lines 436–490) is a 55-line ternary that handles three distinct states (edit textarea, markdown preview, empty) inside the parent.  
**Proposal**: Extract to `NoteEditor.tsx`.

**BEFORE** (inline ternary in `NotesApp`):
```tsx
const rightPanel = editMode && selected ? (
  <div style={{ ... }}>
    <Editor ref={textareaRef} ... />
  </div>
) : selected ? (
  <div style={{ ... }}>
    <div>{selected.title}</div>
    <div>{MarkdownText ? <ErrorBoundary><MarkdownText>...</MarkdownText></ErrorBoundary> : selected.body}</div>
  </div>
) : (
  <EmptyState ... />
)
```

**AFTER** (`extensions/notes/NoteEditor.tsx`):
```tsx
interface NoteEditorProps {
  selected: Note | null
  body: string
  editMode: boolean
  transcribing: boolean
  fontSize: string
  textareaRef: React.RefObject<HTMLTextAreaElement>
  onBodyChange: (body: string) => void
}

export function NoteEditor({ selected, body, editMode, transcribing, fontSize, textareaRef, onBodyChange }: NoteEditorProps) {
  const { Textarea, MarkdownText, EmptyState } = window.UI || {}
  const Editor = Textarea || 'textarea'

  if (editMode && selected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-2)', gap: 'var(--space-2)' }}>
        <Editor ref={textareaRef} className="nuxy-textarea" value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder={transcribing ? 'Transcribing…' : 'Start writing…'}
          style={{ flex: 1, resize: 'none', width: '100%', height: '100%', border: 'none', background: 'transparent', color: 'var(--text, #ffffff)', outline: 'none', padding: 'var(--space-4, 12px)', fontSize }}
        />
      </div>
    )
  }

  if (selected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-4, 12px)', overflowY: 'auto', color: 'var(--text, #ffffff)', gap: 'var(--space-2)' }}>
        <div style={{ fontSize: '1.2em', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>{selected.title}</div>
        <div style={{ flex: 1, whiteSpace: 'pre-wrap', opacity: 0.8, fontSize, lineHeight: '1.5' }}>
          {MarkdownText ? <ErrorBoundary><MarkdownText>{selected.body}</MarkdownText></ErrorBoundary> : selected.body}
        </div>
      </div>
    )
  }

  return <EmptyState message="Select a note or create a new one." hint="Use ⌃N to create a new note." />
}
```

**Impact**: `NoteEditor` is testable in isolation. The `ErrorBoundary` moves with it (where it actually belongs).

---

### 6.4 `useNotesKeyActions` Hook

**Problem**: The `keyActions` `useMemo` block (lines 250–350) is 101 lines long and captures 5 dependencies, making the `NotesApp` body hard to read.  
**Proposal**: Extract to `useNotesKeyActions.ts`.

**BEFORE** (inside `NotesApp`):
```tsx
const keyActions = useMemo(() => [
  { key: 'n', modifiers: ['ctrl'], label: 'New Note', handler: () => { void handleNew() } },
  // ... 6 more entries, 101 lines total
], [editMode, selectedIndex, filteredNotes, selected, body])

_useToolKeyActions(keyActions)
```

**AFTER** (`extensions/notes/useNotesKeyActions.ts`):
```tsx
interface NotesKeyActionsOptions {
  editMode: boolean
  selectedIndex: number
  filteredNotes: Note[]
  selected: Note | null
  onNew: () => void
  onSave: () => void
  onDelete: () => void
  onStartEdit: (note: Note) => void
  onExitEdit: () => void
  onNavigate: (direction: 'up' | 'down') => void
}

export function useNotesKeyActions(opts: NotesKeyActionsOptions) {
  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})
  const keyActions = useMemo(() => [
    // same 7 entries, now with clean external references
  ], [opts.editMode, opts.selectedIndex, opts.filteredNotes, opts.selected])
  _useToolKeyActions(keyActions)
}
```

**Note on `body` dependency**: `body` appears in the current `useMemo` dependency array (line 350) but is NOT read by any key handler. Remove it from the deps array when extracting.

**Impact**: `NotesApp` drops 103 lines. `useNotesKeyActions` is independently testable.

---

### 6.5 `useVoiceRecorder` Hook

**Problem**: `handleRecord` and `handleStopRecord` manage a full `MediaRecorder` lifecycle with `useRef` state that belongs to its own concern.  
**Proposal**: Extract to `useVoiceRecorder.ts`.

**BEFORE** (inside `NotesApp`):
```tsx
const [recording, setRecording] = useState<boolean>(false)
const [transcribing, setTranscribing] = useState<boolean>(false)
const mediaRef = useRef<MediaRecorder | null>(null)
const chunksRef = useRef<Blob[]>([])

async function handleRecord(): Promise<void> { /* 30 lines */ }
function handleStopRecord(): void { /* 5 lines */ }
```

**AFTER** (`extensions/notes/useVoiceRecorder.ts`):
```tsx
interface UseVoiceRecorderOptions {
  onTranscript: (text: string) => void
  transcribeAudio: (buffer: number[]) => Promise<{ transcript: string }>
  maxDurationMs?: number
}

export function useVoiceRecorder({ onTranscript, transcribeAudio, maxDurationMs = 10000 }: UseVoiceRecorderOptions) {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // cleanup on unmount — fixes the missing timeout clearance bug
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (mediaRef.current?.state === 'recording') mediaRef.current.stop()
    }
  }, [])

  const start = async () => { /* ... */ }
  const stop = () => { /* ... */ }

  return { recording, transcribing, start, stop }
}
```

**Impact**: Removes ~40 lines from `NotesApp`. Also fixes the timeout-not-cleared bug (QW smell) as part of the extraction. The hook is independently testable with `vi.fn()` mocks for browser APIs.

---

### 6.6 Shared `deriveTitle` Utility

**Problem**: `deriveTitle` is defined identically in both `frontend.tsx` (lines 41–49) and `backend.ts` (lines 68–79).

**Proposal**: Move to `extensions/notes/utils.ts` and import from both files.

```ts
// extensions/notes/utils.ts
export function deriveTitle(body: string): string {
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return 'New Note'
  const firstLine = lines[0]
  return firstLine.length > 40 ? firstLine.slice(0, 40) + '...' : firstLine
}
```

---

### 6.7 Shared `ErrorBoundary`

**Problem**: The `ErrorBoundary` class is copy-pasted across at least notes and other extensions (pattern confirmed in `ollama`, `n8n` area). It should live in `@nuxy/ui` or at minimum `extensions/global.d.ts` companion.

**Proposal**: If `window.UI` already exports `ErrorBoundary`, use that. Otherwise, place in a shared `extensions/ErrorBoundary.tsx` and import.

---

## 7. Cross-Cutting Pattern Opportunities

These patterns appear identically in `notes/frontend.tsx`, `n8n/frontend.tsx`, `bitwarden/frontend.tsx`, and `clipboard/frontend.tsx`. They are candidates for `@nuxy/ui` or `@nuxy/extension-sdk` promotion:

| Pattern | Notes | N8n | Bitwarden | Clipboard | Suggested Extraction |
|---------|-------|-----|-----------|-----------|---------------------|
| `invoke` IPC helper | Lines 79–84 | Lines 17–22 | Lines 21–26 | Inline calls | `@nuxy/extension-sdk` → `createIpcInvoker(extId)` |
| `_useToolKeyActions` guard | Line 29 | Line 11 | Line 18 | Line 182 | `@nuxy/ui` → export with no-op default |
| `nuxy-register-actions` dispatch | Lines 354–395 | Lines 179–182 | Lines 309–312 | Lines 403–406 | `@nuxy/ui` → `useCommandPalette(actions, deps)` |
| `nuxy-key-hints-changed` dispatch | Lines 397–399 | Lines 187–189 | Lines 316–318 | Lines 234 | `@nuxy/ui` → `useKeyHints(deps)` |
| `nuxy-shell-omni-bar-control` dispatch | Lines 125, 307, 321 | Not present | Not present | Lines 232, 240 | `@nuxy/ui` → `useOmnibarControl()` returning `{ show, hide, clear }` |
| `ErrorBoundary` class | Lines 8–27 | Not found | Not found | Not found | `@nuxy/ui` or `extensions/shared` |
| `IpcResponse<T>` interface | Lines 35–39 | Lines 18–21 (inline) | Lines 21–26 (inline) | Implicit | `@nuxy/core` → export as type |

Promoting even 3 of these 7 patterns would reduce per-extension boilerplate by ~40–60 lines each and enforce consistency.

---

## 8. Risk Matrix

| Change | Impact | Effort | Risk | Priority |
|--------|--------|--------|------|----------|
| Remove `console.log('[DEBUG]')` (L276) | None | Trivial | None | P0 — do immediately |
| Fix `notes:getConfig` dep array (`[]`) | Minor: loads config once | 1 min | None | P0 |
| Remove `body` from `keyActions` dep array | Minor: fewer re-memos | 1 min | None | P0 |
| Add `clearTimeout` for MediaRecorder auto-stop | Bug fix | 5 min | None | P0 |
| Extract `deriveTitle` to `utils.ts` | DRY | 10 min | Very Low (import path change) | P1 |
| Extract `useNotesIpc` hook | Decouples IPC | 30 min | Low (pure extraction) | P1 |
| Extract `NoteList` component | Pure display extraction | 20 min | Low | P1 |
| Extract `NoteEditor` component | Pure display extraction | 20 min | Low | P1 |
| Extract `useNotesKeyActions` hook | Logic extraction | 30 min | Medium (many closures captured) | P2 |
| Extract `useVoiceRecorder` hook | Complex state + refs | 45 min | Medium (MediaRecorder lifecycle) | P2 |
| Extract `ErrorBoundary` to shared | Cross-extension concern | 15 min | Low (import path change) | P2 |
| Promote `invoke` to SDK | Monorepo change | 1–2 h | Medium (needs SDK PR, version bump) | P3 |
| Promote `useCommandPalette` to UI lib | Monorepo change | 1–2 h | Medium | P3 |
| Add frontend unit tests | Coverage improvement | 2–3 h | None | P3 (pre-refactor: P1!) |

### Test Coverage Gap (Critical Observation)

`NotesApp` has **zero unit tests**. The only coverage is via Playwright e2e in `e2e.spec.ts`. Before executing P1/P2 extractions, strongly consider adding vitest unit tests using `jsdom` for the extracted hooks/components, because:
- Extractions could silently change behavior (e.g., `body` dep removal, config dep fix)
- e2e tests are slow (~seconds/test) vs unit tests (~milliseconds)
- The backend test suite is excellent (9 describe blocks, 11 tests) — the frontend deserves equivalent coverage

---

## 9. Step-by-Step Execution Plan

### Phase 0: Quick Wins (No refactor, no tests needed)

1. **[L276] Remove debug log**: Delete `console.log('[DEBUG] Delete key action triggered...')` from the Delete key action handler.
2. **[L103–109] Fix config dep array**: Change `}, [selected])` to `}, [])` on the `notes:getConfig` effect.
3. **[L350] Remove `body` from keyActions deps**: Remove `body` from the `useMemo` dependency array (it is unused by any handler).
4. **[L237] Add MediaRecorder timeout cleanup**: Store the `setTimeout` return value in `timeoutRef.current` and clear it in a `useEffect` cleanup (or during `handleStopRecord`).
5. **[e2e.spec.ts L20–35, 150–153] Clean e2e debug logs**: Remove console.log statements from `openNotes` helper and the Delete test body in `e2e.spec.ts`.

### Phase 1: Structural Extractions (No new files in core packages)

6. **Create `extensions/notes/utils.ts`**: Move `deriveTitle` here. Update import in `frontend.tsx` and `backend.ts`. Run `pnpm -C src test` to confirm no regressions.
7. **Create `extensions/notes/useNotesIpc.ts`**: Extract `invoke` helper and 5 IPC-calling functions. Update `NotesApp` to call `useNotesIpc()`. Verify e2e suite passes.
8. **Create `extensions/notes/NoteList.tsx`**: Extract `leftPanel` as a proper React component with explicit props. Replace inline `leftPanel` variable with `<NoteList ...>`.
9. **Create `extensions/notes/NoteEditor.tsx`**: Extract `rightPanel` ternary as a component. Move `ErrorBoundary` into the same file (or a sibling `ErrorBoundary.tsx`). Replace inline `rightPanel` variable with `<NoteEditor ...>`.
10. **Create `extensions/notes/useNotesKeyActions.ts`**: Extract `keyActions` useMemo + `_useToolKeyActions` call. Fix `body` dep removal and clean handler closure references.
11. **Create `extensions/notes/useVoiceRecorder.ts`**: Extract `recording`/`transcribing` state, `mediaRef`, `chunksRef`, `handleRecord`, `handleStopRecord`. Add `useEffect` cleanup for timeout and recorder.

After each step: run `pnpm -C src test` and manually verify the e2e suite does not regress.

### Phase 2: Test Coverage

12. **Add `extensions/notes/frontend.test.tsx`**: Write vitest unit tests for the extracted hooks/components:
    - `useNotesIpc`: mock `window.core.ipc.invoke`, assert channels and error handling
    - `NoteList`: render with `@testing-library/react` (if available) or snapshot; test empty state, active index, click callbacks
    - `NoteEditor`: test editMode branch, preview branch, empty branch
    - `useVoiceRecorder`: mock `MediaRecorder`, assert recording/transcribing state transitions
    - `useNotesKeyActions`: assert key action descriptors, test `activeOn` conditions

### Phase 3: Cross-Extension (Monorepo PRs, optional)

13. **Promote `IpcResponse<T>`** to `@nuxy/core` types.
14. **Promote `createIpcInvoker`** helper to `@nuxy/extension-sdk`.
15. **Add `useCommandPalette` hook** to `@nuxy/ui` to replace the `nuxy-register-actions` pattern.
16. **Add `useKeyHints` hook** to `@nuxy/ui` to replace the `nuxy-key-hints-changed` pattern.
17. Update all extensions (notes, n8n, bitwarden, clipboard) to use the new shared hooks.

---

## 10. TodoWrite-Compatible JSON Task List

```json
[
  {
    "id": "qw-1-remove-debug-log",
    "content": "Remove console.log('[DEBUG] Delete key action triggered...') from frontend.tsx line 276",
    "status": "pending",
    "priority": "high",
    "phase": 0,
    "file": "extensions/notes/frontend.tsx"
  },
  {
    "id": "qw-2-fix-config-dep",
    "content": "Change notes:getConfig useEffect dependency array from [selected] to [] to prevent redundant IPC call on every selection change",
    "status": "pending",
    "priority": "high",
    "phase": 0,
    "file": "extensions/notes/frontend.tsx"
  },
  {
    "id": "qw-3-remove-body-dep",
    "content": "Remove 'body' from keyActions useMemo dependency array — it is captured but never read by any handler",
    "status": "pending",
    "priority": "medium",
    "phase": 0,
    "file": "extensions/notes/frontend.tsx"
  },
  {
    "id": "qw-4-mediarecorder-cleanup",
    "content": "Store setTimeout return in timeoutRef.current and clear it in handleStopRecord and a useEffect cleanup to prevent state update on unmounted component",
    "status": "pending",
    "priority": "medium",
    "phase": 0,
    "file": "extensions/notes/frontend.tsx"
  },
  {
    "id": "qw-5-e2e-debug-logs",
    "content": "Remove console.log debug statements from e2e.spec.ts (openNotes helper and Delete test body)",
    "status": "pending",
    "priority": "low",
    "phase": 0,
    "file": "extensions/notes/e2e.spec.ts"
  },
  {
    "id": "p1-utils",
    "content": "Create extensions/notes/utils.ts with deriveTitle, update frontend.tsx and backend.ts imports",
    "status": "pending",
    "priority": "high",
    "phase": 1,
    "file": "extensions/notes/utils.ts"
  },
  {
    "id": "p1-use-notes-ipc",
    "content": "Create extensions/notes/useNotesIpc.ts extracting invoke helper and all IPC-calling async functions; update NotesApp",
    "status": "pending",
    "priority": "high",
    "phase": 1,
    "file": "extensions/notes/useNotesIpc.ts"
  },
  {
    "id": "p1-note-list",
    "content": "Create extensions/notes/NoteList.tsx as pure display component; replace leftPanel inline variable in NotesApp",
    "status": "pending",
    "priority": "high",
    "phase": 1,
    "file": "extensions/notes/NoteList.tsx"
  },
  {
    "id": "p1-note-editor",
    "content": "Create extensions/notes/NoteEditor.tsx with all three right-panel branches and ErrorBoundary co-located; replace rightPanel inline variable in NotesApp",
    "status": "pending",
    "priority": "high",
    "phase": 1,
    "file": "extensions/notes/NoteEditor.tsx"
  },
  {
    "id": "p1-key-actions-hook",
    "content": "Create extensions/notes/useNotesKeyActions.ts; move keyActions useMemo and _useToolKeyActions call into the hook; clean deps",
    "status": "pending",
    "priority": "medium",
    "phase": 1,
    "file": "extensions/notes/useNotesKeyActions.ts"
  },
  {
    "id": "p1-voice-recorder-hook",
    "content": "Create extensions/notes/useVoiceRecorder.ts; extract MediaRecorder lifecycle with proper cleanup; update NotesApp to use hook",
    "status": "pending",
    "priority": "medium",
    "phase": 1,
    "file": "extensions/notes/useVoiceRecorder.ts"
  },
  {
    "id": "p2-frontend-tests",
    "content": "Add extensions/notes/frontend.test.tsx with unit tests for useNotesIpc, NoteList, NoteEditor, useVoiceRecorder, useNotesKeyActions",
    "status": "pending",
    "priority": "medium",
    "phase": 2,
    "file": "extensions/notes/frontend.test.tsx"
  },
  {
    "id": "p3-ipc-response-type",
    "content": "Promote IpcResponse<T> interface to @nuxy/core; update notes, n8n, bitwarden imports",
    "status": "pending",
    "priority": "low",
    "phase": 3,
    "file": "packages/core"
  },
  {
    "id": "p3-create-ipc-invoker",
    "content": "Add createIpcInvoker(extId) factory to @nuxy/extension-sdk; migrate notes, n8n, bitwarden, clipboard",
    "status": "pending",
    "priority": "low",
    "phase": 3,
    "file": "packages/extension-sdk"
  },
  {
    "id": "p3-use-command-palette",
    "content": "Add useCommandPalette hook to @nuxy/ui to replace nuxy-register-actions pattern; update all extensions",
    "status": "pending",
    "priority": "low",
    "phase": 3,
    "file": "packages/ui"
  },
  {
    "id": "p3-use-key-hints",
    "content": "Add useKeyHints hook to @nuxy/ui to replace nuxy-key-hints-changed dispatch pattern; update all extensions",
    "status": "pending",
    "priority": "low",
    "phase": 3,
    "file": "packages/ui"
  }
]
```

---

## Appendix: File Line Budget After Full Refactor

| File | Before | After (estimated) |
|------|--------|------------------|
| `frontend.tsx` (NotesApp) | 506 | ~120 |
| `useNotesIpc.ts` | — | ~55 |
| `NoteList.tsx` | — | ~50 |
| `NoteEditor.tsx` | — | ~70 |
| `useNotesKeyActions.ts` | — | ~120 |
| `useVoiceRecorder.ts` | — | ~60 |
| `utils.ts` | — | ~15 |
| `frontend.test.tsx` | — | ~150 |
| **Total** | **506** | **~640 across 8 files** |

The total line count increases because tests are added and each file has proper imports/exports/interfaces, but each individual file becomes well under 150 lines — the threshold for comfortable readability.

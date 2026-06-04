# Frontend Structure Guide

> Companion to `EXTENSION_GUIDE.md` §5. Prescribes _when_ and _how_ to split `frontend.tsx` into hooks and components. The clipboard extension (`extensions/clipboard/`) is the reference implementation.

---

## Core principle

`frontend.tsx` is an **orchestrator**, not an implementation. It wires state and hooks together and returns JSX. It must not contain:

- Business logic or IPC calls
- `useEffect` blocks with non-trivial bodies
- Render logic beyond delegating to components

A healthy `frontend.tsx` should read like a spec: "I have these data sources, these actions, and this layout."

---

## Canonical hook categories

Each hook owns exactly one concern. When a hook is doing two things, split it.

### 1. Data hook — `useXxxData` / `useXxxHistory`

**Owns:** fetching, polling, and exposing raw data. Never mutates — mutation belongs in the actions hook.

```ts
// hooks/useClipboardHistory.ts
export function useClipboardHistory() {
  const [items, setItems] = React.useState<ClipboardItem[]>([])
  // poll via setInterval, expose items + setItems
  return { items, setItems }
}
```

**When to write one:** any extension that loads data from the backend on mount, polls for updates, or listens to IPC push events.

---

### 2. Actions hook — `useXxxActions`

**Owns:** all IPC mutation calls and their local side-effects (flash states, window hide). Returns handlers ready to bind to keyboard actions or component props. Does not contain navigation or keyboard logic.

```ts
// hooks/useClipboardActions.ts
export function useClipboardActions({ filteredItems, searchQuery, setItems, setSelectedIndex }) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  // ipcMutate helper (private)
  // handleCopy, handleCopyFile, handlePin, handleUnpin, handleDelete
  return { copiedId, handleCopy, handleCopyFile, handlePin, handleUnpin, handleDelete }
}
```

**When to write one:** any extension that calls the backend to mutate state (copy, delete, pin, save, run, etc.).

---

### 3. Derived-state hook — `useXxxMeta` / `useXxxPreview`

**Owns:** state that is derived from the current selection — async lookups, computed values, or resource loading that depends on which item is active.

```ts
// hooks/useSelectedItemMeta.ts
export function useSelectedItemMeta({ selectedIndex, filteredItems }) {
  const [imageDimensions, setImageDimensions] = React.useState<string | null>(null)
  const [fileExists, setFileExists] = React.useState<boolean | null>(null)
  // effects: load image dimensions, check file existence
  return { imageDimensions, fileExists }
}
```

**When to write one:** whenever the frontend loads extra information about the selected item (file stats, image dimensions, URL previews, process details, etc.).

---

### 4. Keyboard + actions registration hook — `useXxxKeyboard`

**Owns:** `useToolKeyActions` bindings and the `nuxy-register-actions` event. Both belong here because they describe the same set of user-facing operations expressed in two different channels (keyboard shortcut bar vs. action palette).

```ts
// hooks/useClipboardKeyboard.ts
export function useClipboardKeyboard({ filteredItems, selectedIndex, setSelectedIndex, handlers }) {
  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})
  _useToolKeyActions([
    /* Arrow keys, Enter */
  ])

  React.useEffect(() => {
    // dispatch nuxy-register-actions with context-sensitive actions
  }, [selectedIndex, filteredItems])
}
```

**When to write one:** any extension that registers more than one key action or has context-sensitive actions (actions that change when selection changes).

---

### 5. UI-sync hook — `useXxxSync`

**Owns:** side-effects that synchronise the extension's UI state with the shell — omni bar visibility, key-hints refresh, or other `window.dispatchEvent` calls that are not user actions.

```ts
// hooks/useOmniBarSync.ts
export function useOmniBarSync(selectedIndex: number): void {
  React.useEffect(() => {
    const action = selectedIndex >= 0 ? 'hide' : 'show'
    window.dispatchEvent(new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action } }))
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex])

  React.useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'show' } })
      )
    }
  }, [])
}
```

**When to write one:** any extension that hides/shows the omni bar, changes window size programmatically, or dispatches events on selection change. A single-screen extension that never changes shell state does not need this.

---

## Canonical component categories

### 1. Preview component — `XxxPreview`

Renders the visual content of a selected item. Has no state, no event handlers — pure display.

```tsx
// components/ClipboardPreview.tsx
export function ClipboardPreview({ item, type, txt }: Props) {
  // returns image / color swatch / text block depending on type
}
```

Extract when: the right panel (or detail view) contains `if type === 'image' … else if type === 'color' …` branching that is 30+ lines.

---

### 2. List item leading — `XxxItemLeading`

The icon or thumbnail shown at the start of a list row. Extracted from the list panel so the list component stays focused on layout and selection.

```tsx
// components/ClipboardItemLeading.tsx
export function ClipboardItemLeading({ item, type }: Props) {
  // returns ItemLeading with image thumbnail / color swatch / file icon / URL icon
}
```

Extract when: an item's leading element requires its own conditional logic (more than a simple icon lookup).

---

### 3. Left / right panels — `XxxLeftPanel`, `XxxRightPanel`

Split the two-column layout into separate files. Each panel receives only the props it needs — no passing of the full item list into the right panel.

```tsx
// components/ClipboardLeftPanel.tsx  — list + empty state
// components/ClipboardRightPanel.tsx — preview + properties
```

Extract when: the extension uses a `TwoPanel` layout and either panel is more than ~40 lines.

---

## Decision guide — when to split vs. keep inline

| Signal                                          | Action                                               |
| ----------------------------------------------- | ---------------------------------------------------- |
| `frontend.tsx` > 120 lines                      | audit: what is not orchestration?                    |
| A `useEffect` body > 10 lines                   | extract to a named hook                              |
| Two `useEffect`s share a concept                | merge into one hook                                  |
| An IPC call inside JSX or an effect             | move to the actions hook                             |
| A render branch (`type === 'image'`) > 20 lines | extract to a component                               |
| A hook doing two unrelated things               | split into two hooks                                 |
| One hook used only in one component             | may stay inline                                      |
| A component with no state or handlers           | keep it, it's a pure display component — that's fine |

---

## Anti-patterns

**Don't split for line count alone.** A 60-line `frontend.tsx` with one data hook and clean JSX needs no further splitting.

**Don't create "utils" hooks.** A hook named `useHelpers` or `useUtils` is a drawer — it hides the real concern. Name hooks after what they own (`useNoteActions`, `useProcessMeta`).

**Don't mix data and actions in one hook.** A hook that both polls the backend and handles mutations becomes hard to test. Keep fetch and mutate separate.

**Don't put `nuxy-register-actions` in the keyboard hook if the actions depend on async state.** If the action palette items require data that hasn't loaded yet, put the registration effect in `frontend.tsx` where all state is in scope, or pass the ready data into the keyboard hook explicitly.

**Don't create a sync hook for a single `dispatchEvent` call.** Inline it. Extract `useXxxSync` only when there are two or more related dispatch calls (e.g., show/hide pair + cleanup).

---

## Reference: clipboard extension after refactor

```
extensions/clipboard/
  frontend.tsx                    ← orchestrator (~90 lines)
  backend.ts                      ← IPC handlers
  types.ts                        ← ClipboardItem, AddHistoryItemInput
  hooks/
    useClipboardHistory.ts        ← poll getHistory every 1.5 s
    useClipboardActions.ts        ← copy / pin / delete + copiedId flash
    useSelectedItemMeta.ts        ← imageDimensions + fileExists per selection
    useClipboardKeyboard.ts       ← arrow keys, Enter, nuxy-register-actions
    useOmniBarSync.ts             ← hide omni bar when item selected
  components/
    ClipboardLeftPanel.tsx        ← filtered list + empty state
    ClipboardRightPanel.tsx       ← layout: preview + properties
    ClipboardPreview.tsx          ← image / color / text renderer
    ClipboardItemLeading.tsx      ← thumbnail / icon per item type
    FileIconFor.tsx               ← file extension → icon
  utils/
    itemType.ts                   ← getItemType, getListLabel, timeAgo, …
    history.ts                    ← createHistoryItem, sortHistory
```

`frontend.tsx` after refactor:

- Owns: `selectedIndex` state, `filteredItems` memo, search-reset effect
- Delegates everything else to the five hooks above
- Returns a `TwoPanel` layout with the two panel components

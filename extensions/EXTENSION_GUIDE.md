# Nuxy Extension Development Guide

> **AI agents building or reviewing extensions MUST follow every rule in this document.** Rules marked **[CORE TODO]** require a Core API that does not yet exist — if you encounter a case requiring it, add the API to `packages/core` first, then use it.

---

## Table of Contents

1. [File Structure](#1-file-structure)
2. [Manifest Rules](#2-manifest-rules)
3. [Extension Settings](#3-extension-settings)
4. [Backend Rules](#4-backend-rules)
5. [Frontend Rules](#5-frontend-rules)
6. [TypeScript Rules](#6-typescript-rules)
7. [Core API Reference](#7-core-api-reference)
8. [Testing Requirements](#8-testing-requirements)
9. [Anti-Patterns](#9-anti-patterns)
10. [Checklist](#10-checklist)

---

## 1. File Structure

```
extensions/
  my-extension/
    manifest.json        # required
    backend.ts           # required if type is tool/provider/orchestrator
    backend.test.ts      # required when backend.ts exists
    frontend.tsx         # optional, JSX/TSX component
    types.ts             # extension-specific interfaces (data models, IPC payload types)
    package.json         # only if the extension has its own npm deps
```

- Extensions live strictly inside their own folder. No file may reference paths outside it.
- `frontend.tsx` must be a single self-contained file — no relative imports.
- `backend.ts` must export a named `register` function (`export function register(core: CoreContext): void`).
- All extension-specific types belong in `types.ts` inside the extension folder — not in shared packages.
- The protocol server transpiles `.ts` and `.tsx` files at runtime via `typescript.transpileModule`; no separate build step is needed.

---

## 2. Manifest Rules

```json
{
  "id": "com.nuxy.<name>",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "type": "tool",
  "permissions": ["storage"],
  "capabilities": {
    "callable": true,
    "caller": false
  },
  "entry": {
    "backend": "backend.js",
    "frontend": "frontend.js"
  }
}
```

### Permitted types

`tool` | `provider` | `orchestrator` | `theme` | `iconpack` | `uikit`

### Permissions

Only declare what you actually use. Available values:

| Permission      | Grants access to     |
| --------------- | -------------------- |
| `storage`       | `core.storage.*`     |
| `clipboard`     | `core.clipboard.*`   |
| `network`       | outbound HTTP/fetch  |
| `notifications` | system notifications |
| `media`         | `core.media.*`       |

Using a `core.*` API without declaring the matching permission is a bug. The kernel will reject it at runtime with `PERMISSION_DENIED`.

### Capabilities

- `callable: true` — other extensions may invoke this one via `core.extensions.invoke`
- `caller: true` — this extension calls other extensions. Only set when necessary.

### UIKit Extensions (`type: "uikit"`)

A `uikit` extension ships a `frontend.js` that is loaded **before the shell bootstrap**, allowing it to extend or replace `window.UI` components at runtime — no app recompilation required.

```json
{
  "id": "com.example.my-uikit",
  "name": "My Better UIKit",
  "version": "1.0.0",
  "type": "uikit",
  "priority": 10,
  "permissions": [],
  "entry": {
    "frontend": "frontend.js"
  }
}
```

**`priority`** — load order when multiple uikit extensions are installed. Lower numbers load first (default: `100`). Use this to layer overrides intentionally.

**`frontend.js`** for a `uikit` extension has **no default export**. It is a pure side-effect module that modifies `window.UI`:

```js
// my-uikit/frontend.js
const React = window.React

// Override an existing component
function BetterButton({ children, onClick, variant }) {
  const base = window.UI?.Button
  // ... enhanced implementation using window.React
  return React.createElement('button', { onClick, className: `btn btn--${variant}` }, children)
}

// Add a brand-new molecule not in the core kit
function DataTable({ columns, rows }) {
  // ...
}

// Merge into window.UI — preserves everything not overridden
window.UI = {
  ...window.UI,
  Button: BetterButton,
  DataTable,
}
```

**Rules for `uikit` extensions:**

- No `backend.js` — uikit extensions have no backend worker.
- No `default export` — the file is a side-effect module.
- Must not assume any specific load order relative to other uikit extensions unless `priority` is set.
- Must always spread `...window.UI` when reassigning, to preserve components you are not overriding.
- May add brand-new components (e.g. `DataTable`, `ColorPicker`) that other extension frontends can then use via `window.UI`.
- Uses `window.React` — same as any other frontend.

---

## 3. Extension Settings

Extensions declare user-configurable settings via a `settings.json` schema file. The `com.nuxy.settings` extension automatically discovers this schema and renders a settings UI — **you must never build a custom settings panel inside the extension frontend**.

### 3.1 `settings.json` format

```json
{
  "version": 1,
  "fields": [
    {
      "key": "host",
      "label": "Server URL",
      "type": "text",
      "default": "http://localhost:11434",
      "placeholder": "http://localhost:11434",
      "description": "Optional description shown below the field"
    },
    {
      "key": "format",
      "label": "Output Format",
      "type": "select",
      "default": "mp4",
      "options": [
        { "value": "mp4", "label": "MP4" },
        { "value": "webm", "label": "WebM" }
      ]
    },
    {
      "key": "audioOnly",
      "label": "Audio Only",
      "type": "toggle",
      "default": false
    },
    {
      "key": "outputDir",
      "label": "Download Location",
      "type": "location",
      "default": "~/Downloads",
      "placeholder": "~/Downloads"
    }
  ]
}
```

**Available field types:**

| Type       | Description                                    |
| ---------- | ---------------------------------------------- |
| `text`     | Free-text string input                         |
| `select`   | Dropdown from a static `options` list          |
| `toggle`   | Boolean on/off switch                          |
| `location` | Folder picker (resolves `~` to home directory) |
| `color`    | Color picker                                   |
| `list`     | Multi-value string list                        |

### 3.2 Declaring settings in the manifest

Add `entry.settings` pointing to the schema file:

```json
{
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.tsx",
    "settings": "settings.json"
  }
}
```

No additional permission is required for an extension to read and write its own settings.

### 3.3 Reading and writing settings in the backend

Use `core.settings.read` / `core.settings.write` — these read from and write to the extension's own `ext-settings.json` file. The settings extension writes to the same file when the user saves changes in the settings UI.

```ts
export async function register(core: CoreContext): Promise<void> {
  // Read saved settings (returns null if the user has never set a value)
  const host = (await core.settings.read<string>('host')) ?? 'http://localhost:11434'
  const audioOnly = (await core.settings.read<boolean>('audioOnly')) ?? false

  // Write a setting (e.g. when saving a runtime preference)
  await core.settings.write('model', selectedModel)
}
```

**Do NOT** use `core.storage.write('config.json', ...)` for user-facing settings — use `core.settings` so that the settings extension and the backend share the same source of truth.

### 3.4 Cross-extension settings access

Reading or writing another extension's settings requires explicit permissions:

```json
"permissions": ["settings.read", "settings.write"]
```

```ts
// Read a single key from another extension's settings
const value = await core.settings.readExtension?.('com.nuxy.other', 'key')

// Read all settings from another extension at once
const all = await core.settings.readAllExtension?.('com.nuxy.other')

// Overwrite all settings for another extension
await core.settings.writeAllExtension?.('com.nuxy.other', { key: value })
```

---

## 4. Backend Rules

### 4.1 No direct Node.js imports

**NEVER import Node built-ins directly.**

```js
// WRONG
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { DatabaseSync } from 'node:sqlite'
```

Use `core.*` APIs instead. If the required API does not exist in `CoreContext`, it must be added to `packages/core` first (see [Core TODO](#core-todos)).

### 4.2 File system via `core.fs`

```js
// Check if a file exists
const exists = await core.fs.fileExists('/some/path')

// [CORE TODO] Read a directory listing
const entries = await core.fs.readDir('/some/dir')

// [CORE TODO] Read a file as text
const text = await core.fs.readFile('/some/path', 'utf8')

// [CORE TODO] Write a file
await core.fs.writeFile('/some/path', data)

// [CORE TODO] Create directories recursively
await core.fs.mkdir('/some/dir', { recursive: true })

// [CORE TODO] Rename / move a file
await core.fs.rename('/old', '/new')

// [CORE TODO] Delete a file
await core.fs.rm('/some/path')

// [CORE TODO] Stat (type, size, mtime)
const stat = await core.fs.stat('/some/path')
```

### 4.3 Storage (sandboxed JSON) via `core.storage`

For structured data that belongs to the extension's own data directory, use the sandboxed storage API. Data is automatically namespaced by extension id.

```js
// Read (returns null if not found)
const data = await core.storage.read('history.json')

// Write
await core.storage.write('history.json', data)
```

Do not store data by manually constructing paths under `~/.nuxy/data/` — that bypasses sandboxing.

### 4.4 Database via `core.db` [CORE TODO]

When an extension requires a relational or FTS database:

```js
// [CORE TODO] Open an extension-scoped SQLite database by name
const db = await core.db.open('my-data')

// Execute SQL
await db.exec('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, value TEXT)')

// Prepared statement
const stmt = db.prepare('INSERT INTO items (value) VALUES (?)')
stmt.run('hello')

// Query
const rows = db.prepare('SELECT * FROM items WHERE value LIKE ?').all('%search%')

// Close
db.close()
```

The database file is stored under the extension's data directory — extensions never touch the path directly.

### 4.5 Opening files / URLs via `core.shell` [CORE TODO]

```js
// [CORE TODO] Open a file or URL with the system default handler (xdg-open / open / start)
await core.shell.open('/path/to/file')
await core.shell.open('https://example.com')

// [CORE TODO] Execute an allowed command (requires 'shell' permission)
const result = await core.shell.exec('ffmpeg', ['-i', input, output])
```

Never call `execFile`, `exec`, `spawn`, or `child_process` directly.

### 4.6 Logging

```js
core.logger.info('Loaded successfully')
core.logger.warn('Something unexpected', { detail })
core.logger.error('Fatal error', err)
core.logger.silly('Verbose trace data')
```

Never use `console.log` / `console.error` in extensions.

### 4.7 Cross-extension calls

Extensions must not call each other directly. Use `core.extensions.invoke`:

```js
// WRONG — direct import or window.core.ipc from backend
import { register } from '../other-ext/backend.js'

// CORRECT
const result = await core.extensions.invoke('com.nuxy.other-ext', 'someChannel', payload)
```

`caller: true` must be set in manifest when making cross-extension calls.

### 4.8 Backend entry point

```ts
import type { CoreContext } from '@nuxy/extension-sdk'
import type { MyItem } from './types.ts'

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'my-extension' })

  core.ipc.handle('doSomething', async (payload: unknown): Promise<MyItem> => {
    const p = payload as { id: string }
    // ...
    return result
  })
}
```

All IPC handlers must return a value (or `undefined`). The kernel wraps them in `IpcResult<T>` automatically.

---

## 5. Frontend Rules

### 5.1 TSX format

Frontend files are `.tsx` files containing JSX. They are loaded at runtime via `nuxy-ext://` — no build step, no bundler. All external dependencies come from `window.React` and `window.UI`.

```tsx
// Top of every frontend.tsx — window.React MUST be in scope for JSX to work
const React = window.React
const { useState, useEffect, useRef, useMemo, useCallback } = React

// Import types from the extension's own types.ts (type-only, erased at runtime)
import type { MyItem } from './types.ts'

interface Props {
  query: string
}

export default function MyView({ query }: Props) {
  // ...
}
```

**Do NOT** add `import React from 'react'` — it is not available as an ES module in this context. JSX compiles to `React.createElement(...)` using the `window.React` reference.

### 5.2 UI Kit only — no custom components

All UI must be built exclusively with `@nuxy/ui` components accessed via `window.UI`. If a component you need does not exist, **add it to `packages/ui`** before using it. Do not implement it inline in the extension.

```jsx
// WRONG — custom component in extension
function MyButton({ children, onClick }) {
  return <button style={{ background: 'blue' }}>{children}</button>
}

// CORRECT — use UI kit
const { Button } = window.UI || {}
// ...
{
  Button && <Button>...</Button>
}
```

Destructure all components at the top of the component function or at the module level:

```jsx
export default function MyView({ query }) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState } = window.UI || {}
  // ...
}
```

### 5.3 Keyboard-only interaction — no mouse-only buttons

All actions must be accessible via keyboard. Clickable elements are only permitted as a secondary affordance when a keyboard binding already covers the same action.

- **NEVER** render a `<button>` or clickable element as the **only** way to trigger an action.
- **NEVER** use `onClick` for primary list navigation — use `useListNavigation` from `window.UI`.
- **NEVER** add `onClick` that has no corresponding keyboard shortcut.

```jsx
// WRONG — only mouse-clickable
<ListItem onClick={() => handleOpen(item)}>

// CORRECT — keyboard via useListNavigation, onClick is an optional affordance
const { selectedIndex } = _useListNavigation(items, {
  onEnter: (item) => handleOpen(item),
})
// ...
<ListItem active={idx === selectedIndex}>
```

### 5.4 Input via Omnibar

Extensions must not render their own `<input>` or `<textarea>`. All text input comes through the shell's omnibar and is passed to the frontend as the `query` prop.

```jsx
// CORRECT — receive query from shell
export default function MyView({ query }) {
  useEffect(() => {
    // react to query changes
  }, [query])
}

// WRONG — own input
return <input value={localQuery} onChange={...} />
```

### 5.5 No inline styles — use theme tokens

Never use hardcoded colors, spacing values, or magic numbers in `style` props or CSS strings. Use CSS custom properties from the active theme.

```jsx
// WRONG
<div style={{ color: '#ef4444', background: 'rgba(0,0,0,0.2)', padding: '16px' }}>

// CORRECT
<div style={{ color: 'var(--color-danger)', background: 'var(--surface-overlay)', padding: 'var(--space-4)' }}>
```

For layout primitives (flex, grid, height) that do not need theming, inline styles are acceptable only when no UI kit component fits and the value is purely structural (not a color/border/shadow).

### 5.6 No emojis in UI

Do not use emoji characters as icons or visual affordances. Use icon components from `window.UI` (`IconFile`, `IconCode`, etc.) or request a new icon in `packages/ui/src/components/Icon.tsx`.

```jsx
// WRONG
;<span>📁 {item.title}</span>

// CORRECT
const { IconFile } = window.UI || {}
// ...
{
  IconFile && <IconFile />
}
{
  item.title
}
```

### 5.7 Keyboard actions via `useToolKeyActions` / `useListNavigation`

```jsx
const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})
const _useListNavigation =
  (window.UI || {}).useListNavigation ||
  (() => ({ selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }))

// Simple list navigation
const { selectedIndex, setSelectedIndex } = _useListNavigation(items, {
  onEnter: (item) => handleSelect(item),
  enterLabel: 'Open',
  enterHint: 'Enter',
  extraActions: [
    {
      key: 'Enter',
      modifiers: ['shift'],
      label: 'Open folder',
      hint: ['⇧', 'Enter'],
      handler: () => {
        /* ... */
      },
    },
  ],
})

// Custom key bindings (for non-list views)
_useToolKeyActions([
  {
    key: 'ArrowUp',
    label: 'Previous',
    hint: '↑↓',
    handler: () => {
      /* ... */
    },
  },
  {
    key: 'ArrowDown',
    label: 'Next',
    handler: () => {
      /* ... */
    },
  },
  {
    key: 'Enter',
    label: 'Select',
    hint: '↵',
    handler: () => {
      /* ... */
    },
  },
  {
    key: 'Escape',
    label: 'Back',
    hint: 'Esc',
    handler: () => {
      /* ... */
    },
  },
])
```

#### `activeOn` — conditional activation

Use the optional `activeOn` predicate to make a shortcut (and its shortcut-bar hint) active only when a specific UI state is met — for example, when an item is selected in a list.

```jsx
_useToolKeyActions([
  {
    key: 'ArrowUp',
    label: 'Navigate',
    hint: '↑↓',
    // no activeOn — always enabled
    handler: () => setSelectedIndex((i) => Math.max(-1, i - 1)),
  },
  {
    key: 'ArrowDown',
    label: '', // empty: paired with ArrowUp hint above, no separate hint needed
    handler: () => setSelectedIndex((i) => Math.min(i + 1, items.length - 1)),
  },
  {
    key: 'Enter',
    label: 'Copy',
    hint: '↵',
    activeOn: () => selectedIndex >= 0, // hidden + inactive when nothing selected
    handler: () => handleCopy(filteredItems[selectedIndex]),
  },
  {
    key: 'd',
    label: 'Delete',
    hint: 'D',
    activeOn: () => selectedIndex >= 0,
    handler: () => handleDelete(filteredItems[selectedIndex]),
  },
  {
    key: 's',
    label: 'Search',
    hint: 'S',
    activeOn: () => selectedIndex >= 0, // only meaningful when an item is focused
    handler: () => setSelectedIndex(-1),
  },
])
```

**Rules for `activeOn`:**

- Must be a `() => boolean` closure — it reads your component's current state directly.
- When `activeOn()` returns `false`, the handler is **not** called even if the key is pressed.
- The shortcut-bar **hint is also hidden** when `activeOn()` returns `false`.
- `activeOn` is evaluated at keydown time, using the latest state via the `actionsRef` pattern.

**Triggering hint refresh:** When your selection state changes, dispatch `nuxy-key-hints-changed` so the shell re-evaluates which hints to show:

```jsx
React.useEffect(() => {
  window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
}, [selectedIndex]) // or whichever state drives your activeOn predicates
```

### 5.8 IPC calls from frontend

```jsx
// Invoke your own backend
window.core.ipc
  .invoke(EXT_ID, 'channelName', payload)
  .then((res) => {
    if (res?.success) {
      /* ... */
    }
  })
  .catch(console.error)

// Kernel built-ins
window.core.ipc.invoke('kernel', 'getThemeByName', { name })
window.core.themes?.list()
window.core.icons?.listPacks()
window.core.window?.hide()
```

### 5.9 No cross-extension IPC from frontend

Frontends may only call their own backend (`EXT_ID`) or `kernel`. They must not call another extension's IPC channels directly. If data from another extension is needed, the backend should proxy it.

### 5.10 Layout components

Use layout primitives from the UI kit:

| Layout need           | Component           |
| --------------------- | ------------------- |
| Two-column split      | `TwoPanel`          |
| Vertical tabs sidebar | `TabBar` (vertical) |
| Scrollable item list  | `List`              |
| Empty / zero state    | `EmptyState`        |
| Alert / banner        | `Alert`             |
| Dropdown picker       | `SelectBox`         |
| Grid                  | `Grid` / `GridItem` |
| Section divider       | `SectionHeader`     |

### 5.11 Window / shell events

Communicate with the shell via `window.dispatchEvent(new CustomEvent(...))` for approved channels only:

| Channel                       | Purpose                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nuxy-shell-footer-hints`     | Set footer shortcut hints (`detail: ReactNode \| null`)                                                                                                             |
| `nuxy-shell-omni-bar-control` | Show or hide the omnibar (`detail: { action: 'show' \| 'hide' }`)                                                                                                   |
| `nuxy-register-actions`       | Register command palette actions (`detail: Action[]`)                                                                                                               |
| `nuxy-settings-updated`       | Notify that settings changed (`detail: settingsObj`)                                                                                                                |
| `nuxy-key-hints-changed`      | Ask the shell to re-evaluate which key-action hints are active (no detail needed). Dispatch this whenever the state that drives your `activeOn` predicates changes. |

Do not dispatch or listen for arbitrary custom events not listed here.

---

## 6. TypeScript Rules

All extensions must be written in TypeScript. JavaScript (`.js`) extension files are no longer accepted.

### 6.1 File naming

| File                     | Extension            |
| ------------------------ | -------------------- |
| Backend logic            | `backend.ts`         |
| Backend tests            | `backend.test.ts`    |
| Frontend component       | `frontend.tsx`       |
| Extension-specific types | `types.ts`           |
| Non-JSX helper modules   | `helper-name.ts`     |
| JSX helper components    | `component-name.tsx` |

### 6.2 Types file — extension-local interfaces

Every extension with non-trivial data must have a `types.ts` defining its interfaces. **Never put extension-specific types in shared packages.**

```ts
// extensions/my-extension/types.ts

export interface MyItem {
  id: string
  title: string
  createdAt: string
}

export interface CreatePayload {
  title: string
}

export interface UpdatePayload {
  id: string
  title?: string
}
```

### 6.3 Backend typing

```ts
import type { CoreContext } from '@nuxy/extension-sdk'
import type { MyItem, CreatePayload } from './types.ts'

export function register(core: CoreContext): void {
  let items: MyItem[] = []

  core.registry.registerTool({ name: 'my-extension' })

  core.ipc.handle('getItems', async (): Promise<MyItem[]> => {
    return items
  })

  core.ipc.handle('createItem', async (payload: unknown): Promise<MyItem> => {
    const { title } = payload as CreatePayload
    const item: MyItem = { id: crypto.randomUUID(), title, createdAt: new Date().toISOString() }
    items.push(item)
    await core.storage.write<MyItem[]>('items.json', items)
    return item
  })
}
```

- IPC handler payloads arrive as `unknown` — cast with `as MyPayloadType` after validation.
- Use generic storage reads: `core.storage.read<MyItem[]>('data.json')`.

### 6.4 Frontend typing

```tsx
const React = window.React
const { useState, useEffect } = React

import type { MyItem } from './types.ts'

interface Props {
  query: string
}

export default function MyView({ query }: Props) {
  const { List, ListItem, EmptyState } = window.UI || {}
  const [items, setItems] = useState<MyItem[]>([])

  // IPC helper — cast result explicitly
  const invoke = async <T,>(channel: string, payload?: unknown): Promise<T> => {
    const res = (await window.core.ipc.invoke('com.nuxy.my-extension', channel, payload)) as {
      success: boolean
      data?: T
      error?: string
    }
    if (!res?.success) throw new Error(res?.error || 'IPC failed')
    return res.data as T
  }

  useEffect(() => {
    invoke<MyItem[]>('getItems')
      .then(setItems)
      .catch(() => {})
  }, [])

  // ...
}
```

### 6.5 `ui-default` component authoring — `forwardRef` pattern

Components in `extensions/ui-default/src/components/` that need to forward a DOM `ref` must use `React.forwardRef`. Write proper types — **no `any`**:

```tsx
// CORRECT
export const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
  ({ label, className, ...rest }, ref) => (
    <div ref={ref} className={`nuxy-my-component ${className ?? ''}`} {...rest}>
      {label}
    </div>
  )
)
MyComponent.displayName = 'MyComponent'
```

**Do NOT** use `any` as a workaround for missing types, and **do NOT** add `& { className?: string }` intersection hacks — `className` and all other HTML attributes come from `React.HTMLAttributes<HTMLDivElement>` which is in the interface.

`extensions/tsconfig.json` declares `typeRoots` pointing to `packages/ui/node_modules/@types` and `src/node_modules/@types` so that `@types/react` is resolvable for both extensions and ui-default components. If React types are not found, fix the tsconfig — do not add `any`.

If a component does not need ref forwarding, keep it as a plain function component.

---

### 6.6 TypeScript config

Extensions are covered by `extensions/tsconfig.json`. The config:

- Uses `"jsx": "react"` with `jsxFactory: "React.createElement"` (classic JSX — requires `window.React` to be in scope)
- Resolves `@nuxy/extension-sdk`, `@nuxy/core`, `@nuxy/ui` from the workspace packages
- Does **not** emit files — transpilation is done at runtime by the protocol server
- Includes a path alias for `vitest` pointing to `src/node_modules/vitest`

### 6.7 Global window types

`extensions/global.d.ts` declares the runtime globals available to all frontends:

- `window.React` — full React namespace
- `window.UI` — all exports from `@nuxy/ui`
- `window.core.ipc`, `window.core.window`, `window.core.icons`, `window.core.themes`

This file is picked up automatically by `extensions/tsconfig.json`.

---

## 7. Core API Reference

### Currently available (`CoreContext`)

```ts
core.clipboard.readText()             // → Promise<string>
core.clipboard.writeText(text)        // → Promise<void>
core.clipboard.readImage()            // → Promise<string | null>  (data URL)
core.clipboard.writeImage(dataURL)    // → Promise<void>
core.clipboard.writeFiles(paths)      // → Promise<void>

core.fs.fileExists(path)              // → Promise<boolean>

core.storage.read<T>(file)            // → Promise<T | null>   (JSON, namespaced by ext id)
core.storage.write<T>(file, data)     // → Promise<void>

core.media.getNowPlaying()            // → Promise<NowPlaying | null>

core.extensions.invoke(id, ch, data)  // → Promise<IpcResult>

core.logger.info/warn/error/silly(msg, meta?)

core.config.get()                     // → Promise<NuxyConfig>

core.ipc.handle(channel, handler)     // register an IPC handler
core.registry.registerTool/registerProvider/registerOrchestrator/registerTheme/registerIconPack
```

### Core TODOs — must be added before any extension uses them

These APIs are required by the rules above but do not yet exist. Before writing an extension that needs them, add the type to `packages/core/src/index.ts`, the host channel to `packages/core/src/host-channels.ts`, the proxy method to `packages/extension-host/src/core-proxy.ts`, and the main-process handler to `src/electron/ipc/register.ts`.

| API                                 | Purpose                                           |
| ----------------------------------- | ------------------------------------------------- |
| `core.fs.readDir(path)`             | List directory entries                            |
| `core.fs.readFile(path, encoding?)` | Read file contents                                |
| `core.fs.writeFile(path, data)`     | Write file contents                               |
| `core.fs.mkdir(path, opts?)`        | Create directory                                  |
| `core.fs.rename(src, dest)`         | Move/rename                                       |
| `core.fs.rm(path)`                  | Delete file                                       |
| `core.fs.stat(path)`                | File metadata (type, size, mtime)                 |
| `core.db.open(name)`                | Open/create a sandboxed SQLite database           |
| `core.shell.open(pathOrUrl)`        | Open with system default handler                  |
| `core.shell.exec(cmd, args, opts?)` | Run allowed command (requires `shell` permission) |

---

## 8. Testing Requirements

### Backend tests (`backend.test.ts`)

Every extension with a `backend.ts` must have a corresponding `backend.test.ts` in the same folder.

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CoreContext } from '@nuxy/extension-sdk'
import { register } from './backend.ts'

function makeCore(overrides: Partial<CoreContext> = {}): CoreContext {
  return {
    registry: {
      registerTool: vi.fn(),
      registerProvider: vi.fn(),
      registerOrchestrator: vi.fn(),
      registerTheme: vi.fn(),
      registerIconPack: vi.fn(),
    },
    ipc: { handle: vi.fn() },
    storage: { read: vi.fn().mockResolvedValue(null), write: vi.fn().mockResolvedValue(undefined) },
    clipboard: {
      readText: vi.fn(),
      writeText: vi.fn(),
      readImage: vi.fn(),
      writeImage: vi.fn(),
      writeFiles: vi.fn(),
    },
    fs: {
      fileExists: vi.fn().mockResolvedValue(false),
      readDir: vi.fn(),
      readFile: vi.fn(),
      readFileBinary: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      rename: vi.fn(),
      rm: vi.fn(),
      stat: vi.fn(),
      homedir: vi.fn().mockReturnValue('/home/user'),
      tmpdir: vi.fn().mockReturnValue('/tmp'),
    },
    db: { open: vi.fn() },
    shell: { open: vi.fn(), exec: vi.fn(), spawn: vi.fn() },
    media: { getNowPlaying: vi.fn() },
    extensions: { invoke: vi.fn() },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), silly: vi.fn() },
    config: { get: vi.fn() },
    ...overrides,
  } as CoreContext
}

describe('my-extension backend', () => {
  let core: CoreContext
  const handlers: Record<string, (payload: unknown) => Promise<unknown>> = {}

  beforeEach(() => {
    core = makeCore()
    ;(core.ipc.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (channel: string, fn: (payload: unknown) => Promise<unknown>) => {
        handlers[channel] = fn
      }
    )
    register(core)
  })

  it('registers a tool', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(String) })
    )
  })

  it('handles myChannel', async () => {
    const result = await handlers['myChannel']({ some: 'payload' })
    expect(result).toEqual(/* expected */)
  })
})
```

- Use `vi.spyOn(module, 'method')` in `beforeEach` + `vi.restoreAllMocks()` in `afterEach` for CJS modules.
- Use `vi.mock` factory for ESM-only modules (`node:sqlite` etc.).
- Mock `CoreContext` inline — never import the real proxy.
- Test every IPC handler registered in `register()`.
- Test error paths (storage failure, network timeout, etc.).

### E2E tests (`e2e.spec.ts`) — already TypeScript

For extensions with interactive frontends, add an e2e spec in the same folder. Use worker-scoped `electronApp`/`appPage` fixtures from `src/e2e/fixtures.ts`.

```ts
import { test, expect } from '../../../src/e2e/fixtures.ts'

test('opens and shows results', async ({ appPage }) => {
  // type into omnibar
  await appPage.getByTestId('omnibar-input').type('hello')
  // assert list item appears
  await expect(appPage.getByTestId('list-item').first()).toBeVisible()
  // press Enter
  await appPage.keyboard.press('Enter')
})
```

### Running tests

**Backend unit tests** — run from the repo root:

```bash
pnpm test                          # all unit tests across the monorepo
pnpm -C src test -- extensions/calculator/backend.test.ts  # single file
```

**E2E tests** — require the app to be built (`pnpm build`) first:

```bash
pnpm test:e2e calculator           # e2e tests for one extension
pnpm test:e2e:all                  # all extensions with an e2e.spec.ts
pnpm test:e2e:core                 # core app e2e tests (src/e2e/)
```

`pnpm test:e2e <folder>` resolves to `extensions/<folder>/e2e.spec.ts`. The argument must match the extension's folder name exactly.

---

## 9. Anti-Patterns

The following patterns are banned. Reviewers and AI agents must flag these.

### A. Node.js imports in backend

```js
// BANNED
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { DatabaseSync } from 'node:sqlite'
```

Use `core.fs`, `core.db`, `core.shell` instead.

### B. Hardcoded colors and spacing

```jsx
// BANNED
style={{ color: '#ef4444' }}
style={{ background: 'rgba(0,0,0,0.2)' }}
style={{ padding: '16px' }}
```

Use CSS custom properties: `var(--color-danger)`, `var(--surface-overlay)`, `var(--space-4)`.

### C. Custom UI components not in the UI kit

```jsx
// BANNED
function MyCustomList({ items }) {
  return (
    <ul>
      {items.map((i) => (
        <li key={i.id}>{i.title}</li>
      ))}
    </ul>
  )
}
```

Add the component to `packages/ui` or use an existing one.

### D. Mouse-only actions

```jsx
// BANNED — no keyboard equivalent
<button onClick={handleDelete}>Delete</button>
<ListItem onClick={handleOpen}>    // acceptable only WITH a keyboard binding
```

### E. Own input elements

```jsx
// BANNED
<input value={query} onChange={(e) => setQuery(e.target.value)} />
```

### F. Direct extension-to-extension calls

```js
// BANNED
import { register as otherRegister } from '../other-ext/backend.js'
window.core.ipc.invoke('com.nuxy.other-ext', 'channel', data) // from frontend
```

Backend: use `core.extensions.invoke`. Frontend: proxy via own backend.

### G. Undeclared permissions

```json
// manifest.json has no "storage" permission, but backend does:
await core.storage.write('data.json', value)  // BANNED
```

### H. Emojis in UI code

```jsx
// BANNED
<span>📁</span>
<span>⚙️</span>
```

Use icon components from `window.UI`.

### I. `console.log` / `console.error` in backend

```js
// BANNED
console.log('[MyExt] started')
console.error(err)
```

Use `core.logger.*`.

### J. Dispatching unlisted custom events

```jsx
// BANNED — not in the approved channel list
window.dispatchEvent(new CustomEvent('my-private-event', { detail: data }))
```

### K. JavaScript extension files

```
// BANNED — all extension files must be TypeScript
backend.js
backend.test.js
frontend.js
```

Use `.ts` for backend/helper files and `.tsx` for files containing JSX.

### L. `import React from 'react'` in frontend

```tsx
// BANNED — React is not available as an ES module in the extension context
import React from 'react'
```

Use `const React = window.React` at the top of every `.tsx` file.

### M. Untyped IPC payloads in backend

```ts
// BANNED — payload is unknown, must be cast before use
core.ipc.handle('doThing', async (payload) => {
  return payload.id // implicit any
})

// CORRECT
core.ipc.handle('doThing', async (payload: unknown) => {
  const { id } = payload as { id: string }
  return id
})
```

### N. Extension-specific types in shared packages

```ts
// BANNED — ClipboardItem belongs in extensions/clipboard/types.ts
// packages/core/src/types.ts:
export interface ClipboardItem { ... }
```

Put data-model types in `types.ts` inside the extension folder.

### O. Hardcoded keyboard shortcut hints in UI layout

```tsx
// BANNED — shortcut hints should not be hardcoded in the component body
return (
  <div>
    <span>Ctrl+Enter to send</span>
  </div>
)
```

Register all shortcuts via `useToolKeyActions` instead. This ensures all shortcut hints are unified and displayed in the shell's footer/shortcut bar.

### P. Inline settings panel in extension frontend

```tsx
// BANNED — extensions must not implement their own settings UI
const [showSettings, setShowSettings] = useState(false)

if (showSettings) {
  return (
    <div>
      <input value={hostInput} onChange={...} />      // also banned: own input
      <button onClick={handleSave}>Save</button>       // also banned: mouse-only
    </div>
  )
}
```

Use `settings.json` + `entry.settings` in the manifest instead. The settings extension renders the UI automatically. The extension backend reads values via `core.settings.read()`.

### Q. Using `core.storage` for user-facing settings

```ts
// BANNED — user-visible config must go through core.settings
await core.storage.write('config.json', { host, model })
const cfg = await core.storage.read<Config>('config.json')
```

`core.storage` is for extension-internal data (e.g. history, cache). User-facing settings that appear in the settings extension must use `core.settings.read` / `core.settings.write`, which share the same `ext-settings.json` file the settings extension reads and writes.

---

## 10. Checklist

Before submitting or merging an extension, verify every item:

**Manifest**

- [ ] `id` follows `com.nuxy.<name>` convention
- [ ] All used `core.*` APIs have a matching entry in `permissions`
- [ ] `capabilities.caller` is only `true` if the extension calls other extensions

**Settings**

- [ ] User-configurable options are declared in `settings.json` and referenced via `entry.settings` in the manifest
- [ ] Extension backend reads settings via `core.settings.read(key)` — not `core.storage.read('config.json')`
- [ ] Extension backend writes settings via `core.settings.write(key, value)` — not `core.storage.write('config.json', ...)`
- [ ] No custom settings panel rendered inside the extension frontend
- [ ] `core.storage` is only used for extension-internal data (history, cache, temp state) — not for user-facing config

**TypeScript**

- [ ] All source files use `.ts` or `.tsx` — no `.js` extension files
- [ ] `backend.ts` imports `CoreContext` from `@nuxy/extension-sdk`
- [ ] `register` function is typed: `export function register(core: CoreContext): void`
- [ ] IPC handler payloads typed as `unknown`, cast before use
- [ ] `types.ts` exists with all extension-specific interfaces
- [ ] Frontend has `interface Props { query: string }` and typed component
- [ ] `const React = window.React` at top of every `.tsx` file — no `import React`
- [ ] All `useState` calls have explicit type parameters where non-trivial

**Backend**

- [ ] No `import` of `fs`, `os`, `path`, `child_process`, `node:*`, or any Node built-in
- [ ] File system access goes through `core.fs.*`
- [ ] Persistent data uses `core.storage.*` or `core.db.*`
- [ ] Shell commands use `core.shell.*`
- [ ] Cross-extension calls use `core.extensions.invoke`
- [ ] Only `core.logger.*` used for logging — no `console.*`
- [ ] `backend.test.ts` exists and covers all IPC handlers

**Frontend**

- [ ] File is `.tsx` with JSX syntax
- [ ] `window.React` and `window.UI` used exclusively — no bundled React or UI libs
- [ ] All components come from `window.UI || {}`
- [ ] No `<button>`, `<input>`, `<textarea>`, or custom components
- [ ] All list navigation uses `useListNavigation`
- [ ] All key bindings registered via `useToolKeyActions`
- [ ] No hardcoded keyboard shortcut hints in UI layout (e.g. `⌃↑↓ to switch` inside components) — rely entirely on `useToolKeyActions` and the shell footer/shortcut bar
- [ ] No hardcoded colors — only `var(--token-name)` CSS custom properties
- [ ] No emojis — use icon components
- [ ] Input received from `query` prop — no own input rendering
- [ ] Cross-extension IPC proxied through own backend
- [ ] Only approved `window.dispatchEvent` channels used
- [ ] No inline settings panel — settings are declared in `settings.json` and rendered by the settings extension

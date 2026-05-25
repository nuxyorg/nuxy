# Nuxy Extension Development Guide

> **AI agents building or reviewing extensions MUST follow every rule in this document.** Rules marked **[CORE TODO]** require a Core API that does not yet exist — if you encounter a case requiring it, add the API to `packages/core` first, then use it.

---

## Table of Contents

1. [File Structure](#1-file-structure)
2. [Manifest Rules](#2-manifest-rules)
3. [Backend Rules](#3-backend-rules)
4. [Frontend Rules](#4-frontend-rules)
5. [Core API Reference](#5-core-api-reference)
6. [Testing Requirements](#6-testing-requirements)
7. [Anti-Patterns](#7-anti-patterns)
8. [Checklist](#8-checklist)

---

## 1. File Structure

```
extensions/
  my-extension/
    manifest.json        # required
    backend.js           # required if type is tool/provider/orchestrator
    backend.test.js      # required when backend.js exists
    frontend.js          # optional, JSX component
    package.json         # only if the extension has its own npm deps
```

- Extensions live strictly inside their own folder. No file may reference paths outside it.
- `frontend.js` must be a single self-contained file — no relative imports.
- `backend.js` must be a CJS-compatible ES module (`export function register`).

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
`tool` | `provider` | `orchestrator` | `theme` | `iconpack`

### Permissions
Only declare what you actually use. Available values:

| Permission      | Grants access to              |
|-----------------|-------------------------------|
| `storage`       | `core.storage.*`              |
| `clipboard`     | `core.clipboard.*`            |
| `network`       | outbound HTTP/fetch           |
| `notifications` | system notifications          |
| `media`         | `core.media.*`                |

Using a `core.*` API without declaring the matching permission is a bug. The kernel will reject it at runtime with `PERMISSION_DENIED`.

### Capabilities
- `callable: true` — other extensions may invoke this one via `core.extensions.invoke`
- `caller: true` — this extension calls other extensions. Only set when necessary.

---

## 3. Backend Rules

### 3.1 No direct Node.js imports

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

### 3.2 File system via `core.fs`

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

### 3.3 Storage (sandboxed JSON) via `core.storage`

For structured data that belongs to the extension's own data directory, use the sandboxed storage API. Data is automatically namespaced by extension id.

```js
// Read (returns null if not found)
const data = await core.storage.read('history.json')

// Write
await core.storage.write('history.json', data)
```

Do not store data by manually constructing paths under `~/.nuxy/data/` — that bypasses sandboxing.

### 3.4 Database via `core.db` [CORE TODO]

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

### 3.5 Opening files / URLs via `core.shell` [CORE TODO]

```js
// [CORE TODO] Open a file or URL with the system default handler (xdg-open / open / start)
await core.shell.open('/path/to/file')
await core.shell.open('https://example.com')

// [CORE TODO] Execute an allowed command (requires 'shell' permission)
const result = await core.shell.exec('ffmpeg', ['-i', input, output])
```

Never call `execFile`, `exec`, `spawn`, or `child_process` directly.

### 3.6 Logging

```js
core.logger.info('Loaded successfully')
core.logger.warn('Something unexpected', { detail })
core.logger.error('Fatal error', err)
core.logger.silly('Verbose trace data')
```

Never use `console.log` / `console.error` in extensions.

### 3.7 Cross-extension calls

Extensions must not call each other directly. Use `core.extensions.invoke`:

```js
// WRONG — direct import or window.core.ipc from backend
import { register } from '../other-ext/backend.js'

// CORRECT
const result = await core.extensions.invoke('com.nuxy.other-ext', 'someChannel', payload)
```

`caller: true` must be set in manifest when making cross-extension calls.

### 3.8 Backend entry point

```js
/** @typedef {import('@nuxy/extension-sdk').CoreContext} CoreContext */

/** @param {CoreContext} core */
export function register(core) {
  core.registry.registerTool({ name: 'my-extension' })

  core.ipc.handle('doSomething', async (payload) => {
    // ...
    return result
  })
}
```

All IPC handlers must return a value (or `undefined`). The kernel wraps them in `IpcResult<T>` automatically.

---

## 4. Frontend Rules

### 4.1 JSX format

Frontend files are `.js` files containing JSX. They are loaded at runtime via `nuxy-ext://` — no build step, no bundler. All external dependencies come from `window.React` and `window.UI`.

```jsx
// Top of every frontend.js
const React = window.React
const { useState, useEffect, useRef, useMemo, useCallback } = React
```

### 4.2 UI Kit only — no custom components

All UI must be built exclusively with `@nuxy/ui` components accessed via `window.UI`. If a component you need does not exist, **add it to `packages/ui`** before using it. Do not implement it inline in the extension.

```jsx
// WRONG — custom component in extension
function MyButton({ children, onClick }) {
  return <button style={{ background: 'blue' }}>{children}</button>
}

// CORRECT — use UI kit
const { Button } = window.UI || {}
// ...
{Button && <Button>...</Button>}
```

Destructure all components at the top of the component function or at the module level:

```jsx
export default function MyView({ query }) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    EmptyState,
  } = window.UI || {}
  // ...
}
```

### 4.3 Keyboard-only interaction — no mouse-only buttons

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

### 4.4 Input via Omnibar

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

### 4.5 No inline styles — use theme tokens

Never use hardcoded colors, spacing values, or magic numbers in `style` props or CSS strings. Use CSS custom properties from the active theme.

```jsx
// WRONG
<div style={{ color: '#ef4444', background: 'rgba(0,0,0,0.2)', padding: '16px' }}>

// CORRECT
<div style={{ color: 'var(--color-danger)', background: 'var(--surface-overlay)', padding: 'var(--space-4)' }}>
```

For layout primitives (flex, grid, height) that do not need theming, inline styles are acceptable only when no UI kit component fits and the value is purely structural (not a color/border/shadow).

### 4.6 No emojis in UI

Do not use emoji characters as icons or visual affordances. Use icon components from `window.UI` (`IconFile`, `IconCode`, etc.) or request a new icon in `packages/ui/src/components/Icon.tsx`.

```jsx
// WRONG
<span>📁 {item.title}</span>

// CORRECT
const { IconFile } = window.UI || {}
// ...
{IconFile && <IconFile />} {item.title}
```

### 4.7 Keyboard actions via `useToolKeyActions` / `useListNavigation`

```jsx
const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})
const _useListNavigation = (window.UI || {}).useListNavigation ||
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
      handler: () => { /* ... */ },
    },
  ],
})

// Custom key bindings (for non-list views)
_useToolKeyActions([
  { key: 'ArrowUp',   label: 'Previous', hint: '↑↓', handler: () => { /* ... */ } },
  { key: 'ArrowDown', label: 'Next',                  handler: () => { /* ... */ } },
  { key: 'Enter',     label: 'Select',   hint: '↵',   handler: () => { /* ... */ } },
  { key: 'Escape',    label: 'Back',     hint: 'Esc', handler: () => { /* ... */ } },
])
```

### 4.8 IPC calls from frontend

```jsx
// Invoke your own backend
window.core.ipc.invoke(EXT_ID, 'channelName', payload)
  .then(res => { if (res?.success) { /* ... */ } })
  .catch(console.error)

// Kernel built-ins
window.core.ipc.invoke('kernel', 'getThemeByName', { name })
window.core.themes?.list()
window.core.icons?.listPacks()
window.core.window?.hide()
```

### 4.9 No cross-extension IPC from frontend

Frontends may only call their own backend (`EXT_ID`) or `kernel`. They must not call another extension's IPC channels directly. If data from another extension is needed, the backend should proxy it.

### 4.10 Layout components

Use layout primitives from the UI kit:

| Layout need           | Component          |
|-----------------------|--------------------|
| Two-column split      | `TwoPanel`         |
| Vertical tabs sidebar | `TabBar` (vertical)|
| Scrollable item list  | `List`             |
| Empty / zero state    | `EmptyState`       |
| Alert / banner        | `Alert`            |
| Dropdown picker       | `SelectBox`        |
| Grid                  | `Grid` / `GridItem`|
| Section divider       | `SectionHeader`    |

### 4.11 Window / shell events

Communicate with the shell via `window.dispatchEvent(new CustomEvent(...))` for approved channels only:

| Channel                        | Purpose                                      |
|-------------------------------|----------------------------------------------|
| `nuxy-shell-footer-hints`      | Set footer shortcut hints (`detail: ReactNode \| null`) |
| `nuxy-shell-omni-bar-control`  | Show or hide the omnibar (`detail: { action: 'show' \| 'hide' }`) |
| `nuxy-register-actions`        | Register command palette actions (`detail: Action[]`) |
| `nuxy-settings-updated`        | Notify that settings changed (`detail: settingsObj`) |

Do not dispatch or listen for arbitrary custom events not listed here.

---

## 5. Core API Reference

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

| API | Purpose |
|-----|---------|
| `core.fs.readDir(path)` | List directory entries |
| `core.fs.readFile(path, encoding?)` | Read file contents |
| `core.fs.writeFile(path, data)` | Write file contents |
| `core.fs.mkdir(path, opts?)` | Create directory |
| `core.fs.rename(src, dest)` | Move/rename |
| `core.fs.rm(path)` | Delete file |
| `core.fs.stat(path)` | File metadata (type, size, mtime) |
| `core.db.open(name)` | Open/create a sandboxed SQLite database |
| `core.shell.open(pathOrUrl)` | Open with system default handler |
| `core.shell.exec(cmd, args, opts?)` | Run allowed command (requires `shell` permission) |

---

## 6. Testing Requirements

### Backend tests (`backend.test.js`)

Every extension with a `backend.js` must have a corresponding `backend.test.js` in the same folder.

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { register } from './backend.js'

function makeCore(overrides = {}) {
  return {
    registry: { registerTool: vi.fn(), registerProvider: vi.fn() },
    ipc: { handle: vi.fn() },
    storage: { read: vi.fn().mockResolvedValue(null), write: vi.fn().mockResolvedValue(undefined) },
    clipboard: { readText: vi.fn(), writeText: vi.fn() },
    fs: { fileExists: vi.fn().mockResolvedValue(false) },
    extensions: { invoke: vi.fn() },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), silly: vi.fn() },
    config: { get: vi.fn() },
    ...overrides,
  }
}

describe('my-extension backend', () => {
  let core
  const handlers = {}

  beforeEach(() => {
    core = makeCore()
    core.ipc.handle.mockImplementation((channel, fn) => { handlers[channel] = fn })
    register(core)
  })

  it('registers a tool', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith(expect.objectContaining({ name: expect.any(String) }))
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

### E2E tests (`e2e.spec.ts`)

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

---

## 7. Anti-Patterns

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
  return <ul>{items.map(i => <li key={i.id}>{i.title}</li>)}</ul>
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
<input value={query} onChange={e => setQuery(e.target.value)} />
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

---

## 8. Checklist

Before submitting or merging an extension, verify every item:

**Manifest**
- [ ] `id` follows `com.nuxy.<name>` convention
- [ ] All used `core.*` APIs have a matching entry in `permissions`
- [ ] `capabilities.caller` is only `true` if the extension calls other extensions

**Backend**
- [ ] No `import` of `fs`, `os`, `path`, `child_process`, `node:*`, or any Node built-in
- [ ] File system access goes through `core.fs.*`
- [ ] Persistent data uses `core.storage.*` or `core.db.*`
- [ ] Shell commands use `core.shell.*`
- [ ] Cross-extension calls use `core.extensions.invoke`
- [ ] Only `core.logger.*` used for logging — no `console.*`
- [ ] `backend.test.js` exists and covers all IPC handlers

**Frontend**
- [ ] File is `.js` with JSX syntax
- [ ] `window.React` and `window.UI` used exclusively — no bundled React or UI libs
- [ ] All components come from `window.UI || {}`
- [ ] No `<button>`, `<input>`, `<textarea>`, or custom components
- [ ] All list navigation uses `useListNavigation`
- [ ] All key bindings registered via `useToolKeyActions`
- [ ] No hardcoded colors — only `var(--token-name)` CSS custom properties
- [ ] No emojis — use icon components
- [ ] Input received from `query` prop — no own input rendering
- [ ] Cross-extension IPC proxied through own backend
- [ ] Only approved `window.dispatchEvent` channels used

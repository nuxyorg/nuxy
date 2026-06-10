# Nuxy Extension Development Guide

> **AI agents building or reviewing extensions MUST follow every rule in this document.**

---

## Table of Contents

1. [File Structure](#1-file-structure)
2. [Manifest Rules](#2-manifest-rules)
3. [Extension Settings](#3-extension-settings)
4. [Backend Rules](#4-backend-rules)
5. [Frontend Rules](#5-frontend-rules)
6. [Localisation (i18n)](#6-localisation-i18n)
7. [TypeScript Rules](#7-typescript-rules)
8. [Core API Reference](#8-core-api-reference)
9. [Testing Requirements](#9-testing-requirements)
10. [Anti-Patterns](#10-anti-patterns)
11. [Checklist](#11-checklist)

---

## 1. File Structure

```
extensions/
  my-extension/
    manifest.json        # required
    backend.ts           # required for tool/provider/orchestrator; optional for helper
    frontend.ts          # entry point — thin import OR inline LitElement (@customElement)
    controller.ts        # optional — state, IPC, keyboard actions
    viewmodel.ts         # optional — helper/theme lifecycle (see gradient)
    types.ts             # extension-specific interfaces
    settings.json        # optional — settings schema (rendered by Settings extension)
    package.json         # optional — extension-local npm deps
    preload.ts           # optional — runs in Electron preload at startup
    locales/             # optional — when manifest declares locales
      en.json
      tr.json
    utils/               # pure helpers (.ts), no window.UI
    tests/               # all test files
      backend.test.ts
      nuxy-tool-<name>.test.ts
      e2e.spec.ts
    dist/                # build artifacts (gitignored)
    types/               # alternative to types.ts (export via types/index.ts)
      index.ts
```

**Reference — `extensions/nyaa/` (typical Lit tool):**

```
extensions/nyaa/
  manifest.json
  backend.ts
  frontend.ts          # @customElement('nuxy-tool-nyaa') + render() inline
  controller.ts        # search state, IPC, keyboard actions
  types.ts
  settings.json
  locales/en.json, tr.json, ja.json
  utils/parse.ts
  tests/backend.test.ts, nuxy-tool-nyaa.test.ts, e2e.spec.ts
```

Nyaa does **not** use a separate `nuxy-tool-nyaa.ts` — the element lives in `frontend.ts`. Notes follows the same pattern. Shell is the exception: it imports many `nuxy-*.ts` subcomponents from a large `frontend.ts`.

- Extensions live strictly inside their own folder. No file may reference paths outside it.
- Relative imports within the extension folder are allowed. The protocol server transpiles each `.ts` file on demand via `nuxy-ext://`.
- Permitted subfolders: `utils/`, `tests/`, `dist/`, `types/`, `locales/`. No `styles/`, `components/`, or `hooks/` directories — styling uses theme tokens; UI uses `window.UI`.
- `*-dom.ts` and `h()` rendering are **removed** — use Lit `html\`\``templates in the element (or`frontend.ts`).
- `tests/` holds all test files for the extension: backend unit tests, frontend element tests, and the e2e spec. Do not scatter test files at the extension root.
- `dist/` holds build artifacts (e.g. compiled `frontend.js` for extensions with their own build step). Add `dist/` to `.gitignore` for bundled extensions.
- `types/` replaces the single `types.ts` when an extension has many type modules. It must export everything through `types/index.ts` so consumers always import from `./types/index.ts` (or `./types.ts` for simple extensions — both are valid).
- `preload.ts` runs directly in the main window's Electron preload context. It must contain the background listeners (like clipboard watchers), default settings initializers, and other early setup tasks.
- `backend.ts` must export a named `register` function (`export function register(core: CoreContext): void`).
- All extension-specific types belong in `types.ts` or `types/index.ts` inside the extension folder — not in shared packages.
- The protocol server transpiles `.ts` files at runtime via `typescript.transpileModule`; no separate build step is needed for source files.

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
    "preload": "preload.js",
    "backend": "backend.js",
    "frontend": "frontend.js",
    "element": "nuxy-tool-<name>"
  }
}
```

### Permitted types

`tool` | `provider` | `orchestrator` | `helper` | `theme` | `iconpack` | `uikit`

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

// Override an existing component — return an HTMLElement factory
function BetterButton({ children, ...props }) {
  const el = document.createElement('nuxy-button')
  Object.assign(el, props)
  if (children) el.append(...[].concat(children))
  return el
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

### Helper Extensions (`type: "helper"`)

A `helper` extension provides utility services to other extensions. Helpers are **not** shown in the tool list and are never directly activated by the user. They are called from other extension backends via `core.extensions.invoke`, or they may emit and listen to approved `window.dispatchEvent` channels from their frontend.

```json
{
  "id": "com.nuxy.my-helper",
  "name": "My Helper",
  "version": "1.0.0",
  "type": "helper",
  "permissions": [],
  "capabilities": {
    "callable": true,
    "caller": false
  },
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.ts"
  }
}
```

**Key differences from `tool`:**

|                            | `tool`                      | `helper`                                       |
| -------------------------- | --------------------------- | ---------------------------------------------- |
| Appears in tool list       | Yes                         | No                                             |
| User activates directly    | Yes                         | No                                             |
| Backend (worker)           | Required                    | Optional                                       |
| Frontend                   | Optional                    | Optional — self-attaches or responds to events |
| Called by other extensions | Via `capabilities.callable` | Via `capabilities.callable` or events          |

**Rules for `helper` extensions:**

- Must **not** register a tool via `core.registry.registerTool` — helpers are not tools.
- A `backend.ts` is optional. Only declare one if the helper exposes IPC channels to other extensions.
- A `frontend.ts` is optional. If present, it is loaded early alongside `uikit` extensions. It may self-attach to the shell DOM or listen for custom events.
- Must set `capabilities.callable: true` when other extensions call it via `core.extensions.invoke`.
- May use any approved `window.dispatchEvent` channel.

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
    "frontend": "frontend.ts",
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

Use `core.*` APIs instead. If the required API does not exist in `CoreContext`, it must be added to `packages/core` first.

### 4.2 File system via `core.fs`

```js
// Check if a file exists
const exists = await core.fs.fileExists('/some/path')

// Read a directory listing
const entries = await core.fs.readDir('/some/dir')

// Read a file as text
const text = await core.fs.readFile('/some/path', 'utf8')

// Write a file
await core.fs.writeFile('/some/path', data)

// Create directories recursively
await core.fs.mkdir('/some/dir', { recursive: true })

// Rename / move a file
await core.fs.rename('/old', '/new')

// Delete a file
await core.fs.rm('/some/path')

// Stat (type, size, mtime)
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

### 4.4 Database via `core.db`

When an extension requires a relational or FTS database:

```js
// Open an extension-scoped SQLite database by name
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

### 4.5 Opening files / URLs via `core.shell`

```js
// Open a file or URL with the system default handler (xdg-open / open / start)
await core.shell.open('/path/to/file')
await core.shell.open('https://example.com')

// Execute an allowed command (requires 'shell' permission)
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

### 5.1 Frontend format

Frontend files are `.ts` files loaded at runtime via `nuxy-ext://` — no build step, no bundler.

`frontend.ts` is the **bootstrap file**: the first module the kernel loads when an extension's frontend activates. It can take three shapes depending on the extension type:

```typescript
// 1. Pure entry — tool extensions that only need to register a custom element
import './nuxy-tool-my-extension.ts'

// 2. Inline bootstrap — helper/theme with minimal setup (a few lines)
import './nuxy-gradient-layer.ts'
new GradientViewModel().mount()

// 3. Viewmodel delegation — helper/theme with non-trivial lifecycle logic
import './nuxy-gradient-layer.ts'
import { GradientViewModel } from './gradient-viewmodel.ts'
new GradientViewModel().mount()
```

`frontend.ts` must **never** contain render logic, templates, or direct DOM construction.
See `FRONTEND_STRUCTURE_GUIDE.md` for the full decision guide.

The custom element itself lives in `nuxy-tool-<name>.ts`. Use vanilla `HTMLElement` or `LitElement` (from the `lit` package):

**Vanilla HTMLElement pattern:**

```typescript
import type { NuxyToolElement } from '@nuxy/core'
import { MyController } from './my-controller.ts'

const TAG = 'nuxy-tool-my-extension'

export class NuxyToolMyExtensionElement extends HTMLElement implements NuxyToolElement {
  private controller: MyController | null = null
  private _query = ''
  private _committedQuery = ''
  private _extensionId = ''

  connectedCallback(): void {
    this.classList.add('nuxy-tool-my-extension')
    this.controller = new MyController(() => this.render())
    this.controller.connect()
    this.render()
  }

  disconnectedCallback(): void {
    this.controller?.disconnect()
    this.controller = null
    this.replaceChildren()
  }

  set query(value: string) {
    const next = value ?? ''
    if (this._query === next) return
    this._query = next
    this.controller?.setQuery(next)
  }
  get query() {
    return this._query
  }

  set committedQuery(value: string) {
    this._committedQuery = value ?? ''
  }
  get committedQuery() {
    return this._committedQuery
  }

  set extensionId(value: string) {
    this._extensionId = value ?? ''
  }
  get extensionId() {
    return this._extensionId
  }

  private render(): void {
    if (!this.controller) return
    this.replaceChildren(renderMyApp(this.controller))
  }
}

customElements.define(TAG, NuxyToolMyExtensionElement)
```

**LitElement pattern (also valid):**

```typescript
import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import type { NuxyToolElement } from '@nuxy/core'

@customElement('nuxy-tool-my-extension')
export class NuxyToolMyExtensionElement extends LitElement implements NuxyToolElement {
  @state() private items: MyItem[] = []
  @state() private selectedIndex = -1

  private _query = ''
  private _extensionId = ''

  set query(value: string) {
    const next = value ?? ''
    if (this._query === next) return
    this._query = next
    this.filterItems()
  }
  get query() {
    return this._query
  }
  set committedQuery(_: string) {}
  get committedQuery() {
    return ''
  }
  set extensionId(v: string) {
    this._extensionId = v
  }
  get extensionId() {
    return this._extensionId
  }

  async connectedCallback() {
    super.connectedCallback()
    // load data
  }

  render() {
    const { List, ListItem, EmptyState } = (window as any).UI || {}
    return html`...`
  }
}
```

No JSX, no `window.React`. `LitElement` with `html\`\``template literals is the standard approach for UI construction. The legacy`h()`helper from`extensions/ce-utils.ts` is deprecated and scheduled for removal.

**Lit reactive properties — use `declare`, never class-field initializers:**

```typescript
// ✅ Correct — reactive updates work when parent sets .keys=
@property({ type: String, attribute: 'keys' })
declare keys: string

// ❌ Banned — class field shadows @property setter; dynamic updates skip requestUpdate()
@property({ type: String }) keys = ''
```

Same rule applies to `@state()`. See [class-field shadowing](https://lit.dev/msg/class-field-shadowing).

Relative imports from `utils/` work via `nuxy-ext://` resolution — the protocol server transpiles each `.ts` file on demand.

**Rules:**

- `utils/` files are pure `.ts` with no window.UI dependencies.
- No file may import from outside the extension folder.
- The custom element must be named `nuxy-tool-<name>` and declared in `entry.element` in the manifest.

### 5.2 UI Kit only — no custom components

All UI must be built exclusively with `@nuxy/ui` components accessed via `window.UI`. If a component you need does not exist, **add it to `packages/ui`** before using it. Do not implement it inline in the extension.

```typescript
// WRONG — custom component in extension
function renderMyButton(children: string) {
  const el = document.createElement('button')
  el.style.background = 'blue'
  el.append(children)
  return el
}

// CORRECT — use UI kit
const { Button } = (window as any).UI || {}
Button?.({ children: 'Click me' })
```

Destructure all components at the top of the render method or at the module level:

```typescript
render() {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState } = (window as any).UI || {}
  // ...
}
```

### 5.3 Keyboard-only interaction — no mouse-only buttons

All actions must be accessible via keyboard. Clickable elements are only permitted as a secondary affordance when a keyboard binding already covers the same action.

- **NEVER** render a `<button>` or clickable element as the **only** way to trigger an action.
- **NEVER** use `onClick` for primary list navigation — use `useListNavigation` from `window.UI`.
- **NEVER** add `onClick` that has no corresponding keyboard shortcut.

The examples below are shown conceptually — use `h()` or LitElement `html\`\`` in practice:

```
// WRONG — only mouse-clickable
ListItem with onClick as sole interaction

// CORRECT — keyboard via useListNavigation, onClick is an optional affordance
const { selectedIndex } = _useListNavigation(items, {
  onEnter: (item) => handleOpen(item),
})
// ...
ListItem with active={idx === selectedIndex}
```

### 5.4 Input via Omnibar

Extensions must not render their own `<input>` or `<textarea>`. All text input comes through the shell's omnibar and is delivered to the custom element via the `query` property setter.

```typescript
// CORRECT — receive query via property setter
set query(value: string) {
  const next = value ?? ''
  if (this._query === next) return
  this._query = next
  this.controller?.setQuery(next) // react to query changes
}

// WRONG — own input element
const input = document.createElement('input')
input.value = localQuery
```

### 5.5 No inline styles — use theme tokens

Never use hardcoded colors, spacing values, or magic numbers in `style` assignments or CSS strings. Use CSS custom properties from the active theme.

```typescript
// WRONG
el.style.color = '#ef4444'
el.style.background = 'rgba(0,0,0,0.2)'
el.style.padding = '16px'

// CORRECT
el.style.color = 'var(--color-danger)'
el.style.background = 'var(--surface-overlay)'
el.style.padding = 'var(--space-4)'
```

For layout primitives (flex, grid, height) that do not need theming, inline styles are acceptable only when no UI kit component fits and the value is purely structural (not a color/border/shadow).

### 5.6 No emojis in UI

Do not use emoji characters as icons or visual affordances. Use icon components from `window.UI` (`IconFile`, `IconCode`, etc.) or request a new icon in `packages/ui/src/components/Icon.tsx`.

```typescript
// WRONG
const span = document.createElement('span')
span.textContent = '📁 ' + item.title

// CORRECT
const { IconFile } = (window as any).UI || {}
const icon = IconFile?.()
if (icon) container.append(icon)
container.append(item.title)
```

### 5.7 Keyboard actions via `useToolKeyActions` / `useListNavigation`

These utilities are called from inside `connectedCallback` or a controller class.

```typescript
const _useToolKeyActions = ((window as any).UI || {}).useToolKeyActions || (() => {})
const _useListNavigation =
  ((window as any).UI || {}).useListNavigation ||
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

```typescript
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

```typescript
// In a controller or LitElement updated() lifecycle:
window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
// Call this whenever the state that drives your activeOn predicates changes.
```

### 5.8 IPC calls from frontend

```typescript
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
| `nuxy-shell-footer-hints`     | Set footer shortcut hints (`detail: HTMLElement \| null`)                                                                                                           |
| `nuxy-shell-omni-bar-control` | Show or hide the omnibar (`detail: { action: 'show' \| 'hide' }`)                                                                                                   |
| `nuxy-register-actions`       | Register command palette actions (`detail: Action[]`)                                                                                                               |
| `nuxy-settings-updated`       | Notify that settings changed (`detail: settingsObj`)                                                                                                                |
| `nuxy-key-hints-changed`      | Ask the shell to re-evaluate which key-action hints are active (no detail needed). Dispatch this whenever the state that drives your `activeOn` predicates changes. |
| `nuxy-locale-changed`         | Emitted by the settings extension when the user changes `preferredLanguages`. `useTranslation` listens to this automatically — no manual handling required.         |

Do not dispatch or listen for arbitrary custom events not listed here.

### 5.12 Scroll viewports — never use native `scrollIntoView`

Never use the native browser `el.scrollIntoView()` directly in extension views or hooks. Calling native `scrollIntoView` on deep elements causes side-effects that scroll the main window viewport/shell, breaking the fixed dual-pane layout.

Instead, use the custom `smoothScrollIntoViewIfNeeded` utility from `window.UI`:

```tsx
// WRONG — native scrollIntoView scrolls the entire browser window/outer layout
el.scrollIntoView({ behavior: 'smooth', block: 'start' })

// CORRECT — scrolls only the local parent scrollable container smoothly
const { smoothScrollIntoViewIfNeeded } = window.UI || {}
if (el && smoothScrollIntoViewIfNeeded) {
  smoothScrollIntoViewIfNeeded(el)
}
```

---

## 6. Localisation (i18n)

Extensions that support multiple languages declare a `locales` block in their manifest and ship one JSON translation file per locale under a `locales/` directory.

### 6.1 File layout

```
extensions/
  my-extension/
    manifest.json
    locales/
      en.json          # default locale
      tr.json
      ja.json
```

### 6.2 Manifest declaration

```json
{
  "locales": {
    "default": "en",
    "supported": ["en", "tr", "ja"]
  }
}
```

| Field       | Required | Description                                                                      |
| ----------- | -------- | -------------------------------------------------------------------------------- |
| `default`   | Yes      | BCP 47 fallback locale when no preferred language matches.                       |
| `supported` | Yes      | All BCP 47 locale codes the extension ships. Scanner warns if a file is missing. |
| `dir`       | No       | Subdirectory with locale files. Defaults to `"locales"`.                         |

### 6.3 Translation file format

```json
{
  "meta": {
    "name": "Benim Uzantım",
    "direction": "ltr"
  },
  "hello": "Merhaba",
  "greeting": "Merhaba, {name}!",
  "section": {
    "nested": "İç içe değer"
  },
  "items": {
    "one": "{count} öğe",
    "other": "{count} öğe"
  }
}
```

| Feature          | Syntax                         | Notes                                                     |
| ---------------- | ------------------------------ | --------------------------------------------------------- |
| Simple key       | `"hello": "Merhaba"`           | Accessed as `t('hello')`                                  |
| Nested key       | `{ "a": { "b": "val" } }`      | Accessed as `t('a.b')`                                    |
| Interpolation    | `"Hi {name}!"`                 | `t('key', { name: 'Ali' })` → `"Hi Ali!"`                 |
| Plurals          | `{ "one": "…", "other": "…" }` | `t('items', { count: 3 }, 3)`                             |
| `meta.name`      | Translated extension name      | Overrides the display name in the tool list               |
| `meta.direction` | `"ltr"` / `"rtl"`              | Informational; direction is auto-detected from the locale |

**Rules:**

- The `meta` key is reserved and ignored by the translation lookup.
- Plural keys must be an object whose _all_ keys are CLDR plural categories (`zero`, `one`, `two`, `few`, `many`, `other`). Any mixed object is treated as a nested group.
- Unresolved `{placeholder}` values are left as-is (not stripped).
- Missing keys return the key string itself; a `silly`-level warning is logged in the backend.

### 6.4 Locale resolution

The kernel resolves the best locale for each extension using an ordered preference chain:

```
User's preferredLanguages list (Settings → Language)
  ↓ (for each candidate)
  1. Exact match        ("tr-TR" === "tr-TR")
  2. Language match     ("tr-TR" → "tr")
  3. Region variant     ("tr" → "tr-TR")
  ↓ none matched
System OS locale (app.getLocale())
  ↓ none matched
Extension's declared default locale
```

### 6.5 Using i18n in the backend

`core.i18n` is populated before `register()` is called. No async setup needed.

```ts
import type { CoreContext } from '@nuxy/extension-sdk'

export function register(core: CoreContext): void {
  core.ipc.handle('getSomething', async () => {
    const label = core.i18n.t('section.label')
    const msg = core.i18n.t('greeting', { name: 'World' })
    const count = core.i18n.t('items', { count: 5 }, 5)
    core.logger.info(`locale=${core.i18n.locale}, dir=${core.i18n.dir}`)
    return { label, msg, count }
  })
}
```

If the extension has no `locales` declaration, `core.i18n.t(key)` returns `key` unchanged.

### 6.6 Using i18n in the frontend

Use the `useTranslation` hook from `window.UI`. It fetches translations from the kernel on mount and re-fetches automatically when the `nuxy-locale-changed` event fires (i.e. when the user changes their language preferences).

```typescript
const EXT_ID = 'com.nuxy.my-extension'
const _useTranslation =
  ((window as any).UI || {}).useTranslation ||
  (() => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr' as const,
  }))

// Inside connectedCallback or a controller:
async connectedCallback() {
  super.connectedCallback?.()
  const { t, dir } = _useTranslation(EXT_ID)
  this.style.direction = dir

  const hello = t('hello')
  const greeting = t('greeting', { name: 'World' })
  const count = t('items', { count: 3 }, 3)
  this.render()
}
```

**Rules:**

- Always define a safe fallback for `useTranslation` in case the UI kit version doesn't include it yet.
- Pass `dir` to the root container's `style.direction` for RTL language support.
- `useTranslation` returns `{ t, locale, dir }`. Do not call `window.core.ipc.invoke('kernel', 'getExtensionTranslations', ...)` directly — use the hook instead.

### 6.7 RTL layout

When `dir === 'rtl'`, logical CSS properties (`margin-inline-start`, `padding-inline-end`, etc.) are preferred over physical ones (`margin-left`, `padding-right`). The `direction` CSS property should be set on the extension root element:

```typescript
this.style.direction = dir // all child elements inherit RTL automatically
```

---

## 7. TypeScript Rules

All extensions must be written in TypeScript. JavaScript (`.js`) extension files are no longer accepted.

### 6.1 File naming

| File                     | Extension                         |
| ------------------------ | --------------------------------- |
| Backend logic            | `backend.ts`                      |
| Backend tests            | `tests/backend.test.ts`           |
| E2E spec                 | `tests/e2e.spec.ts`               |
| Frontend entry point     | `frontend.ts`                     |
| Custom element           | `nuxy-tool-<name>.ts`             |
| Element unit tests       | `tests/nuxy-tool-<name>.test.ts`  |
| Controller (state/IPC)   | `<name>-controller.ts`            |
| Controller tests         | `tests/<name>-controller.test.ts` |
| DOM helpers              | `<name>-dom.ts`                   |
| Extension-specific types | `types.ts` or `types/index.ts`    |
| Utility/helper modules   | `helper-name.ts` (in `utils/`)    |
| Utility tests            | `tests/<helper-name>.test.ts`     |
| Build artifacts          | `dist/frontend.js` etc.           |

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

Define your IPC channel contract in `types.ts` using `IpcChannelMap`, then use `TypedInvoker` in the frontend to get channel-name autocomplete and typed return values.

```ts
// types.ts
import type { IpcChannelMap } from '@nuxy/extension-sdk'

export interface MyItem {
  id: string
  title: string
  createdAt: string
}

export interface IpcChannels extends IpcChannelMap {
  getItems: { input: void; output: MyItem[] }
  createItem: { input: { title: string }; output: MyItem }
  deleteItem: { input: string; output: void }
}
```

In a controller class, use `TypedInvoker` for typed IPC:

```typescript
import type { TypedInvoker } from '@nuxy/extension-sdk'
import type { MyItem, IpcChannels } from './types.ts'

export class MyController {
  items: MyItem[] = []

  // Typed IPC helper — channel names and return types come from IpcChannels in types.ts
  private invoke: TypedInvoker<IpcChannels> = async (channel, ...args) => {
    const res = await window.core.ipc.invoke('com.nuxy.my-extension', channel, args[0])
    if (!res?.success) throw new Error(res?.error ?? 'IPC failed')
    return res.data
  }

  async connect(): Promise<void> {
    this.items = await this.invoke('getItems') // return type is MyItem[] — no cast needed
    this.onUpdate()
  }

  constructor(private onUpdate: () => void) {}
}
```

---

### 6.6 TypeScript config

Extensions are covered by `extensions/tsconfig.json`. The config:

- Uses `"jsx": "preserve"` (`.tsx` files are valid but JSX is not used — all DOM is built with `h()` or Lit `html\`\``)
- Enables `"experimentalDecorators": true` for Lit `@customElement`, `@state()`, etc.
- Resolves `@nuxy/extension-sdk`, `@nuxy/core`, `@nuxy/ui` from the workspace packages
- Does **not** emit files — transpilation is done at runtime by the protocol server
- Includes a path alias for `vitest` pointing to `src/node_modules/vitest`

### 6.7 Global window types

`extensions/global.d.ts` declares the runtime globals available to all frontends:

- `window.UI` — all exports from `@nuxy/ui`
- `window.core.ipc`, `window.core.window`, `window.core.icons`, `window.core.themes`

This file is picked up automatically by `extensions/tsconfig.json`.

---

## 8. Core API Reference

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

core.i18n.locale                      // resolved BCP 47 locale string (e.g. "tr", "ja-JP")
core.i18n.dir                         // 'ltr' | 'rtl'
core.i18n.t(key)                      // → translated string (returns key if not found)
core.i18n.t(key, vars)                // → interpolated string ("Hello, {name}!" + { name: "Ali" })
core.i18n.t(key, vars, count)         // → plural-form string ("3 items")
```

---

## 9. Testing Requirements

### Backend tests (`tests/backend.test.ts`)

Every extension with a `backend.ts` must have a corresponding `tests/backend.test.ts`.

Use `createMockCore` from `@nuxy/extension-sdk` — it sets up all `CoreContext` mocks and captures IPC handlers automatically. Never hand-roll a `makeCore` function.

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import { register } from './backend.ts'

describe('my-extension backend', () => {
  let core: CoreContext
  let handlers: Record<string, (payload?: unknown) => Promise<unknown>>

  beforeEach(() => {
    ;({ core, handlers } = createMockCore())
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

**Overriding specific mocks** — pass overrides to `createMockCore`:

```ts
beforeEach(() => {
  ;({ core, handlers } = createMockCore({
    storage: {
      read: vi.fn().mockResolvedValue([{ id: '1', title: 'existing' }]),
    },
    clipboard: {
      readText: vi.fn().mockResolvedValue('hello'),
    },
  }))
  register(core)
})
```

- Use `vi.spyOn(module, 'method')` in `beforeEach` + `vi.restoreAllMocks()` in `afterEach` for CJS modules.
- Use `vi.mock` factory for ESM-only modules (`node:sqlite` etc.).
- Test every IPC handler registered in `register()`.
- Test error paths (storage failure, network timeout, etc.).

### E2E tests (`tests/e2e.spec.ts`)

For extensions with interactive frontends, add an e2e spec under `tests/`. Use worker-scoped `electronApp`/`appPage` fixtures from `src/e2e/fixtures.ts`.

```ts
import { test, expect } from '../../../../src/e2e/fixtures.ts'

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
pnpm test:e2e:all                  # all extensions with a tests/e2e.spec.ts
pnpm test:e2e:core                 # core app e2e tests (src/e2e/)
```

`pnpm test:e2e <folder>` resolves to `extensions/<folder>/tests/e2e.spec.ts`. The argument must match the extension's folder name exactly.

---

## 10. Anti-Patterns

The following patterns are banned. Reviewers and AI agents must flag these.

### A. Lit `@property` / `@state` class-field initializers

```typescript
// BANNED — breaks dynamic property updates (class-field shadowing)
@property({ type: String }) label = ''
@state() private _open = false

// REQUIRED
@property({ type: String })
declare label: string
@state() private declare _open: boolean
```

Enforced by `extensions/lit-property-shadowing.test.ts`.

### B. Node.js imports in backend

```js
// BANNED
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { DatabaseSync } from 'node:sqlite'
```

Use `core.fs`, `core.db`, `core.shell` instead.

### C. Hardcoded colors and spacing

```jsx
// BANNED
style={{ color: '#ef4444' }}
style={{ background: 'rgba(0,0,0,0.2)' }}
style={{ padding: '16px' }}
```

Use CSS custom properties: `var(--color-danger)`, `var(--surface-overlay)`, `var(--space-4)`.

### D. Custom UI components not in the UI kit

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

### E. Mouse-only actions

```jsx
// BANNED — no keyboard equivalent
<button onClick={handleDelete}>Delete</button>
<ListItem onClick={handleOpen}>    // acceptable only WITH a keyboard binding
```

### F. Own input elements

```jsx
// BANNED
<input value={query} onChange={(e) => setQuery(e.target.value)} />
```

### G. Direct extension-to-extension calls

```js
// BANNED
import { register as otherRegister } from '../other-ext/backend.js'
window.core.ipc.invoke('com.nuxy.other-ext', 'channel', data) // from frontend
```

Backend: use `core.extensions.invoke`. Frontend: proxy via own backend.

### H. Undeclared permissions

```json
// manifest.json has no "storage" permission, but backend does:
await core.storage.write('data.json', value)  // BANNED
```

### I. Emojis in UI code

```jsx
// BANNED
<span>📁</span>
<span>⚙️</span>
```

Use icon components from `window.UI`.

### J. `console.log` / `console.error` in backend

```js
// BANNED
console.log('[MyExt] started')
console.error(err)
```

Use `core.logger.*`.

### K. Dispatching unlisted custom events

```jsx
// BANNED — not in the approved channel list
window.dispatchEvent(new CustomEvent('my-private-event', { detail: data }))
```

### L. JavaScript extension files

```
// BANNED — all extension files must be TypeScript
backend.js
backend.test.js
frontend.js
```

Use `.ts` for all extension files. `.tsx` is permitted but not required — there is no JSX.

### M. Importing React or using React patterns

```typescript
// BANNED — React is not installed in this project
import React from 'react'
import { useState, useEffect } from 'react'
```

Extensions use native custom elements (`HTMLElement` or `LitElement`). State goes in controller class properties or `@state()` decorators (Lit).

### N. Untyped IPC payloads in backend

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

### O. Extension-specific types in shared packages

```ts
// BANNED — ClipboardItem belongs in extensions/clipboard/types.ts
// packages/core/src/types.ts:
export interface ClipboardItem { ... }
```

Put data-model types in `types.ts` inside the extension folder.

### P. Hardcoded keyboard shortcut hints in UI layout

```typescript
// BANNED — shortcut hints should not be hardcoded in render output
// e.g. h('span', {}, 'Ctrl+Enter to send')
```

Register all shortcuts via `useToolKeyActions` instead. This ensures all shortcut hints are unified and displayed in the shell's footer/shortcut bar.

### Q. Inline settings panel in extension frontend

```typescript
// BANNED — extensions must not implement their own settings UI
// e.g. rendering a settings form inside the tool element's render()
```

Use `settings.json` + `entry.settings` in the manifest instead. The settings extension renders the UI automatically. The extension backend reads values via `core.settings.read()`.

### R. Using `core.storage` for user-facing settings

```ts
// BANNED — user-visible config must go through core.settings
await core.storage.write('config.json', { host, model })
const cfg = await core.storage.read<Config>('config.json')
```

`core.storage` is for extension-internal data (e.g. history, cache). User-facing settings that appear in the settings extension must use `core.settings.read` / `core.settings.write`, which share the same `ext-settings.json` file the settings extension reads and writes.

### S. Hardcoded user-facing strings

```ts
// BANNED — string will not be translated
core.ipc.handle('getLabel', async () => 'Open file')
```

```tsx
// BANNED
<span>Search results</span>
```

Use `core.i18n.t('label')` in backend, `t('label')` from `useTranslation` in frontend.

### T. Custom locale resolution in extensions

```ts
// BANNED — extensions must not detect or resolve locales themselves
const locale = process.env.LANG?.split('.')[0] ?? 'en'
const msgs = require(`./locales/${locale}.json`)
```

Use `core.i18n` — the kernel resolves the locale and loads the file before `register()` is called.

### U. Calling `getExtensionTranslations` directly from frontend

```typescript
// BANNED — use the hook instead
// (e.g. fetching translations manually in connectedCallback)
const res = await window.core.ipc.invoke('kernel', 'getExtensionTranslations', { extId: EXT_ID })
```

Use `const { t } = useTranslation(EXT_ID)` from `window.UI`.

---

## See Also

| Topic                     | Document                                                               | Notes                                                                               |
| ------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| CoreContext API reference | [Extension Access](../website/docs/extensions/extension-access.md)     | Full list of implemented and planned host APIs, renderer bridge, and manifest rules |
| Security model            | [Security](../website/docs/design/security.md)                         | Thread isolation, chroot jails, and permission prompt design                        |
| Plugin system deep dive   | [Plugin System](../website/docs/design/modular-plugin-system.md)       | Extension loading sequence and CoreContext proxy internals                          |
| Frontend structure        | [Frontend Structure](../website/docs/extensions/frontend-structure.md) | Controller vs viewmodel patterns, `frontend.ts` bootstrap rules                     |
| Lit renderer composition  | [Lit Renderer](../website/docs/design/lit-renderer.md)                 | Tool host, composition layer, cross-extension UI                                    |

---

### V. Unpermitted subdirectories or external CSS

```
// BANNED — only utils/, tests/, dist/, types/ are permitted
extensions/my-extension/styles/main.css
extensions/my-extension/components/MyCard.ts
extensions/my-extension/hooks/useData.ts
```

```typescript
// BANNED — hardcoded values that bypass the theme system
h('div', { style: 'color:#333;padding:12px;background:#fff' }, ...)
```

All styling is done via CSS custom property tokens inline. Use `var(--color-*)`, `var(--space-*)`, `var(--font-*)`, `var(--radius-*)` tokens directly in `style` props. A `styles/` directory will not be served by the protocol server.

---

## 11. Checklist

Before submitting or merging an extension, verify every item:

**File Structure**

- [ ] Subdirectories are limited to `utils/`, `tests/`, `dist/`, `types/`, `locales/` — no `styles/`, `components/`, `hooks/`, or other directories
- [ ] All test files (`.test.ts`, `e2e.spec.ts`) are inside `tests/`, not scattered at the extension root
- [ ] `dist/` is gitignored if the extension has a build step
- [ ] `types/` exports everything via `types/index.ts` when used instead of `types.ts`
- [ ] No file references paths outside the extension folder (no `../../`)
- [ ] Custom element file is named `nuxy-tool-<name>.ts` and `entry.element` is declared in manifest
- [ ] `utils/` files are pure `.ts` with no `window.UI` dependencies

**Manifest**

- [ ] `id` follows `com.nuxy.<name>` convention
- [ ] All used `core.*` APIs have a matching entry in `permissions`
- [ ] `capabilities.caller` is only `true` if the extension calls other extensions
- [ ] If the extension ships translations, `locales.default` and `locales.supported` are declared

**Localisation**

- [ ] Every locale listed in `locales.supported` has a corresponding `locales/<code>.json` file
- [ ] `locales.default` locale file exists
- [ ] Default locale file covers all keys used in code (it is the ultimate fallback)
- [ ] Plural keys use CLDR categories: `one`, `other`, etc. — not custom names
- [ ] Backend calls `core.i18n.t(key)` — never hardcodes user-facing strings
- [ ] Frontend uses `useTranslation(EXT_ID)` from `window.UI` — never calls `getExtensionTranslations` directly
- [ ] Root container has `style={{ direction: dir }}` for RTL support
- [ ] No hardcoded locale strings or language detection logic in the extension

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
- [ ] Custom element implements `NuxyToolElement` with `query`, `committedQuery`, `extensionId` setters
- [ ] No React imports anywhere in the extension

**Helper-specific**

- [ ] `type: "helper"` in manifest — not `tool`
- [ ] Does not call `core.registry.registerTool` / `registerProvider` / `registerOrchestrator`
- [ ] `capabilities.callable: true` if other extensions call this helper via `core.extensions.invoke`
- [ ] No backend worker spawned unless `entry.backend` is declared
- [ ] Frontend (if any) self-attaches via module-level code or approved event channels — no `default export` required when no view is rendered

**Backend**

- [ ] No `import` of `fs`, `os`, `path`, `child_process`, `node:*`, or any Node built-in
- [ ] File system access goes through `core.fs.*`
- [ ] Persistent data uses `core.storage.*` or `core.db.*`
- [ ] Shell commands use `core.shell.*`
- [ ] Cross-extension calls use `core.extensions.invoke`
- [ ] Only `core.logger.*` used for logging — no `console.*`
- [ ] `tests/backend.test.ts` exists and covers all IPC handlers

**Frontend**

- [ ] `frontend.ts` only imports the custom element file — no logic, no default export
- [ ] Custom element uses `HTMLElement` + controller or `LitElement` — no React
- [ ] All UI components come from `window.UI || {}`
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

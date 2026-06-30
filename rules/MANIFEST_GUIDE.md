# Nuxy Extension & Manifest Developer Guide

Welcome to the Nuxy Extension Development Guide. This document provides a step-by-step tutorial on creating a Nuxy extension from scratch, details every field of `manifest.json`, explains our strict permission policies, and suggests future improvements.

---

## 1. Creating a Nuxy Extension from Scratch (Step-by-Step)

Creating a Nuxy extension is simple. Follow these steps to build a "Hello World" tool extension:

### Step 1: Create the Extension Folder

Navigate to the `extensions` directory of the Nuxy project and create a new folder named after your extension (using kebab-case, e.g. `hello-world`):

```bash
mkdir extensions/hello-world
cd extensions/hello-world
```

### Step 2: Define `manifest.json`

Every Nuxy extension must contain a `manifest.json` file in its root. This file defines its identity, type, permissions, and entry points.
Create `manifest.json` with the following content:

```json
{
  "id": "com.nuxy.hello-world",
  "name": "Hello World",
  "version": "1.0.0",
  "type": "tool",
  "icon": "hand",
  "permissions": ["storage"],
  "capabilities": {
    "callable": true,
    "caller": false
  },
  "entry": {
    "preload": "preload.ts",
    "backend": "backend.ts",
    "frontend": "frontend.ts",
    "element": "nuxy-tool-hello-world"
  }
}
```

### Step 3: Implement the Backend (`backend.ts`)

The backend runs in a dedicated worker thread. It uses the `CoreContext` SDK to interact with the main process.
Create `backend.ts`:

```typescript
import type { CoreContext } from '@nuxyorg/extension-sdk'

export function register(core: CoreContext): void {
  // Register an IPC handler that the frontend can call
  core.ipc.handle('greet', async (name: unknown) => {
    const greeting = `Hello, ${typeof name === 'string' ? name : 'World'}!`

    // Save to storage (since we declared the "storage" permission)
    await core.storage.write('last-greeting.json', { greeting })

    return greeting
  })
}
```

### Step 4: Implement the Frontend (`frontend.ts`)

> [!WARNING]
> The example below uses the legacy vanilla `HTMLElement` + `h()` helper, which is deprecated. `ce-utils.ts` has been removed. The `h()` helper now lives in `extensions/ui-default/src/h.ts`. New extensions should be built using `LitElement`.

The frontend is a TypeScript file that registers a custom element for the launcher UI.
Create `frontend.ts`:

```typescript
// frontend.ts — registers the custom element
import './nuxy-tool-hello-world.ts'
```

Create `nuxy-tool-hello-world.ts`:

```typescript
// nuxy-tool-hello-world.ts
import type { NuxyToolElement } from '@nuxyorg/core'
import { h } from '../ui-default/src/h.ts'

export class NuxyToolHelloWorldElement extends HTMLElement implements NuxyToolElement {
  private _query = ''
  private _extensionId = ''

  connectedCallback() {
    this.render()
  }

  set query(v: string) {
    this._query = v
    this.render()
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

  private async greet() {
    const res = await window.core.ipc.invoke(this._extensionId, 'greet', this._query || 'World')
    this.render(res?.data as string)
  }

  private render(response?: string) {
    const { EmptyState } = (window as any).UI || {}
    this.replaceChildren(
      h(
        'div',
        { style: 'padding:20px;color:var(--text-primary)' },
        h('p', {}, response ?? 'Type a name and press Enter')
      )
    )
  }
}

customElements.define('nuxy-tool-hello-world', NuxyToolHelloWorldElement)
```

---

## 2. Manifest Properties API Reference

The `manifest.json` file configures how the extension behaves. Below is the list of properties:

| Property       | Type       | Required | Description                                                                                                                                                                    |
| -------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`           | `string`   | Yes      | Unique reverse-DNS identifier (e.g. `com.nuxy.my-extension`).                                                                                                                  |
| `name`         | `string`   | Yes      | Human-readable name displayed in the launcher.                                                                                                                                 |
| `version`      | `string`   | Yes      | Semantic version string (e.g., `1.0.0`).                                                                                                                                       |
| `type`         | `string`   | Yes      | Type of extension. Allowed values: `tool`, `provider`, `orchestrator`, `helper`, `theme`, `iconpack`, `uikit`.                                                                 |
| `icon`         | `string`   | No       | Name of the Lucide icon representing the tool.                                                                                                                                 |
| `permissions`  | `string[]` | No       | Array of permissions indicating host APIs the extension needs access to.                                                                                                       |
| `capabilities` | `object`   | No       | Defines capabilities: `callable` (whether others can invoke it) and `caller` (whether it invokes others).                                                                      |
| `placeholder`  | `string`   | No       | Custom omnibar placeholder text shown when this tool is active (e.g. `"Ask anything"`). Falls back to `Search <name>` if omitted.                                              |
| `locales`      | `object`   | No       | Localisation config. Declare when the extension ships translated strings (see §Localisation below).                                                                            |
| `entry`        | `object`   | Yes      | Relative paths to entry files: `backend`, `frontend`, `preload`, `theme`, `settings`, etc.                                                                                     |
| `ipc`          | `object`   | No       | Declares the extension's **public** IPC surface. Only channels listed here may be invoked cross-extension from the renderer or other workers.                                  |
| `ipc.public`   | `string[]` | No       | Channel names exposed to other extensions (e.g. `["getStatus", "add"]`). Omit or use `[]` when no cross-extension API is intended.                                             |
| `ipc.samples`  | `object`   | No       | Example JSON payloads keyed by public channel name. Strongly recommended for every entry in `ipc.public` — IPC Explorer pre-fills these and callers use them as documentation. |

### Public IPC surface (`ipc.public`)

By default, every `core.ipc.handle(...)` channel is **private** — callable only from the same extension's renderer code (with `callerExtId` matching the target). To allow another extension or the shell to invoke a channel, declare it in `manifest.json` **and** register it with `{ expose: 'public' }` in the backend:

```json
{
  "id": "com.nuxy.qbittorrent",
  "ipc": {
    "public": ["getStatus", "add"],
    "samples": {
      "getStatus": {},
      "add": {
        "url": "magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567"
      }
    }
  }
}
```

At startup the kernel validates that every `{ expose: 'public' }` handler appears in `manifest.ipc.public`, and that declared public channels are actually registered. Mismatches fail extension load (`markFailed`).

When `ipc.public` is non-empty, provide a matching `ipc.samples` entry for each channel. The kernel logs a warning at startup when a public channel has no sample — this does not block load, but helps IPC Explorer and cross-extension callers discover the expected payload shape.

Cross-extension renderer calls additionally require the target extension to declare `capabilities.callable: true`.

### Example payloads (`ipc.samples`)

`ipc.samples` is optional in the schema but **strongly recommended** whenever you declare a public IPC surface. Treat it as part of the cross-extension contract — same importance as listing the channel in `ipc.public`.

| Who benefits        | How                                                             |
| ------------------- | --------------------------------------------------------------- |
| IPC Explorer        | Pre-fills the invoke payload textarea when you select a channel |
| Other extensions    | Discover expected payload shape without reading your backend    |
| Authors / reviewers | Static, auditable documentation in `manifest.json`              |
| Kernel              | Warns at startup when a public channel has no sample            |

Guidelines:

- One sample object per channel in `ipc.public`. Use `{}` when the handler takes no payload.
- Match the shape your backend expects (mirror `types.ts` / `IpcChannelMap` input types).
- Do **not** put private channels in `ipc.samples`.
- Use realistic placeholder values (URLs, ids, hashes) — not `"foo"` / `"bar"` unless the field is opaque.

```json
{
  "ipc": {
    "public": ["registerExternal", "updateExternal"],
    "samples": {
      "registerExternal": {
        "extensionId": "com.nuxy.video-downloader",
        "jobId": "job-123",
        "url": "https://example.com/video.mp4",
        "fileName": "video.mp4"
      },
      "updateExternal": {
        "extensionId": "com.nuxy.video-downloader",
        "jobId": "job-123",
        "status": "downloading",
        "bytesDownloaded": 524288
      }
    }
  }
}
```

### Extension Types

| Type           | User-visible | Backend worker | Frontend loaded         | Purpose                                                             |
| -------------- | ------------ | -------------- | ----------------------- | ------------------------------------------------------------------- |
| `tool`         | Yes          | Required       | Optional, on activation | Interactive tool the user activates directly.                       |
| `provider`     | Yes          | Required       | Optional                | Data provider surfaced by orchestrators.                            |
| `orchestrator` | Yes          | Required       | Optional                | Coordinates one or more providers.                                  |
| `helper`       | No           | Optional       | Optional, loaded early  | Utility called by other extensions; never shown in the tool list.   |
| `uikit`        | No           | No             | Yes, loaded early       | Ships UI components that extend `window.UI` before shell bootstrap. |
| `theme`        | No           | No             | No                      | JSON theme definition consumed by the theme engine.                 |
| `iconpack`     | No           | No             | No                      | JSON icon pack consumed by the icon registry.                       |

**`helper` specifics:** A `helper` extension has no user-facing presence. It exposes IPC channels consumed by other backends via `core.extensions.invoke`, or it attaches side-effects to the shell DOM / event bus from its `frontend.ts`. Helpers must **not** call `core.registry.registerTool`. A backend worker is only spawned when `entry.backend` is declared.

---

## 3. Strict Permission Policy (Runtime & Loading)

To maintain maximum safety and stability, Nuxy enforces a strict sandboxing model.

### 3.1 Forbidden Node.js Core Imports

**Extensions are strictly forbidden from importing Node.js core modules.** Any extension that includes standard or `node:` prefixed imports (e.g. `fs`, `child_process`, `path`, `os`, `net`, `http`) will **fail static analysis** and will **not be loaded** by Nuxy.

All file operations, process executions, and system interactions must go through the provided `core` SDK context.

### 3.2 List of Allowed Permissions

Every core API accessed via the `core` object must be explicitly requested in the `permissions` array of `manifest.json`. If an API is called without declaring the corresponding permission, the host will throw a `Permission Denied` error at runtime.

| Permission       | Gates Access to        | Reason / Intent                                                                    |
| ---------------- | ---------------------- | ---------------------------------------------------------------------------------- |
| `fs`             | `core.fs.*`            | File operations (checking files, reading/writing directories, temporary paths).    |
| `db`             | `core.db.*`            | Local database operations (opening/querying structured SQLite databases).          |
| `shell`          | `core.shell.*`         | Executing binaries, spawning shell commands, or opening URLs in external browsers. |
| `clipboard`      | `core.clipboard.*`     | Reading or writing text, images, and files to the system clipboard.                |
| `storage`        | `core.storage.*`       | Storing settings, states, or small caches in sandboxed JSON documents.             |
| `media`          | `core.media.*`         | Reading current media details or controlling playback state.                       |
| `network`        | Outbound requests      | Performing network requests or outgoing HTTP fetch operations.                     |
| `notifications`  | System notifications   | Spawning system notifications to communicate with the user.                        |
| `settings.read`  | `core.settings.read*`  | Reading configuration values of other extensions.                                  |
| `settings.write` | `core.settings.write*` | Modifying configuration values of other extensions.                                |

---

## 4. Localisation (`locales`)

Extensions that support multiple languages declare a `locales` block. The kernel resolves the best locale for each extension at load time using the user's ordered language preference list (Settings → Language), the OS locale, and the extension default as a final fallback.

### `locales` object

| Field       | Type       | Required | Description                                                                      |
| ----------- | ---------- | -------- | -------------------------------------------------------------------------------- |
| `default`   | `string`   | Yes      | BCP 47 code of the extension's built-in language (e.g. `"en"`).                  |
| `supported` | `string[]` | Yes      | All BCP 47 codes the extension ships translations for.                           |
| `dir`       | `string`   | No       | Relative path to the directory containing locale files. Defaults to `"locales"`. |

### Example

```json
{
  "id": "com.nuxy.my-extension",
  "name": "My Extension",
  "version": "1.0.0",
  "type": "tool",
  "locales": {
    "default": "en",
    "supported": ["en", "tr", "ja", "ar"]
  },
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.ts"
  }
}
```

Each entry in `supported` must have a corresponding JSON file at `locales/<code>.json` inside the extension folder. The scanner emits a warning for missing files and an error if the default locale file is absent.

### Translation file format (`locales/tr.json`)

```json
{
  "meta": {
    "name": "Benim Uzantım",
    "direction": "ltr"
  },
  "hello": "Merhaba",
  "greeting": "Merhaba, {name}!",
  "section": {
    "label": "Bir değer"
  },
  "items": {
    "one": "{count} öğe",
    "other": "{count} öğe"
  }
}
```

`meta.name` (optional) overrides the extension's display name in the tool list when this locale is active. `meta.direction` is informational — the kernel auto-detects RTL from the BCP 47 code.

### Locale resolution algorithm

```
For each candidate in [user preferredLanguages..., OS locale]:
  1. Exact match        "tr-TR" === "tr-TR"
  2. Language match     "tr-TR"  → "tr"
  3. Region variant     "tr"     → "tr-TR"
→ if nothing matched: use extension's default locale
```

---

## 5. Proposed Manifest Improvements

To continue evolving Nuxy's extension ecosystem, we propose the following manifest improvements:

1. **Schema Validation (`nuxyVersion`)**:
   Introduce a `nuxyVersion` field to prevent loading extensions built for newer/older incompatible versions of the desktop core.

   ```json
   "nuxyVersion": ">=2.0.0"
   ```

2. **User-Facing Permission Descriptions**:
   Allow extensions to provide clear explanations of _why_ they need a permission. This can be displayed to the user during installation or settings configuration.

   ```json
   "permissionJustifications": {
     "shell": "Required to execute yt-dlp to download video streams."
   }
   ```

3. **Granular Execution Permissions**:
   Instead of a broad, binary `shell` permission, allow defining allowed binaries or commands:

   ```json
   "permissions": [
     {
       "name": "shell",
       "allowedCommands": ["yt-dlp", "ffmpeg"]
     }
   ]
   ```

4. **Granular Filesystem Paths**:
   Limit directory access for the `fs` permission to specific paths (e.g. read-only access to `/etc` or write access to `~/Downloads` only):
   ```json
   "permissions": [
     {
       "name": "fs",
       "paths": [
         { "path": "~/Downloads", "access": "rw" }
       ]
     }
   ]
   ```

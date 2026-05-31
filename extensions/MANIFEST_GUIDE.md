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
    "frontend": "frontend.tsx"
  }
}
```

### Step 3: Implement the Backend (`backend.ts`)
The backend runs in a dedicated worker thread. It uses the `CoreContext` SDK to interact with the main process.
Create `backend.ts`:
```typescript
import type { CoreContext } from '@nuxy/extension-sdk'

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

### Step 4: Implement the Frontend (`frontend.tsx`)
The frontend is a React component that renders the user interface in the launcher.
Create `frontend.tsx`:
```tsx
import React, { useState } from 'react'

interface Props {
  // The extension's channel proxy for calling the backend
  invoke: (channel: string, payload?: unknown) => Promise<unknown>
}

export default function HelloWorld({ invoke }: Props) {
  const [name, setName] = useState('')
  const [response, setResponse] = useState('')

  const handleGreet = async () => {
    const msg = await invoke('greet', name) as string
    setResponse(msg)
  }

  return (
    <div style={{ padding: '20px', color: 'var(--text-primary)' }}>
      <h2>Hello World Extension</h2>
      <input 
        type="text" 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
        placeholder="Enter your name"
        style={{ padding: '8px', marginRight: '10px', borderRadius: '4px', border: '1px solid var(--border)' }}
      />
      <button onClick={handleGreet} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px' }}>
        Greet
      </button>
      {response && <p style={{ marginTop: '15px' }}>{response}</p>}
    </div>
  )
}
```

---

## 2. Manifest Properties API Reference

The `manifest.json` file configures how the extension behaves. Below is the list of properties:

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique reverse-DNS identifier (e.g. `com.nuxy.my-extension`). |
| `name` | `string` | Yes | Human-readable name displayed in the launcher. |
| `version` | `string` | Yes | Semantic version string (e.g., `1.0.0`). |
| `type` | `string` | Yes | Type of extension. Allowed values: `tool`, `provider`, `orchestrator`, `helper`, `theme`, `iconpack`, `uikit`. |
| `icon` | `string` | No | Name of the Lucide icon representing the tool. |
| `permissions` | `string[]` | No | Array of permissions indicating host APIs the extension needs access to. |
| `capabilities` | `object` | No | Defines capabilities: `callable` (whether others can invoke it) and `caller` (whether it invokes others). |
| `placeholder` | `string` | No | Custom omnibar placeholder text shown when this tool is active (e.g. `"Ask anything"`). Falls back to `Search <name>` if omitted. |
| `locales` | `object` | No | Localisation config. Declare when the extension ships translated strings (see §Localisation below). |
| `entry` | `object` | Yes | Relative paths to entry files: `backend`, `frontend`, `preload`, `theme`, `settings`, etc. |

### Extension Types

| Type | User-visible | Backend worker | Frontend loaded | Purpose |
|---|---|---|---|---|
| `tool` | Yes | Required | Optional, on activation | Interactive tool the user activates directly. |
| `provider` | Yes | Required | Optional | Data provider surfaced by orchestrators. |
| `orchestrator` | Yes | Required | Optional | Coordinates one or more providers. |
| `helper` | No | Optional | Optional, loaded early | Utility called by other extensions; never shown in the tool list. |
| `uikit` | No | No | Yes, loaded early | Ships UI components that extend `window.UI` before shell bootstrap. |
| `theme` | No | No | No | JSON theme definition consumed by the theme engine. |
| `iconpack` | No | No | No | JSON icon pack consumed by the icon registry. |

**`helper` specifics:** A `helper` extension has no user-facing presence. It exposes IPC channels consumed by other backends via `core.extensions.invoke`, or it attaches side-effects to the shell DOM / event bus from its `frontend.tsx`. Helpers must **not** call `core.registry.registerTool`. A backend worker is only spawned when `entry.backend` is declared.

---

## 3. Strict Permission Policy (Runtime & Loading)

To maintain maximum safety and stability, Nuxy enforces a strict sandboxing model.

### 3.1 Forbidden Node.js Core Imports
**Extensions are strictly forbidden from importing Node.js core modules.** Any extension that includes standard or `node:` prefixed imports (e.g. `fs`, `child_process`, `path`, `os`, `net`, `http`) will **fail static analysis** and will **not be loaded** by Nuxy.

All file operations, process executions, and system interactions must go through the provided `core` SDK context.

### 3.2 List of Allowed Permissions

Every core API accessed via the `core` object must be explicitly requested in the `permissions` array of `manifest.json`. If an API is called without declaring the corresponding permission, the host will throw a `Permission Denied` error at runtime.

| Permission | Gates Access to | Reason / Intent |
|---|---|---|
| `fs` | `core.fs.*` | File operations (checking files, reading/writing directories, temporary paths). |
| `db` | `core.db.*` | Local database operations (opening/querying structured SQLite databases). |
| `shell` | `core.shell.*` | Executing binaries, spawning shell commands, or opening URLs in external browsers. |
| `clipboard` | `core.clipboard.*` | Reading or writing text, images, and files to the system clipboard. |
| `storage` | `core.storage.*` | Storing settings, states, or small caches in sandboxed JSON documents. |
| `media` | `core.media.*` | Reading current media details or controlling playback state. |
| `network` | Outbound requests | Performing network requests or outgoing HTTP fetch operations. |
| `notifications` | System notifications | Spawning system notifications to communicate with the user. |
| `settings.read` | `core.settings.read*` | Reading configuration values of other extensions. |
| `settings.write` | `core.settings.write*` | Modifying configuration values of other extensions. |

---

## 4. Localisation (`locales`)

Extensions that support multiple languages declare a `locales` block. The kernel resolves the best locale for each extension at load time using the user's ordered language preference list (Settings → Language), the OS locale, and the extension default as a final fallback.

### `locales` object

| Field | Type | Required | Description |
|---|---|---|---|
| `default` | `string` | Yes | BCP 47 code of the extension's built-in language (e.g. `"en"`). |
| `supported` | `string[]` | Yes | All BCP 47 codes the extension ships translations for. |
| `dir` | `string` | No | Relative path to the directory containing locale files. Defaults to `"locales"`. |

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
    "frontend": "frontend.tsx"
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
   Allow extensions to provide clear explanations of *why* they need a permission. This can be displayed to the user during installation or settings configuration.
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

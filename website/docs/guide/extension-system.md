---
title: Extension System
---

# Extension System

## How Extensions Are Loaded

The extension system has three layers: the **scanner**, the **worker**, and the **CoreContext proxy**.

### 1. Scanner (`extensions/scanner.ts`)

On startup, the scanner recursively walks `~/.nuxy/extensions/`. For each subdirectory containing a valid `manifest.json`:

- The manifest is parsed and registered in the in-memory extension registry
- If the manifest declares `entry.backend`, a Worker thread is spawned
- If the manifest is a `theme` type with `entry.theme`, the JSON theme file is read and registered in the theme engine
- If the manifest is an `iconpack` type with `entry.icons`, the icon JSON is read and registered in the icon registry

### 2. Worker Thread (`spawn/spawn.ts`)

Each backend extension gets its own isolated Node.js Worker thread. The worker runs the `@nuxy/extension-host` bundle, which:

1. Creates a `CoreContext` proxy object
2. Imports the extension's backend module
3. Calls `register(core)` with the proxy
4. Listens for `host:call` messages from the main process
5. Routes calls to the appropriate registered IPC handler
6. Returns results via `host:reply`

Because each extension runs in a separate V8 Worker, they cannot share memory, access each other's variables, or crash the main process.

### 3. CoreContext Proxy (`@nuxy/extension-host`)

The `CoreContext` object passed to `register()` is a proxy. When the extension calls `core.clipboard.readText()`, the proxy serializes the call into a `host:call` message, sends it to the main process via `parentPort`, and awaits a `host:reply`. The main process checks permissions, executes the real Electron API, and returns the result.

This design means extensions cannot directly access Node.js built-ins, Electron APIs, or other extensions' memory.

## Extension Types

| Type           | User Visible | Backend Worker | Frontend                       | Purpose                                                     |
| -------------- | ------------ | -------------- | ------------------------------ | ----------------------------------------------------------- |
| `tool`         | Yes          | Required       | Optional, loaded on activation | Interactive tool the user activates directly                |
| `provider`     | Yes          | Required       | Optional                       | Real-time data provider that reacts to omnibar input        |
| `orchestrator` | Yes          | Required       | Optional                       | Fallback handler for unmatched Enter; typically an AI layer |
| `helper`       | No           | Optional       | Optional, loaded early         | Background utility called by other extensions               |
| `uikit`        | No           | No             | Yes, loaded before shell       | Extends `window.UI` with additional UI components           |
| `theme`        | No           | No             | No                             | JSON file defining CSS custom property values               |
| `iconpack`     | No           | No             | No                             | JSON file containing SVG icon strings                       |

## Extension Manifest Format

Every extension must have a `manifest.json` in its root folder:

```json
{
  "id": "com.example.my-tool",
  "name": "My Tool",
  "version": "1.0.0",
  "type": "tool",
  "icon": "wrench",
  "permissions": ["storage", "clipboard"],
  "capabilities": {
    "callable": true,
    "caller": false
  },
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.ts",
    "settings": "settings.json"
  },
  "locales": {
    "default": "en",
    "supported": ["en", "tr", "ja"]
  }
}
```

See [Manifest Reference](/extensions/manifest) for the full field documentation.

## Extension Lifecycle

```
Extension directory created in ~/.nuxy/extensions/<id>/
  │
  ├─ Nuxy starts (or dev watcher fires)
  ├─ Scanner reads manifest.json
  ├─ Extension registered in kernel registry
  │
  ├─ [If has backend]:
  │    Worker thread spawned
  │    extension-host imports backend.ts
  │    register(CoreContext) called
  │    IPC handlers registered
  │    registry:sync message sent to kernel
  │
  ├─ [If bootstrap = true]:
  │    Frontend loaded into renderer at startup
  │
  └─ Extension is now active
       │
       ├─ User activates tool → frontend loaded via nuxy-ext://<id>/frontend.js
       ├─ Renderer calls core.ipc.invoke(id, channel, payload)
       ├─ Main process routes to worker → handler → response
       └─ Frontend updates UI with response data
```

## Where to Install Extensions

- **Development / built-in:** `extensions/<name>/` in the repo (auto-synced to `~/.nuxy/extensions/` by `pnpm dev`)
- **User-installed:** `~/.nuxy/extensions/<id>/` — create the folder and restart Nuxy

## The `nuxy-ext://` Protocol

Extension assets (JavaScript, CSS, images) are served via a privileged Electron protocol registered as `nuxy-ext://`. When the renderer requests `nuxy-ext://com.example.my-tool/frontend.js`:

1. The protocol handler resolves `com.example.my-tool` to its on-disk folder path
2. It reads the requested file
3. If the file is `.ts` or `.tsx`, it transpiles it at runtime using `typescript.transpileModule`
4. Any path that escapes the extension folder (e.g. `../../../etc/passwd`) is rejected

This means extensions can be written in TypeScript without a build step — the protocol server handles transpilation on demand.

## Next steps

- [Extension types reference](/extensions/overview) — tools, providers, orchestrators, helpers
- [Built-in Extensions](/extensions/built-in) — bundled extensions in the repo
- [Your First Extension](/extensions/first-extension) — hands-on tutorial
- [Manifest Reference](/extensions/manifest) — `manifest.json` fields

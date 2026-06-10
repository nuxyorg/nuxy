---
title: Architecture Overview
---

# Architecture Overview

Nuxy is a monorepo. The codebase is split into workspace packages, an Electron app in `src/`, and extensions in `extensions/`.

## Monorepo Layout

| Path                      | Package                | Role                                                                                             |
| ------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `packages/core`           | `@nuxy/core`           | Shared types, logger, IPC message type definitions                                               |
| `packages/ui`             | `@nuxy/ui`             | Compile-time UI stubs (Card, List, Input, SelectBox, etc.) — delegates to `window.UI` at runtime |
| `packages/extension-host` | `@nuxy/extension-host` | Worker runner that loads backend extensions; implements `createCoreProxy`                        |
| `packages/extension-sdk`  | `@nuxy/extension-sdk`  | Extension authoring API; re-exports `@nuxy/core` + `createMockCore` for tests                    |
| `extensions/`             | —                      | Bundled first-party extensions (shell, notes, calculator, settings, …)                           |
| `src/`                    | —                      | Electron main process + Vite renderer (Lit bootstrap)                                            |

Workspace aliases in `src/vite.config.ts` point to package source files directly — no separate build step is needed for packages during development.

## Electron Main Process

Located in `src/electron/`. Bootstrap order in `main.ts`:

1. **Register `nuxy-ext://` protocol** — privileged custom protocol that serves extension assets (JS, CSS, images) from `~/.nuxy/extensions/<id>/`
2. **Register IPC handlers** — all `ipcMain` handlers; `ext:invoke` routes calls to either kernel built-ins or worker extensions
3. **Create main window** — frameless, transparent `BrowserWindow` via `window/manager.ts`
4. **Scan and spawn extensions** — scanner crawls `~/.nuxy/extensions/`, spawns one Worker thread per extension with a backend entry point

### Key Main-Process Modules

| Module                   | Path                    | Role                                                           |
| ------------------------ | ----------------------- | -------------------------------------------------------------- |
| `NuxyConfig`             | `config/nuxyconfig.ts`  | Reads and hot-reloads `~/.nuxy/nuxyconfig`                     |
| `WindowManager`          | `window/manager.ts`     | Creates the frameless transparent BrowserWindow                |
| `WindowRuntime`          | `window/runtime.ts`     | Applies config options, positions window on nearest display    |
| `WindowSpringController` | `window/spring.ts`      | Spring-physics animated window resizing on `window:resize` IPC |
| `IPC Register`           | `ipc/register.ts`       | All `ipcMain` handlers; `ext:invoke` routing                   |
| `Extension Scanner`      | `extensions/scanner.ts` | Scans `~/.nuxy/extensions/`, spawns workers                    |
| `Spawn`                  | `spawn/spawn.ts`        | Manages Worker threads; `extension-host` bundle runs in each   |
| `Protocol`               | `protocol/register.ts`  | Serves extension assets via `nuxy-ext://<id>/…`                |
| `Message Broker`         | `ipc/broker.ts`         | Routes cross-extension calls (`broker:invoke`)                 |

### IPC Flow

```
Renderer (Lit custom elements)
  │
  │  window.core.ipc.invoke(extId, channel, payload)
  ▼
Preload (contextBridge)
  │
  │  ipcRenderer.invoke('ext:invoke', { extId, channel, payload })
  ▼
Main Process — ipc/register.ts
  │
  ├─ extId === 'kernel'  →  kernel built-in handlers
  │
  └─ extId === extension  →  Worker thread (via spawn.ts)
       │
       │  host:call message
       ▼
     Extension Worker (extension-host)
       │
       │  CoreContext proxy → core.ipc.handle registered handler
       ▼
     handler(payload) → result
       │
       │  host:reply message
       ▼
     Main Process → IpcResponse → Renderer
```

## Renderer

Lit-based renderer at `src/renderer/`. Bootstrap loads the active uikit extension (registers `window.UI`), applies theme tokens, then mounts `<nuxy-shell-view>` by dynamically importing `nuxy-ext://com.nuxy.shell/frontend.js`. The entire launcher chrome — omnibar, result list, tool switcher — lives in the shell extension.

The `window.core` object (injected by `preload.ts` via `contextBridge`) provides:

- `core.ipc.invoke(extId, channel, payload)` — IPC to any extension or kernel
- `core.window.*` — resize, hide, esc, drag, center, onShow callbacks
- `core.themes.*` — list available themes
- `core.icons.*` — get SVG icon strings from icon packs

## Extension Loading Sequence

```
pnpm dev / app start
  │
  ├─ NuxyConfig reads ~/.nuxy/nuxyconfig
  ├─ Scanner crawls ~/.nuxy/extensions/
  │    For each extension folder:
  │      ├─ Read manifest.json
  │      ├─ Register manifest in extension registry
  │      ├─ If manifest has entry.backend:
  │      │    └─ Spawn Worker thread
  │      │         └─ extension-host loads backend.ts
  │      │              └─ register(CoreContext) called
  │      ├─ If type === 'theme' and entry.theme:
  │      │    └─ Read theme.json → register in theme registry
  │      └─ If type === 'iconpack' and entry.icons:
  │           └─ Read icons.json → register in icon registry
  │
  ├─ Renderer loads com.nuxy.shell frontend
  └─ Window shown (if showOnStartup or socket toggle)
```

## Data Flow: User Types in Omnibar

1. User types `2 + 2` in the omnibar
2. Shell frontend debounces (50ms), then fans out to all active `provider` extensions via `core.ipc.invoke`
3. Calculator backend receives the `eval` channel call, evaluates the expression, returns `{ result: '4' }`
4. Shell renders the result as a list item
5. User presses Enter → result is acted on (e.g. opens a note, runs a command)

## Development vs Production

| Aspect          | Development (`pnpm dev`)                          | Production (`pnpm build`)  |
| --------------- | ------------------------------------------------- | -------------------------- |
| Renderer        | Vite dev server (HMR)                             | Pre-built static bundle    |
| Extension sync  | Auto-copies `extensions/` → `~/.nuxy/extensions/` | Not auto-synced            |
| Protocol server | Transpiles `.ts`/`.tsx` at request time           | Same runtime transpilation |
| Log level       | Defaults to `info`; set `LOG_LEVEL=silly`         | Defaults to `warn`         |

## Deep dive

For the full architecture map with diagrams and data paths, see the [Architecture](/design/overview) section.

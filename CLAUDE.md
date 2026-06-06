# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root. `pnpm` is required (enforced by `preinstall`).

```bash
pnpm dev          # Build ui-default once, then start Electron + ui-default watcher in parallel
pnpm build        # Build ui-default, run tests, then build renderer + Electron main
pnpm package      # Build + package distributable via electron-builder
pnpm test         # Run vitest unit tests (from src/)
pnpm format       # Format all files with Prettier
pnpm format:check # Check formatting without writing
```

> **Note**: `extensions/ui-default/frontend.js` is a build artifact (gitignored). Run `pnpm -C extensions/ui-default build` manually to rebuild it, or use `pnpm dev` which handles this automatically.

Run from `src/` directly for more granular control:

```bash
pnpm -C src test           # Run unit tests once
pnpm -C src test:watch     # Watch mode
pnpm -C src test:e2e:core  # Playwright core e2e tests (restricted to src/e2e)
pnpm -C src typecheck      # TypeScript check without emit
```

Single test file: `pnpm -C src test -- electron/ipc/validate.test.ts`

Logging verbosity: `LOG_LEVEL=silly pnpm dev` (levels: `silly` | `info` | `warn` | `error`)

## Development workflow

**TDD is mandatory for all new features.** Follow this order strictly:

1. Write the test(s) first — they must fail initially
2. Write the minimum implementation to make them pass
3. Run `pnpm -C src test` (or the scoped single-file command) and iterate until all tests are green
4. Do not consider a feature done until the full suite passes

Tests live next to the code they test:

- Extension logic → `extensions/<name>/*.test.js`
- Electron main process → `src/electron/**/*.test.ts`

For extension backends, mock `CoreContext` inline (see existing `*.test.js` files for the pattern). For modules that import Node built-ins (`fs`, `child_process`), prefer `vi.spyOn(module, 'method')` in `beforeEach` + `vi.restoreAllMocks()` in `afterEach` — it patches the live `module.exports` object and is more reliable than `vi.mock` factories for CJS modules. For ESM-only built-ins (`node:sqlite`), use a hoisted `vi.mock` factory.

For Electron main-process modules, mock `electron` and any modules that do file I/O. Use `vi.hoisted()` when a value must be available inside a `vi.mock` factory (e.g., a tmp directory path).

**Playwright e2e tests** live in `src/e2e/`. Two kinds:

- _Unit-style_ (no Electron app): import TypeScript modules directly, use `@playwright/test`. Avoid importing modules that transitively import `@nuxy/core` value exports (only type imports work without Vite alias resolution).
- _Full UI_ (Electron app launch): use the worker-scoped `electronApp`/`appPage` fixtures from `fixtures.ts`.

## Architecture

Nuxy is a frameless, transparent Electron launcher — a popup shell that extensions give functionality to.

### Monorepo layout

```
packages/core          → @nuxy/core      — shared types, logger, IPC message types
packages/ui            → @nuxy/ui        — React component library (Card, List, Input, etc.)
packages/extension-host→ @nuxy/extension-host — worker runner that loads backend extensions
packages/extension-sdk → @nuxy/extension-sdk  — extension authoring API (re-exports @nuxy/core)
extensions/            → bundled extensions (shell, clipboard, calculator, angrysearch)
src/                   → Electron + Vite app (renderer + main process)
```

Workspace aliases are resolved at build time in `src/vite.config.ts` — package source files are pointed to directly (no build step needed for packages).

### Electron main process (`src/electron/`)

Bootstrap order in `main.ts`:

1. Register `nuxy-ext://` privileged protocol
2. Register IPC handlers
3. Create main window
4. Scan and spawn extensions

Key modules:

- `config/nuxyconfig.ts` — reads/watches `~/.nuxy/nuxyconfig` (key=value format, hot-reloads on change)
- `window/manager.ts` — creates the frameless transparent `BrowserWindow`
- `window/runtime.ts` — applies config options and positions window on the nearest display
- `window/spring.ts` — `WindowSpringController`: spring-physics animated window resizing triggered by `window:resize` IPC
- `ipc/register.ts` — all `ipcMain` handlers; `ext:invoke` routes to either kernel built-ins or worker extensions
- `extensions/scanner.ts` — scans `~/.nuxy/extensions/`, spawns a Worker thread per extension backend
- `spawn/spawn.ts` — manages Worker threads; `extension-host` worker bundle runs in each thread
- `protocol/register.ts` — serves extension assets (`frontend.js`, CSS, etc.) via `nuxy-ext://<ext-id>/...`

A UNIX socket at `/tmp/nuxy.sock` accepts `toggle` and `show` commands from `nuxy.sh` or other processes.

### Renderer (`src/renderer/`)

Single-page React app. `App.tsx` dynamically imports `nuxy-ext://com.nuxy.shell/frontend.js` as the UI shell. The `window.core` object (injected by `preload.ts` via `contextBridge`) provides:

- `core.ipc.invoke(extId, channel, payload)` → routes through `ext:invoke` IPC
- `core.window.*` → resize, hide, esc, drag, center, onShow

### `@nuxy/ui` — two-layer component system

`packages/ui/src/` and `extensions/ui-default/src/` are **not duplicates**. They form a deliberate two-layer design:

- **`packages/ui/src/components/`** — compile-time proxy stubs. Each component reads from `window.UI` at runtime and renders nothing if the runtime implementation is absent:
  ```ts
  const Impl = (window.UI as any)?.Button ?? (() => null)
  return <Impl {...props} />
  ```
  This layer provides TypeScript types and import aliases (`@nuxy/ui`) without shipping CSS or real DOM.

- **`extensions/ui-default/src/components/`** — real CSS-styled implementations. Built into `extensions/ui-default/frontend.js`, which sets `window.UI = { Button, Card, … }` at runtime. This layer owns the visual design; swapping it (or shipping an alternative uikit extension) changes the entire UI without touching any consumer code.

**Critical rule**: never add actual rendering logic or CSS to `packages/ui/src/`. It must stay as thin proxy stubs. All styling belongs in `extensions/ui-default/src/` (or a replacement uikit extension).

`extensions/ui-default/frontend.js` is a **build artifact** (gitignored). Run `pnpm -C extensions/ui-default build` to regenerate it; `pnpm dev` does this automatically before starting the watchers.

### Extension system

> **Extension authoring rules**: See [`extensions/EXTENSION_GUIDE.md`](extensions/EXTENSION_GUIDE.md) for the full mandatory ruleset. AI agents must read and follow that document when writing or reviewing any extension.

**Extension format** (place under `~/.nuxy/extensions/<folder>/`):

- `manifest.json` — required; fields: `id`, `name`, `version`, `type` (`tool`|`provider`|`orchestrator`), `bootstrap`, `permissions`, `entry.backend`, `entry.frontend`
- `backend.js` — runs in a Worker thread; receives a `CoreContext` proxy
- `frontend.js` — optional React component loaded by the shell via `nuxy-ext://`

**Backend API** (`CoreContext` from `@nuxy/extension-sdk`):

- `core.registry.registerTool/registerProvider/registerOrchestrator` — register with the kernel
- `core.ipc.handle(channel, handler)` — expose a channel callable via `ext:invoke`
- `core.clipboard`, `core.media`, `core.storage` — require matching `permissions` in manifest
- `core.extensions.invoke(targetId, channel, payload)` — cross-extension calls

**Worker isolation**: each backend runs in its own Worker thread. Calls to `core.*` send `host:call` messages to the main thread via `parentPort`; replies come back as `host:reply`. The broker in `packages/extension-host` manages this.

**Dev sync**: `pnpm dev` copies `extensions/` into `~/.nuxy/extensions/`. Override with `NUXY_EXTENSIONS_SRC=/path` or force full replacement with `NUXY_DEV_OVERWRITE=1`.

### Config file (`~/.nuxy/nuxyconfig`)

Plain key=value format, auto-created on first run. Key options:

- `theme` — `dark` | `light` | `system`
- `escAction` / `blurAction` — `hide` | `minimize` | `quit` | `none`
- `windowWidth`, `windowMaxHeight`
- `windowPosition` — `center`, `50%`, `1/3`, `200px`, or `"x y"` pair
- `alwaysOnTop`, `opacity`, `showInTaskbar`, `showOnStartup`

### Themes & Icons

**Theme extensions** (`type: "theme"`, `entry.theme: "theme.json"`): Scanner reads the JSON and registers it in `src/electron/themes/extension-themes.ts`. `loadTheme(name)` checks the extension registry first, then `~/.nuxy/themes/{name}.json`. Setting `theme = ocean` in nuxyconfig activates it. Kernel channel `getThemeByName` lets the renderer fetch any theme's CSS variables.

**Icon pack extensions** (`type: "iconpack"`, `entry.icons: "icons.json"`): Scanner reads the JSON into `src/electron/icons/registry.ts`. Renderer accesses icons via `window.core.icons.get(name, pack?)`. The `icons.json` format is `{ version, name, icons: { [name]: svgString } }`.

**Renderer API** (from preload):

- `window.core.themes.list()` — all available theme names
- `window.core.icons.get(name, pack?)` — SVG string for an icon
- `window.core.icons.listPacks()` — all loaded icon pack names

**`@nuxy/ui` SelectBox component**: keyboard-controlled dropdown placed in `ListItemActions`. Parent manages `open`, `focusedIndex`, `onSelect`, `onClose`, `onOpen` — component is fully controlled. Used by the Settings tool for theme/icon/zoom/font pickers.

JSON theme files live in `src/themes/` and are copied to `~/.nuxy/themes/` on startup. Theme variables are applied as CSS custom properties on `document.documentElement`.

# Nuxy — Comprehensive Overview

> **Last updated:** 2026-06-03  
> **Scope:** Single authoritative reference covering philosophy, implementation status, bugs, roadmap, architecture, extension system, config, and development workflow.

---

## Table of Contents

1. [What is Nuxy?](#1-what-is-nuxy)
2. [Core Philosophy](#2-core-philosophy)
3. [Implementation Status](#3-implementation-status)
4. [Known Bugs and Pain Points](#4-known-bugs-and-pain-points)
5. [Improvement Roadmap](#5-improvement-roadmap)
6. [Architecture Overview](#6-architecture-overview)
7. [Extension System](#7-extension-system)
8. [Config Reference](#8-config-reference-nuxyconfig)
9. [Development Workflow](#9-development-workflow)
10. [Related Documentation](#10-related-documentation)

---

## 1. What is Nuxy?

Nuxy is a **frameless, transparent Electron launcher** — a spotlight/command-palette style desktop app. By itself, Nuxy does absolutely nothing. Its only purpose is to act as an operating system for productivity extensions.

Nuxy runs as a single-instance daemon. It is invoked via a keyboard shortcut that runs `nuxy.sh` (or sends a `toggle` command to `/tmp/nuxy.sock`). The window appears, the user types or activates a tool, and it disappears on Escape or blur.

All functionality — the search bar, the result list, clipboard management, AI integration, themes — is delivered entirely by **extensions** installed in `~/.nuxy/extensions/`.

---

## 2. Core Philosophy

Nuxy is built on three design tenets, first articulated in [00-overview.md](./00-overview.md):

### Tenet A — The Empty Shell

When Nuxy starts with no extensions loaded, the renderer displays an empty state: "No extensions loaded. Place extensions in `~/.nuxy/extensions/`." Every piece of functionality, including the search bar itself (`com.nuxy.shell`), must be an extension. The core `App.tsx` is deliberately thin (158 lines) — it loads UIKit extensions, bootstraps the shell extension, and renders an `EmptyState` when nothing is present.

### Tenet B — Absolute Extension Autonomy

Extensions are self-contained folders with a `manifest.json`, a backend TypeScript module, and an optional React frontend. They are dropped into `~/.nuxy/extensions/`. The kernel reads their manifest, spawns a dedicated `worker_threads` Worker for the backend, and serves frontend assets via the custom `nuxy-ext://` protocol. Third-party developers can build and publish extensions without touching Nuxy's core.

### Tenet C — Zero-Trust Security

Nuxy executes third-party code from the filesystem. Extensions cannot call Node.js built-ins (`fs`, `child_process`, etc.) directly. Instead, they receive a restricted `CoreContext` proxy that routes every request through the kernel. The kernel enforces:

- **Storage chroot** — `core.storage` reads/writes are jailed to `~/.nuxy/data/<manifest.id>/`
- **Permission gate** — each `core.*` API requires the matching `permissions` entry in `manifest.json`
- **IPC channel allowlist** — only channels explicitly registered via `core.ipc.handle` are callable
- **Protocol path jail** — `nuxy-ext://` rejects any path that escapes the extension's folder
- **Capability checks** — cross-extension calls require `caller: true` on the caller and `callable: true` on the target

---

## 3. Implementation Status

The following table is derived from [DOCUMENTATION.md](./DOCUMENTATION.md) and cross-checked against the actual source tree. See [pain-points-plan.md](./pain-points-plan.md) for detailed gap analysis.

| Feature | Status | Notes / Source File |
|---|---|---|
| Worker per extension | **Implemented** | `src/electron/spawn/spawn.ts` |
| `nuxy-ext://` protocol | **Implemented** | `src/electron/protocol/resolve.ts` |
| Storage chroot | **Implemented** | `src/electron/config/storage-path.ts` |
| Permissions manifest gate | **Implemented** | `src/electron/config/permissions.ts` |
| IPC channel allowlist | **Implemented** | `src/electron/extensions/registry.ts`, `src/electron/ipc/validate.ts` |
| Registry worker sync (`registry:sync`) | **Implemented** | `src/electron/spawn/spawn.ts` → `mergeRuntimeSync` |
| Message broker (`core.extensions.invoke`) | **Implemented** | `src/electron/ipc/broker.ts` |
| Shell as extension (`com.nuxy.shell`) | **Implemented** | `extensions/shell/` |
| Empty-state UX | **Implemented** | `src/renderer/App.tsx` lines 139–155 |
| UIKit extension loading | **Implemented** | `src/renderer/App.tsx`, `listUikitExtensions` in `ipc/register.ts` |
| Theme extensions | **Implemented** | `src/electron/themes/extension-themes.ts` |
| Icon pack extensions | **Implemented** | `src/electron/icons/registry.ts` |
| i18n / localisation | **Implemented** | `core.i18n`, `useTranslation` hook, locale resolution |
| Extension settings schema | **Implemented** | `settings.json` + `core.settings.read/write` |
| Playwright E2E | **Implemented** | `src/e2e/*.spec.ts` (12 spec files) |
| Extension hot reload | **Partial** | `fs.watch` in dev mode only; no crash-restart in production |
| Clipboard consent UI | **Planned** | Permission denied without declaration; no interactive prompt |
| AI orchestrator extension | **Planned** | `type: orchestrator` exists; no built-in orchestrator shipped |
| Orchestrator Enter path | **Planned** | Type registered; shell Enter key only opens tools today |
| Granular `shell` permission | **Planned** | Binary allow/deny today; no `allowedCommands` filter |
| Extension version conflict resolution | **Planned** | No version gating or `nuxyVersion` field |

### Runtime paths

| Path | Purpose |
|---|---|
| `~/.nuxy/nuxyconfig` | User settings (key=value) |
| `~/.nuxy/extensions/<folder>/` | Installed extensions |
| `~/.nuxy/data/<manifest.id>/` | Extension storage (chroot-jailed) |
| `~/.nuxy/themes/` | Runtime theme JSON files |

> Historical references to `~/.local/share/nuxy` or `~/.config/nuxy` in older docs are obsolete. The canonical path is `~/.nuxy/`. See [electron-fix-plan.md](./electron-fix-plan.md).

---

## 4. Known Bugs and Pain Points

For the full analysis, see [pain-points-plan.md](./pain-points-plan.md) and [known-bugs.md](./known-bugs.md).

| ID | Description | Severity | Status | Primary File |
|---|---|---|---|---|
| P1 | Shell business logic still bleeds into `App.tsx` (omni bar, provider routing) | High | Largely fixed — `App.tsx` is now 158 LOC, shell moved to extension | `src/renderer/App.tsx` |
| P2 | `core.registry.*` in workers did not sync to kernel | High | Fixed — `registry:sync` message implemented | `src/electron/spawn/spawn.ts` |
| P3 | No message broker / `core.extensions.invoke` | High | Fixed — `broker.ts` implemented | `src/electron/ipc/broker.ts` |
| P4 | Manifest `capabilities` ignored by kernel | High | Fixed — checked in `broker.ts` | `src/electron/ipc/broker.ts` |
| P5 | Clipboard exposed to all workers regardless of permissions | High | Fixed — `permissions.ts` gates clipboard channels | `src/electron/config/permissions.ts` |
| P6 | Extension IPC channels not allowlisted | Medium | Fixed — `isChannelAllowed` in registry | `src/electron/extensions/registry.ts` |
| P7 | Worker sandbox weaker than documented (`import()` not `vm`) | Medium | Open — documented as known gap; isolation is worker-thread-level, not `isolated-vm` | `packages/extension-host/src/` |
| P8 | Calculator uses `eval()` for math expressions | Medium | Open — unsafe; replace with `mathjs` or Pratt parser | `extensions/calculator/backend.ts` |
| P9 | Documentation drift (`~/.local/share/nuxy`, `vm`, Shadcn) | Medium | Largely fixed — paths updated; some older docs may lag | `docs/` |
| P10 | Extension author DX (no typed SDK template, plain JS) | Medium | Partial — `packages/ext-template/` added; JS files banned, TypeScript required | `packages/ext-template/` |
| P11 | No empty-state UX when no extensions loaded | Medium | Fixed — `App.tsx` renders `EmptyState` when extension count is 0 | `src/renderer/App.tsx` |
| P12 | Orchestrator / Enter fallback not wired | Medium | Open — `type: orchestrator` exists but Enter key only opens tools | `extensions/shell/frontend.tsx` |
| P13 | Provider fan-out on every keystroke | Medium | Open — no AbortController pattern for in-flight IPC cancellation | `extensions/shell/frontend.tsx` |
| P14 | No E2E / integration tests | Medium | Fixed — 12 Playwright spec files in `src/e2e/` | `src/e2e/` |
| P15 | No extension lifecycle (hot reload, crash restart) | Low | Partial — dev-mode `fs.watch`; no production hot reload | `src/electron/extensions/scanner.ts` |
| P16 | Global shortcut / daemon story incomplete | Low | Open — single-instance lock works; UNIX socket (`/tmp/nuxy.sock`) present but optional | `src/electron/bootstrap/main.ts` |
| P17 | Toolchain / release gaps (eslint, CI, `electron-builder`) | Low | Open — no CI pipeline yet | repo root |
| P18 | Package manager split (`pnpm` vs `bun run start`) | Low | Open — `bun run start` still in root `package.json` | `package.json` |

---

## 5. Improvement Roadmap

The phased plan below is derived from [pain-points-plan.md](./pain-points-plan.md). Phases 0–2 are largely complete; Phases 3–4 are active or pending.

### Phase 0 — Align Reality (Complete)

- [x] Canonical path docs updated (`~/.nuxy` everywhere)
- [x] `docs/DOCUMENTATION.md` "implemented vs planned" table created
- [x] `electron-fix-plan.md` audit completed — all 6 phases marked done

**Exit criterion:** New contributors are not misled by docs.

### Phase 1 — Security Baseline (Complete)

- [x] `permissions.ts` — gate clipboard, storage, media, fs host channels
- [x] IPC channel allowlist (`isChannelAllowed` in registry)
- [x] `broker.ts` — capability checks for cross-extension calls
- [ ] Remove calculator `eval()` (P8) — still open

**Exit criterion:** Malicious extension cannot read clipboard without declaring the `clipboard` permission.

### Phase 2 — Registry and Broker (Complete)

- [x] Worker → kernel registry sync (`registry:sync`)
- [x] `broker.ts` + `core.extensions.invoke` with capability enforcement
- [ ] Orchestrator Enter path in shell extension (P12) — still open

**Exit criterion:** Cross-extension calls work with capability checks.

### Phase 3 — True Empty Shell (Active)

- [x] `com.nuxy.shell` extension extracted; `App.tsx` reduced to 158 lines
- [x] Empty-state UX when no extensions loaded
- [x] `packages/ext-template/` starter template
- [ ] Orchestrator Enter path wired (P12)
- [ ] Provider in-flight cancellation (P13)

**Exit criterion:** Core `App.tsx` < 200 lines; architecture matches the manifesto.

### Phase 4 — Quality and Ship (Ongoing)

- [x] Playwright E2E suite (`src/e2e/`)
- [ ] Calculator `eval()` replacement (P8)
- [ ] `electron-builder` distributable + GitHub Actions CI (P17)
- [ ] Extension hot reload in production (P15)
- [ ] UNIX socket daemon for global shortcut (P16)
- [ ] Provider fan-out cancellation (P13)

**Exit criterion:** Passing CI, distributable package, ≥ 30 unit tests, ≥ 3 critical E2E paths.

### Success Metrics

| Metric | Current | Target (V1) |
|---|---|---|
| Kernel unit tests | ~19 | 30+ (broker, permissions) |
| E2E test specs | 12 | All critical paths covered |
| Docs path consistency | Clean | 0 stale `~/.local/share/nuxy` refs |
| Core `App.tsx` LOC | 158 | < 200 |
| Extensions needing core edit for new provider | No | No |
| Cross-extension invoke with capability deny | Tested | Tested + passing |

---

## 6. Architecture Overview

See [02-architecture.md](./02-architecture.md) for the full diagram and component breakdown. See [structure.md](./structure.md) for the monorepo layout rationale.

### High-Level Topology

```
Main Process (Electron Kernel)
  ├── Extension Scanner     — reads ~/.nuxy/extensions/, spawns workers
  ├── Worker Pool           — one worker_threads Worker per backend
  ├── Kernel Message Broker — routes cross-extension calls with capability checks
  ├── IPC Register          — ipcMain handlers for renderer ↔ kernel
  ├── Protocol Handler      — nuxy-ext://<id>/... asset serving
  ├── Config                — nuxyconfig hot-reload, permissions gate
  ├── Window Manager        — frameless transparent BrowserWindow
  └── Theme / Icon Registry — extension-contributed and bundled assets

Renderer Process (React)
  ├── App.tsx               — loads UIKit exts → shell ext → EmptyState fallback
  └── preload.ts            — window.core contextBridge (ipc, window, icons, themes)

Extension Workers (one per backend)
  └── @nuxy/extension-host  — calls register(core) on the extension module
                              core is a CoreContext proxy over MessagePort
```

### Monorepo Layout

```
nuxy/
├── packages/
│   ├── core/              # @nuxy/core — CoreContext types, logger, IPC message types
│   ├── ui/                # @nuxy/ui — React component library (Card, List, Input, etc.)
│   ├── extension-host/    # @nuxy/extension-host — worker runner, CoreContext proxy
│   ├── extension-sdk/     # @nuxy/extension-sdk — extension authoring API (re-exports core)
│   ├── ext-template/      # Starter template for new extensions
│   └── ext-devserver/     # Development server for extension live-reload
├── src/
│   ├── electron/          # Electron main process (kernel)
│   │   ├── bootstrap/     # main.ts, preload.ts
│   │   ├── config/        # paths, nuxyconfig, storage-path, permissions
│   │   ├── extensions/    # scanner, registry, disabled
│   │   ├── ipc/           # register, validate, broker, worker-invoke
│   │   ├── protocol/      # nuxy-ext:// handler
│   │   ├── spawn/         # worker spawn, host-handlers, active-workers, migrate-data
│   │   ├── media/         # MPRIS now-playing (Linux; stubs on macOS/Win)
│   │   ├── window/        # BrowserWindow manager, spring animation, runtime
│   │   ├── themes/        # bundled theme install
│   │   └── icons/         # icon pack registry
│   ├── renderer/          # React shell (App.tsx, main.tsx)
│   ├── themes/            # Bundled theme JSON (copied to ~/.nuxy/themes/ on startup)
│   └── e2e/               # Playwright e2e tests
├── extensions/            # Sample / bundled extensions (synced to ~/.nuxy/extensions/ in dev)
│   ├── shell/             # com.nuxy.shell — bootstrap OmniBar shell UI
│   ├── calculator/        # provider: math evaluator
│   ├── clipboard/         # tool: clipboard history
│   └── ... (25+ more)
└── docs/                  # This directory
```

### Key Kernel Modules

| Module | Path | Responsibility |
|---|---|---|
| `main.ts` | `src/electron/bootstrap/main.ts` | App lifecycle, single-instance lock, UNIX socket |
| `scanner.ts` | `src/electron/extensions/scanner.ts` | Reads `~/.nuxy/extensions/`, validates manifests |
| `spawn.ts` | `src/electron/spawn/spawn.ts` | Creates Worker thread, wires `host:call`/`host:reply` |
| `broker.ts` | `src/electron/ipc/broker.ts` | Cross-extension `invokeExtension` with capability checks |
| `registry.ts` | `src/electron/extensions/registry.ts` | In-memory extension map, channel allowlist, runtime sync |
| `register.ts` | `src/electron/ipc/register.ts` | All `ipcMain` handlers (`listTools`, `getThemeByName`, etc.) |
| `permissions.ts` | `src/electron/config/permissions.ts` | Maps host channels to required manifest permissions |
| `nuxyconfig.ts` | `src/electron/config/nuxyconfig.ts` | Reads/watches `~/.nuxy/nuxyconfig`; hot-reloads on change |
| `protocol/resolve.ts` | `src/electron/protocol/` | `nuxy-ext://` path resolution with folder escape prevention |
| `spring.ts` | `src/electron/window/spring.ts` | Spring-physics animated window resizing |
| `preload.ts` | `src/electron/bootstrap/preload.ts` | `contextBridge` — exposes `window.core` to renderer |

### IPC Flow

```
Renderer (window.core.ipc.invoke)
  → preload contextBridge
    → ipcMain ext:invoke
      → validate (extension exists, channel allowed)
        → invokeWorker (15s timeout)
          → Worker (host:call → extension handler → host:reply)
```

Cross-extension calls:

```
Worker A core.extensions.invoke(targetId, channel, payload)
  → host:call broker:invoke
    → Main process broker.ts
      → verify caller.capabilities.caller = true
      → verify target.capabilities.callable = true
      → isChannelAllowed(targetId, channel)
        → invokeWorker(targetId, channel, payload)
```

---

## 7. Extension System

Full authoring rules: [EXTENSION_GUIDE.md](../extensions/EXTENSION_GUIDE.md)  
Manifest reference: [MANIFEST_GUIDE.md](../extensions/MANIFEST_GUIDE.md)  
Frontend structure: [FRONTEND_STRUCTURE_GUIDE.md](../extensions/FRONTEND_STRUCTURE_GUIDE.md)

### Extension Types

| Type | User-visible | Backend worker | Frontend loaded | Purpose |
|---|---|---|---|---|
| `tool` | Yes | Required | Optional, on activation | Interactive tool activated directly |
| `provider` | Yes | Required | Optional | Data provider (supplies result rows) |
| `orchestrator` | Yes | Required | Optional | Coordinates providers; Enter fallback |
| `helper` | No | Optional | Optional, loaded early | Utility called by other extensions |
| `uikit` | No | No | Yes, loaded before shell | Extends `window.UI` with new components |
| `theme` | No | No | No | JSON theme definition |
| `iconpack` | No | No | No | JSON icon pack |

### Manifest Format

```json
{
  "id": "com.nuxy.<name>",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "type": "tool",
  "permissions": ["storage", "clipboard"],
  "capabilities": {
    "callable": true,
    "caller": false
  },
  "locales": {
    "default": "en",
    "supported": ["en", "tr"]
  },
  "entry": {
    "preload": "preload.ts",
    "backend": "backend.ts",
    "frontend": "frontend.tsx",
    "settings": "settings.json"
  }
}
```

### Available Permissions

| Permission | Grants access to |
|---|---|
| `storage` | `core.storage.*` (sandboxed JSON, namespaced by extension id) |
| `clipboard` | `core.clipboard.*` |
| `fs` | `core.fs.*` (arbitrary path I/O proxied through kernel) |
| `db` | `core.db.*` (SQLite via kernel proxy) |
| `shell` | `core.shell.open()`, `core.shell.exec()` |
| `media` | `core.media.*` |
| `network` | Outbound HTTP/fetch |
| `notifications` | System notifications |
| `settings.read` | Read another extension's settings |
| `settings.write` | Write another extension's settings |

### CoreContext API (available in backend)

```ts
core.clipboard.readText()             // → Promise<string>
core.clipboard.writeText(text)        // → Promise<void>
core.clipboard.readImage()            // → Promise<string | null>
core.clipboard.writeImage(dataURL)    // → Promise<void>
core.clipboard.writeFiles(paths)      // → Promise<void>

core.fs.fileExists(path)              // → Promise<boolean>
core.fs.readDir(path)                 // → Promise<string[]>
core.fs.readFile(path, encoding)      // → Promise<string>
core.fs.writeFile(path, data)         // → Promise<void>
core.fs.mkdir(path, opts)             // → Promise<void>
core.fs.rename(old, new)              // → Promise<void>
core.fs.rm(path)                      // → Promise<void>
core.fs.stat(path)                    // → Promise<{type, size, mtime}>

core.storage.read<T>(file)            // → Promise<T | null>  (JSON, ext-namespaced)
core.storage.write<T>(file, data)     // → Promise<void>

core.settings.read<T>(key)            // → Promise<T | null>
core.settings.write(key, value)       // → Promise<void>

core.db.open(name)                    // → Promise<Database>  (SQLite)

core.media.getNowPlaying()            // → Promise<NowPlaying | null>

core.shell.open(pathOrUrl)            // → Promise<void>
core.shell.exec(cmd, args)            // → Promise<{stdout, stderr}>

core.extensions.invoke(id, ch, data)  // → Promise<IpcResult>

core.config.get()                     // → Promise<NuxyConfig>

core.logger.info/warn/error/silly(msg, meta?)

core.ipc.handle(channel, handler)     // register an IPC handler

core.registry.registerTool(config)
core.registry.registerProvider(config)
core.registry.registerOrchestrator(config)
core.registry.registerTheme(config)
core.registry.registerIconPack(config)

core.i18n.locale                      // resolved BCP 47 locale
core.i18n.dir                         // 'ltr' | 'rtl'
core.i18n.t(key, vars?, count?)       // translated string
```

### Capabilities (cross-extension calls)

- `callable: true` — other extensions may call this one via `core.extensions.invoke`
- `caller: true` — this extension is permitted to call other extensions

The broker enforces both sides before routing the call. See [10-security.md](./10-security.md) and [16-omni-input-system.md](./16-omni-input-system.md).

### Extension Settings

Declare user-facing settings in a `settings.json` schema file and point to it via `entry.settings` in the manifest. The `com.nuxy.settings` extension discovers this schema and renders the settings UI automatically. Extensions read and write their own settings via `core.settings.read(key)` / `core.settings.write(key, value)`.

**Never** build a custom settings panel inside an extension frontend.

### i18n / Localisation

Extensions ship locale files under `locales/<code>.json`. The kernel resolves the best locale using the user's ordered `preferredLanguages` list, then the OS locale, then the extension's declared default. Use `core.i18n.t(key)` in backend and `useTranslation(EXT_ID)` from `window.UI` in frontend. See [EXTENSION_GUIDE.md §6](../extensions/EXTENSION_GUIDE.md#6-localisation-i18n).

### Key Anti-Patterns (banned)

- Importing Node built-ins (`fs`, `child_process`, `path`, `os`, `node:*`) in backend
- Using `console.log` instead of `core.logger.*`
- Hardcoded colors in frontend (use CSS custom properties)
- Own `<input>` or `<textarea>` in frontend (use the `query` prop)
- Custom UI components not in `@nuxy/ui`
- Mouse-only actions without keyboard equivalents
- Dispatching unlisted custom events
- `.js` extension files (all extensions must be TypeScript)
- Custom settings panel inside extension frontend
- Using `core.storage` for user-facing settings (use `core.settings`)
- Hardcoded user-facing strings (use `core.i18n.t`)

---

## 8. Config Reference (`~/.nuxy/nuxyconfig`)

Plain `key=value` format. Auto-created on first run. Hot-reloaded on file change.

| Key | Type | Default | Description |
|---|---|---|---|
| `theme` | `dark` \| `light` \| `system` \| `<name>` | `dark` | Active theme. Custom theme names match JSON files in `~/.nuxy/themes/` or theme extensions. |
| `escAction` | `hide` \| `minimize` \| `quit` \| `none` | `hide` | What happens when Escape is pressed |
| `blurAction` | `hide` \| `minimize` \| `quit` \| `none` | `hide` | What happens when the window loses focus |
| `windowWidth` | integer (pixels) | 700 | Width of the launcher window |
| `windowMaxHeight` | integer (pixels) | 500 | Maximum height before the window scrolls |
| `windowPosition` | `center` \| `50%` \| `1/3` \| `200px` \| `"x y"` | `center` | Initial window position on the display |
| `alwaysOnTop` | `true` \| `false` | `false` | Keep the window above all other windows |
| `opacity` | `0.0`–`1.0` | `1.0` | Window opacity |
| `showInTaskbar` | `true` \| `false` | `false` | Show Nuxy in the OS taskbar |
| `showOnStartup` | `true` \| `false` | `false` | Show the window immediately on launch |
| `zoom` | CSS zoom value (e.g. `1.2`) | — | Renderer zoom level |
| `font` | `system` \| `monospace` \| font name | — | Global font family |

---

## 9. Development Workflow

All commands run from the repo root. `pnpm` is required (enforced by `preinstall` script).

### Commands

```bash
pnpm dev          # Start Electron in dev mode (hot-reload, syncs extensions/)
pnpm build        # Run tests then build renderer + Electron main
pnpm package      # Build + package distributable via electron-builder
pnpm test         # Run vitest unit tests (from src/)
pnpm format       # Format all files with Prettier
pnpm format:check # Check formatting without writing
```

Granular control from `src/`:

```bash
pnpm -C src test                                    # Run all unit tests once
pnpm -C src test:watch                              # Watch mode
pnpm -C src test:e2e:core                           # Playwright core e2e tests (src/e2e/)
pnpm -C src typecheck                               # TypeScript check without emit
pnpm -C src test -- electron/ipc/validate.test.ts  # Single test file
```

Extension e2e:

```bash
pnpm test:e2e calculator      # e2e tests for extensions/calculator/
pnpm test:e2e:all             # all extensions with an e2e.spec.ts
```

Logging verbosity: `LOG_LEVEL=silly pnpm dev` (levels: `silly` | `info` | `warn` | `error`)

Dev extensions sync: `pnpm dev` copies `extensions/` into `~/.nuxy/extensions/`. Override source with `NUXY_EXTENSIONS_SRC=/path`. Force full replacement with `NUXY_DEV_OVERWRITE=1`.

### TDD — Mandatory

**TDD is mandatory for all new features.** Follow this order strictly:

1. Write the test(s) first — they must fail initially.
2. Write the minimum implementation to make them pass.
3. Run `pnpm -C src test` and iterate until all tests are green.
4. A feature is not complete until the full test suite passes.

### Test Locations

| What | Where |
|---|---|
| Extension backend logic | `extensions/<name>/backend.test.ts` |
| Electron main process | `src/electron/**/*.test.ts` |
| Playwright e2e (unit-style, no app) | `src/e2e/*.spec.ts` |
| Playwright e2e (full app launch) | `src/e2e/*.spec.ts` using `electronApp`/`appPage` fixtures |

### Extension Backend Test Pattern

Use `createMockCore` from `@nuxy/extension-sdk` — do not hand-roll a mock core:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
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
    expect(core.registry.registerTool).toHaveBeenCalled()
  })

  it('handles myChannel', async () => {
    const result = await handlers['myChannel']({ some: 'payload' })
    expect(result).toEqual(/* expected */)
  })
})
```

For CJS modules with Node built-ins: use `vi.spyOn(module, 'method')` in `beforeEach` + `vi.restoreAllMocks()` in `afterEach`.  
For ESM-only built-ins (`node:sqlite`): use a hoisted `vi.mock` factory.  
For Electron main-process modules: mock `electron` and file I/O. Use `vi.hoisted()` for values needed inside `vi.mock` factories.

### Playwright E2E Fixtures

Full-app tests use worker-scoped fixtures from `src/e2e/fixtures.ts`:

```ts
import { test, expect } from '../../../src/e2e/fixtures.ts'

test('calculator returns result', async ({ appPage }) => {
  await appPage.getByTestId('omnibar-input').type('2 + 2')
  await expect(appPage.getByTestId('result').first()).toHaveText('4')
})
```

---

## 10. Related Documentation

| Topic | Document |
|---|---|
| Empty shell philosophy | [00-overview.md](./00-overview.md) |
| Architecture diagram and component breakdown | [02-architecture.md](./02-architecture.md) |
| Canonical paths and kernel fix audit | [electron-fix-plan.md](./electron-fix-plan.md) |
| Pain points and gap analysis | [pain-points-plan.md](./pain-points-plan.md) |
| Open bug tracker | [known-bugs.md](./known-bugs.md) |
| Feature implementation status | [DOCUMENTATION.md](./DOCUMENTATION.md) |
| MVP roadmap and sprint history | [19-mvp-roadmap.md](./19-mvp-roadmap.md) |
| Security model and isolation | [10-security.md](./10-security.md) |
| Extension types and omni-input arbitration | [16-omni-input-system.md](./16-omni-input-system.md) |
| Gnome Extensions style deep dive | [15-modular-plugin-system.md](./15-modular-plugin-system.md) |
| Testing strategy | [12-testing-strategy.md](./12-testing-strategy.md) |
| Monorepo file structure design | [structure.md](./structure.md) |
| Extension authoring rules (mandatory) | [../extensions/EXTENSION_GUIDE.md](../extensions/EXTENSION_GUIDE.md) |
| Manifest field reference | [../extensions/MANIFEST_GUIDE.md](../extensions/MANIFEST_GUIDE.md) |
| Frontend structure guide | [../extensions/FRONTEND_STRUCTURE_GUIDE.md](../extensions/FRONTEND_STRUCTURE_GUIDE.md) |
| Documentation index | [README.md](./README.md) |

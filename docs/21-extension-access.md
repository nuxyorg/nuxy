# 21 - Extension Access & Permissions

This document lists everything extensions can reach in Nuxy: host privileges, renderer APIs, manifest rules, and shell integration. Each item is marked by **implementation status** so extension authors know what works today versus what is only planned.

**Legend**

| Status           | Meaning                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| **Implemented**  | Available in code; extensions can use it now.                           |
| **Partial**      | API exists but behavior is incomplete (e.g. logs only, no enforcement). |
| **Planned**      | Described in design docs or examples; not wired in the kernel yet.      |
| **Not enforced** | Runtime grants access without checking manifest or user consent.        |

**Source of truth (runtime)**

- Backend injection: `@nuxy/extension-host` (`createCoreProxy` implements `CoreContext`)
- Host handlers: `src/electron/spawn/host-handlers.ts`
- Worker spawn: `src/electron/spawn/spawn.ts`
- Media backends: `src/electron/media/platforms/{linux,darwin,win32}/`
- Renderer bridge: `src/electron/bootstrap/preload.ts`
- IPC routing: `src/electron/ipc/register.ts`, `src/electron/ipc/validate.ts`

---

## 1. Host privileges (backend worker)

These APIs are passed into `register(core)` inside an isolated worker thread. Extensions cannot use Node `fs`, `child_process`, or raw Electron APIs; they must go through the kernel via `callHost`.

### Implemented

| Access                     | API                                 | What it allows                                                 | Kernel channel / notes                                     |
| -------------------------- | ----------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| **Clipboard (read)**       | `core.clipboard.readText()`         | Read the OS clipboard as plain text                            | `clipboard:readText` → Electron `clipboard.readText()`     |
| **Clipboard (write)**      | `core.clipboard.writeText(text)`    | Write plain text to the OS clipboard                           | `clipboard:writeText`                                      |
| **Scoped storage (read)**  | `core.storage.read(file)`           | Read a JSON file under `~/.nuxy/data/<extension-id>/`          | `storage:read`; path traversal blocked (`storage-path.ts`) |
| **Scoped storage (write)** | `core.storage.write(file, data)`    | Write JSON in the same chroot                                  | `storage:write`                                            |
| **Custom IPC (backend)**   | `core.ipc.handle(channel, handler)` | Register channels the extension frontend (or shell) can invoke | Handled in worker; forwarded via `ext:invoke`              |
| **Now playing (read)**     | `core.media.getNowPlaying()`        | Title, artist, album, playing state, source, artwork URL       | `media:getNowPlaying` → platform backend (Linux: MPRIS)    |
| **Logging**                | `core.logger.silly/info/warn/error` | Scoped logs for the extension worker                           | Worker-local; respects `LOG_LEVEL`                         |

### Implemented (registry sync)

| Access                         | API                                                  | Current behavior                                                                        |
| ------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Omni tool registration**     | `core.registry.registerTool(cfg)`                    | Syncs `displayName` to kernel; listed via `listTools` (excludes `bootstrap` extensions) |
| **Live provider registration** | `core.registry.registerProvider(cfg)`                | Syncs display name; shell invokes registered `eval` channel                             |
| **Orchestrator registration**  | `core.registry.registerOrchestrator(cfg)`            | Registered; shell Enter invokes first orchestrator’s `route` channel when present       |
| **Cross-extension invoke**     | `core.extensions.invoke(targetId, channel, payload)` | Routed via `broker:invoke`; requires `caller` / `callable` capabilities                 |

### Planned (documented, not in worker)

| Access                    | API                                    | Intended use                                                                |
| ------------------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| **OS notifications**      | `core.notify(title, body)`             | Desktop notifications                                                       |
| **IPC push to UI**        | `core.ipc.broadcast(channel, payload)` | Push events to extension frontend without polling (stub logs warning today) |
| **Callable tool listing** | `core.registry.getCallableTools()`     | List tools the extension may invoke when `caller: true`                     |

### Planned host privileges (not implemented)

| Permission / access       | Intended API (proposal)                  | What it should allow                                                |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| **`network`**             | TBD (proxied fetch / allowlisted hosts)  | HTTP(S) from backend without raw sockets in worker                  |
| **`media` (consent)**     | `core.media.getNowPlaying()`             | Manifest gate + user consent (API implemented; enforcement planned) |
| **`notifications`**       | `core.notify` + manifest `notifications` | Same as notify API, gated by permission                             |
| **`shell` / `commands`**  | TBD                                      | Run allowlisted shell commands (high risk; strict sandbox)          |
| **`clipboard` (consent)** | Same `core.clipboard`                    | User prompt before read/write (see [Security](./10-security.md))    |

> **Note:** `core.clipboard` is part of `CoreContext` in `@nuxy/core`. The worker proxy in `@nuxy/extension-host` is built from that type so the API cannot drift.

---

## 2. Renderer APIs (extension frontend & shell)

Exposed on `window.core` via `contextBridge` (`preload.ts`). Used by extension UIs loaded from `nuxy-ext://<manifest.id>/…` and by the main React shell.

### Implemented

| Access             | API                                         | What it allows                                                                                 |
| ------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Invoke backend** | `core.ipc.invoke(extId, channel, payload?)` | Call any loaded extension’s registered handler, or kernel pseudo-extension (`kernel` / `core`) |
| **Window resize**  | `core.window.resize(width, height)`         | Resize the frameless host window                                                               |
| **Window hide**    | `core.window.hide()`                        | Hide the launcher window                                                                       |
| **Escape action**  | `core.window.esc()`                         | Trigger configured Esc behavior (hide / minimize / quit)                                       |
| **Window center**  | `core.window.center()`                      | Reposition on current display                                                                  |
| **Window drag**    | `core.window.dragStart/Move/End()`          | Drag frameless window                                                                          |
| **Show callback**  | `core.window.onShow(callback)`              | Subscribe to `window-show` events                                                              |

### Kernel channels (`extId`: `kernel` or `core`)

| Channel             | Returns / does                                     |
| ------------------- | -------------------------------------------------- |
| `listTools`         | Extensions with `manifest.type === "tool"`         |
| `listProviders`     | Extensions with `manifest.type === "provider"`     |
| `listOrchestrators` | Extensions with `manifest.type === "orchestrator"` |
| `getConfig`         | Application config                                 |
| `getTheme`          | Active theme definition                            |

### Partial / implicit (no dedicated permission)

| Access                  | Mechanism                         | Notes                                                           |
| ----------------------- | --------------------------------- | --------------------------------------------------------------- |
| **Extension assets**    | `nuxy-ext://<manifest.id>/<file>` | Protocol resolves under extension folder; escape paths rejected |
| **Omni bar keyboard**   | `window` event `omniBar-keydown`  | Tool UIs receive keys when omni bar is hidden                   |
| **Omni bar visibility** | `window` event `omniBar-control`  | Tool can show/hide omni bar                                     |
| **Shared UI kit**       | `window.UI`                       | Set in `renderer/main.tsx` from `@nuxy/ui`                      |
| **React global**        | `window.React`                    | Set in `renderer/main.tsx` for extension frontends              |
| **Bootstrap shell**     | `com.nuxy.shell` extension        | Core `App.tsx` loads `nuxy-ext://com.nuxy.shell/frontend.js`    |

### Planned (renderer)

| Access                  | API                              | Intended use                                                                                 |
| ----------------------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| **IPC subscribe**       | `core.ipc.on(channel, listener)` | Listen for `core.ipc.broadcast` from backend                                                 |
| **Typed `IpcResponse`** | Wrapper on all invokes           | Documented in [API Design](./05-api-design.md); worker returns raw `{ result, error }` today |

---

## 3. Manifest: roles and cross-extension rules

Defined in `packages/core/src/types.ts` and extension `manifest.json`.

| Field                   | Values                                 | Status          | Effect                                                                             |
| ----------------------- | -------------------------------------- | --------------- | ---------------------------------------------------------------------------------- |
| `type`                  | `tool` \| `provider` \| `orchestrator` | **Implemented** | Shell routing: tools get custom UI; providers answer live search via `eval`        |
| `capabilities.callable` | `boolean`                              | **Implemented** | Enforced in `broker.ts` for `core.extensions.invoke` targets                       |
| `capabilities.caller`   | `boolean`                              | **Implemented** | Enforced in `broker.ts` for callers                                                |
| `permissions`           | `string[]`                             | **Implemented** | Enforced in `permissions.ts` at host boundary (`storage`, `clipboard`, `media`, …) |
| `bootstrap`             | `boolean`                              | **Implemented** | Frontend-only shell loaded by core; excluded from `listTools`                      |
| `peerExtensions`        | version map                            | **Planned**     | Dependency graph before boot                                                       |

### Example manifest permissions

Extensions should declare host privileges they need. The kernel will eventually deny undeclared calls and show a consent UI for sensitive ones.

```json
{
  "permissions": ["storage", "clipboard", "media", "network", "notifications"]
}
```

| Permission      | Sensitive? | Planned behavior                                                 |
| --------------- | ---------- | ---------------------------------------------------------------- |
| `storage`       | Low        | Default for persistent extension data under `~/.nuxy/data/<id>/` |
| `clipboard`     | **High**   | User prompt on first read (and optionally write) per extension   |
| `media`         | Medium     | Read now-playing metadata only (no arbitrary audio capture)      |
| `network`       | Medium     | Proxied HTTP with host allowlist                                 |
| `notifications` | Low        | OS notification surface                                          |

---

## 4. Custom IPC channels (per extension)

Any extension may define arbitrary backend channels via `core.ipc.handle`. These are **not** global permissions; they are namespaced by `extId` when invoked from the renderer.

| Extension             | Type       | Channels                                               | Host APIs used                                     |
| --------------------- | ---------- | ------------------------------------------------------ | -------------------------------------------------- |
| `com.nuxy.clipboard`  | `tool`     | `getHistory`, `clearHistory`, `deleteItem`, `copyItem` | `clipboard`, `storage`, `logger`                   |
| `com.nuxy.calculator` | `provider` | `eval` (shell always uses this name for providers)     | `logger` (optional); evaluates user math in worker |

---

## 5. What extensions cannot access (by design)

| Blocked                                  | Reason                                          |
| ---------------------------------------- | ----------------------------------------------- |
| Raw filesystem (`fs`, arbitrary paths)   | Only chrooted `core.storage`                    |
| Raw `require('electron')` / main process | Worker has no native Electron in sandbox        |
| Other extensions’ memory or variables    | Separate worker per extension                   |
| Other extensions’ data dirs              | Storage jail is per `manifest.id`               |
| Arbitrary `ipcRenderer`                  | Preload exposes only `window.core`              |
| Direct DOM of other extensions           | Separate UI bundles / future sandboxed webviews |

---

## 6. Built-in extensions (current usage)

| Extension         | Clipboard         | Storage              | Network | Media (now playing) | Custom IPC  |
| ----------------- | ----------------- | -------------------- | ------- | ------------------- | ----------- |
| Clipboard Manager | Yes (poll + copy) | Yes (`history.json`) | No      | No                  | 4 channels  |
| Calculator        | No                | No                   | No      | No                  | `eval` only |

---

## 7. Media / now playing

### API (implemented)

```typescript
const track = await core.media.getNowPlaying()
// NowPlaying | null — see @nuxy/core `NowPlaying`
```

Host channel: `media:getNowPlaying` (`HostChannel.MEDIA_GET_NOW_PLAYING`).

### Platform layout

```text
src/electron/media/
├── index.ts                 # getNowPlaying() facade
├── parse-mpris.ts           # shared MPRIS metadata parsing (Linux)
└── platforms/
    ├── index.ts             # picks backend from process.platform
    ├── linux/
    │   ├── index.ts
    │   └── mpris.ts         # session D-Bus / MPRIS (dbus-next)
    ├── darwin/
    │   └── index.ts         # stub — MediaPlayer planned
    └── win32/
        └── index.ts         # stub — SMTC planned
```

| Platform | Backend                         | Status                            |
| -------- | ------------------------------- | --------------------------------- |
| Linux    | MPRIS via `dbus-next`           | **Implemented**                   |
| macOS    | MediaPlayer / Now Playing       | **Planned** (`platforms/darwin/`) |
| Windows  | System Media Transport Controls | **Planned** (`platforms/win32/`)  |

### Planned controls

`playPause()`, `next()`, `previous()` — only with manifest `media` permission, user consent, and per-player allowlists.

Manifest `permissions: ["media"]` is **enforced** at the host boundary; user consent UI is still planned.

---

## 8. Security model (summary)

| Topic                  | Today                                                 | Target                 |
| ---------------------- | ----------------------------------------------------- | ---------------------- |
| Worker isolation       | **Yes** — one worker per extension                    | Same                   |
| Storage chroot         | **Yes**                                               | Same                   |
| Clipboard              | **`clipboard` permission required**                   | Optional consent UI    |
| Cross-extension calls  | **Broker** with `callable` / `caller` + IPC allowlist | JSON Schema validation |
| Manifest `permissions` | **Enforced** at `callHost` boundary                   | Same                   |
| IPC channels           | **Allowlist** from worker `registry:sync`             | Same                   |

See [Security & Strict Isolation](./10-security.md) for the full threat model and consent flow.

---

## 9. Related documentation

| Topic | Document | Notes |
| ----- | -------- | ----- |
| Module layout and manifest example | [04-modules.md](./04-modules.md) | Extension folder structure |
| CoreContext and IPC contracts | [05-api-design.md](./05-api-design.md) | IpcResponse wrapper, Zod validation pattern |
| Isolation, chroot, permission prompts | [10-security.md](./10-security.md) | Full threat model and consent flow |
| Tool / Provider / Orchestrator roles | [16-omni-input-system.md](./16-omni-input-system.md) | Capability flags and schema validation |
| UI loading and omni bar events | [17-frontend-extensions.md](./17-frontend-extensions.md) | Canvas zones and shortcut management |
| Plugin system and CoreContext proxy | [15-modular-plugin-system.md](./15-modular-plugin-system.md) | Thread isolation and MessagePort detail |
| Feature implementation status | [DOCUMENTATION.md](./DOCUMENTATION.md) | Implemented vs planned feature tracker |

---

**Previous:** [20. Logging](./20-logging.md) | **Back to:** [Documentation index](./README.md)

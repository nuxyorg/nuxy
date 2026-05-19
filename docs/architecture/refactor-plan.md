# Architecture Refactor Plan

**Project:** nuxy — Electron spotlight/launcher  
**Date:** 2026-05-19  
**Scope:** Static analysis of main-process, packages, and renderer layers  
**Applied Automatically?** No — all findings are architecture changes that require manual review and implementation.

---

## Summary

The codebase is generally well-structured and small. Most files are appropriately sized and single-purpose. However, several architectural tensions exist that will create compounding maintenance debt as the project grows:

1. Validation logic is duplicated and split across two files with overlapping concerns.
2. The IPC register module conflates three distinct responsibilities.
3. `nuxyconfig.ts` is a god-module for configuration — parsing, file-watching, migration, and window positioning all live together.
4. `CoreContext` is defined in `@nuxy/core` but consumed by the worker host, creating an implicit contract that can diverge silently.
5. The renderer bypasses all type safety with `(window as any).core`.
6. The extension scanner owns too many lifecycle concerns that belong elsewhere.
7. The `NowPlaying` type is defined twice (in `@nuxy/core` and re-exported through a local `media/types.ts`).
8. The worker message protocol is an untyped ad-hoc string format duplicated across the host and main process.
9. `config.ts` is a re-export shim that adds no value and creates a confusing indirection.
10. The preload surface is hardcoded — adding new bridge methods requires modifying `preload.ts` directly with no registry mechanism.

---

## Finding 1: Validation Split Creates Duplicate Extension-Lookup Logic

**Problem:**  
`src/electron/ipc/validate.ts` (lines 67–88) calls `getExtensionById` and `isChannelAllowed` to guard IPC args. `src/electron/ipc/broker.ts` (lines 14–54) independently calls the exact same `getExtensionById` and `isChannelAllowed` for broker-level invocations. Both files perform the same existence and channel-authorization checks in parallel code paths. `validate.ts` also hard-codes `KERNEL_CHANNELS` (lines 7–13), while `register.ts` (lines 45–71) re-implements the same kernel-channel dispatch switch inline.

**Impact:**  
Any new kernel channel must be added in two places: `validate.ts:KERNEL_CHANNELS` and `register.ts` dispatch block. A channel added to one but not the other silently creates either a validation hole or a dead handler. The duplication will grow as more kernel channels are added.

**Proposed Fix:**  
1. Extract a `src/electron/ipc/kernel-router.ts` that owns the `KERNEL_CHANNELS` set, the dispatch logic, and its own validation.  
2. `validate.ts` should only validate shape (extId type, channel type, payload type) and delegate kernel vs extension routing to the router.  
3. `broker.ts` can then be a pure "extension-to-extension" path without repeating registry lookups already done by `validate.ts`.

**Risk Level:** Medium  
**Applied Automatically?** No

---

## Finding 2: `register.ts` Is a God-Handler (Three Responsibilities in One File)

**Problem:**  
`src/electron/ipc/register.ts` (169 lines) does all of the following:  
- Registers the `ext:invoke` handler and dispatches kernel channels inline (lines 36–74).  
- Registers all window management IPC handlers (`window:resize`, `window:center`, `window:dragStart`, `window:dragMove`, `window:dragEnd`, `window:hide`, `window:esc`) — lines 77–165.  
- Manages mutable `dragOffset` state at module scope (line 22).  
- Applies business logic (min/max size clamping, `escAction` branching) inline within handlers.

**Impact:**  
Window drag state, window resize logic, extension dispatch, and kernel-channel handling are coupled into one registration call. Testing any single concern requires the entire IPC surface to be present. The `dragOffset` module-level variable is invisible to any caller and cannot be reset without re-importing the module.

**Proposed Fix:**  
1. Move window handlers to `src/electron/ipc/window-handlers.ts` with `dragOffset` encapsulated inside a closure or class.  
2. Move kernel-channel dispatch to `src/electron/ipc/kernel-router.ts` (see Finding 1).  
3. `register.ts` becomes a thin orchestrator: `registerIpc()` calls `registerWindowHandlers()` and `registerExtensionHandlers()`.

**Risk Level:** Medium  
**Applied Automatically?** No

---

## Finding 3: `nuxyconfig.ts` Is a God-Module

**Problem:**  
`src/electron/config/nuxyconfig.ts` (290 lines) combines:  
- A custom line-by-line config file parser (lines 39–95).  
- Default-config writer (lines 97–113).  
- File-system migration of the legacy `~/.nuxyconfig` path (lines 132–145).  
- A file-watcher that dynamically imports `window/runtime.js` and `window/manager.js` using `import()` inside a callback to avoid circular dependency (lines 146–169) — this is a code smell indicating a layering violation.  
- Window-position coordinate math with five distinct parsing modes (lines 218–289).

**Impact:**  
The dynamic `import()` on lines 155–160 is a direct symptom of a circular dependency: `nuxyconfig.ts` wants to call `applyConfigToWindow` but cannot import `window/runtime.ts` statically because `window/runtime.ts` imports `nuxyconfig.ts`. This dynamic import is a workaround, not a fix. The window-position math has no tests despite being complex (percentages, px, fractions, ratios). Config file parsing is bespoke and untested.

**Proposed Fix:**  
1. Extract `src/electron/config/config-parser.ts` for the line-based parser.  
2. Extract `src/electron/config/window-position.ts` for `getWindowPosition` and `parseCoordinate`.  
3. Move the config file-watcher into `src/electron/config/config-watcher.ts`. Decouple it from window concerns by emitting an event (e.g. `EventEmitter` or a simple callback registry) that `bootstrap/main.ts` subscribes to. `bootstrap/main.ts` already knows about both config and windows — it is the right place to wire the "config changed → apply to window" reaction.  
4. Move legacy migration to `src/electron/config/migrate-config.ts`, called once at startup.

**Risk Level:** Medium  
**Applied Automatically?** No

---

## Finding 4: `NowPlaying` Type Is Defined and Re-exported Through an Extra Indirection

**Problem:**  
`packages/core/src/media.ts` (line 1) defines `NowPlaying`. `packages/core/src/index.ts` re-exports it (line 3). `src/electron/media/types.ts` re-exports it again (lines 1–3) from `@nuxy/core` alongside a local `MediaPlatform` type. `src/electron/media/index.ts` re-exports the local `media/types.ts` (line 5).

Consumers of the media layer now have two import paths for the same type: `@nuxy/core` or `@nuxy/media/index.ts` → `./types.ts` → `@nuxy/core`.

**Impact:**  
Type aliasing through multiple hops makes it harder to trace the canonical definition. If `NowPlaying` ever needs to change, the re-export chain may silently continue to serve stale type declarations from a cached build artifact.

**Proposed Fix:**  
1. Remove the re-export of `NowPlaying` from `src/electron/media/types.ts`.  
2. Have `src/electron/media/index.ts` export only the local `MediaPlatform` and `MediaPlatformProvider` types, letting callers import `NowPlaying` directly from `@nuxy/core`.

**Risk Level:** Low  
**Applied Automatically?** No

---

## Finding 5: Worker Message Protocol Is an Untyped Ad-Hoc String Format

**Problem:**  
The communication protocol between `packages/extension-host/src/index.ts` and `src/electron/spawn/spawn.ts` is an ad-hoc message format with no shared type definition:

- Worker sends `{ type: 'registry:sync', ipcChannels, displayName }` — `spawn.ts` line 43 checks `msg.type === 'registry:sync'` with no type guard.  
- Worker sends `{ type: 'host:call', id, channel, payload }` — `spawn.ts` line 52 destructures with no type guard.  
- Main sends `{ type: 'host:reply', id, ...reply }` — `index.ts` line 26 checks `msg?.type === 'host:reply'`.  
- Main sends `{ id, channel, payload }` (no `type` field) for IPC invocations — `index.ts` line 36 checks `msg?.channel && msg?.id`.  

The `invokeWorker` function in `src/electron/ipc/worker-invoke.ts` (line 39) types incoming messages as `{ id?: string; error?: string; result?: unknown }` inline, which is a different partial shape than the `host:reply` handling in `index.ts`.

**Impact:**  
Any message shape change requires updating at least three files with no compiler enforcement. A typo in `'registry:sync'` or `'host:call'` would silently drop messages. The lack of a discriminated union means no exhaustive-check safety.

**Proposed Fix:**  
1. Add a `packages/core/src/worker-protocol.ts` file defining a discriminated union:  
   ```ts
   export type WorkerToHostMessage =
     | { type: 'registry:sync'; ipcChannels: string[]; displayName?: string }
     | { type: 'host:call'; id: string; channel: string; payload?: unknown }
     | { id: string; channel?: never; result?: unknown; error?: string }  // IPC reply

   export type HostToWorkerMessage =
     | { type: 'host:reply'; id: string; result?: unknown; error?: string }
     | { id: string; channel: string; payload?: unknown }  // IPC invoke
   ```  
2. Import and use these types in both `spawn.ts` and `extension-host/src/index.ts`.  
3. Export from `@nuxy/core` so both sides of the boundary share one source of truth.

**Risk Level:** Medium  
**Applied Automatically?** No

---

## Finding 6: Renderer Bypasses All Type Safety via `(window as any).core`

**Problem:**  
`src/renderer/App.tsx` accesses the preload bridge with `(window as any).core` on lines 16, 43, 51. `src/renderer/main.tsx` sets globals with `(window as any).React` etc. (lines 6–8). The preload contract (`src/electron/bootstrap/preload.ts`) exposes a structured `window.core` object, but no TypeScript declaration file describes it to the renderer.

**Impact:**  
Renaming or adding properties to `preload.ts` does not produce a type error anywhere in the renderer. The renderer cannot be statically checked against the actual bridge surface. Intellisense is absent for `window.core` in renderer code.

**Proposed Fix:**  
1. Add `src/renderer/preload.d.ts` (or `src/types/global.d.ts`) with:  
   ```ts
   interface Window {
     core: {
       ipc: { invoke(extId: string, channel: string, payload?: unknown): Promise<import('@nuxy/core').IpcResult> }
       window: {
         resize(w: number, h: number): void
         hide(): void
         esc(): void
         center(): void
         dragStart(): void
         dragMove(): void
         dragEnd(): void
         onShow(cb: () => void): () => void
       }
     }
   }
   ```  
2. Remove all `(window as any).core` casts from `App.tsx`.  
3. Include the declaration in `tsconfig.json` for the renderer.

**Risk Level:** Low  
**Applied Automatically?** No

---

## Finding 7: Scanner Owns Too Many Lifecycle Concerns

**Problem:**  
`src/electron/extensions/scanner.ts` (119 lines) is responsible for:  
- Clearing and rebuilding the registry (line 46, `clearRegistry()`).  
- Dev-mode file sync (lines 48–53, calls `copyDefaultExtensions`).  
- Production seeding of bundled extensions (line 56, `seedBundledExtensions()`).  
- Manifest parsing and `LoadedExtension` construction (lines 80–96).  
- Spawning workers (line 102, `spawnExtension`).  
- Registering extensions into the registry (line 108, `registerExtension`).  
- Starting a filesystem watcher (line 118, `startExtensionWatcher`).  
- The watcher itself (lines 29–42, `rescanExtensions` + `startExtensionWatcher`).  

Additionally, `scanner.ts` re-exports `loadedExtensions` from `registry.ts` (line 14) — callers importing from `scanner.ts` get a view into the registry without touching the registry module, creating an unclear ownership boundary.

**Impact:**  
`scanExtensions()` cannot be tested without mocking workers, the file system, and the registry simultaneously. The watcher and rescan logic are entangled with the initial scan, making hot-reload behavior hard to reason about. The re-export of `loadedExtensions` means consumers cannot tell whether scanner or registry is the authoritative source.

**Proposed Fix:**  
1. Extract `src/electron/extensions/loader.ts` — takes a directory path, returns `LoadedExtension[]` without side effects (no worker spawn, no registry write). Testable in isolation.  
2. Extract `src/electron/extensions/watcher.ts` — owns the `fs.watch` loop and calls `rescanExtensions` on change.  
3. `scanner.ts` becomes an orchestrator: calls loader, registers results, spawns workers, then starts the watcher.  
4. Remove the re-export of `loadedExtensions` from `scanner.ts`; callers should import from `registry.ts` directly.

**Risk Level:** Medium  
**Applied Automatically?** No

---

## Finding 8: `config.ts` Is a No-Op Re-export Shim

**Problem:**  
`src/electron/config/config.ts` (10 lines) only re-exports everything from `paths.ts`. It adds no logic, no transformation, and no new public surface. Some callers (e.g. `scanner.ts`) import from `paths.ts` directly, others could import from `config.ts`, creating inconsistency in import paths.

**Impact:**  
Developers trying to find where `EXTENSION_DIR` is defined must trace through an extra indirection file. It creates a false impression that `config.ts` is the canonical import point for config-related constants, which it is not (that role is occupied by `nuxyconfig.ts`).

**Proposed Fix:**  
Delete `src/electron/config/config.ts`. Update any consumers to import directly from `paths.ts` or `nuxyconfig.ts` as appropriate. This is a pure cleanup with no behavioral change.

**Risk Level:** Low  
**Applied Automatically?** No

---

## Finding 9: `CoreContext.registry` Uses `unknown` Parameter Types

**Problem:**  
`packages/core/src/index.ts` defines `CoreContext.registry` (lines 26–29) with:  
```ts
registry: {
  registerTool: (config: unknown) => void
  registerProvider: (config: unknown) => void
  registerOrchestrator: (handler: unknown) => void
}
```  
`packages/extension-host/src/core-proxy.ts` implements these methods (lines 57–78) by extracting `name` from the config with explicit `typeof` narrowing at runtime — a pattern needed only because the type is `unknown`.

**Impact:**  
Extension authors calling `core.registry.registerTool({ name: 'foo' })` get no type error if they omit `name` or pass a non-object. The `core-proxy.ts` runtime narrowing (`cfg && typeof cfg === 'object' && 'name' in cfg`) is defensive code compensating for a missing type contract. Any meaningful tool/provider schema that the kernel might one day enforce is invisible to the type system.

**Proposed Fix:**  
1. Define a minimal `ToolConfig`, `ProviderConfig`, and `OrchestratorConfig` interface in `packages/core/src/types.ts`.  
2. Replace `unknown` in `CoreContext.registry` with those interfaces.  
3. Remove the runtime `'name' in cfg` guards from `core-proxy.ts` — they become unnecessary once the type carries the guarantee.

**Risk Level:** Low  
**Applied Automatically?** No

---

## Finding 10: `msgId` Generation Is Cryptographically Weak and Duplicated

**Problem:**  
`src/electron/ipc/worker-invoke.ts` (line 19) and `packages/extension-host/src/index.ts` (line 53) both use `Math.random().toString(36).slice(2)` to generate message correlation IDs. This pattern is duplicated in two independent places, and `Math.random()` is not a cryptographically secure source.

**Impact:**  
Under high concurrency (many simultaneous ext:invoke calls), the ~9-character base-36 ID (~46 bits) has a meaningful birthday-collision probability. A collision would cause one pending promise to resolve with another invocation's result, producing silent data corruption. The duplication means any fix must be applied in two places.

**Proposed Fix:**  
1. Add a `generateMessageId()` utility to `packages/core/src/index.ts` using `crypto.randomUUID()` (available in Node 14.17+ and in modern browsers).  
2. Import and use it in both `worker-invoke.ts` and `extension-host/src/index.ts`.

**Risk Level:** Medium  
**Applied Automatically?** No

---

## Finding 11: Protocol Handler Performs Runtime TypeScript Transpilation

**Problem:**  
`src/electron/protocol/register.ts` (lines 33–63) dynamically imports `typescript` at request time, then calls `ts.transpileModule()` to convert JSX/TSX frontend files to JavaScript before serving them to the renderer. This happens on every page load for every `.jsx`/`.tsx` extension frontend.

**Impact:**  
- Correctness: regex-based JSX detection (`/<[a-zA-Z]+/.test(code)` on line 34) is unreliable — it will trigger on files that contain HTML-like strings inside comments or template literals, even pure JavaScript files.  
- Performance: on-demand transpilation adds latency to every extension-frontend load. There is no caching layer; each protocol request re-transpiles the same file.  
- Complexity: the protocol handler is doing build-tool work that belongs in the build pipeline.  
- Dependency: production bundles now need `typescript` as a runtime dependency.

**Proposed Fix:**  
1. Require extension frontends to be pre-transpiled (plain `.js`) before being placed in `~/.nuxy/extensions/`. This is already the convention for bundled extensions (all have `frontend.js`, not `frontend.tsx`).  
2. Remove the `typescript` import and transpilation branch from `protocol/register.ts`.  
3. For dev-mode live editing, add a separate dev-only transpile step in `dev/extensions.ts` during the sync phase, not at request time.  
4. If runtime JSX support is a hard requirement for extension authors, document it as an intentional escape hatch, add a transpile cache keyed by `(file, mtime)`, and remove the regex heuristic in favor of explicit file-extension checks only.

**Risk Level:** High  
**Applied Automatically?** No

---

## Finding 12: `migrate-data.ts` Logger Uses Wrong Namespace

**Problem:**  
`src/electron/spawn/migrate-data.ts` line 6 creates a logger with `kernelLogger.child('Spawn')`, the same namespace used by `spawn.ts` line 13. Two separate files write to the same log channel, making it impossible to distinguish migration log entries from worker spawn log entries without reading the message text.

**Impact:**  
Minor operational observability issue — log filtering by channel (`Spawn`) will conflate two distinct concerns.

**Proposed Fix:**  
Change `migrate-data.ts` line 6 to `kernelLogger.child('MigrateData')`.

**Risk Level:** Low  
**Applied Automatically?** No

---

## Finding 13: Extension Scan Registers Before Worker Is Ready

**Problem:**  
`src/electron/extensions/scanner.ts` calls `spawnExtension()` (line 102) and then `registerExtension()` (line 108). At the point of registration, the worker has been spawned but has not yet sent its `registry:sync` message. Callers using `getExtensionById()` immediately after `scanExtensions()` returns will get a `LoadedExtension` with `runtime === undefined` — the `ipcChannels` set will be empty.

`src/electron/ipc/validate.ts` line 78 uses `isChannelAllowed()` which returns `false` until the `registry:sync` arrives and `mergeRuntimeSync` is called (via `spawn.ts` line 44). This means that for a brief window after startup, all channel validations on freshly-spawned workers will fail.

**Impact:**  
The race is currently benign because the renderer is created after `scanExtensions()` returns and users cannot invoke extensions before the UI loads. However, if extensions are ever hot-reloaded or if `rescanExtensions()` is called while the window is visible, IPC calls made immediately after the rescan may be incorrectly rejected.

**Proposed Fix:**  
1. In `spawnExtension()`, return a `Promise<Worker>` that resolves when the first `registry:sync` message has been received.  
2. `scanExtensions()` awaits all these promises before calling `registerExtension()`.  
3. This guarantees `runtime.ipcChannels` is populated before any consumer can reach the extension via the registry.

**Risk Level:** Medium  
**Applied Automatically?** No

---

## Finding 14: `loadExtensionModule` Silently Swallows Load Failures

**Problem:**  
`packages/extension-host/src/load-extension.ts` (lines 50–55) catches all errors from `import()` and `ext.register(core)`, logs them, and returns without re-throwing. The `extension-host/src/index.ts` (lines 67–73) proceeds to call `parentPort.postMessage({ type: 'registry:sync', ...getSyncPayload() })` even after a failed load. The main process registers the extension as successfully loaded.

**Impact:**  
A broken extension (syntax error, missing dependency, runtime crash in `register()`) is silently marked as loaded. The worker process continues to run and accept messages but has no handlers registered, so every IPC invocation will time out after 15 seconds (`worker-invoke.ts` line 6). The 15-second timeout is the only signal that something went wrong, and it surfaces as a user-visible latency rather than an actionable error.

**Proposed Fix:**  
1. `loadExtensionModule` should return a `boolean` (or throw) indicating success.  
2. `index.ts` should post a `registry:sync` with a `loadError` field if loading failed.  
3. `spawn.ts` should handle `loadError` in the `registry:sync` message by logging and optionally removing the extension from the registry.

**Risk Level:** Medium  
**Applied Automatically?** No

---

## Dependency Graph Summary

```
@nuxy/core
  └── no upstream deps (correct)

@nuxy/extension-sdk
  └── @nuxy/core (types only — correct)

@nuxy/extension-host
  └── @nuxy/core (HostChannel, CoreContext, NowPlaying — correct)

src/electron/*
  ├── @nuxy/core (throughout — correct)
  └── No imports from @nuxy/extension-host or @nuxy/extension-sdk directly;
      the host is loaded as a compiled worker script — correct isolation

src/renderer/*
  ├── @nuxy/core (types only — correct)
  └── @nuxy/ui (components — correct)
      PROBLEM: window.core bridge is untyped (Finding 6)

nuxyconfig.ts → themes/install.ts → paths.ts  (correct direction)
nuxyconfig.ts → window/runtime.ts             (CIRCULAR — worked around with dynamic import, Finding 3)
spawn/host-handlers.ts → ipc/broker.ts        (correct — host calls broker for broker:invoke)
ipc/broker.ts → extensions/registry.ts        (correct)
ipc/validate.ts → extensions/registry.ts      (correct but duplicates broker's checks — Finding 1)
```

No true circular module dependencies exist at the static import level. The one logical circular concern (config → window → config) is already broken with a dynamic import but should be resolved architecturally (Finding 3).

---

## Priority Order

| # | Finding | Risk | Effort |
|---|---------|------|--------|
| 11 | Runtime TypeScript transpilation in protocol handler | High | Medium |
| 14 | Silent extension load failure masks errors as timeouts | Medium | Low |
| 13 | Registration race: extension registered before worker is ready | Medium | Medium |
| 5 | Untyped worker message protocol | Medium | Low |
| 10 | Weak msgId generation duplicated in two files | Medium | Low |
| 2 | `register.ts` god-handler (three responsibilities) | Medium | Medium |
| 1 | Duplicate validation logic across validate.ts and broker.ts | Medium | Medium |
| 3 | `nuxyconfig.ts` god-module with circular-import workaround | Medium | High |
| 7 | Scanner owns too many lifecycle concerns | Medium | Medium |
| 6 | Renderer bypasses type safety for preload bridge | Low | Low |
| 9 | `CoreContext.registry` uses `unknown` parameter types | Low | Low |
| 4 | `NowPlaying` re-exported through extra indirection | Low | Low |
| 12 | `migrate-data.ts` logger uses wrong namespace | Low | Low |
| 8 | `config.ts` is a no-op re-export shim | Low | Low |

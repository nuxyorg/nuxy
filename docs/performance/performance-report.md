# Nuxy Performance Report

**Generated:** 2026-05-19
**Scope:** Startup path, renderer lifecycle, extension worker architecture, media detection, window animation

---

## Summary

The codebase is generally well-structured for an Electron launcher, but has several performance issues concentrated in three areas: (1) the startup sequence gates window creation behind a fully synchronous extension scan, (2) the renderer fires four independent `useEffect` IPC calls on mount without batching, and (3) the `WindowSpringController` runs a `setInterval` at 4 ms (250 Hz) during any resize animation—a rate that crosses over the main process on every tick via `win.setContentSize`.

---

## Issues

---

### 1. Extension scan blocks window creation

- **Problem**: `src/electron/bootstrap/main.ts:68` — `await scanExtensions()` is called on line 68 and `createMainWindow()` only executes on line 71 after the scan resolves. The scan performs synchronous `fs.readdirSync`, `fs.statSync`, `fs.existsSync`, and `fs.readFileSync` calls (one per extension manifest) inside a sequential `for` loop in `src/electron/extensions/scanner.ts:63-112`, then synchronously spawns a `Worker` per extension before returning. The entire startup sequence — including the window becoming visible — is blocked until all workers are started.
- **Impact**: On a machine with a slow home directory (e.g., network filesystem, HDD, or cold cache) or many extensions, startup latency is entirely determined by the number of extensions and the disk seek time for each manifest. The window does not appear until scan completes. Perceived cold-start time is measurably degraded.
- **Proposed Fix**: Decouple window creation from scanning. Call `createMainWindow()` immediately after IPC registration, then kick off `scanExtensions()` concurrently. The renderer already handles the "no extensions yet" empty state gracefully. Alternatively, keep the scan synchronous but parallelize the manifest reads with `Promise.all` and only keep `spawnExtension` sequential.
- **Risk Level**: Medium
- **Applied Automatically?**: No

---

### 2. Four independent `useEffect` IPC calls fire on App mount

- **Problem**: `src/renderer/App.tsx:15-69` — four separate `useEffect(..., [])` hooks each fire an independent IPC round-trip on first mount:
  1. `kernel/listTools` (line 15)
  2. `nuxy-ext://com.nuxy.shell/frontend.js` dynamic import (line 26)
  3. `core/window.onShow` listener setup (line 40)
  4. `kernel/getTheme` (line 50)

  Each one causes a separate renderer→main round-trip. Effects 1 and 4 (`listTools` and `getTheme`) are pure data fetches with no dependency on each other and could be issued in a single IPC call. Effect 3 is a listener registration (no IPC cost, but a separate render pass). Effect 2 triggers a protocol fetch which waits on the extension-host worker being alive.

- **Impact**: The renderer makes at minimum 3 sequential render passes (mount → effect cleanup → individual state updates) and 2–3 IPC round-trips before it can show the shell. `getTheme` applies CSS variables _after_ first paint, causing a flash of un-themed content if the initial render is fast.
- **Proposed Fix**: (a) Combine `listTools` and `getTheme` into a single `kernel/bootstrap` IPC channel that returns both in one reply, eliminating one round-trip. (b) Move theme application to the preload script so CSS variables are set before React hydration. (c) The `onShow` listener registration (effect 3) does not need to be in a separate effect — it can share a cleanup function with effect 2 or be moved to a dedicated hook so the intent is clearer.
- **Risk Level**: Medium
- **Applied Automatically?**: No

---

### 3. `WindowSpringController` fires `setInterval` at 4 ms (250 Hz) in the main process

- **Problem**: `src/electron/window/spring.ts:17,107` — `intervalMs` defaults to `4` (250 frames/sec). On each tick the handler calls `this.win.setContentSize(...)` (line 155), which is a synchronous cross-process Electron call that goes to the OS compositor. With `stiffness: 0.14` and `damping: 0.3` an animation can take 30–80 ticks to settle. The timer is started from the main process IPC handler for `window:resize` (`src/electron/ipc/register.ts:96`) which is itself called from the renderer on every resize event emitted by the shell extension.
- **Impact**: 250 `setContentSize` calls per second saturates the OS window server connection during a resize animation. On Linux (X11/Wayland) this causes visible jank if any other main-process work (IPC, media query, config reload) runs concurrently, because Node.js's event loop must service both. The interval is never paused during window drag (`pause()` is called on `dragStart` — correct) but it _is_ active any time the shell extension resizes the window, even for small increments.
- **Proposed Fix**: Increase `intervalMs` to `16` (60 Hz) which matches display refresh rate for most monitors without any perceptible difference in spring feel. For hi-DPI / 120 Hz displays `intervalMs: 8` is still half the current rate. Additionally, add a minimum delta threshold: skip `setContentSize` on ticks where both `|vw| < 1` and `|vh| < 1` to avoid IPC noise near the rest position.
- **Risk Level**: Low
- **Applied Automatically?**: No

---

### 4. Synchronous `fs.readFileSync` / `fs.writeFileSync` in hot IPC paths

- **Problem**: `src/electron/spawn/host-handlers.ts:58-72` — `HostChannel.STORAGE_READ` performs `fs.existsSync` + `fs.readFileSync` synchronously (line 58-62) and `STORAGE_WRITE` calls `fs.existsSync` + `fs.mkdirSync` + `fs.writeFileSync` synchronously (lines 67-71). These are called on every storage IPC request from any worker, and they run on the main process event loop thread.
- **Impact**: Any extension that performs frequent storage reads/writes (e.g., a calculator history, clipboard history) will block the main process event loop, adding latency to all other IPC channels including window resize, drag, and ESC actions.
- **Proposed Fix**: Replace with async `fs.promises.*` equivalents (`readFile`, `writeFile`, `mkdir`, `access`). The callers already `await handleHostCall(...)` so the change is drop-in.
- **Risk Level**: Low
- **Applied Automatically?**: No

---

### 5. Per-IPC-call `worker.on('message', listener)` accumulates listeners

- **Problem**: `src/electron/ipc/worker-invoke.ts:53` — each call to `invokeWorker` attaches a new `'message'` event listener to the worker via `worker.on('message', listener)`. The listener is correctly cleaned up via `worker.off('message', listener)` inside `finish()`. However, `finish()` is _also_ called from the `setTimeout` timer after 15 seconds. If a burst of IPC calls is made before any of them resolve, each in-flight call adds a listener; Node.js emits an `MaxListenersExceededWarning` at 10 listeners by default. While the listeners do eventually clean up, the warning indicates a risk window.
- **Impact**: In a burst scenario (e.g., shell extension issues several parallel `ext:invoke` calls), the warning can appear in logs and signals that the pattern does not scale well beyond ~10 concurrent in-flight calls to the same worker. It does not cause a memory leak because each listener cleans itself up.
- **Proposed Fix**: Use a single persistent `'message'` listener per worker (a dispatch table keyed by `msgId`), which is already the pattern used _inside_ the worker itself (`pendingHostCalls` Map in `packages/extension-host/src/index.ts:15`). Apply the same pattern in `invokeWorker`: register one `worker.on('message', dispatcher)` at spawn time and route by `msg.id` in the dispatcher, storing `{resolve, reject, timer}` in a `Map<string, …>`.
- **Risk Level**: Low
- **Applied Automatically?**: No

---

### 6. `migrateLegacyData` performs synchronous filesystem scan on every worker spawn

- **Problem**: `src/electron/spawn/migrate-data.ts:12` — `migrateLegacyData(extId, folderName)` is called synchronously inside `spawnExtension` at line 28 of `spawn.ts`. It calls `fs.existsSync` + `fs.readdirSync` (line 14-15) and up to 3 more `fs.existsSync` checks (lines 22-24). This runs once per extension on every app start, even after migration has already happened.
- **Impact**: For N extensions, this adds 2–5 synchronous filesystem calls per extension to the startup path, blocking the scan loop. On a cold filesystem this is measurable.
- **Proposed Fix**: After a successful migration, write a sentinel file (e.g., `.migrated`) to the target dir so the early return on line 14 fires immediately. On subsequent starts the check is a single `existsSync` call and the `readdirSync` is never reached.
- **Risk Level**: Low
- **Applied Automatically?**: No

---

### 7. `loadConfig` triggers `ensureUserThemes` synchronously on first call

- **Problem**: `src/electron/config/nuxyconfig.ts:127` — `loadConfig()` calls `ensureUserThemes()` which in `src/electron/themes/install.ts:25-41` calls `fs.existsSync`, `fs.mkdirSync`, and potentially `fs.readFileSync` + `fs.writeFileSync` for each of the two bundled theme files. `loadConfig()` is called at window creation time (indirectly via `getConfig()` in `manager.ts`).
- **Impact**: Two additional synchronous file reads/writes on every startup where themes need to be seeded or upgraded. Minor on SSD, noticeable on spinning disk or network filesystem.
- **Proposed Fix**: Defer `ensureUserThemes()` to run asynchronously after the window is created, or run it once during `app.whenReady()` before `scanExtensions()` so it does not overlap with the scan loop.
- **Risk Level**: Low
- **Applied Automatically?**: No

---

### 8. `getTheme` IPC handler dynamically imports `electron` on every `system` theme request

- **Problem**: `src/electron/ipc/register.ts:66` — when `cfg.theme === 'system'`, the handler executes `await import('electron')` to access `nativeTheme`. Dynamic `import()` of a native module on every IPC call is harmless at Node's module cache level after the first call, but the `await` adds an unnecessary microtask tick to every theme query when the cache hit could be a synchronous read.
- **Impact**: Minimal — one additional microtask per `getTheme` call when theme is `system`. More importantly, this makes the code harder to reason about and sets a precedent for dynamic imports in hot paths.
- **Proposed Fix**: Import `nativeTheme` statically at the top of `register.ts` alongside the other Electron imports.
- **Risk Level**: Low
- **Applied Automatically?**: No

---

### 9. `whole @nuxy/ui` package imported eagerly in renderer entry point

- **Problem**: `src/renderer/main.tsx:4` — `import * as UI from '@nuxy/ui'` imports the entire UI package namespace and assigns it to `window.UI`. This forces all UI component code to be included in the initial renderer bundle regardless of which components are actually used by the loaded shell extension.
- **Impact**: Every component, CSS, and utility in `@nuxy/ui` is parsed and executed at startup. As the UI package grows this directly increases Time to Interactive. The assignment `(window as any).UI = UI` suggests this is done so dynamically-loaded extension frontends can access UI components without bundling them — a valid pattern, but the eagerness is not necessary if the shell extension's dynamic import happens after the UI bundle has already been parsed.
- **Proposed Fix**: This pattern (exposing UI on `window`) is intentional for extension sandboxing. To reduce the startup cost, ensure the UI package uses tree-shakeable named exports and that Vite/Rollup can dead-code-eliminate unused components. Auditing the package's `index.tsx` for re-exported barrel patterns that defeat tree-shaking would reduce the bundle size.
- **Risk Level**: Low
- **Applied Automatically?**: No

---

### 10. `fs.watch` on extension directory uses `{ recursive: true }` — not supported on all Linux kernels

- **Problem**: `src/electron/extensions/scanner.ts:34` — the dev-mode file watcher uses `fs.watch(EXTENSION_DIR, { recursive: true }, ...)`. On Linux, `recursive: true` is silently ignored for `fs.watch` (only supported on macOS and Windows). The watcher may miss subdirectory changes on Linux in dev mode, triggering unexpected "did not rescan" behavior that could lead a developer to force-kill and restart, which is itself a startup cost.
- **Impact**: Functional correctness issue in dev mode on Linux; not a runtime performance issue. The 500 ms debounce (`scanner.ts:38`) is correct but is moot if the watcher does not fire.
- **Proposed Fix**: Use `chokidar` or Node's `fs.watch` with a manual recursive wrapper (watch each subdirectory individually) for Linux compatibility in dev mode.
- **Risk Level**: Low (dev-only)
- **Applied Automatically?**: No

---

### 11. Media detection: no polling — on-demand only

- **Problem / Finding**: `src/electron/media/index.ts` — `getNowPlaying()` is a pure async function that makes a D-Bus call only when invoked. There is **no background interval or polling loop** in the media subsystem. The Linux MPRIS backend (`src/electron/media/platforms/linux/mpris.ts`) lazily initializes the D-Bus session bus on first call (lines 18-32) and then reuses the same `sessionBus` singleton for subsequent queries. This is the correct design for an on-demand media provider.
- **Impact**: No polling overhead. The first call to `getNowPlaying()` pays a D-Bus connection cost; subsequent calls are fast. If an extension calls this in a tight loop it would generate repeated D-Bus round-trips, but that is the extension's responsibility.
- **Proposed Fix**: No fix needed. Consider documenting the on-demand model in the `CoreContext` type definition so extension authors know not to poll it in a high-frequency loop.
- **Risk Level**: None identified
- **Applied Automatically?**: N/A

---

### 12. `WindowSpringController` — memory leak if `destroy()` is never called externally

- **Problem**: `src/electron/window/spring.ts:162-178` — `getOrCreateSpring` registers a `win.once('closed', ...)` listener that calls `ctrl.destroy()`. This is correct. However, if `setTarget()` is called after `win.isDestroyed()` returns `true` but before the `'closed'` event fires (a narrow race in Electron's destroy sequence), `_start()` can initialize a new `setInterval` timer (`spring.ts:107`) that then calls `_tick()`, which calls `_applyFrame()`, which checks `win.isDestroyed()` and returns early — but the interval itself is never cleared because `_stop()` is not called from `_applyFrame`'s early return.
- **Impact**: A leaked `setInterval` running at 250 Hz if the race is hit. The timer runs indefinitely until the process exits. In practice this race is very narrow and requires a resize event to arrive during window teardown, so it is unlikely in normal use.
- **Proposed Fix**: In `_applyFrame`, when `win.isDestroyed()` is true, call `this._stop()` before returning:
  ```ts
  private _applyFrame(): void {
    if (this.win.isDestroyed()) {
      this._stop()  // add this line
      return
    }
    ...
  }
  ```
- **Risk Level**: Low
- **Applied Automatically?**: No

---

## Priority Order

| Priority | Item                                          | File                                    | Risk           |
| -------- | --------------------------------------------- | --------------------------------------- | -------------- |
| 1        | Extension scan blocks window creation         | `bootstrap/main.ts:68`, `scanner.ts:63` | Medium         |
| 2        | 250 Hz spring interval in main process        | `spring.ts:17`                          | Low            |
| 3        | Four uncoordinated useEffect IPC calls        | `App.tsx:15-69`                         | Medium         |
| 4        | Synchronous fs in hot IPC handler             | `host-handlers.ts:58-72`                | Low            |
| 5        | Per-call worker message listener accumulation | `worker-invoke.ts:53`                   | Low            |
| 6        | Spring interval leak on destroyed window      | `spring.ts:152`                         | Low            |
| 7        | migrateLegacyData on every spawn              | `migrate-data.ts:12`                    | Low            |
| 8        | Dynamic electron import in IPC handler        | `register.ts:66`                        | Low            |
| 9        | ensureUserThemes in startup critical path     | `nuxyconfig.ts:127`                     | Low            |
| 10       | Full @nuxy/ui barrel import at renderer entry | `main.tsx:4`                            | Low            |
| 11       | fs.watch recursive on Linux (dev mode)        | `scanner.ts:34`                         | Low (dev only) |

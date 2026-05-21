# Dead Code Report — nuxy

Generated: 2026-05-19

---

## 1. Stale Backup File

- **Problem**: `/home/xava/Documents/nuxy/src/electron/dev/extensions.ts.bak` — binary/text backup of the active `extensions.ts` left on disk.
- **Impact**: Causes confusion about which file is canonical; may be accidentally included in builds or linting passes.
- **Proposed Fix**: Delete the file (it is a verbatim duplicate of the live `.ts`).
- **Risk Level**: Low
- **Applied Automatically?**: Yes — file deleted.

---

## 2. `config/config.ts` — No-Op Re-Export Shim

- **Problem**: `/home/xava/Documents/nuxy/src/electron/config/config.ts` (line 1–9) is a pure re-export of every symbol from `./paths.js`. Nothing in the codebase imports from `config/config`; all consumers import directly from `config/paths` or the package-level `@nuxy/core` barrel.
- **Impact**: Dead module that adds an indirection layer with zero value; the name `config.ts` suggests it holds configuration logic, creating misleading navigation for future maintainers.
- **Proposed Fix**: Delete `config.ts`. Verify with `grep -r "from.*config/config"` returning zero hits before removal.
- **Risk Level**: Low
- **Applied Automatically?**: No

---

## 3. Duplicate `Math.random().toString(36)` ID Generator

- **Problem**: Two files independently implement the same ad-hoc ID generator:
  - `/home/xava/Documents/nuxy/src/electron/ipc/worker-invoke.ts:19` — `Math.random().toString(36).slice(2)`
  - `/home/xava/Documents/nuxy/packages/extension-host/src/index.ts:53` — same expression
- **Impact**: Both sites are in security-sensitive IPC message-correlation paths. `Math.random()` is not cryptographically secure, so IDs could collide or be predicted. Duplication means a future fix must be applied in two places. Node.js `crypto.randomUUID()` is available in both contexts.
- **Proposed Fix**: Extract a shared `generateMsgId()` utility (e.g. `() => crypto.randomUUID()`) in `@nuxy/core` or a small internal module, and replace both call sites.
- **Risk Level**: Medium (correctness/security concern rather than pure maintenance)
- **Applied Automatically?**: No

---

## 4. Unimplemented `ipc.broadcast` in `CoreContext`

- **Problem**: `/home/xava/Documents/nuxy/packages/core/src/index.ts:23` declares `broadcast: <T>(channel: string, payload: T) => void` on the `ipc` object of `CoreContext`. The implementation in `/home/xava/Documents/nuxy/packages/extension-host/src/core-proxy.ts:47–54` is a no-op that logs a warning. The method is marked `/** Planned — not implemented in the worker yet. */` in the type definition. No extension or test ever calls it.
- **Impact**: Presents a callable API to extension authors that silently does nothing, potentially causing hard-to-debug issues. Adds dead surface to the public SDK interface.
- **Proposed Fix**: Either implement the feature or remove the declaration from `CoreContext` and `core-proxy.ts` until it is ready. A build-time `throw new Error("not implemented")` is safer than a silent no-op.
- **Risk Level**: Medium
- **Applied Automatically?**: No

---

## 5. Unimplemented `registry.*` Methods in `CoreContext`

- **Problem**: `/home/xava/Documents/nuxy/packages/core/src/index.ts:26–28` — `registerTool`, `registerProvider`, `registerOrchestrator` are defined on `CoreContext.registry`. The proxy implementation in `core-proxy.ts` logs the registration but never persists or surfaces the data anywhere (the only side-effect is setting a local `displayName` string for the sync payload). No code in `src/` consumes any registered tool/provider/orchestrator.
- **Impact**: Extension authors calling `core.registry.registerTool(...)` receive no error but the registration is silently discarded. This is misleading API surface; it suggests a plugin system that does not yet exist at runtime.
- **Proposed Fix**: Mark the methods clearly as stubs in JSDoc, or remove them from the public `CoreContext` interface until the dispatch layer exists.
- **Risk Level**: Medium
- **Applied Automatically?**: No

---

## 6. macOS and Windows Media Platform Stubs

- **Problem**: `/home/xava/Documents/nuxy/src/electron/media/platforms/darwin/index.ts` and `/home/xava/Documents/nuxy/src/electron/media/platforms/win32/index.ts` each contain a `getNowPlaying()` that unconditionally returns `null` after logging a "not implemented yet" message. Both are imported and dispatched through the live `createPlatformMediaProvider()` switch.
- **Impact**: Low maintenance burden on their own, but they constitute dead runtime paths (always `null`) for any user not on Linux. The `warned` singleton flag pattern also leaks across hot-reloads in dev mode.
- **Proposed Fix**: These stubs are intentional placeholders and should be kept, but they should have `// TODO` markers or an issue reference to track the planned implementation (macOS MediaPlayer framework, Windows SMTC/WinRT).
- **Risk Level**: Low
- **Applied Automatically?**: No

---

## 7. `LEGACY_DATA_DIR` and `migrateLegacyData` — Migration of Unknown Age

- **Problem**: `/home/xava/Documents/nuxy/src/electron/config/paths.ts:14` defines `LEGACY_DATA_DIR = ~/.config/nuxy/data`. `/home/xava/Documents/nuxy/src/electron/spawn/migrate-data.ts` copies data from this path on every extension spawn if the new location is empty. There is no record of when this migration was introduced or whether any users still have data in the legacy location.
- **Impact**: If the legacy path no longer exists in any active installation, the migration code runs on every spawn (stat calls) for no benefit. The `folderName` parameter is a second fallback that suggests the schema changed at least twice.
- **Proposed Fix**: Add a version gate (e.g. a sentinel file in `DATA_DIR`) so the migration runs at most once per installation. If the project has not had a release that wrote data to `~/.config/nuxy/data`, consider removing the migration entirely.
- **Risk Level**: Medium (risk of data loss if removed prematurely; risk of ongoing unnecessary I/O if kept)
- **Applied Automatically?**: No

---

## Summary

| #   | Location                                                    | Kind                                      | Risk   | Auto-Fixed |
| --- | ----------------------------------------------------------- | ----------------------------------------- | ------ | ---------- |
| 1   | `src/electron/dev/extensions.ts.bak`                        | Stale backup file                         | Low    | Yes        |
| 2   | `src/electron/config/config.ts`                             | Dead re-export shim                       | Low    | No         |
| 3   | `ipc/worker-invoke.ts:19`, `extension-host/src/index.ts:53` | Duplicate insecure ID generator           | Medium | No         |
| 4   | `CoreContext.ipc.broadcast`                                 | Unimplemented no-op API                   | Medium | No         |
| 5   | `CoreContext.registry.*`                                    | Stub registry methods, silently discarded | Medium | No         |
| 6   | `media/platforms/darwin`, `media/platforms/win32`           | Unimplemented platform stubs              | Low    | No         |
| 7   | `spawn/migrate-data.ts`, `paths.ts:LEGACY_DATA_DIR`         | Unbounded legacy migration                | Medium | No         |

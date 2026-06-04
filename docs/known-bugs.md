# Nuxy — Known Bugs Tracker

> **Last updated:** 2026-06-04  
> **Sources:** [pain-points-plan.md](./pain-points-plan.md) · [open-issues.md](./open-issues.md) · source audit 2026-05-19

---

## Open Bugs

| ID     | Description                                | Severity | Status      | File / Location                | Notes                                                                                                                                                                                                                                                                                                                                   |
| ------ | ------------------------------------------ | -------- | ----------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BUG-04 | Worker sandbox weaker than documented      | Medium   | **Partial** | `packages/extension-host/src/` | Docs claim `vm` / `isolated-vm`; runtime uses `worker_threads`. Static Node built-in imports are now blocked by esbuild `platform: 'browser'` bundling (`src/electron/extensions/bundle-backend.ts`) + scanner `detectNodeImports` gate. Dynamic `import(variable)` still possible. Full isolation deferred to `isolated-vm` (P7 Long). |
| BUG-09 | `docs/restructure-plan.md` Phase 1 pending | Low      | **Open**    | `docs/restructure-plan.md`     | `src/` → `apps/desktop/` migration not started; Phases 2–3 (kernel folders, `@nuxy/extension-host`) are done.                                                                                                                                                                                                                           |

---

## Fixed Bugs (Historical Record)

| ID     | Description                                                   | Severity | Fixed In | File                                                                       | Resolution                                                                                                                                                                               |
| ------ | ------------------------------------------------------------- | -------- | -------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FIX-01 | `window-show` typo — renderer missed the show event           | Critical | 2026-05  | `src/electron/window/manager.ts:78`                                        | `'window-show'` renamed to `'window:show'`                                                                                                                                               |
| FIX-02 | Extension load errors silently swallowed                      | High     | 2026-05  | `src/electron/spawn/spawn.ts`                                              | On `registry:error`, `activeWorkers.delete(extId)` now called immediately — broken extension no longer causes a 15-second IPC timeout                                                    |
| FIX-03 | `CoreContext.registry` registrations ignored in kernel        | High     | 2026-05  | `packages/extension-host/src/core-proxy.ts`                                | `registerTool/registerProvider/registerOrchestrator` now stored in `registeredEntries[]` and sent in `registry:sync` payload                                                             |
| FIX-04 | Synchronous `fs` calls in hot IPC path                        | High     | 2026-05  | `src/electron/config/nuxyconfig.ts`                                        | File watcher callback now uses `reloadConfigAsync()` (`fs/promises`); startup path keeps `readFileSync` as a one-off                                                                     |
| FIX-05 | Worker message listener accumulation                          | Medium   | 2026-05  | `src/electron/spawn/spawn.ts`                                              | `worker.setMaxListeners(100)` added at worker creation                                                                                                                                   |
| FIX-06 | `docs/architecture.md` referenced non-existent file path      | Low      | 2026-05  | `docs/14-rebuild-roadmap.md:21`                                            | `electron/core/ipc.ts` updated to `src/electron/ipc/register.ts`                                                                                                                         |
| FIX-07 | Clipboard accessible to all workers regardless of permissions | High     | 2026-05  | `src/electron/config/permissions.ts`                                       | `assertHostPermission` now gates `clipboard:*` host channels against manifest `permissions`                                                                                              |
| FIX-08 | Manifest `capabilities.caller/callable` never enforced        | High     | 2026-05  | `src/electron/ipc/broker.ts`                                               | `broker.ts` created — checks both capabilities before forwarding cross-extension calls                                                                                                   |
| FIX-09 | IPC channels not allowlisted per extension                    | Medium   | 2026-05  | `src/electron/extensions/registry.ts`                                      | `isChannelAllowed(extId, channel)` implemented; `setExtensionChannels` populated on `registry:sync`                                                                                      |
| FIX-10 | No empty-state UX when no extensions loaded                   | Medium   | 2026-05  | `src/renderer/App.tsx`                                                     | `EmptyState` rendered when `extensionCount === 0` and shell extension is absent                                                                                                          |
| FIX-11 | Fat shell — all launcher logic in core `App.tsx` (~540 LOC)   | High     | 2026-05  | `src/renderer/App.tsx`                                                     | Shell extracted to `extensions/shell/`; `App.tsx` reduced to 158 lines that only bootstrap the shell extension                                                                           |
| FIX-12 | `core.registry.*` worker sync not reaching kernel             | High     | 2026-05  | `src/electron/spawn/spawn.ts`, `packages/extension-host/src/core-proxy.ts` | `registry:sync` message wired; `mergeRuntimeSync` updates in-memory registry                                                                                                             |
| FIX-13 | Hardcoded extension filter in `listByType`                    | Low      | 2026-06  | `src/electron/ipc/list-by-type.ts`                                         | `listTools` / `listProviders` now filter by `runtime.registeredEntries` from `registry:sync`, with manifest fallback before sync                                                         |
| FIX-14 | No cross-extension `core.extensions.invoke`                   | High     | 2026-05  | `src/electron/ipc/broker.ts`                                               | `invokeExtension(callerId, targetId, channel, payload)` implemented with full capability + channel checks                                                                                |
| FIX-15 | No E2E test suite                                             | Medium   | 2026-05  | `src/e2e/`                                                                 | Playwright specs cover kernel channels, shell interaction, themes, extension resilience, window interactions, UNIX socket, and more                                                      |
| FIX-16 | Calculator uses `eval()` for math                             | Medium   | 2026-05  | `extensions/calculator/safe-eval.ts`                                       | Replaced with `safeEvalMath` Pratt parser; backend no longer calls `eval()`                                                                                                              |
| FIX-17 | Orchestrator Enter path not wired                             | Medium   | 2026-06  | `extensions/shell/`                                                        | Typing no longer auto-selects first result; `tryOrchestratorRoute` unwraps `ext:invoke` `{ success, data }` wrapper                                                                      |
| FIX-18 | Provider fan-out cancellation missing                         | Medium   | 2026-06  | `extensions/shell/hooks.tsx`                                               | `queryGeneration` invalidates stale responses; 50ms debounce before provider `eval` fan-out                                                                                              |
| FIX-19 | Package manager split (`pnpm` / `bun`)                        | Low      | 2026-06  | `package.json`                                                             | Root scripts use `pnpm` only; `preinstall` enforces `only-allow pnpm`                                                                                                                    |
| FIX-20 | No CI pipeline                                                | Low      | 2026-05  | `.github/workflows/ci.yml`                                                 | CI runs `pnpm test`, `typecheck`, and `build` on push/PR                                                                                                                                 |
| FIX-21 | UNIX socket daemon undocumented                               | Low      | 2026-06  | `docs/19-mvp-roadmap.md`                                                   | Documented MVP toggle path: single-instance lock + optional `$TMPDIR/nuxy.sock` (`toggle` / `show`)                                                                                      |
| FIX-22 | Documentation drift — stale `~/.local/share/nuxy` paths       | Medium   | 2026-05  | `docs/` (multiple files)                                                   | Canonical path updated to `~/.nuxy/` across active docs                                                                                                                                  |
| FIX-23 | Extension hot reload absent in production                     | Low      | 2026-06  | `src/electron/extensions/extension-reload.ts`, `scanner.ts`, `spawn.ts`    | Production `fs.watch` on `EXTENSION_DIR` triggers per-extension worker reload; non-zero worker exit schedules debounced restart                                                          |
| FIX-24 | Extension backend esbuild pre-bundling absent                 | Medium   | 2026-06  | `src/electron/extensions/bundle-backend.ts`, `src/electron/spawn/spawn.ts` | `bundleExtensionBackend` now esbuild-bundles each backend before spawning worker; `platform: 'browser'` + `detectNodeImports` gate blocks static Node built-in imports (P7 Short+Medium) |

---

## Notes on Severity

| Severity | Meaning                                                                     |
| -------- | --------------------------------------------------------------------------- |
| Critical | Data loss risk, app crash, or fundamental failure — must fix before any use |
| High     | Security gap or major feature broken — fix before public release            |
| Medium   | Incorrect behavior or architectural violation — fix before V1               |
| Low      | Polish, tooling, or documentation gap — fix in Phase 4                      |

---

## Filing New Bugs

When adding a new row to the Open Bugs table:

1. Assign the next sequential ID (`BUG-NN`).
2. Link to the exact file and line number where the bug lives.
3. Describe the expected vs actual behavior.
4. When fixed, move the row to the Fixed Bugs table with the resolution date and a one-line description of the fix.

---

## Related Documents

- [pain-points-plan.md](./pain-points-plan.md) — full gap analysis with recommended solutions and phased remediation plan
- [open-issues.md](./open-issues.md) — chronological issue log (partially in Turkish; historical)
- [comprehensive-overview.md](./comprehensive-overview.md) — authoritative project overview including roadmap
- [DOCUMENTATION.md](./DOCUMENTATION.md) — feature implementation status table
- [electron-fix-plan.md](./electron-fix-plan.md) — completed kernel audit (Phases 0–6)

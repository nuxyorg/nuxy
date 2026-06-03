# Nuxy — Known Bugs Tracker

> **Last updated:** 2026-06-03  
> **Sources:** [pain-points-plan.md](./pain-points-plan.md) · [open-issues.md](./open-issues.md) · source audit 2026-05-19

---

## Open Bugs

| ID | Description | Severity | Status | File / Location | Notes |
|---|---|---|---|---|---|
| BUG-01 | Calculator uses `eval()` for math expression evaluation | Medium | **Open** | `extensions/calculator/backend.ts` | User-controlled string passed to `eval`. Replace with `mathjs` or a Pratt parser. Regex guard exists but is insufficient. |
| BUG-02 | Orchestrator Enter path not wired | Medium | **Open** | `extensions/shell/frontend.tsx` | `type: orchestrator` is registered and parsed but pressing Enter with raw text only opens tools — it does not fall through to the orchestrator. See [16-omni-input-system.md](./16-omni-input-system.md). |
| BUG-03 | Provider fan-out cancellation missing | Medium | **Open** | `extensions/shell/frontend.tsx` | Every debounced keystroke fires N parallel IPC calls to all providers with no AbortController. Stale responses may arrive after a newer query supersedes them. |
| BUG-04 | Worker sandbox weaker than documented | Medium | **Open** | `packages/extension-host/src/` | Docs claim `vm` / `isolated-vm`; actual implementation uses `worker_threads` + dynamic `import()`. A malicious backend could import native Node modules if not pre-bundled. Accepted as a known gap — production extensions should be esbuild-bundled. |
| BUG-05 | Extension hot reload absent in production | Low | **Open** | `src/electron/extensions/scanner.ts` | `fs.watch` restarts only work in dev mode. Production build has no mechanism to reload a crashed or updated extension worker without restarting the whole app. |
| BUG-06 | Package manager split (`pnpm` / `bun run start`) | Low | **Open** | `package.json` | Root `package.json` has a `bun run start` script alongside the canonical `pnpm dev`. Causes confusion; standardise on `pnpm`. |
| BUG-07 | No CI pipeline or `electron-builder` packaging | Low | **Open** | repo root | No GitHub Actions workflow exists. `pnpm package` command is declared but not verified in CI. |
| BUG-08 | UNIX socket daemon optional, not documented as MVP | Low | **Open** | `src/electron/bootstrap/main.ts` | `requestSingleInstanceLock` is the current mechanism; `/tmp/nuxy.sock` code exists but the daemon story (global shortcut → socket → show) is not fully documented for end users. |
| BUG-09 | `docs/restructure-plan.md` checklist not updated | Low | **Open** | `docs/restructure-plan.md` | Phase 1 (`src/` → `apps/desktop/`) is still pending; Phase 0 is complete but the checklist item for `dist-electron/` is partially marked. |
| BUG-10 | Hardcoded extension filter in `listByType` | Low | **Open** | `src/electron/ipc/register.ts` line 34 | `com.nuxy.time-calculator` and `com.nuxy.notes` are hardcoded to appear in both `tool` and `provider` lists. This should be driven by manifest data, not by extension ID. |

---

## Fixed Bugs (Historical Record)

| ID | Description | Severity | Fixed In | File | Resolution |
|---|---|---|---|---|---|
| FIX-01 | `window-show` typo — renderer missed the show event | Critical | 2026-05 | `src/electron/window/manager.ts:78` | `'window-show'` renamed to `'window:show'` |
| FIX-02 | Extension load errors silently swallowed | High | 2026-05 | `src/electron/spawn/spawn.ts` | On `registry:error`, `activeWorkers.delete(extId)` now called immediately — broken extension no longer causes a 15-second IPC timeout |
| FIX-03 | `CoreContext.registry` registrations ignored in kernel | High | 2026-05 | `packages/extension-host/src/core-proxy.ts` | `registerTool/registerProvider/registerOrchestrator` now stored in `registeredEntries[]` and sent in `registry:sync` payload |
| FIX-04 | Synchronous `fs` calls in hot IPC path | High | 2026-05 | `src/electron/config/nuxyconfig.ts` | File watcher callback now uses `reloadConfigAsync()` (`fs/promises`); startup path keeps `readFileSync` as a one-off |
| FIX-05 | Worker message listener accumulation | Medium | 2026-05 | `src/electron/spawn/spawn.ts` | `worker.setMaxListeners(100)` added at worker creation |
| FIX-06 | `docs/architecture.md` referenced non-existent file path | Low | 2026-05 | `docs/14-rebuild-roadmap.md:21` | `electron/core/ipc.ts` updated to `src/electron/ipc/register.ts` |
| FIX-07 | Clipboard accessible to all workers regardless of permissions | High | 2026-05 | `src/electron/config/permissions.ts` | `assertHostPermission` now gates `clipboard:*` host channels against manifest `permissions` |
| FIX-08 | Manifest `capabilities.caller/callable` never enforced | High | 2026-05 | `src/electron/ipc/broker.ts` | `broker.ts` created — checks both capabilities before forwarding cross-extension calls |
| FIX-09 | IPC channels not allowlisted per extension | Medium | 2026-05 | `src/electron/extensions/registry.ts` | `isChannelAllowed(extId, channel)` implemented; `setExtensionChannels` populated on `registry:sync` |
| FIX-10 | No empty-state UX when no extensions loaded | Medium | 2026-05 | `src/renderer/App.tsx` | `EmptyState` rendered when `extensionCount === 0` and shell extension is absent |
| FIX-11 | Fat shell — all launcher logic in core `App.tsx` (~540 LOC) | High | 2026-05 | `src/renderer/App.tsx` | Shell extracted to `extensions/shell/`; `App.tsx` reduced to 158 lines that only bootstrap the shell extension |
| FIX-12 | `core.registry.*` worker sync not reaching kernel | High | 2026-05 | `src/electron/spawn/spawn.ts`, `packages/extension-host/src/core-proxy.ts` | `registry:sync` message wired; `mergeRuntimeSync` updates in-memory registry |
| FIX-13 | No cross-extension `core.extensions.invoke` | High | 2026-05 | `src/electron/ipc/broker.ts` | `invokeExtension(callerId, targetId, channel, payload)` implemented with full capability + channel checks |
| FIX-14 | Documentation drift — stale `~/.local/share/nuxy` paths | Medium | 2026-05 | `docs/` (multiple files) | Canonical path updated to `~/.nuxy/` across all active docs |
| FIX-15 | No E2E test suite | Medium | 2026-05 | `src/e2e/` | 12 Playwright spec files added covering kernel channels, shell interaction, theme switching, extension resilience, window interactions, UNIX socket, and more |

---

## Notes on Severity

| Severity | Meaning |
|---|---|
| Critical | Data loss risk, app crash, or fundamental failure — must fix before any use |
| High | Security gap or major feature broken — fix before public release |
| Medium | Incorrect behavior or architectural violation — fix before V1 |
| Low | Polish, tooling, or documentation gap — fix in Phase 4 |

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

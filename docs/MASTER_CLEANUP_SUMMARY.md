# Master Cleanup Summary

_Orchestrated cleanup run — 2026-05-19_

---

## Overview

9 specialized agents analyzed the nuxy codebase in parallel. This document consolidates all findings, applied fixes, and recommended next actions.

---

## Automated Fixes Applied

| # | File | Fix | Agent |
|---|------|-----|-------|
| 1 | `src/electron/dev/extensions.ts.bak` | Deleted verbatim backup file | Dead Code |
| 2 | `src/electron/extensions/seed-bundled.test.ts` | Fixed TS2540 — replaced direct `process.resourcesPath` assignment with `Object.defineProperty` | Build & Launch |
| 3 | `.github/workflows/ci.yml` | Added `pnpm -C src typecheck` step — CI was never running the type checker | Build & Launch |
| 4 | `src/electron/ipc/validate.ts:43` | Removed dead `'core'` IPC target alias — all call sites use `'kernel'` | Naming |
| 5 | `src/electron/ipc/register.ts:45` | Same alias removal in the router | Naming |
| 6 | `docs/README.md` | Rewritten — old version had 15+ broken links and described the project as a blueprint instead of a product | Documentation |

---

## Findings by Category

### Dead Code — 6 issues
Report: `docs/cleanup/dead-code-report.md`

| # | Location | Issue | Risk |
|---|----------|-------|------|
| 1 | `src/electron/config/config.ts` | No-op re-export shim — nothing in the project imports it | Low |
| 2 | `ipc/worker-invoke.ts:19` + `extension-host/src/index.ts:53` | Duplicate `Math.random().toString(36)` ID generator — not cryptographically safe, used for IPC correlation | Medium |
| 3 | `CoreContext.ipc.broadcast` | Declared in public API, implemented as a silent no-op in `core-proxy.ts`, never called | Medium |
| 4 | `CoreContext.registry.registerTool/Provider/Orchestrator` | Proxy logs calls but discards registration data — no consumer exists | Medium |
| 5 | `media/platforms/darwin/index.ts` + `win32/index.ts` | Always-null stubs with no issue tracking; `warned` singleton also leaks on dev hot-reload | Low |
| 6 | `src/electron/spawn/migrate-data.ts` | Migration runs on every extension spawn with no sentinel gate after completion | Medium |

---

### Dependencies — 11 issues
Report: `docs/cleanup/dependency-report.md`

| # | Package | Issue | Priority |
|---|---------|-------|----------|
| 1 | `typescript@^6.0.3` (root) | TS 6 doesn't exist as a stable release — pulls unstable pre-release on clean install | **High** |
| 2 | `typescript` in `src/devDependencies` | Used at runtime in `protocol/register.ts` to transpile extension frontends — electron-builder excludes devDeps, breaking this feature in production | **High** |
| 3 | `@modelcontextprotocol/sdk` (root) | Zero imports anywhere in the codebase — completely unused | Medium |
| 4 | `@types/bun` (root) | Project runs on Node.js 22, no Bun APIs used | Medium |
| 5 | `vite-plugin-electron-renderer` | Not imported, not referenced in `vite.config.ts` | Medium |
| 6 | `vite@^4.4.5` | EOL — Vite 7.x is current; lockfile already has Vite 7 as a transitive dep | Medium |
| 7 | `typescript` (4 packages) | Duplicated across `core`, `extension-host`, `extension-sdk`, `ui` — should be hoisted | Low |
| 8 | Root `"main": "index.js"` | Points to a non-existent file | Low |
| 9 | `@nuxy/extension-sdk` in extensions | Used only in JSDoc typedefs, never actually imported | Low |
| 10 | `packages/core/package.json` | `"main"` points to a raw `.ts` file — only works via Vite alias bypass | Low |
| 11 | Shell extension | Inconsistently missing `@nuxy/extension-sdk` (calculator and clipboard have it) | Low |

---

### Architecture — 14 issues
Report: `docs/architecture/refactor-plan.md`

| # | Location | Issue | Priority |
|---|----------|-------|----------|
| 1 | `protocol/register.ts` | Runs `typescript.transpileModule()` at request time for every extension frontend load — no cache, produces broken production builds (see dependency issue #2) | **High** |
| 2 | `extension-host/src/load-extension.ts` | Swallows load errors and sends `registry:sync` as if extension loaded cleanly — broken extensions silently time out every IPC call (15s) | Medium |
| 3 | `extensions/scanner.ts` | Registers extension before worker sends `registry:sync` — `ipcChannels` is empty for a window after startup | Medium |
| 4 | Worker↔main message protocol | Duplicated across `spawn.ts` and `extension-host/src/index.ts` with no shared discriminated union type | Medium |
| 5 | `worker-invoke.ts:19` + `extension-host/src/index.ts:53` | `Math.random()` correlation IDs — collision risk under concurrency, should use `crypto.randomUUID()` | Medium |
| 6 | `ipc/register.ts` | Conflates extension dispatch, kernel routing, window management, and drag state in one file | Medium |
| 7 | `config/nuxyconfig.ts` (290 lines) | God-module — dynamic `import()` on lines 155–160 is a workaround for a logical circular dependency | Medium |
| 8 | `validate.ts` + `broker.ts` | Independently re-check the same registry lookups | Low |
| 9 | `core-proxy.ts` | `CoreContext.registry` accepts `config: unknown` with no typed contract | Low |
| 10 | Renderer | `(window as any).core` used everywhere — `env.d.ts` already has full typed shape, `as any` is gratuitous | Low |
| 11 | `config.ts` shim | No-op re-export with no callers | Low |
| 12 | `media/index.ts` | Redundant `NowPlaying` re-export chain | Low |
| 13 | `migrate-data.ts` | Logs under wrong `'Spawn'` namespace | Low |
| 14 | `CoreContext.extensions.invoke` | Returns `Promise<unknown>` when runtime shape is `IpcResult` | Low |

---

### Naming Consistency — 10 issues
Report: `docs/cleanup/naming-report.md`

| # | Issue | Severity |
|---|-------|----------|
| 1 | Dead `'core'` IPC target alias (validate.ts, register.ts) — **FIXED** | Low |
| 2 | IPC channel casing: `'window:dragStart'`/`dragMove`/`dragEnd` are camelCase, others are lowercase | Medium |
| 3 | `'window-show'` push event uses dash; all request channels use colon — should be `'window:show'` | Medium |
| 4 | Custom DOM events: `'omniBar-control'` / `'omniBar-keydown'` are mixed case — should be `'omni-bar-control'` | Low |
| 5 | Duplicate `ExtensionModule` interface — SDK marks `register` required, host marks it optional | Medium |
| 6 | Shell extension CSS uses bare class names (`.app-container`, `.results-list`) — risk of collision with `@nuxy/ui`'s `nuxy-*` namespace | Medium |
| 7 | `nuxy-shortcut-sep` breaks BEM `__` child naming convention | Low |
| 8 | `kernelLogger` name vs `@nuxy/core` package name vs `window.core` preload — undocumented split | Low |
| 9 | All `@nuxy/ui` component props typed as `any` (12 of 13 components) | High |
| 10 | `RegistrySyncPayload` duplicates `ExtensionRuntimeMeta` fields across `core-proxy.ts` and `types.ts` | Medium |

---

### Type Safety — 14 issues
Report: `docs/types/type-safety-report.md`

| # | Location | Issue | Severity |
|---|----------|-------|----------|
| 1 | `App.tsx:16,44,51` | `(window as any).core` — gratuitous; `env.d.ts` already has typed shape | Low |
| 2 | `main.tsx:6-8` | Three `(window as any)` assignments — add declarations to `env.d.ts` | Low |
| 3 | `@nuxy/ui` (12 components) | `props: any` throughout entire component library | **Medium** |
| 4 | `CoreContext` | `registerTool/Provider/Orchestrator` accept `config: unknown` | Medium |
| 5 | `CoreContext.extensions.invoke` | Returns `Promise<unknown>` instead of `Promise<IpcResult>` | Medium |
| 6 | `host-handlers.ts:29` | Bare `as { targetId, channel, payload }` cast on untrusted worker message | **High** |
| 7 | `host-handlers.ts:52,57,66` | `payload as string` and `payload as { file, data }` without runtime guards | Medium |
| 8 | `spawn.ts:40` | Untyped `msg` in worker message handler — no discriminated union | Medium |
| 9 | `extension-host/src/index.ts:12` | `workerData as WorkerData` without runtime assertion | Low |
| 10 | `load-extension.ts:22` | `(def ?? extModule) as ExtensionModule` cast — undefined is safer | Low |
| 11–13 | Various | Missing explicit return types on `scanExtensions`, `listByType`, `parseConfig` | Low |

---

### UI — 8 issues
Report: `docs/ui/ui-cleanup-report.md`

| # | Issue | Severity |
|---|-------|----------|
| 1 | `transition: all` in Button, Card, ListItem, shell.css | Low |
| 2 | Hardcoded `10px` in ShortcutBar instead of `var(--space-3)` | Low |
| 3 | Decorative 🔍 emoji in shell frontend missing `aria-hidden="true"` | Low |
| 4 | Shell results list missing `role="listbox"` / `role="option"` | Medium |
| 5 | `ListItem` `<div>` with `onClick` missing `role="button"`, `tabIndex`, `onKeyDown` | Medium |
| 6 | No `prefers-reduced-motion` support in shell.css | Low |
| 7 | Theme variable validation gap — no type contract for required CSS variables | Medium |
| 8 | CSS class namespace collision risk between `@nuxy/ui` and shell extension | Medium |

---

### Performance — 12 issues
Report: `docs/performance/performance-report.md`

| # | Issue | Severity |
|---|-------|----------|
| 1 | `scanExtensions()` blocks window creation — runs before `createMainWindow()` | **Medium** |
| 2 | 4 uncoordinated `useEffect` IPC calls on mount — multiple render passes, FOUC on theme | **Medium** |
| 3 | `WindowSpringController` runs at 4ms / 250Hz — should be 16ms / 60fps | Medium |
| 4 | Spring interval leak risk on window teardown | Low |
| 5 | Synchronous `fs.readFileSync`/`writeFileSync` in hot IPC path | Medium |
| 6 | Per-call `worker.on('message', listener)` — listener accumulation under burst | Low |
| 7 | `migrateLegacyData` scans filesystem on every extension spawn | Medium |
| 8 | Dynamic `import('electron')` inside hot `getTheme` IPC handler | Low |
| 9 | `ensureUserThemes` runs synchronously in startup critical path | Low |
| 10 | Full `@nuxy/ui` barrel import at renderer entry | Low |
| 11 | `fs.watch({ recursive: true })` silently ignored on Linux | Low |
| 12 | Media detection: clean — D-Bus is lazy-initialized, no polling loop | ✅ No action |

---

### Build & Launch Validation
Report: `docs/release/launch-readiness.md`

**Launch Readiness Score: 72 / 100 — CONDITIONAL**

| Status | Item |
|--------|------|
| ✅ Fixed | TypeScript `TS2540` error in `seed-bundled.test.ts` |
| ✅ Fixed | CI missing typecheck step |
| ⚠️ Manual | TypeScript version split: root uses `^6.0.3`, src uses `^5.9.3` |
| ⚠️ Manual | `typescript` must move to `dependencies` in `src/package.json` (used at runtime) |
| ⚠️ Manual | No macOS code-signing workflow in CI |
| ⚠️ Manual | `maintainer: nuxy@localhost` placeholder in `electron-builder.yml` |
| ⚠️ Manual | `src/postcss.config.js` has empty `plugins: {}` — PostCSS is a no-op |
| ⚠️ Verify | Run full test suite to confirm all tests pass |

---

### Documentation
Report: `docs/cleanup/documentation-audit-report.md`

| Status | Item |
|--------|------|
| ✅ Fixed | `docs/README.md` rewritten — broken links and "blueprint" framing removed |
| ⚠️ Manual | `docs/00-overview.md` describes sandboxing as "Node `vm`" — real mechanism is `worker_threads` |
| ⚠️ Manual | `docs/restructure-plan.md` — all checklist items show unchecked; Phases 1–3 are actually complete |
| ⚠️ Manual | `docs/DOCUMENTATION.md` — 5 stale file paths (moved during restructure) |
| ⚠️ Manual | `docs/architecture.md` — references `electron/core/ipc.ts` (never existed) |
| ⚠️ Manual | `extensions/README.md` — clipboard example missing permission requirement note |
| ⚠️ Manual | `packages/ext-template/README.md` — `bootstrap: true` manifest pattern undocumented |

---

## Removed Files

| File | Reason |
|------|--------|
| `src/electron/dev/extensions.ts.bak` | Verbatim duplicate of live file — zero diff |

---

## Top Priority Actions (Recommended Order)

### Blocking — fix before shipping

1. **Move `typescript` to `dependencies` in `src/package.json`** — production builds silently break without it (protocol/register.ts uses it at runtime)
2. **Downgrade root `typescript` from `^6.0.3` to `^5.9.0`** — TS 6 is not a stable release
3. **Fix `CoreContext.ipc.broadcast` no-op** — or remove the method from the public API
4. **Gate `migrate-data.ts`** — write a sentinel file after first migration, skip on subsequent runs
5. **Move `CoreContext.registry.registerTool/Provider/Orchestrator`** — they discard data silently; either implement or remove from the API surface

### High impact, low risk

6. **Replace `Math.random()` correlation IDs** with `crypto.randomUUID()` in `worker-invoke.ts` and `extension-host/src/index.ts`
7. **Add runtime validation before unsafe casts** in `host-handlers.ts:29` (worker message payload)
8. **Combine the 4 mount `useEffect`s** in `App.tsx` — eliminates FOUC and reduces IPC round-trips
9. **Move `scanExtensions()` after `createMainWindow()`** in bootstrap — use a loading state in renderer
10. **Add `role="button"` + `tabIndex` to `ListItem`** — keyboard accessibility regression

### Cleanup

11. **Delete `src/electron/config/config.ts`** — confirmed unused shim
12. **Remove `@modelcontextprotocol/sdk`** and **`@types/bun`** from root `package.json`
13. **Remove `vite-plugin-electron-renderer`** from `src/package.json`
14. **Standardize IPC channel casing** — kebab-case after colon, e.g. `window:drag-start`
15. **Type `@nuxy/ui` component props** — remove all `any` prop types across 12 components
16. **Prefix shell extension CSS classes** with `nuxy-shell-` namespace
17. **Reduce `WindowSpringController` to 16ms interval** from 4ms

---

## Report Index

| Report | Path |
|--------|------|
| Dead Code | `docs/cleanup/dead-code-report.md` |
| Dependencies | `docs/cleanup/dependency-report.md` |
| Naming | `docs/cleanup/naming-report.md` |
| Documentation Audit | `docs/cleanup/documentation-audit-report.md` |
| Architecture Refactor Plan | `docs/architecture/refactor-plan.md` |
| Type Safety | `docs/types/type-safety-report.md` |
| UI Cleanup | `docs/ui/ui-cleanup-report.md` |
| Performance | `docs/performance/performance-report.md` |
| Launch Readiness | `docs/release/launch-readiness.md` |

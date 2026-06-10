# Documentation Audit Report

> **Historical report** — reflects the codebase before the React→Lit/Web Components migration (completed 2026-06-09). React references below describe the old architecture; they have since been resolved.

**Generated:** 2026-05-19  
**Auditor:** Documentation Agent  
**Scope:** All files listed in the task brief plus key source files for ground-truth comparison.

---

## Executive Summary

The existing documentation corpus is large (33+ markdown files) and covers the design intent accurately. However several concrete structural claims no longer match the codebase as it has evolved from a flat `src/electron/` layout to the domain-grouped layout described in `restructure-plan.md`. There are also a number of file-path references that were accurate during drafting but are now stale.

The single most impactful fix is rewriting `docs/README.md` — it currently reads as a blueprint index for a rebuild project rather than an orientation guide for a working codebase. That rewrite was applied automatically (see the last item in this report).

---

## Issues Found

---

### Issue 1: docs/README.md treats the project as "to be built" — it is already built

**Problem:**  
The README opens with "This documentation serves as a complete blueprint to reverse-engineer the current system and build a cleaner, modular, highly scalable…version from scratch." The codebase has already been rebuilt. The folder-grouped kernel (`src/electron/{bootstrap,config,extensions,ipc,protocol,spawn,window,themes,media,worker}/`), `@nuxy/extension-host`, `@nuxy/extension-sdk`, and the `shell` bootstrap extension all exist. The README still links to numbered series docs (02 through 20) many of which reference files that do not exist (`05-api-design.md`, `06-state-management.md`, `07-database-design.md`, `08-authentication.md`, `09-error-handling.md`, `11-performance.md`, `12-testing-strategy.md`, `13-deployment.md`, `16-omni-input-system.md`, `17-frontend-extensions.md`, `20-logging.md`).

**Impact:** New contributors see a "rebuild blueprint" framing and a table of contents full of broken links before they read a single line of real API docs.

**Proposed Fix:** Replace with a concise orientation README that describes what nuxy is, the actual directory tree, how to run it, and where to find developer docs. Done below.

**Risk Level:** Low  
**Applied Automatically?:** Yes — `docs/README.md` was rewritten.

---

### Issue 2: `docs/restructure-plan.md` describes `src/src/` as the renderer path — it is now `src/renderer/`

**Problem:**  
Section 1 of `restructure-plan.md` shows:

```
├── src/                             # Renderer (React) — confusing double `src/`
│   ├── main.tsx
│   ├── App.tsx
```

and the file-mapping table maps `src/src/*` → `apps/desktop/renderer/*`. However the restructure is partially done: the renderer already lives at `src/renderer/` (`src/renderer/App.tsx`, `main.tsx`, `env.d.ts`). The double `src/src/` path no longer exists.

**Impact:** Anyone reading the plan thinks the awkward `src/src/` nesting is still in place. The "Phase 1" migration in section 8 looks unstarted when it is actually complete.

**Proposed Fix:** Add a note at the top of the restructure plan: "Phase 1 (renderer rename) is complete: `src/src/` → `src/renderer/`." Update the current-tree block to show `renderer/` and remove the `src/src/` complaint from the problems table. Check off Phase 1 items in the migration checklist.

**Risk Level:** Low  
**Applied Automatically?:** No

---

### Issue 3: `docs/DOCUMENTATION.md` references `worker/spawn.ts` for the "Worker per extension" feature — path has changed

**Problem:**  
The feature-status table says:

```
| Worker per extension | **Implemented** | `worker/spawn.ts` |
```

The actual file is at `src/electron/spawn/spawn.ts` (under the `spawn/` domain folder). There is also a `src/electron/worker/` directory, but it only contains the built extension-host script entry point — the spawning logic is in `spawn/spawn.ts`.

**Impact:** Developers following the reference to `worker/spawn.ts` will not find it.

**Proposed Fix:** Update the notes column to `src/electron/spawn/spawn.ts`.

**Risk Level:** Low  
**Applied Automatically?:** No

---

### Issue 4: `docs/DOCUMENTATION.md` references `protocol-resolve.ts` as a flat file — it now lives at `src/electron/protocol/resolve.ts`

**Problem:**  
The feature table references `protocol-resolve.ts` for the `nuxy-ext://` protocol. The file is now `src/electron/protocol/resolve.ts` following the domain-folder restructure.

**Impact:** Stale path reference.

**Proposed Fix:** Update to `src/electron/protocol/resolve.ts`.

**Risk Level:** Low  
**Applied Automatically?:** No

---

### Issue 5: `docs/DOCUMENTATION.md` references `storage-path.ts` as a flat file — it is now `src/electron/config/storage-path.ts`

**Problem:**  
The feature table references `storage-path.ts` for "Storage chroot." The file is now at `src/electron/config/storage-path.ts`.

**Proposed Fix:** Update path in notes column.

**Risk Level:** Low  
**Applied Automatically?:** No

---

### Issue 6: `docs/DOCUMENTATION.md` references `registry.ts` and `ipc-validate.ts` as flat files

**Problem:**  
Notes column shows `registry.ts` and `ipc-validate.ts`. Actual locations are:

- `src/electron/extensions/registry.ts`
- `src/electron/ipc/validate.ts`

**Proposed Fix:** Update both paths.

**Risk Level:** Low  
**Applied Automatically?:** No

---

### Issue 7: `docs/DOCUMENTATION.md` feature table references `broker.ts` without a path

**Problem:**  
The "Message broker" row shows `broker.ts`. Actual file is `src/electron/extensions/broker.ts`.

**Proposed Fix:** Update note to `src/electron/extensions/broker.ts`.

**Risk Level:** Low  
**Applied Automatically?:** No

---

### Issue 8: `docs/DOCUMENTATION.md` says Playwright E2E is in `src/e2e/`

**Problem:**  
The table shows:

```
| Playwright E2E | **Implemented** | `src/e2e/` |
```

The E2E file exists at `src/e2e/kernel-channels.spec.ts`, so this is technically correct in terms of path. However the `src/` directory in the project is the desktop app package (named `nuxy-desktop`), not a monorepo `src/` root. The path `src/e2e/` is valid but could be confusing compared to what a reader might expect at the monorepo root.

**Impact:** Minor — low confusion risk, path is accurate.

**Proposed Fix:** No change required; path is correct.

**Risk Level:** Low  
**Applied Automatically?:** No

---

### Issue 9: `docs/architecture.md` references `electron/core/ipc.ts` — this path never existed in the new layout

**Problem:**  
The architecture doc section 2 ("Core Modules") in the notes about "Kernel" says:

> "Build the `electron/core/ipc.ts` strict router"

and references `02-architecture.md` and `04-modules.md` as sources. There is no `electron/core/ipc.ts`. The IPC router is `src/electron/ipc/register.ts`.

**Impact:** Architects following the reference find nothing at that path.

**Proposed Fix:** Update the reference in `architecture.md` to `src/electron/ipc/register.ts`.

**Risk Level:** Low  
**Applied Automatically?:** No

---

### Issue 10: `docs/architecture.md` says CoreContext is a "proxy over MessagePort" — it is actually delivered via `worker_threads` `parentPort`

**Problem:**  
Section 4 states: "Extensions are injected with a restricted `CoreContext` proxy over `MessagePort`."  
`MessagePort` is the `worker_threads` API name, but the actual implementation uses `parentPort` from `worker_threads` and the host-call pattern (`host:call` / `host:reply` messages). The proxy is created by `@nuxy/extension-host/src/core-proxy.ts`, which does not use `MessagePort` directly — it takes a `callHost` callback wrapping `parentPort.postMessage`. This is a minor naming nuance but the overall model description is accurate.

**Impact:** Very low — the description is close enough for architecture purposes. Not misleading.

**Proposed Fix:** Optionally clarify to "via `parentPort` in a `worker_threads` Worker."

**Risk Level:** Low  
**Applied Automatically?:** No

---

### Issue 11: `docs/19-mvp-roadmap.md` describes the VM Sandbox / Node `vm` approach — actual implementation uses `worker_threads` dynamic import, not `vm`

**Problem:**  
The overview doc (`00-overview.md`) and the MVP roadmap describe executing extension code in a "Node `vm` Sandbox" or "V8 Sandbox." The actual implementation in `@nuxy/extension-host` uses `import(absolutePath)` inside a dedicated `worker_threads` Worker. Node `vm` is not used. The security model is worker isolation (separate memory, no shared globals, no raw Electron access), not a `vm.Script` context.

**Impact:** Developers reading the security model think there is a `vm.runInContext` call providing an additional sandboxing layer. There is not — isolation comes entirely from `worker_threads`. This overstates the sandbox level.

**Proposed Fix:**  
In `docs/00-overview.md`, change:

> "executes their backend in a secure V8 Sandbox (Node `vm`)"

to:

> "executes their backend in an isolated `worker_threads` Worker thread (separate memory space, no shared Electron globals)"

Apply the same correction to any other occurrence of "Node `vm`" in `19-mvp-roadmap.md` and `architecture.md`.

**Risk Level:** Medium — misdescribes the actual security boundary.  
**Applied Automatically?:** No

---

### Issue 12: `extensions/README.md` shows `core.clipboard.readText()` called inside `register()` without a `permissions` check note

**Problem:**  
The authoring example in `extensions/README.md` demonstrates:

```ts
export default defineExtension({
  register(core) {
    core.clipboard.readText()
  },
})
```

This call will fail at runtime unless the manifest declares `"permissions": ["clipboard"]`. There is no note warning about this requirement.

**Impact:** Extension authors copy the snippet, get a denied error from `host-handlers.ts` permission check, and cannot easily diagnose why.

**Proposed Fix:** Add a comment or note: "Requires `\"clipboard\"` in `manifest.json` permissions."

**Risk Level:** Low  
**Applied Automatically?:** No

---

### Issue 13: `packages/ext-template/README.md` does not mention the `bootstrap` manifest field or the shell extension pattern

**Problem:**  
The template README covers `tool`, `permissions`, and `entry`, but the codebase has a fourth critical pattern: `"bootstrap": true` frontend-only extensions that act as the shell UI (e.g. `extensions/shell/manifest.json`). This is undocumented in the template.

**Impact:** Extension authors who want to create an alternative shell or OmniBar replacement have no guidance.

**Proposed Fix:** Add a "Bootstrap extensions" section describing the `bootstrap: true` flag and the fact that such extensions have only a `frontend` entry.

**Risk Level:** Low  
**Applied Automatically?:** No

---

### Issue 14: `docs/restructure-plan.md` section 8 Phase 0–5 checklists show all items unchecked — Phase 1 and parts of Phase 2–3 are already done

**Problem:**  
All migration checklist items in section 8 are shown as `[ ]` (unchecked). In reality:

- **Phase 1** is complete: `src/src/` is gone, renderer is at `src/renderer/`, the desktop app is the `src/` package.
- **Phase 2** (kernel domain folders) is complete: `bootstrap/`, `config/`, `extensions/`, `ipc/`, `protocol/`, `spawn/`, `window/`, `themes/`, `media/` all exist under `src/electron/`.
- **Phase 3** (extract `@nuxy/extension-host`) is complete: `packages/extension-host/` exists with `src/index.ts`, `core-proxy.ts`, `load-extension.ts`, `worker-log.ts`.

**Impact:** Readers think the project is at "Phase 0" when it is effectively at Phase 3 or early Phase 4.

**Proposed Fix:** Check off completed items in the migration checklist and add a "Status as of 2026-05-19" banner at the top of the document.

**Risk Level:** Low  
**Applied Automatically?:** No

---

### Issue 15: `docs/README.md` table of contents links to non-existent files

**Problem:**  
The old README links to the following files that do not exist in the repository:

- `02-architecture.md`
- `03-data-flow.md`
- `05-api-design.md`
- `06-state-management.md`
- `07-database-design.md`
- `08-authentication.md`
- `09-error-handling.md`
- `11-performance.md`
- `12-testing-strategy.md`
- `13-deployment.md`
- `16-omni-input-system.md`
- `17-frontend-extensions.md`
- `20-logging.md`
- `implementation/01-setup.md`
- `implementation/05-final-polish.md`

**Impact:** Every link in the "Design & Implementation" and "Quality & Lifecycle" sections 404s.

**Proposed Fix:** Rewrite `docs/README.md` to only link to files that exist. Done below.

**Risk Level:** Low  
**Applied Automatically?:** Yes — `docs/README.md` was rewritten.

---

### Issue 16: `docs/00-overview.md` says extensions cannot run `require('fs')` — workers use ESM `import()`, not CommonJS `require`

**Problem:**  
Section 3 ("Tenet C") states:

> "Extensions cannot run raw `require('fs')`."

Extensions are loaded via ESM `import()` inside a worker. The equivalent restriction is that workers cannot `import 'fs'` directly (because the worker environment does not expose Node built-ins by default when loaded as an ES module without explicit permission). The accurate statement is that extensions are isolated by the worker boundary — they receive only the `core` proxy injected by `@nuxy/extension-host` and cannot reach the filesystem, Electron APIs, or the main process directly.

**Impact:** Minor — the intent is clear but the mechanism is slightly wrong. Could confuse TypeScript/ESM-only developers who do not use CommonJS `require`.

**Proposed Fix:** Update to: "Extensions cannot import raw Node built-ins (`fs`, `child_process`) or Electron APIs. They are isolated inside a `worker_threads` Worker and only have access to the `CoreContext` proxy injected by the kernel."

**Risk Level:** Low  
**Applied Automatically?:** No

---

## Summary Table

| #   | File                                       | Problem                                                    | Severity | Applied? |
| --- | ------------------------------------------ | ---------------------------------------------------------- | -------- | -------- |
| 1   | `docs/README.md`                           | Framed as rebuild blueprint; full of broken links          | High     | Yes      |
| 2   | `docs/restructure-plan.md`                 | `src/src/` shown as current — Phase 1 already complete     | Medium   | No       |
| 3   | `docs/DOCUMENTATION.md`                    | `worker/spawn.ts` → `src/electron/spawn/spawn.ts`          | Low      | No       |
| 4   | `docs/DOCUMENTATION.md`                    | `protocol-resolve.ts` → `src/electron/protocol/resolve.ts` | Low      | No       |
| 5   | `docs/DOCUMENTATION.md`                    | `storage-path.ts` → `src/electron/config/storage-path.ts`  | Low      | No       |
| 6   | `docs/DOCUMENTATION.md`                    | `registry.ts` / `ipc-validate.ts` missing domain prefix    | Low      | No       |
| 7   | `docs/DOCUMENTATION.md`                    | `broker.ts` → `src/electron/extensions/broker.ts`          | Low      | No       |
| 8   | `docs/DOCUMENTATION.md`                    | `src/e2e/` path accurate; no change needed                 | Info     | No       |
| 9   | `docs/architecture.md`                     | `electron/core/ipc.ts` does not exist                      | Low      | No       |
| 10  | `docs/architecture.md`                     | "MessagePort" wording slightly inaccurate                  | Very Low | No       |
| 11  | `docs/00-overview.md`, `19-mvp-roadmap.md` | "Node `vm` sandbox" — actual isolation is `worker_threads` | Medium   | No       |
| 12  | `extensions/README.md`                     | Clipboard example missing `permissions` requirement note   | Low      | No       |
| 13  | `packages/ext-template/README.md`          | `bootstrap: true` pattern undocumented                     | Low      | No       |
| 14  | `docs/restructure-plan.md`                 | All phase checklists unchecked — Phases 1–3 complete       | Medium   | No       |
| 15  | `docs/README.md`                           | 15+ broken links to non-existent doc files                 | High     | Yes      |
| 16  | `docs/00-overview.md`                      | `require('fs')` wording; extensions use ESM not CJS        | Low      | No       |

---

## Nuxy — Accurate Summary (for reuse in updated README)

### What nuxy is

Nuxy is an Electron desktop launcher (spotlight/command-palette style). By itself the shell does nothing — all functionality, including the search bar, is provided by extensions dropped into `~/.nuxy/extensions/`. This "empty shell" design means any feature can be added, removed, or replaced without touching core code.

### Architecture

```
Main Process (Kernel)                          ~/.nuxy/
  src/electron/bootstrap/main.ts               ├── nuxyconfig
    └── Registers protocols, IPC, scans        ├── extensions/<folder>/
        extensions, creates window                  ├── manifest.json
                                                    ├── backend.js
  src/electron/extensions/scanner.ts               └── frontend.js  (optional)
    └── Reads ~/.nuxy/extensions/              ├── data/<manifest.id>/  (storage chroot)
        Creates one Worker per backend         └── themes/*.json

  src/electron/spawn/spawn.ts
    └── Spawns packages/extension-host
        as a worker_threads Worker

  packages/extension-host/src/index.ts
    └── Runs inside Worker; builds CoreContext
        proxy; calls loadExtensionModule()
        → ext.register(core)

Renderer (React)
  src/renderer/App.tsx
    └── Loads bootstrap extension UI via
        nuxy-ext://com.nuxy.shell/frontend.js

  nuxy-ext:// protocol
    └── Serves extension files from
        ~/.nuxy/extensions/<folder>/
```

### How extensions work

1. A folder is placed in `~/.nuxy/extensions/` with a `manifest.json`.
2. On startup (or file-system watch event in dev), the scanner reads manifests.
3. If the manifest has `entry.backend`, a `worker_threads` Worker is spawned running `@nuxy/extension-host`.
4. The extension-host calls `register(core)` on the extension module.
5. The `core` object is a `CoreContext` proxy — calls to `core.clipboard.*`, `core.storage.*`, etc. are sent via `parentPort` as `host:call` messages to the main process, which validates permissions and replies.
6. After `register()` completes the worker posts `registry:sync` so the kernel knows which IPC channels the extension registered.
7. When the renderer calls `core.ipc.invoke(extId, channel, payload)`, the kernel routes it to the correct worker.

### How to develop an extension

```
extensions/my-ext/
├── manifest.json
├── backend.js   (or .ts compiled to .js)
└── frontend.js  (optional — React component)
```

**manifest.json minimum fields:**

```json
{
  "id": "com.example.my-ext",
  "name": "My Extension",
  "version": "1.0.0",
  "type": "tool",
  "permissions": ["storage"],
  "entry": {
    "backend": "backend.js",
    "frontend": "frontend.js"
  }
}
```

`type` values: `tool` (custom UI), `provider` (live search results), `orchestrator` (AI/logic fallback).  
`bootstrap: true` makes the extension the shell UI loaded by the renderer.

**backend.js** — export a `register(core)` function:

```js
/** @typedef {import('@nuxy/extension-sdk').CoreContext} CoreContext */
/** @param {CoreContext} core */
export function register(core) {
  core.registry.registerTool({ name: 'my-ext' })
  core.ipc.handle('greet', async ({ name }) => `Hello, ${name}`)
}
```

**frontend.js** — export a default React component (React is available via `window.React`; `@nuxy/ui` primitives via `window.UI`):

```js
const React = window.React

export default function MyExtView({ query }) {
  return React.createElement('div', null, 'Query: ' + query)
}
```

Drop the folder in `~/.nuxy/extensions/` and run `pnpm dev` to reload.

See `packages/ext-template/` for a complete starting point and `docs/21-extension-access.md` for the full `CoreContext` API reference.

---

## Files with no issues found

- `docs/21-extension-access.md` — accurate, detailed, path references correct.
- `packages/extension-sdk/src/index.ts` — exports match `CoreContext` in `@nuxy/core`.
- `packages/extension-host/src/load-extension.ts` — correctly handles both named and default exports.
- `src/electron/extensions/registry.ts` — implementation matches what docs describe.
- `packages/core/src/types.ts` — manifest shape matches working example extensions.

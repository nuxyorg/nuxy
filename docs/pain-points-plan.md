# Pain Points & Remediation Plan

**Status:** Living document (audited 2026-05-19)  
**Scope:** Current `src/electron` kernel, `src/src` shell, `extensions/`, and alignment with architecture docs.

This document lists concrete gaps between Nuxy’s **stated architecture** (empty shell, zero-trust extensions, kernel message broker) and **what ships today**, with prioritized fixes.

---

## Executive summary

The kernel foundation is in good shape: worker-based extension loading, `nuxy-ext://` path jail, storage chroot, IPC validation, and 19 automated unit tests all work. The main risks are **architectural drift** (the React shell is no longer “empty”), **security features that exist only on paper** (capabilities, broker, permission prompts), and **documentation that still describes the old layout** (`~/.local/share/nuxy`, Node `vm`, Shadcn).

Recommended order: fix **truth in docs + agents.md** (cheap), then **capability enforcement + IPC allowlists** (security), then **extract shell UI into extensions** (architecture), then **broker + orchestrator** (product).

---

## Pain point matrix

| ID | Pain point | Severity | Evidence |
|----|------------|----------|----------|
| P1 | **“Empty shell” violated — launcher logic lives in core** | High | `App.tsx` (~540 lines): omni bar, provider fan-out, tool routing, keyboard UX |
| P2 | **`core.registry.*` in workers is a no-op** | High | `extension-host.ts` only logs; `scanner.ts` registers from `manifest.json` only |
| P3 | **No kernel message broker / `core.extensions.invoke`** | High | Docs (`10-security`, `15-modular-plugin-system`, `agents.md`); not implemented in `ipc.ts` / workers |
| P4 | **Manifest `capabilities` ignored** | High | `clipboard`/`calculator` declare `callable`/`caller`; kernel never checks before host calls |
| P5 | **Clipboard is a global host privilege** | High | `spawn.ts` serves `clipboard:*` to every worker |
| P6 | **Extension IPC channels are not allowlisted** | Medium | `ipc-validate.ts` checks ext exists, not `channel` ∈ manifest |
| P7 | **Worker sandbox is weaker than documented** | Medium | `extension-host.ts` uses `import(absolutePath)` — not `vm` / `isolated-vm`; malicious backend could bundle native deps |
| P8 | **Calculator uses `eval()`** | Medium | `extensions/calculator/backend.js` |
| P9 | **Massive documentation drift** | Medium | 20+ docs + `agents.md` still say `~/.local/share/nuxy`, Node `vm`, Shadcn; code uses `~/.nuxy`, workers, `@nuxy/ui` |
| P10 | **Extension author DX is ad hoc** | Medium | `main.tsx` exposes `window.React` / `window.UI`; extensions are hand-written `.js`, not built TSX packages |
| P11 | **No empty-state UX** | Medium | `00-overview.md` promises “no extensions” message; `App.tsx` always shows full launcher |
| P12 | **Orchestrator / Enter fallback not wired** | Medium | `type: orchestrator` in types; no `registerOrchestrator` handler in kernel; Enter only opens tools |
| P13 | **Provider fan-out on every keystroke** | Medium | `App.tsx` invokes all providers in parallel per `savedQuery` (50ms debounce only) |
| P14 | **No E2E / integration tests** | Medium | `12-testing-strategy.md` describes Playwright; none exist; `electron-fix-plan.md` manual checklist mostly open |
| P15 | **No extension lifecycle** | Low | No hot reload, crash restart, or version/conflict resolution (`18-advanced-capabilities.md`) |
| P16 | **Global shortcut / daemon story incomplete** | Low | `19-mvp-roadmap.md` mentions `/tmp/nuxy.sock`; `main.ts` only uses `requestSingleInstanceLock` |
| P17 | **Toolchain / release gaps** | Low | Roadmap mentions eslint, prettier, `electron-builder`, CI — not present in repo |
| P18 | **Package manager split** | Low | Root `package.json`: `pnpm` for dev, `bun run` for `start` |

---

## Detailed pain points & recommended solutions

### P1 — Fat shell (core owns product UX)

**Problem:** The kernel’s React app implements search, results list, provider aggregation, tool activation, theme wiring, and window resize — exactly what docs say must be extensions (`00-overview`, `agents.md`).

**Impact:** New features require editing core; third parties cannot replace the launcher; “empty shell” is not demonstrable.

**Recommended solution:**

1. Introduce a **shell extension** (e.g. `com.nuxy.shell`) shipped by default in `extensions/` with manifest `type: headless` + optional `bootstrap: true`.
2. Move omni bar, result list, and provider routing into that extension’s `frontend.js` / `backend.js`.
3. Reduce core `App.tsx` to: load bootstrap extension, render slot, forward `window-show` / resize IPC.

**Acceptance criteria:** Removing all extensions except `com.nuxy.shell` still yields a working launcher; removing shell too shows empty state (see P11).

---

### P2 — Registry API does not sync worker → kernel

**Problem:** Extensions call `core.registry.registerTool({ name: 'clipboard' })` but the kernel never receives it. Listing uses `manifest.type` only (`scanner.ts` + `ipc.ts` `listTools`/`listProviders`).

**Impact:** Duplicate source of truth; extension authors follow docs that do not affect runtime; schemas/handlers declared at register time are lost.

**Recommended solution:**

1. On worker boot, after `register()`, worker posts `registry:sync` message with tools/providers/orchestrators + JSON schemas.
2. Kernel merges into `registry.ts` (validate against manifest `type`).
3. Deprecate redundant `registerTool` **or** make manifest minimal (`id`, `type`, `entry`) and registry the rich metadata — pick one model and document it.

**Acceptance criteria:** Changing only `registerTool` payload (e.g. display name) updates `listTools` without editing `manifest.json`.

---

### P3 — No message broker / cross-extension invoke

**Problem:** `agents.md` and `10-security.md` require schema-validated routing between workers. Today only renderer → single worker via `ext:invoke` exists.

**Recommended solution:**

1. Add `core.extensions.invoke(targetId, channel, payload)` in worker `core` → host `broker:invoke`.
2. Implement `broker.ts` in main process:
   - Verify caller `caller: true`, target `callable: true`
   - Optional JSON Schema validation per channel (store schemas from P2 sync)
   - Forward to target worker; enforce timeout (reuse 15s)
3. Wire orchestrator Enter path in shell extension to `kernel` → orchestrator worker.

**Acceptance criteria:** Calculator tool invocable from a test orchestrator extension without direct worker coupling.

---

### P4 — Capabilities not enforced

**Problem:** `manifest.capabilities.callable/caller` are parsed but never checked.

**Recommended solution:**

1. Define capability → host channel map, e.g. `clipboard` → `clipboard:readText|writeText`.
2. In `spawn.ts`, reject host calls if manifest lacks permission (future: `permissions: ["clipboard"]` array).
3. Block `broker:invoke` unless P3 rules pass.

**Acceptance criteria:** Extension without clipboard permission gets structured error on `core.clipboard.readText()`.

---

### P5 — Clipboard exposed to all workers

**Problem:** Any extension can read/write system clipboard via host bridge.

**Recommended solution:** Same as P4 — gate `clipboard:*` in `spawn.ts` on manifest permission before executing.

---

### P6 — Per-extension IPC channel allowlist

**Problem:** Any loaded extension can expose any channel name; renderer can call `ext:invoke(id, 'arbitrary', ...)`.

**Recommended solution:**

1. During `core.ipc.handle` in worker, register channel names and post to kernel on sync.
2. `validateExtInvokeArgs` checks `channel` ∈ allowed set for `extId` (kernel channels unchanged).

**Acceptance criteria:** Invoking unregistered channel returns `UNKNOWN_CHANNEL` without waking worker handler.

---

### P7 — Worker isolation gap

**Problem:** Docs claim `vm` / strict no-`require`; implementation uses Node worker + dynamic `import()`. A malicious `backend.js` could still reach Node if the file is not bundled under control.

**Recommended solution (phased):**

| Phase | Approach |
|-------|----------|
| **Short** | Document actual model; only load extensions from signed/trusted paths in prod |
| **Medium** | Pre-bundle extension backends with esbuild (no node builtins) before spawn |
| **Long** | Evaluate `isolated-vm` or separate utility process per extension |

**Acceptance criteria:** Official extension template cannot `import('fs')` at runtime in production build.

---

### P8 — `eval()` in calculator

**Problem:** User-controlled math via `eval` is unsafe and sets a bad precedent.

**Recommended solution:** Replace with `mathjs` or a small Pratt parser; keep regex guard.

---

### P9 — Documentation drift

**Problem:** Contributors and agents follow wrong paths and security model.

**Recommended solution:**

1. **Single source of truth:** `docs/structure.md` + `electron-fix-plan.md` for paths (`~/.nuxy`).
2. Bulk-update stale references (`~/.local/share/nuxy` → `~/.nuxy`) in docs 00–19, `architecture.md`, `implementation/*`.
3. Update `agents.md` to match worker + `~/.nuxy` (not `vm`, not `.local/share`).
4. Add `docs/DOCUMENTATION.md` index noting “implemented vs planned” per feature.

**Acceptance criteria:** `rg '\.local/share/nuxy'` returns zero hits except historical changelog notes.

---

### P10 — Extension author experience

**Problem:** Extensions rely on globals (`window.React`, `window.UI`), plain JS, no types, no build step.

**Recommended solution:**

1. Publish `@nuxy/ext-sdk` template: Vite library mode → `dist/frontend.js` + `dist/backend.js`.
2. Document `manifest.entry` pointing at `dist/*`.
3. Optional: dev middleware serves built assets into `~/.nuxy/extensions` on watch.

---

### P11 — Empty shell UX

**Problem:** First-run without extensions still shows full UI.

**Recommended solution:** If `loadedExtensions.length === 0`, render kernel empty view with path `~/.nuxy/extensions` and link to docs; hide provider/tool logic.

---

### P12 — Orchestrator not integrated

**Problem:** `ExtensionType` includes `orchestrator`; no Enter → orchestrator pipeline.

**Recommended solution:** After P1 shell extraction, on Enter with no selection invoke first orchestrator (or priority from manifest); implement `eval`/`route` channel contract from `16-omni-input-system.md`.

---

### P13 — Provider performance

**Problem:** N parallel IPC calls per debounced keystroke.

**Recommended solution:**

1. Cancel in-flight provider requests when `savedQuery` changes (AbortController pattern at IPC layer or request generation counter).
2. Optional: provider `priority` + short-circuit on first high-confidence match.
3. Consider shared worker pool only if N > ~10 (premature until then).

---

### P14 — Testing gaps

**Problem:** Kernel unit tests only; no confidence in full launcher flows.

**Recommended solution:**

1. Add Playwright Electron smoke: boot → type in omni → calculator result visible.
2. Worker integration test: mock host, load fixture extension, assert `getHistory` round-trip.
3. Close manual items in `electron-fix-plan.md` or automate where possible.

---

### P15–P18 — Lower priority

| ID | Quick recommendation |
|----|----------------------|
| P15 | `fs.watch` on `EXTENSION_DIR` + worker terminate/respawn; manifest version check |
| P16 | Document single-instance as MVP; add optional UNIX socket later for CLI `nuxy toggle` |
| P17 | Add `electron-builder`, GitHub Actions `pnpm test && pnpm build`, eslint flat config |
| P18 | Remove or document `bun run start`; standardize on `pnpm dev` |

---

## Implementation plan (phased)

### Phase 0 — Align reality (1–2 days)

- [ ] Doc + `agents.md` path/sandbox sync (P9)
- [ ] Add “Implemented vs planned” table to `docs/README.md`

**Exit:** New contributors are not misled by docs.

### Phase 1 — Security baseline (3–5 days)

- [ ] Manifest permissions model (`permissions: string[]`)
- [ ] Gate clipboard + storage host channels (P4, P5)
- [ ] IPC channel allowlist (P6)
- [ ] Remove calculator `eval` (P8)

**Exit:** Malicious extension cannot read clipboard without declaration.

### Phase 2 — Registry & broker (5–8 days)

- [ ] Worker → kernel registry sync (P2)
- [ ] `broker.ts` + `core.extensions.invoke` (P3)
- [ ] Orchestrator Enter path in shell extension (P12)

**Exit:** Cross-extension call works with capability checks.

### Phase 3 — True empty shell (5–10 days)

- [ ] Extract `com.nuxy.shell` extension (P1)
- [ ] Empty state when no extensions (P11)
- [ ] Extension SDK template (P10)

**Exit:** Core `App.tsx` < 100 lines; architecture matches manifesto.

### Phase 4 — Quality & ship (ongoing)

- [ ] Playwright E2E (P14)
- [ ] Provider cancelation (P13)
- [ ] `electron-builder` + CI (P17)
- [ ] Extension hot reload (P15)

---

## Success metrics

| Metric | Current | Target (V1) |
|--------|---------|-------------|
| Kernel unit tests | 19 | 30+ (broker, permissions) |
| E2E tests | 0 | ≥ 3 critical paths |
| Docs path consistency | ~20 stale refs | 0 stale refs |
| Core `App.tsx` LOC | ~540 | < 100 |
| Extensions needing core edit for new provider | Yes | No |
| Cross-extension invoke with capability deny | N/A | Tested + passing |

---

## Related documents

| Topic | Doc |
|-------|-----|
| Canonical paths & kernel fixes | [electron-fix-plan.md](./electron-fix-plan.md) |
| MVP scope | [19-mvp-roadmap.md](./19-mvp-roadmap.md) |
| Security target state | [10-security.md](./10-security.md) |
| Extension types & omni input | [16-omni-input-system.md](./16-omni-input-system.md) |
| Testing | [12-testing-strategy.md](./12-testing-strategy.md) |
| Agent rules (update after Phase 0) | [../agents.md](../agents.md) |

---

## Decision log (open questions)

1. **Registry source of truth:** manifest-only vs worker `register*` sync — recommend sync with manifest as bootstrap type hint.
2. **Default shell extension:** bundled in repo `extensions/` vs downloaded on first run.
3. **Isolation long-term:** stay on `worker_threads` + esbuild bundle vs `isolated-vm` investment.

Record decisions here when resolved.

# Electron kernel fix plan

Tracking document for the `src/electron` audit and remediation. Status: **complete** (automated tests + build verified).

Run from repo root:

```bash
pnpm test    # 18 kernel unit tests
pnpm -C src build
```

## Canonical layout

All user data under `~/.nuxy/`:

| Path | Purpose |
|------|---------|
| `~/.nuxy/nuxyconfig` | User settings |
| `~/.nuxy/extensions/<folder>/` | Installed extensions (folder name on disk) |
| `~/.nuxy/data/<manifest.id>/` | Extension storage (chroot) |
| `~/.nuxy/themes/*.json` | Runtime themes |

Extension identity in IPC, protocol, and storage: **`manifest.id`** (e.g. `com.nuxy.clipboard`).

Bundled defaults ship in `src/themes/default-*.json` (UI assets; kernel copies them to `~/.nuxy/themes/` on first run). Tailwind scans that folder + uses a safelist so runtime `className` strings from theme JSON are included in CSS.

---

## Phases

### Phase 0 — Prep
- [x] `docs/electron-fix-plan.md` (this file)
- [x] `packages/core/src/types.ts`
- [x] `src/electron/paths.ts`
- [x] `config.ts` re-exports from `paths.ts`

### Phase 1 — Security
- [x] `protocol-resolve.ts` + `protocol.ts` path jail + logger
- [x] `worker/extension-host.ts` dedicated worker entry
- [x] `worker/spawn.ts` host loader + `path.relative` storage check
- [x] `ipc.ts` — `ext:invoke` timeout (15s)

### Phase 2 — Extension identity
- [x] `registry.ts`
- [x] `scanner.ts` — `manifest.id` as canonical id
- [x] `protocol-resolve.ts` — id → folder
- [x] `App.tsx` — tools use manifest id from `listTools`

### Phase 3 — Config wiring
- [x] `nuxyconfig.ts` — `windowWidth` / `opacity` validation
- [x] `config-runtime.ts` — `applyConfigToWindow`, `positionWindowOnDisplay`
- [x] `ipc.ts` — `window:center`, `window:dragMove`, `window:esc`, `kernel.getConfig`
- [x] `main.ts` — config apply on second-instance
- [x] `App.tsx` — `window.esc()` respects `escAction`

### Phase 4 — Structure
- [x] Default themes in `electron/themes/*.json`
- [x] `preload.ts` — removed hardcoded clipboard API
- [x] `dev/extensions.ts` — sync workspace `extensions/` → `~/.nuxy/extensions/` (walk-up path resolve; `NUXY_DEV_OVERWRITE=1` for full replace)
- [x] Migrate `~/.config/nuxy/data` → `~/.nuxy/data` on worker spawn

### Phase 5 — Window & polish
- [x] `window.ts` — destroy old window, transparency, position on show
- [x] Theme `version` field migration

### Phase 6 — Quality
- [x] `ipc-validate.ts` — kernel channel + ext id validation
- [x] `IpcResult` / `ThemeDefinition` types in `@nuxy/core`
- [x] `tailwind.config.js` reads colors from `default-dark.json`
- [x] Security/path docs updated

---

## Test checklist

### Automated (`pnpm test` from repo root)

- [x] Path traversal on `nuxy-ext://` blocked — `protocol-resolve.test.ts`
- [x] Storage path traversal blocked — `storage-path.test.ts`
- [x] IPC validation (kernel channels, extension id) — `ipc-validate.test.ts`
- [x] Extension registry id ↔ folder — `registry.test.ts`

### Manual (app runtime)

- [ ] Worker invoke times out after 15s
- [ ] `nuxy-ext://com.nuxy.clipboard/frontend.js` loads
- [ ] `escAction` values work
- [ ] `windowPosition` applied on show
- [ ] Dev mode does not wipe `~/.nuxy/extensions` edits
- [ ] Config reload updates opacity / alwaysOnTop

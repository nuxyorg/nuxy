# IPC public/private security — gap closure

**Status:** Implemented  
**Parent plan:** [`06-ipc-public-private-security.md`](./06-ipc-public-private-security.md)  
**Context:** First implementation (Claude CLI) landed core split + broker enforcement + pilot extensions. Audit found remaining security and plan-alignment gaps.

---

## G1 — Renderer fail-closed (critical)

### Problem

`validateExtInvokeArgs` still allows **private** channels when `callerExtId` is omitted. Any renderer code can invoke `window.core.ipc.invoke('com.nuxy.qbittorrent', 'list', {})` and reach a private handler.

### Target

| Scenario                         | Rule                                                                      |
| -------------------------------- | ------------------------------------------------------------------------- |
| Private channel                  | Requires `callerExtId === targetExtId`                                    |
| Public channel, same extension   | `callerExtId === targetExtId` OR omitted (public only)                    |
| Public channel, cross-extension  | Requires `callerExtId !== targetExtId`, target `callable`, channel public |
| Missing `callerExtId` on private | `CALLER_REQUIRED`                                                         |

### Entry points

| File                                                                     | Change                                                                                         |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `src/electron/ipc/validate.ts`                                           | Replace legacy fallback with rules above                                                       |
| `src/electron/ipc/validate.test.ts`                                      | Remove “backward compatible” private-without-caller test; add `CALLER_REQUIRED`                |
| `packages/extension-sdk/src/invoke-ipc.ts`                               | **New** — `invokeExtensionIpc(target, channel, payload?, caller?)` always passes `callerExtId` |
| `packages/extension-sdk/src/index.ts`                                    | Export helper                                                                                  |
| `extensions/**/utils/ipc.ts`                                             | Use helper (6 files)                                                                           |
| `extensions/nyaa/controller.ts`                                          | Pass `callerExtId` on all invokes                                                              |
| `extensions/settings/data.ts`                                            | Pass `callerExtId: com.nuxy.settings`; cross-call Ollama with caller                           |
| `extensions/settings/actions.ts`                                         | Kernel calls unchanged; extension calls get caller                                             |
| `extensions/shell/controller.ts`                                         | Pass `callerExtId: com.nuxy.shell` on cross-ext provider/orchestrator invokes                  |
| `extensions/angrysearch/controller.ts`, `extensions/store/controller.ts` | Pass own ext id                                                                                |

### Acceptance

- `validateExtInvokeArgs('com.nuxy.qbittorrent', 'list', {})` → `CALLER_REQUIRED`
- Same-ext private with `{ callerExtId: 'com.nuxy.qbittorrent' }` → success
- Nyaa → qBittorrent `getStatus` with `{ callerExtId: 'com.nuxy.nyaa' }` → success

---

## G2 — Reject invalid IPC sync (manifest enforcement)

### Problem

`validateIpcSync` logs errors but still calls `mergeRuntimeSync`. A handler marked `{ expose: 'public' }` but missing from `manifest.ipc.public` is registered anyway.

### Target

On `registry:sync`, run validation **before** merge. If `validation.errors.length > 0`:

1. Do **not** call `mergeRuntimeSync`
2. Call `markFailed(extId, joined errors)`
3. Log at error level

Warnings (manifest declares public channel with no handler yet) still allow merge.

### Entry points

| File                               | Change                                                    |
| ---------------------------------- | --------------------------------------------------------- |
| `src/electron/spawn/spawn.ts`      | Validate-then-merge                                       |
| `src/electron/spawn/spawn.test.ts` | Sync with public/manifest mismatch → no merge, markFailed |

---

## G3 — Nyaa torrent handoff: fixed qBittorrent target

### Problem

`torrent-handoff.ts` still scans all `add` deeplink extensions via `resolveReadyTorrentClientFromEntries`. Plan v1: explicit coupling to `com.nuxy.qbittorrent` (public `getStatus` + `add`).

### Target

- Constant `TORRENT_CLIENT_EXT_ID = 'com.nuxy.qbittorrent'`
- Remove kernel `listInstalledExtensions` + discovery from handoff path
- Runtime probe: `getStatus` → `add` on fixed id only
- Error when not `ready` (no “no client found” from multi-candidate logic)

### Entry points

| File                                            | Change                             |
| ----------------------------------------------- | ---------------------------------- |
| `extensions/nyaa/utils/torrent-handoff.ts`      | Simplify                           |
| `extensions/nyaa/tests/torrent-handoff.test.ts` | Drop listInstalledExtensions mocks |

---

## G4 — Ollama public `models` for Settings cross-call

### Problem

Settings fetches `com.nuxy.ollama` / `models` from renderer without `ipc.public` declaration. Fail-closed (G1) blocks this unless fixed.

### Target

```json
"ipc": { "public": ["models"] }
```

Backend: `core.ipc.handle('models', …, { expose: 'public' })`

### Entry points

| File                                      | Change                     |
| ----------------------------------------- | -------------------------- |
| `extensions/ollama/manifest.json`         | Add `ipc.public`           |
| `extensions/ollama/backend.ts`            | Mark `models` public       |
| `extensions/ollama/tests/backend.test.ts` | Assert public registration |

---

## G5 — Documentation (Phase 0 completion)

### Problem

Parent plan Phase 0 docs incomplete. EXTENSION_GUIDE only gained unrelated `showIf` settings docs.

### Target

Document public/private IPC in:

| File                              | Content                                                      |
| --------------------------------- | ------------------------------------------------------------ |
| `rules/MANIFEST_GUIDE.md`         | `ipc.public` field                                           |
| `rules/EXTENSION_GUIDE.md`        | § Backend — `handle(..., { expose: 'public' })`, callerExtId |
| `website/docs/api/ipc.md`         | Public/private + callerExtId                                 |
| `website/docs/design/security.md` | Cross-module public surface paragraph                        |

Update parent plan status to **implemented (see gaps doc)** when G1–G5 done.

---

## Out of scope (this gap pass)

- Reverting unrelated `showIf` / `nuxy-input` changes from first pass (harmless; separate cleanup optional)
- JSON Schema payload validation at kernel
- Per-caller ACL beyond public/private
- `download-manager` `add` in `ipc.public` (deeplink/internal only today)

---

## Verification checklist

```bash
pnpm -C src test -- src/electron/ipc packages/extension-host src/electron/spawn extensions/nyaa/tests extensions/ollama/tests extensions/ipc-explorer/tests
pnpm typecheck
```

Manual:

1. Settings → Nyaa → Enter Key Action shows 3 static options
2. IPC Explorer: private channel on qBittorrent disabled for invoke; public works with caller
3. Nyaa Enter with `torrentClient` when qBittorrent down → runtime error, not hidden setting

---

## Implementation order

1. G1 validate + invoke helper + call-site sweep
2. G2 spawn reject
3. G4 Ollama models public
4. G3 Nyaa handoff simplify
5. G5 docs
6. Full test + typecheck

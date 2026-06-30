# Security Review — branch `task/qbit-p0-p1`

- **Date:** 2026-06-26
- **Reviewer:** automated security review (two-phase: identification + independent false-positive filtering)
- **Diff reviewed:** `git diff --merge-base origin/HEAD` — 106 files, +2927/−675 vs `origin/main` (changes staged, uncommitted)
- **Threshold:** report only findings at confidence ≥ 8/10

## Result: No HIGH or MEDIUM findings at the required confidence

No exploitable security vulnerability was confirmed in this diff. Non-code files (locale JSON, `website/docs/**`, `rules/**`, `docs/**`, markdown) and test-only files were treated as context, not reported. One candidate was identified and independently filtered out below threshold (below).

## Candidate investigated and dismissed (confidence 3/10)

### Untrusted `save_path` reaches a subprocess via new `openSavePath` handler — `extensions/qbittorrent/backend.ts:110`

- **Category:** command_injection / untrusted-argument-to-subprocess
- **Assessed severity:** hardening only (not a concrete vuln) — **filtered out (3/10)**
- **Data flow (real, newly introduced):** the new `openSavePath` handler (`backend.ts:110-114`) does only `if (!savePath.trim()) throw …` then `await core.shell.open(savePath)`. `savePath` traces to the `list` mapping (`backend.ts:58` → `savePath: t.save_path`) sourced from the qBittorrent Web API JSON `/api/v2/torrents/info` (`utils/qbit-client.ts:161-164`). The diff also newly grants the `"shell"` permission in `manifest.json`.
- **Why dismissed:**
  - **Sink is `execFile`, not a shell.** `packages/extension-host/src/proxy-shell.ts:23-33` runs `execFile('xdg-open'|'explorer'|'open', [savePath])`. No shell ⇒ no metacharacter interpretation (`;` `|` `$()`), no whitespace argument-splitting, no extra-flag injection. The whole string is one argv element ⇒ no command injection / RCE.
  - **Channel is private and not cross-extension reachable.** `openSavePath` is absent from `manifest.json` `ipc.public` (only `getStatus`, `add`). `src/electron/ipc/validate.ts:109-123` rejects non-public channels unless `callerExtId === id`, so only qBittorrent's own frontend can invoke it.
  - **Requires a non-default threat model.** Default host is `http://localhost:8080` (the user's own trusted server). Attacker control of `save_path` needs a compromised/malicious remote server or an HTTP MITM on a non-default config, plus an explicit user action (activate a completed torrent).
  - **Worst realistic impact is forced-open**, not code execution — an attacker URL, a Windows UNC `\\host\share` (SMB/NTLM leak via `explorer`), or a registered URI-scheme handler.
- **Optional hardening (not a security fix):** before `core.shell.open(savePath)`, require `path.isAbsolute(savePath)`, reject URI schemes (`/^[a-z][a-z0-9+.-]*:/i`) and UNC prefixes (`\\`); prefer HTTPS for non-localhost hosts.

## High-risk areas explicitly verified as intact

- **IPC public/private enforcement (authz):** request-time enforcement in `src/electron/ipc/validate.ts` (private channels require `callerExtId === id`) is **unchanged**. The `validateIpcSync` edits in `registry.ts`/`spawn.ts` only affect startup warnings (now also flagging missing/extra `ipc.samples`); load-blocking conditions are unchanged. IPC Explorer's `canInvokeChannel` gating is client-side UI only; its calls run as `com.nuxy.ipc-explorer` and remain subject to kernel enforcement.
- **Path traversal — `src/electron/protocol/register.ts`:** only an export/injection list gained three `@nuxyorg/core` symbols (`computeKeyHints`, `flattenShellActions`, `isShellActionClickable`); the `nuxy-ext://` URL→file resolution logic is untouched.
- **XSS (renderer):** new rendering in `extensions/ipc-explorer/nuxy-tool-ipc-explorer.ts` and `extensions/qbittorrent/frontend.ts` uses LitElement text/property bindings only — no `innerHTML`/`unsafeHTML`/`insertAdjacentHTML`/`document.write`/`eval`. Network-derived `name`/`category`/`tags`/`save_path` are auto-escaped; IPC Explorer moved to shadow DOM (stricter).
- **i18n `mergeTranslations` (`packages/core/src/i18n.ts`, `extension-host/src/core-proxy.ts`, `kernel-handlers/i18n.ts`):** pure object spread of parsed locale JSON rendered as escaped text — no injection or trust-boundary change.
- **Settings password field (`settings.json`, `resolveExtInputType`):** a security improvement (masks the qBittorrent password input); returns a fixed `'password'|'color'|'text'` set.

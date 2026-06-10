---
title: Security Model
---

# Security Model

::: tip Full design document
For the complete security architecture (chroot jails, permission prompts, threat model), see [Security & Isolation](/design/security).
:::

## Worker Isolation

Every extension backend runs in its own Node.js Worker thread — a separate V8 isolate with no shared memory. An extension cannot:

- Read another extension's variables or in-memory state
- Access raw Node.js built-ins (`fs`, `child_process`, `os`, `path`)
- Reach the Electron main process directly
- Crash another extension or the main process (worker crashes are contained)

Communication with the outside world is only possible through a `MessagePort` connected to the Nuxy kernel. This port speaks the `host:call` / `host:reply` protocol described in [IPC & Kernel](/guide/ipc-kernel).

## Permission Model

Extensions declare which `CoreContext` APIs they need in the `permissions` array of `manifest.json`. The kernel enforces these at the `host:call` boundary — before executing any Electron API:

```json
{
  "permissions": ["storage", "clipboard", "media"]
}
```

| Permission       | Gates Access to                              | Sensitivity |
| ---------------- | -------------------------------------------- | ----------- |
| `storage`        | `core.storage.*` — sandboxed JSON files      | Low         |
| `clipboard`      | `core.clipboard.*` — OS clipboard read/write | High        |
| `media`          | `core.media.*` — now-playing metadata        | Medium      |
| `network`        | Outbound HTTP/fetch                          | Medium      |
| `notifications`  | System notifications                         | Low         |
| `fs`             | `core.fs.*` — filesystem operations          | Medium      |
| `db`             | `core.db.*` — SQLite databases               | Low         |
| `shell`          | `core.shell.*` — run external binaries       | High        |
| `settings.read`  | Read another extension's settings            | Low         |
| `settings.write` | Write another extension's settings           | Medium      |

If an extension calls a `core.*` API without the corresponding permission declared, the kernel rejects it at runtime with `PERMISSION_DENIED`. The extension receives a structured error — the main process never executes the underlying Electron API.

## Storage Chroot

When an extension calls `core.storage.read('history.json')`, the kernel translates the path:

```
~/.nuxy/data/com.nuxy.notes/notes.json
```

Path traversal attempts are blocked. If `com.nuxy.notes` requests `../com.nuxy.settings/config.json`, the kernel detects the traversal via `path.relative` and rejects the request. Extensions cannot access each other's storage directories.

The same chroot applies to `core.db.open('my-data')` — the SQLite file is created under the extension's data directory.

## `nuxy-ext://` Protocol Security

Extension frontend assets are served via the `nuxy-ext://` Electron protocol. The handler:

1. Resolves the extension ID to its on-disk folder path via the registry
2. Appends the requested file path
3. Checks that the resolved path is still within the extension folder (no `..` escape)
4. Serves the file (transpiling `.ts`/`.tsx` on the fly)

Any request escaping the extension folder is rejected with a 403.

## Capabilities: Caller and Callable

The `capabilities` manifest field controls cross-extension invocation rights:

- `callable: true` — other extensions may invoke this extension via `core.extensions.invoke`. The kernel will route broker calls to it.
- `caller: true` — this extension may call other extensions via `core.extensions.invoke`. The `core.extensions.invoke` API is not available to extensions with `caller: false`.

This creates a strict capability lattice. A standard tool extension (`callable: true, caller: false`) can be called by an orchestrator, but cannot itself initiate calls to other extensions. The AI orchestrator (`callable: false, caller: true`) can call tools but cannot be called by anything.

## Content Security Policy

The renderer runs with Electron's `contextIsolation: true`. Direct access to Node.js APIs from renderer code is blocked. All extension frontends are loaded as untrusted `nuxy-ext://` resources — they cannot access raw `ipcRenderer` and can only communicate through the `window.core` contextBridge API.

## Threat Model

| Threat                                                 | Mitigation                                             |
| ------------------------------------------------------ | ------------------------------------------------------ |
| Malicious extension reads another extension's data     | Storage chroot per extension ID                        |
| Malicious extension calls privileged Node APIs         | Worker has no native require; all I/O via host:call    |
| Malicious extension reads clipboard without permission | Permission check at host boundary                      |
| Compromised renderer injects arbitrary IPC             | contextBridge exposes only typed, allowlisted channels |
| Extension escapes its frontend asset folder            | nuxy-ext:// path traversal check                       |
| Extension calls another extension directly             | Broker enforces caller/callable capability bits        |
| Frontend reads another extension's DOM                 | Separate UI bundles; future sandboxed webviews planned |

## Planned Security Enhancements

- **Clipboard consent UI** — prompt the user on first clipboard read per extension, similar to browser permission prompts
- **Network proxying** — route extension `fetch()` through a kernel proxy with host allowlisting
- **Extension signing** — verify cryptographic signatures before loading third-party extensions
- **Per-command shell allowlisting** — `"permissions": [{ "name": "shell", "allowedCommands": ["ffmpeg"] }]`

## Next steps

- [Security & Isolation](/design/security) — full threat model
- [Extension Access](/extensions/extension-access) — permission gates and API surface
- [IPC & Kernel](/guide/ipc-kernel) — how host calls are routed

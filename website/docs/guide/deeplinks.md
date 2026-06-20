---
title: Deeplinks
---

# Deeplinks

Nuxy registers a `nuxy://` URL scheme so other applications — a browser,
another CLI tool, or an extension itself — can hand Nuxy a target tool, a
path within that tool, and query parameters, without needing Nuxy already
open and focused.

## URL shape

```
nuxy://<extension-id>/<path>?<query>
```

- `nuxy://settings/extension/nyaa` — opens Settings with the `nyaa` extension's panel selected
- `nuxy://download-manager/add?url=https://example.com/file.iso` — adds a download

`<extension-id>` is matched against the live extension registry (the same
ids declared as `id` in each extension's `manifest.json`). `<path>` and the
query string are passed through to the target extension untouched — Nuxy's
kernel does not interpret them beyond routing.

## How a deeplink is delivered

A `nuxy://...` URL can reach Nuxy through three channels, all converging on
the same dispatcher (`src/electron/deeplink/dispatch.ts`):

1. **OS protocol handler** — Nuxy registers itself via
   `app.setAsDefaultProtocolClient('nuxy')`. On macOS the OS hands the URL to
   the running instance via the `open-url` event. On Linux/Windows, since
   Nuxy is single-instance (`app.requestSingleInstanceLock`), a second launch
   attempt with a `nuxy://...` argv fires the `second-instance` event instead
   — argv is scanned for the URL (`src/electron/deeplink/argv.ts`).
2. **Cold start** — if Nuxy isn't running yet and the OS launches it directly
   with a `nuxy://...` argument (or `--open=nuxy://...`), the URL is queued
   until the renderer is ready, then dispatched.
3. **Control socket / CLI** — the existing `/tmp/nuxy.sock` control channel
   (which already accepts `toggle`/`show`) accepts an `open:<url>` command.
   `nuxy.sh` exposes this as:

   ```bash
   nuxy.sh --open "nuxy://settings/extension/nyaa"
   ```

   This is the mechanism for invoking Nuxy from an external process — e.g. a
   browser's "open with" dialog, or another extension's backend running in
   its own process.

## What happens on dispatch

`handleDeeplinkUrl` (`src/electron/deeplink/dispatch.ts`):

1. Parses the raw URL (`parse.ts`) into `{ extensionId, path, query }`.
   Malformed URLs, non-`nuxy:` schemes, or a missing extension id are
   rejected (`invalid-url`).
2. Resolves `extensionId` against the live extension registry. Unknown ids
   are rejected (`unknown-extension`) — a deeplink can never target an
   extension that isn't installed/loaded.
3. Shows/focuses the main window if it's hidden or minimized.
4. Sends a `deeplink:open` IPC event (`DEEPLINK_OPEN_CHANNEL` in
   `@nuxyorg/core`) to the renderer with the resolved `DeeplinkPayload`.

The renderer shell's `DeeplinkController`
(`extensions/shell/controllers/deeplink-controller.ts`) listens via
`window.core.deeplink.onOpen`, checks the target id against its known tool
list (defense in depth — the kernel already validated it), and activates the
target tool, forwarding `path`/`query` to it as a query string.

## Declaring accepted deeplinks in a manifest

An extension that wants to advertise which deeplink paths it accepts can add
an optional `deeplinks` field to its `manifest.json`:

```json
{
  "id": "download-manager",
  "deeplinks": {
    "schemes": ["add", "extension/:extId"]
  }
}
```

- Each entry is a path template matched against the `path` segment of an
  incoming `nuxy://<extension-id>/<path>` URL (the part after the host).
- A segment prefixed with `:` is a named parameter and matches any single
  path segment (e.g. `extension/:extId` matches `extension/nyaa`).
- Entries must not start with `/` — paths are always relative to the
  extension id, which is already the host segment of the URL.
- `schemes` is validated at extension-load time
  (`src/electron/deeplink/manifest.ts`) but is advisory at dispatch time: an
  unmatched path is only logged as a warning, not blocked, so an extension
  can still choose to handle freeform paths itself.

This field is primarily documentation + early validation. The actual routing
decision (which tool gets activated, what it does with the path/query) is
made by the target extension's own frontend code once `deeplink:open`
reaches it.

## Worked example: Settings panel deeplink

`extensions/settings` consumes `nuxy://settings/extension/:extId` end to end:
`SettingsController.selectPanelFromDeeplinkPath` reads the `extension/<id>`
path and pre-selects that extension's panel when the tool mounts. This is
the reference implementation other extensions can copy when adopting
deeplinks — see `extensions/settings/controller.ts`.

## Limitations / forward-looking notes

- There is currently no UI affordance for _constructing_ deeplinks from
  inside another extension (e.g. a "Nyaa settings" entry in the Ctrl+K
  command palette that resolves to
  `nuxy://settings/extension/nyaa`) — that is tracked separately as the
  Ctrl+K → settings deeplink work, which will introduce a `caller.commands`
  manifest field built on top of the contract documented here.
- A future download-manager extension is the first planned consumer of
  externally-triggered deeplinks (`nuxy://download-manager/add?url=...`).

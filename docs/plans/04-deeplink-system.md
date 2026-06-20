# Deeplink system

## Request

"Deeplink sistemi geliştirilmeli ve dokümante edilmeli. website/docs altına."
This is the foundational piece — task #3 (download manager) and #5 (Ctrl+K →
settings) both consume whatever scheme/API this defines, so this lands first.

## Design

### URL scheme

`nuxy://<extension-id>/<path>?<query>` — e.g.:

- `nuxy://settings/extension/nyaa` (open settings, Nyaa panel selected)
- `nuxy://download-manager/add?url=https://example.com/file.iso`

### OS registration

Register `nuxy://` as a custom protocol handler (Electron `app.setAsDefaultProtocolClient`),
mirroring the existing `nuxy-ext://` privileged protocol registered in
`src/electron/protocol/register.ts` but for OS-level invocation (not just
internal asset serving) — needs `app.on('open-url', ...)` (macOS) and
second-instance argv parsing (Linux/Windows, via `app.requestSingleInstanceLock`

- `second-instance` event) since Nuxy is a single-instance app already
  fronted by `/tmp/nuxy.sock`.

### Internal routing

1. New `src/electron/deeplink/` module: parses `nuxy://...` URLs, resolves
   `extension-id` against the scanner's registry, and dispatches a
   `deeplink:open` IPC event to the renderer with `{ extensionId, path, query }`.
2. Renderer's shell (`extensions/shell`) listens for `deeplink:open` and:
   - if the target extension is already the active tool, forwards
     `path`/`query` to it as a `committedQuery`-like payload;
   - otherwise activates/mounts the target tool element first, then forwards.
3. Manifest addition: extensions declare which deeplink paths they accept via
   a new manifest field, e.g.:
   ```json
   "deeplinks": {
     "schemes": ["add", "extension/:extId"]
   }
   ```
   so an extension can also act as a _caller_ — declaring it's allowed to
   construct deeplinks targeting another extension (the `caller` field this
   doc enables for task #5).
4. Also support invocation from the `/tmp/nuxy.sock` control channel and CLI
   (`nuxy.sh --open nuxy://...`) for the download-manager use case ("deeplink
   ile çalıştırılabilmeli" — must be launchable via deeplink from outside the
   app, e.g. a browser's "open with" dialog).

## Plan

1. Write the IPC contract types in `packages/core` (`DeeplinkPayload`, etc.) —
   this one _is_ a legitimate core/IPC concern, contrast with task #1's audit.
2. Implement `src/electron/deeplink/parse.ts` + `dispatch.ts` with unit tests
   (TDD: write parse/dispatch tests first).
3. Wire `app.setAsDefaultProtocolClient('nuxy')`, `open-url`, and
   `second-instance` argv parsing in `main.ts`.
4. Extend manifest schema validation (wherever manifests are currently
   validated, e.g. `extensions/scanner.ts`) to accept `deeplinks.schemes`.
5. Add renderer-side listener in shell + a minimal example using the existing
   `settings` extension (`nuxy://settings/extension/:extId`) to prove the
   round-trip end-to-end before other extensions adopt it.
6. Document under `website/docs/guide/deeplinks.md`: URL scheme, manifest
   field, OS registration caveats per-platform, CLI usage, code examples.
   Link from `website/docs/guide/extension-system.md`.

## Acceptance

- `nuxy://settings/extension/nyaa` opens Settings with Nyaa's panel selected,
  tested via Playwright e2e (`src/e2e`).
- `nuxy.sh --open nuxy://...` works from a second process via the existing
  `/tmp/nuxy.sock` mechanism.
- `website/docs/guide/deeplinks.md` published and linked from nav.

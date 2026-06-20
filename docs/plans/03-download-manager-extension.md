# Download manager extension

**Blocked on [#4 deeplink system](04-deeplink-system.md)** — consumes the
`nuxy://` scheme and manifest `deeplinks.schemes` field defined there.

## Request

"Bir download manager extensioni olmalı. Deeplink ile çalıştırılabilmeli." —
new extension, invocable via deeplink (e.g. external app/browser hands Nuxy a
URL to download).

## Plan

1. Scaffold `extensions/download-manager/` following the pattern of
   `extensions/file-transfer/` (closest existing analog — check its
   manifest/backend/frontend split first).
2. manifest.json: `type: "tool"`, permissions: `fs`, `net` (if available) or
   spawn a downloader process via `core.process`/`core.spawn` — check
   `CoreContext` in `packages/core/src/index.ts` for available primitives
   (`SpawnHandle` exists) — confirm whether a `net`/fetch-with-progress
   primitive exists in core or whether downloads need a spawned helper
   (`curl`/`wget`) or Node's `fetch` inside the worker.
3. Declare `"deeplinks": { "schemes": ["add"] }` so
   `nuxy://download-manager/add?url=...&filename=...` queues a download.
4. Backend: queue, progress events (`core.ipc` push events to frontend),
   persistence across restarts via `core.storage` or `core.db`.
5. Frontend (`nuxy-tool-download-manager`): list of active/completed
   downloads, progress bars, pause/resume/cancel.
6. TDD: backend queue logic tests first (mock `CoreContext`), then wire UI.
7. README for the extension + entry in `website/docs/extensions/built-in/`.

## Acceptance

- `nuxy://download-manager/add?url=https://example.com/file` queues and
  starts a download visible in the tool UI.
- Survives app restart (in-progress downloads resumed or clearly marked
  failed/incomplete).
- `pnpm -C src test` and `pnpm typecheck` pass; extension has its own
  `*.test.js` backend tests.

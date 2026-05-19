# Nuxy extension template

Copy this folder to `~/.nuxy/extensions/my-extension/` (folder name is arbitrary; `manifest.id` is canonical).

## Files

- `manifest.json` — id, type, `permissions`, `entry`
- `backend.js` — `register(core)` runs in a worker thread
- `frontend.js` — default export React component loaded via `nuxy-ext://<id>/frontend.js`

## Permissions

Declare host privileges in `manifest.json`:

```json
"permissions": ["storage", "clipboard"]
```

Undeclared host APIs (clipboard, media, etc.) are denied by the kernel.

## Development

From repo root, `pnpm dev` syncs `extensions/` into `~/.nuxy/extensions/` automatically.

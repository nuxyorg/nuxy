---
title: Storage API
---

# Storage API

Extension data is stored in a chroot-jailed directory per extension ID.

## Paths

| Location                                        | Purpose                             |
| ----------------------------------------------- | ----------------------------------- |
| `~/.nuxy/data/<extension-id>/`                  | Sandboxed JSON storage              |
| `~/.nuxy/data/<extension-id>/ext-settings.json` | User settings (via `core.settings`) |

Path traversal is blocked — extensions cannot read or write outside their own data directory.

## Read and write

```ts
// Read (returns null if file does not exist)
const history = await core.storage.read<Greeting[]>('history.json')

// Write
await core.storage.write('history.json', history)
```

Requires `storage` permission in `manifest.json`.

## Settings vs storage

| API                        | Use for                                          |
| -------------------------- | ------------------------------------------------ |
| `core.settings.read/write` | User-facing settings declared in `settings.json` |
| `core.storage.read/write`  | Extension-internal data (history, cache, state)  |

The Settings extension writes to `ext-settings.json` when the user saves changes. Backends should read settings via `core.settings` so both sides share the same source of truth.

## Database

For relational or full-text search data, use `core.db.open()` instead of JSON files. See [CoreContext](/api/core-context#database).

## Related

- [Extension Access & Permissions](/extensions/extension-access)
- [Configuration](/guide/configuration)

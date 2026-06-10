---
title: CoreContext
---

# CoreContext

`CoreContext` is the backend API injected into every extension worker via `register(core)`. Extensions cannot import Node built-ins directly — all system access goes through this proxy.

## Clipboard

```ts
core.clipboard.readText() // → Promise<string>
core.clipboard.writeText(text) // → Promise<void>
core.clipboard.readImage() // → Promise<string | null>  (data URL)
core.clipboard.writeImage(dataURL) // → Promise<void>
core.clipboard.writeFiles(paths) // → Promise<void>
```

Requires `clipboard` permission in `manifest.json`.

## File system

```ts
core.fs.fileExists(path)              // → Promise<boolean>
core.fs.readDir(path)                 // → Promise<DirEntry[]>
core.fs.readFile(path, encoding?)      // → Promise<string | Buffer>
core.fs.writeFile(path, data)         // → Promise<void>
core.fs.mkdir(path, opts?)            // → Promise<void>
core.fs.rename(old, new)              // → Promise<void>
core.fs.rm(path)                      // → Promise<void>
core.fs.stat(path)                    // → Promise<FileStat>
```

Requires `fs` permission.

## Storage (sandboxed JSON)

```ts
core.storage.read<T>(file) // → Promise<T | null>
core.storage.write<T>(file, data) // → Promise<void>
```

Data is namespaced under `~/.nuxy/data/<extension-id>/`. Requires `storage` permission.

## Database

```ts
const db = await core.db.open('my-data')
await db.exec('CREATE TABLE ...')
const stmt = db.prepare('SELECT * FROM items WHERE id = ?')
stmt.run(id)
db.close()
```

Requires `db` permission.

## Shell

```ts
core.shell.openPath(path) // open file/folder in OS default app
core.shell.openExternal(url) // open URL in browser
core.shell.exec(command) // run allowlisted command
```

Requires `shell` permission.

## Media

```ts
const track = await core.media.getNowPlaying() // → NowPlaying | null
```

Requires `media` permission. Linux uses MPRIS via D-Bus.

## Settings

```ts
await core.settings.read<T>(key)
await core.settings.write(key, value)
await core.settings.readExtension?.(extId, key)
await core.settings.writeAllExtension?.(extId, values)
```

Extension settings are managed by the Settings tool. Use `core.settings`, not `core.storage`, for user-facing config.

## Config & logging

```ts
core.config.get()                     // → Promise<NuxyConfig>
core.logger.silly/info/warn/error(msg, meta?)
```

## Internationalisation

```ts
core.i18n.locale // resolved BCP 47 locale (e.g. "tr", "ja-JP")
core.i18n.dir // 'ltr' | 'rtl'
core.i18n.t(key) // → translated string
core.i18n.t(key, vars) // → interpolated ("Hello, {name}!")
core.i18n.t(key, vars, n) // → plural form
```

## Related

- [Registry API](/api/registry)
- [IPC API](/api/ipc)
- [Extension Access & Permissions](/extensions/extension-access)

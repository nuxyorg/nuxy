# ANGRYsearch

> Instant full-filesystem file search powered by a local FTS4 SQLite index.

**Type:** `tool`
**Version:** 1.0.0
**ID:** `com.nuxy.angrysearch`
**Permissions:** `storage` `shell` `fs` `db`

---

## Overview

ANGRYsearch indexes your entire filesystem into a SQLite full-text-search database and lets you find any file or directory in milliseconds. Results appear as you type — no waiting for `find` or `locate`. The index is built in the background on first launch and automatically refreshed on a configurable schedule. Both plain substring matching and regular expression search are supported.

---

## Extension Type

### `tool`

Appears in the Nuxy tool list. The user activates it by selecting it from the shell, then interacts through the omnibar query and keyboard shortcuts.

---

## Usage

### Activation

Select **ANGRYsearch** from the tool list and start typing. Results appear once at least 3 characters have been entered.

### Keyboard Shortcuts

| Key       | Action                                              |
| --------- | --------------------------------------------------- |
| `↑` `↓`   | Navigate the results list                           |
| `Enter`   | Open the selected file with the default application |
| `⇧ Enter` | Open the folder containing the selected file        |

Additional actions available via the Nuxy action menu:

| Action            | Description                                             |
| ----------------- | ------------------------------------------------------- |
| Update Database   | Trigger a manual re-index of the filesystem             |
| Toggle Regex Mode | Switch between normal substring search and regex search |

### Examples

**Example 1 — Find a file by name:**
Type `nuxyconfig` → all files whose path contains that string are listed immediately.

**Example 2 — Open the containing folder:**
Navigate to a result with `↑`/`↓`, then press `⇧ Enter` to open the parent directory in your file manager.

**Example 3 — Regex search:**
Activate Regex Mode from the action menu, then type `\.log$` to find every file ending in `.log`.

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key                   | Type   | Default                                              | Description                                                                |
| --------------------- | ------ | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| `scanRoot`            | text   | `/`                                                  | Root directory to index (e.g. `/` or `/home/user`)                         |
| `ignoredRoots`        | text   | `/proc,/dev,/sys,/snap,/run,/tmp,/var/run,/var/lock` | Comma-separated list of top-level directories to skip during indexing      |
| `updateIntervalHours` | select | `6`                                                  | How often the index is automatically rebuilt (1 / 3 / 6 / 12 / 24 hours)   |
| `searchLimit`         | select | `500`                                                | Maximum number of results returned per query (50 / 100 / 200 / 500 / 1000) |

---

## Permissions

| Permission | Used for                                                                |
| ---------- | ----------------------------------------------------------------------- |
| `storage`  | Persisting the SQLite index across sessions                             |
| `shell`    | Opening files and folders with the system default application           |
| `fs`       | Walking the filesystem during index building; reading directory entries |
| `db`       | Creating and querying the FTS4 SQLite database                          |

---

## Localization

| Locale | Language          |
| ------ | ----------------- |
| `en`   | English (default) |
| `tr`   | Turkish           |

To add a new locale, create `locales/<code>.json` and add the code to `locales.supported` in `manifest.json`.

---

## Platform & Environment

| Platform        | Supported | Notes |
| --------------- | --------- | ----- |
| Linux (X11)     | Yes       |       |
| Linux (Wayland) | Yes       |       |
| macOS           | Yes       |       |

The initial index build can take several minutes on large filesystems. Subsequent queries hit the pre-built SQLite FTS4 index and return results instantly. The database is stored at `~/.nuxy/data/com.nuxy.angrysearch/angry_database.db`.

---

## Cross-Extension Integration

### This extension can be called by other extensions

`capabilities.callable: true` — other extensions can invoke ANGRYsearch directly:

```ts
const result = await core.extensions.invoke('com.nuxy.angrysearch', 'search', {
  query: 'myfile',
  regex: false,
})
```

**Exposed IPC channels:**

| Channel          | Payload                              | Returns                                                                | Description                                      |
| ---------------- | ------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------ |
| `search`         | `{ query: string, regex?: boolean }` | `{ items: AngrysearchItem[] }`                                         | Search the index; requires at least 3 characters |
| `getStatus`      | —                                    | `{ isUpdating: boolean, lastUpdate: string \| null, exists: boolean }` | Current database status                          |
| `updateDatabase` | —                                    | `boolean`                                                              | Trigger a background re-index                    |
| `openFile`       | `string` (full path)                 | `boolean`                                                              | Open a file with the system default handler      |
| `openLocation`   | `string` (full path)                 | `boolean`                                                              | Open the directory containing the given path     |

---

## Manifest Reference

```json
{
  "id": "com.nuxy.angrysearch",
  "name": "ANGRYsearch",
  "version": "1.0.0",
  "type": "tool",
  "icon": "search",
  "permissions": ["storage", "shell", "fs", "db"],
  "capabilities": {
    "callable": true,
    "caller": false
  },
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.tsx",
    "settings": "settings.json"
  },
  "locales": {
    "default": "en",
    "supported": ["en", "tr"]
  }
}
```

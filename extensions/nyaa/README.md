<!-- cspell:ignore Frieren -->

# Nyaa Search

> Search nyaa.si for torrents and copy magnet links directly to the clipboard.

**Type:** `tool`
**Version:** 1.0.0
**ID:** `com.nuxy.nyaa`
**Permissions:** `network` `clipboard`

---

## Overview

Nyaa Search lets you query [nyaa.si](https://nyaa.si) from the Nuxy launcher without opening a browser. Type a title, browse results by seeder count, and press Enter to run the highest-priority action on the selected result.

Results show trust level (Normal / Trusted / Remake), seeder and leecher counts, and file size at a glance. The detail panel displays the full title, category, date, and a truncated magnet preview.

Enter and Shift+Enter bind to the first two available actions from your configured priority list. When the qBittorrent extension is unavailable, torrent-client is skipped and the remaining priorities shift into Enter and Shift+Enter automatically. While Nyaa is open, readiness is polled every 2 seconds so labels update as soon as qBittorrent becomes available.

---

## Extension Type

### `tool`

Appears in the Nuxy tool list. The user activates it by selecting it from the shell, then interacts through the omnibar query and keyboard shortcuts.

---

## Usage

### Activation

Select **Nyaa Search** from the tool list and type a title into the omnibar. Results load automatically after a short debounce. Navigate the list with the arrow keys and press Enter to run the primary action (default: add via qBittorrent when available, otherwise copy magnet).

### Keyboard Shortcuts

| Key           | Action                                                   |
| ------------- | -------------------------------------------------------- |
| `↑` `↓`       | Navigate results                                         |
| `Enter`       | Highest-priority available action on the selected result |
| `Shift+Enter` | Second-priority available action                         |
| `Ctrl+A`      | Enter multi-select mode                                  |
| `Ctrl+C`      | Copy all checked magnets (multi-select)                  |
| `Ctrl+D`      | Download all checked torrents (multi-select)             |

### Examples

**Example 1 — Search for a series:**
Type `Frieren` → results load sorted by seeders. Press `↓` to browse, then `Enter` to copy the magnet of the selected entry.

**Example 2 — Trusted only:**
Set Filter to **Trusted Only** in Settings, then search — only green (trusted uploader) rows appear.

**Example 3 — Audio releases:**
Change Category to **Audio** in Settings, then search for a soundtrack title.

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key                   | Type          | Default                                          | Description                                                         |
| --------------------- | ------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| `category`            | select        | `1_2` (Anime - English)                          | Nyaa category filter                                                |
| `filter`              | select        | `0` (No Filter)                                  | Removes remakes or limits to trusted uploader(s)                    |
| `sortBy`              | select        | `seeders`                                        | Result sort order: Seeders, Newest, Size, or Downloads              |
| `enterActionPriority` | priority-list | `torrentClient`, `copyMagnet`, `downloadTorrent` | Ordered Enter key actions; reorder in Settings with ↑↓ and Shift+↑↓ |

---

## Permissions

| Permission  | Used for                             |
| ----------- | ------------------------------------ |
| `network`   | Fetching search results from nyaa.si |
| `clipboard` | Writing the selected magnet link     |

---

## Localization

| Locale | Language          |
| ------ | ----------------- |
| `en`   | English (default) |

---

## Platform & Environment

All platforms supported by Nuxy.

Requires an active internet connection. nyaa.si must be reachable from the host machine (check regional availability or use a VPN if needed).

---

## Manifest Reference

```json
{
  "id": "com.nuxy.nyaa",
  "name": "Nyaa Search",
  "version": "1.0.0",
  "type": "tool",
  "icon": "search",
  "permissions": ["network", "clipboard"],
  "capabilities": {
    "callable": false,
    "caller": false
  },
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.tsx",
    "settings": "settings.json"
  },
  "locales": {
    "default": "en",
    "supported": ["en"]
  }
}
```

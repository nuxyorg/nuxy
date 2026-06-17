<!-- cspell:ignore Frieren -->

# Nyaa Search

> Search nyaa.si for torrents and copy magnet links directly to the clipboard.

**Type:** `tool`
**Version:** 1.0.0
**ID:** `com.nuxy.nyaa`
**Permissions:** `network` `clipboard`

---

## Overview

Nyaa Search lets you query [nyaa.si](https://nyaa.si) from the Nuxy launcher without opening a browser. Type a title, browse results by seeder count, and press Enter to copy the magnet link — ready to paste into any torrent client.

Results show trust level (Normal / Trusted / Remake), seeder and leecher counts, and file size at a glance. The detail panel displays the full title, category, date, and a truncated magnet preview.

---

## Extension Type

### `tool`

Appears in the Nuxy tool list. The user activates it by selecting it from the shell, then interacts through the omnibar query and keyboard shortcuts.

---

## Usage

### Activation

Select **Nyaa Search** from the tool list and type a title into the omnibar. Results load automatically after a short debounce. Navigate the list with the arrow keys and press Enter to copy the magnet link to the clipboard.

### Keyboard Shortcuts

| Key     | Action                     |
| ------- | -------------------------- |
| `↑` `↓` | Navigate results           |
| `Enter` | Copy magnet link and close |

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

| Key        | Type   | Default                 | Description                                            |
| ---------- | ------ | ----------------------- | ------------------------------------------------------ |
| `category` | select | `1_2` (Anime - English) | Nyaa category filter                                   |
| `filter`   | select | `0` (No Filter)         | Removes remakes or limits to trusted uploader(s)       |
| `sortBy`   | select | `seeders`               | Result sort order: Seeders, Newest, Size, or Downloads |

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

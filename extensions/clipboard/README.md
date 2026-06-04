# Clipboard Manager

> Tracks everything you copy — text, images, colors, URLs, and file paths — in a searchable history with pin support.

**Type:** `tool`
**Version:** 1.0.0
**ID:** `com.nuxy.clipboard`
**Permissions:** `clipboard` `storage` `fs`

---

## Overview

Clipboard Manager polls the system clipboard in the background and builds a persistent history of every item you copy. Open it from the shell to browse, search, preview, and re-copy any past entry. Items can be pinned so they survive the history cap and are never evicted. The split-pane UI shows a scrollable list on the left and a rich preview (image, color swatch, file metadata) on the right.

---

## Extension Type

### `tool`

Appears in the Nuxy tool list. The user activates it by selecting **Clipboard Manager** from the shell. The omnibar filters the list as you type.

---

## Usage

### Activation

Select **Clipboard Manager** from the tool list. The history list appears immediately. Type in the omnibar to filter by content. The preview panel updates as you move through items.

### Keyboard Shortcuts

| Key     | Action                                              |
| ------- | --------------------------------------------------- |
| `↑` `↓` | Navigate history list                               |
| `Enter` | Copy selected item (or copy-as-file for file paths) |
| `Esc`   | Deselect / return to list                           |

Actions available via the Nuxy action palette when an item is selected:

| Action                   | Description                         |
| ------------------------ | ----------------------------------- |
| **Delete Selected Item** | Remove the item from history        |
| **Pin Selected Item**    | Pin the item so it is never evicted |
| **Unpin Selected Item**  | Remove the pin from a pinned item   |

### Examples

**Example 1 — Re-copy a previous entry:**
Open Clipboard Manager, press `↓` to select the desired item, then press `Enter` to copy it to the clipboard. Nuxy hides automatically after copying.

**Example 2 — Search and copy a URL:**
Type part of the URL in the omnibar. Matching items appear in the list. Navigate with `↓`, then press `Enter`.

**Example 3 — Pin a frequently used snippet:**
Select the item and choose **Pin Selected Item** from the action palette. Pinned items are sorted to the top and are never removed even when the history cap is reached.

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key               | Type   | Default | Description                                                                              |
| ----------------- | ------ | ------- | ---------------------------------------------------------------------------------------- |
| `pollIntervalMs`  | select | `1000`  | How frequently the manager polls the system clipboard (`250 ms`, `500 ms`, `1 s`, `2 s`) |
| `maxHistoryItems` | select | `100`   | Maximum number of unpinned entries to retain (`25`, `50`, `100`, `200`, `500`)           |
| `storeImages`     | toggle | `true`  | Store copied images and screenshots in the clipboard history                             |

---

## Permissions

| Permission  | Used for                                                                                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| `clipboard` | Reading new clipboard contents on each poll tick; writing an item back when the user copies from history               |
| `storage`   | Persisting the history list to `history.json` between sessions                                                         |
| `fs`        | Checking whether a stored file path still exists on disk; copying file entries to the clipboard as native file objects |

---

## Localization

| Locale | Language          |
| ------ | ----------------- |
| `en`   | English (default) |
| `tr`   | Turkish           |

To add a new locale, create `locales/<code>.json` and add the code to `locales.supported` in `manifest.json`.

---

## Platform & Environment

| Platform        | Supported | Notes                                             |
| --------------- | --------- | ------------------------------------------------- |
| Linux (X11)     | Yes       |                                                   |
| Linux (Wayland) | Yes       | Image clipboard support depends on the compositor |
| macOS           | Yes       |                                                   |

---

## Cross-Extension Integration

### This extension can be called by other extensions

Set `capabilities.callable: true` in your manifest, then call it from another backend:

```ts
const history = await core.extensions.invoke('com.nuxy.clipboard', 'getHistory', null)
```

**Exposed IPC channels:**

| Channel        | Payload        | Returns           | Description                                             |
| -------------- | -------------- | ----------------- | ------------------------------------------------------- |
| `getHistory`   | `null`         | `ClipboardItem[]` | Return the full history list (pinned first)             |
| `copyItem`     | `id: string`   | `ClipboardItem[]` | Copy item to system clipboard and move it to the top    |
| `copyFile`     | `id: string`   | `ClipboardItem[]` | Copy a file-path item to the clipboard as a native file |
| `pinItem`      | `id: string`   | `ClipboardItem[]` | Pin an item                                             |
| `unpinItem`    | `id: string`   | `ClipboardItem[]` | Unpin an item                                           |
| `deleteItem`   | `id: string`   | `ClipboardItem[]` | Delete an item from history                             |
| `clearHistory` | `null`         | `ClipboardItem[]` | Remove all unpinned items                               |
| `checkFile`    | `path: string` | `boolean`         | Check whether the file at `path` still exists on disk   |

---

## Manifest Reference

```json
{
  "id": "com.nuxy.clipboard",
  "name": "Clipboard Manager",
  "version": "1.0.0",
  "type": "tool",
  "icon": "clipboard",
  "permissions": ["clipboard", "storage", "fs"],
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

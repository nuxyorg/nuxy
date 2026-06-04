# Emoji Picker

> Browse, search, and paste emojis from a categorised grid with favorites support.

**Type:** `tool`
**Version:** 1.0.0
**ID:** `com.nuxy.emoji-picker`
**Permissions:** `clipboard` `storage` `shell`

---

## Overview

Emoji Picker presents the full emoji set in a two-panel layout: a category sidebar on the left and a 9-column grid on the right. Type in the omnibar to filter by emoji name or category. Select an emoji to copy it to the clipboard and automatically paste it into the previously focused window. Up to 60 favorites can be pinned and appear as the first category. The backend persists favorites across sessions using `storage`.

---

## Extension Type

### `tool`

Appears in the Nuxy tool list. The user activates it by selecting **Emoji Picker** from the shell, then either browses by category or types a search term in the omnibar.

---

## Usage

### Activation

Select **Emoji Picker** from the tool list. The category list is focused on the left panel and the emoji grid is on the right. Typing in the omnibar switches instantly to search mode.

### Keyboard Shortcuts

**Left panel (category navigation):**

| Key           | Action                                   |
| ------------- | ---------------------------------------- |
| `↑` `↓`       | Navigate categories                      |
| `→` / `Enter` | Focus emoji grid for the active category |

**Right panel (emoji grid):**

| Key      | Action                                                                                |
| -------- | ------------------------------------------------------------------------------------- |
| `↑` `↓`  | Move up / down one row                                                                |
| `←` `→`  | Move left / right one column; `←` at the left edge returns focus to the category list |
| `Enter`  | Copy the focused emoji and paste it into the previously active window                 |
| `Ctrl+F` | Toggle the focused emoji in/out of favorites                                          |

**Mouse:**

| Gesture     | Action               |
| ----------- | -------------------- |
| Left click  | Copy and paste emoji |
| Right click | Toggle favorite      |

### Examples

**Example 1 — Quick emoji by search:**
Type `rocket` in the omnibar → matching emojis appear. Press `Enter` on the focused one to copy and paste it.

**Example 2 — Browse by category:**
Press `↓` to navigate to the **Travel & Places** category, press `→` to enter the grid, navigate to the desired emoji with arrow keys, then press `Enter`.

**Example 3 — Add a favorite:**
Focus any emoji and press `Ctrl+F`. It is immediately added to the **Favorites** category at the top of the sidebar.

---

## Permissions

| Permission  | Used for                                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `clipboard` | Writing the selected emoji as text to the system clipboard; additionally writing to the X11 selection buffer (`selection` type)    |
| `storage`   | Persisting the favorites list (`favorites.json`) between sessions                                                                  |
| `shell`     | Running `xdotool key Shift+Insert` (falling back to `ctrl+v`) to trigger a paste in the previously focused window after Nuxy hides |

---

## Localization

| Locale | Language          |
| ------ | ----------------- |
| `en`   | English (default) |
| `tr`   | Turkish           |

To add a new locale, create `locales/<code>.json` and add the code to `locales.supported` in `manifest.json`.

---

## Platform & Environment

| Platform        | Supported | Notes                                                                                                    |
| --------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| Linux (X11)     | Yes       | Full paste support via `xdotool`                                                                         |
| Linux (Wayland) | Partial   | `xdotool` is not available on Wayland; the emoji is copied to the clipboard but auto-paste does not work |
| macOS           | Partial   | `xdotool` is not available on macOS; the emoji is copied to the clipboard but auto-paste does not work   |

**Auto-paste** (the step where Nuxy hides and triggers `Shift+Insert` / `Ctrl+V` in the previously focused app) requires `xdotool`, which is an X11-only tool. On Wayland and macOS the emoji is still copied to the clipboard — the user must paste manually.

## Requirements

| Requirement | Minimum version | Install                                               |
| ----------- | --------------- | ----------------------------------------------------- |
| `xdotool`   | any             | `sudo apt install xdotool` / `sudo pacman -S xdotool` |

Required only for auto-paste on X11. The extension functions without it (copy only).

---

## Cross-Extension Integration

### This extension can be called by other extensions

Set `capabilities.callable: true` in your manifest, then call it from another backend:

```ts
const favorites = await core.extensions.invoke('com.nuxy.emoji-picker', 'getFavorites', null)
```

**Exposed IPC channels:**

| Channel          | Payload         | Returns        | Description                                                              |
| ---------------- | --------------- | -------------- | ------------------------------------------------------------------------ |
| `getFavorites`   | `null`          | `string[]`     | Return the current favorites list (emoji characters)                     |
| `toggleFavorite` | `emoji: string` | `string[]`     | Add or remove an emoji from favorites; returns updated list              |
| `copy`           | `emoji: string` | `{ ok: true }` | Write the emoji to the clipboard (and selection buffer)                  |
| `paste`          | `null`          | `{ ok: true }` | Trigger a paste keystroke in the previously focused window via `xdotool` |

---

## Manifest Reference

```json
{
  "id": "com.nuxy.emoji-picker",
  "name": "Emoji Picker",
  "version": "1.0.0",
  "type": "tool",
  "icon": "emoji",
  "permissions": ["clipboard", "storage", "shell"],
  "capabilities": {
    "callable": true,
    "caller": false
  },
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.tsx"
  },
  "locales": {
    "default": "en",
    "supported": ["en", "tr"]
  }
}
```

# Settings

> Central configuration panel for Nuxy appearance, window behaviour, language, and installed extensions.

**Type:** `tool`  
**Version:** 1.0.0  
**ID:** `com.nuxy.settings`  
**Permissions:** `storage` `settings.read` `settings.write`

---

## Overview

Settings is the built-in configuration tool for Nuxy. It exposes a two-panel interface with a vertical tab bar on the left and a scrollable list of options on the right. Changes apply instantly — theme, zoom, font, and window properties update in real time without requiring a restart. The Settings tool also surfaces the `settings.json` fields of every installed extension that declares them, so users have a single place to configure the entire application.

---

## Extension Type

### `tool`
Appears in the Nuxy tool list. The user selects **Settings** from the shell and navigates the option list with the keyboard or mouse.

---

## Usage

### Activation

Select **Settings** from the tool list. The panel opens with the **General** section focused. Use `↑` / `↓` to move between rows and `Enter` to open a dropdown for the highlighted row.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` `↓` | Move between settings rows (or between dropdown options when a dropdown is open) |
| `Enter` | Open the dropdown for the selected row, or confirm the focused option |
| `Esc` | Close an open dropdown without changing the value |

### Examples

**Example 1 — Change theme:**
Navigate to **General → Theme**, press `Enter`, select a theme from the dropdown, and press `Enter` again. The window repaints immediately.

**Example 2 — Adjust zoom:**
Navigate to **General → Zoom**, open the dropdown, and pick a percentage. The renderer rescales at once.

**Example 3 — Configure an extension:**
Scroll to the extension's named section (e.g. **Ollama**) and adjust its fields directly without opening the extension itself.

**Example 4 — Enable or disable an extension:**
Open the **Extensions** section. Each non-bootstrap extension has a Yes/No toggle. Switching to **No** disables the extension immediately.

**Example 5 — Set preferred language:**
Navigate to **Language → Preferred Language (1st)** and select a locale from the searchable dropdown. All extensions that support that locale will switch to it.

---

## Settings

The Settings tool manages the following Nuxy-wide options (stored in `settings.json`):

**General**

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `theme` | select | `dark` | Active visual theme |
| `iconPack` | select | *(none)* | Active icon pack extension |
| `zoom` | select | `100%` | Renderer zoom level: 75% – 150% |
| `font` | select | `system` | UI font family; lists installed system fonts |

**Window**

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `escAction` | select | `hide` | What pressing Esc does: `hide`, `minimize`, `quit`, or `none` |
| `blurAction` | select | `hide` | What losing focus does: same options as `escAction` |
| `windowWidth` | select | `800` | Window width in pixels (600 – 1200) |
| `windowMaxHeight` | select | `600` | Maximum window height in pixels (400 – 800) |
| `windowPosition` | select | `Upper Center` | Where the window appears on screen at launch |
| `opacity` | select | `1` | Window opacity: 70% – 100% |
| `alwaysOnTop` | select | `false` | Keep the window above all other windows |
| `showInTaskbar` | select | `false` | Show Nuxy in the system taskbar / dock |
| `showOnStartup` | select | `false` | Open Nuxy automatically at login |

**Language**

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `preferredLanguages[0]` | select | *(none)* | First preferred locale for extension i18n |
| `preferredLanguages[1]` | select | *(none)* | Second preferred locale (fallback) |
| `preferredLanguages[2]` | select | *(none)* | Third preferred locale (fallback) |

---

## Permissions

| Permission | Used for |
|------------|----------|
| `storage` | Reading and writing the global `settings.json` file |
| `settings.read` | Reading per-extension setting values for display |
| `settings.write` | Persisting per-extension setting changes |

---

## Localization

| Locale | Language |
|--------|----------|
| `en` | English (default) |
| `tr` | Turkish |

To add a new locale, create `locales/<code>.json` and add the code to `locales.supported` in `manifest.json`.

---

## Platform & Environment

| Platform | Supported | Notes |
|----------|-----------|-------|
| Linux (X11) | Yes | |
| Linux (Wayland) | Yes | |
| macOS | Yes | |

---

## Manifest Reference

```json
{
  "id": "com.nuxy.settings",
  "name": "Settings",
  "version": "1.0.0",
  "type": "tool",
  "icon": "settings",
  "permissions": ["storage", "settings.read", "settings.write"],
  "capabilities": {
    "callable": false,
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

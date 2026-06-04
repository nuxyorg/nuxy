# Color Picker

> Parse and convert color values between HEX, RGB, and HSL formats with a saved history.

**Type:** `tool`
**Version:** 1.0.0
**ID:** `com.nuxy.color`
**Permissions:** `clipboard` `storage`

---

## Overview

Color Picker lets you type any color value into the omnibar and instantly see it converted to all three common formats (HEX, RGB, HSL). A live color swatch confirms the parsed result. Save colors you use often — they appear in the history list so you can copy any format with one keypress.

---

## Extension Type

### `tool`

Appears in the Nuxy tool list. The user activates it by selecting it from the shell, then types a color string in the omnibar.

---

## Usage

### Activation

Select **Color Picker** from the tool list, then type a color value in the omnibar.

### Keyboard Shortcuts

| Key     | Action                                                               |
| ------- | -------------------------------------------------------------------- |
| `↑` `↓` | Navigate history list                                                |
| `Enter` | Copy active color (query or selected history item) in default format |
| `S`     | Save the current query color to history                              |
| `D`     | Delete selected history item                                         |

### Examples

**Example 1 — Convert a hex color:**
Type `#3b82f6` → the right panel shows the hex, RGB, and HSL equivalents with a live swatch. Press `Enter` to copy the default format.

**Example 2 — Parse rgb():**
Type `rgb(59, 130, 246)` → same live preview. Press `Enter` to copy.

**Example 3 — Save and reuse:**
Type `hsl(217, 91%, 60%)`, press `S` to save it. Next time you open Color Picker the color is in the history list — press `↓` to select it and `Enter` to copy.

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key          | Type   | Default | Description                                         |
| ------------ | ------ | ------- | --------------------------------------------------- |
| `copyFormat` | select | `hex`   | Which format `Enter` copies: `hex`, `rgb`, or `hsl` |

---

## Permissions

| Permission  | Used for                                               |
| ----------- | ------------------------------------------------------ |
| `clipboard` | Writing the copied color value to the system clipboard |
| `storage`   | Persisting the saved color history across sessions     |

---

## Manifest Reference

```json
{
  "id": "com.nuxy.color",
  "name": "Color Picker",
  "version": "1.0.0",
  "type": "tool",
  "icon": "color",
  "permissions": ["clipboard", "storage"],
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

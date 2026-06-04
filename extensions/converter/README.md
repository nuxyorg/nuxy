# Unit Converter

> Convert between units of length, weight, temperature, area, volume, speed, time, and data — directly from the omnibar.

**Type:** `tool`
**Version:** 1.0.0
**ID:** `com.nuxy.converter`
**Permissions:** `clipboard`

---

## Overview

Unit Converter parses a plain-text expression typed in the omnibar and returns a list of equivalent values in all units of the same category. It supports both metric and imperial systems and can target a specific output unit with `to` syntax. Results appear instantly as you type, and pressing `Enter` copies the highlighted result to the clipboard.

---

## Extension Type

### `tool`

Appears in the Nuxy tool list. The user activates it by selecting **Unit Converter** from the shell, then types a conversion expression directly in the omnibar.

---

## Usage

### Activation

Select **Unit Converter** from the tool list and type a value with a unit directly in the omnibar. Results update as you type with a 120 ms debounce.

### Keyboard Shortcuts

| Key     | Action                            |
| ------- | --------------------------------- |
| `↑` `↓` | Navigate result list              |
| `Enter` | Copy selected result to clipboard |

### Examples

**Example 1 — Convert to all units:**
Type `100 km` → all length equivalents (miles, meters, feet, etc.) appear below.

**Example 2 — Convert to a specific unit:**
Type `32 F to C` → shows the result in Celsius only.

**Example 3 — Weight conversion:**
Type `5 kg` → shows pounds, ounces, grams, etc. Press `↓` to select a result, then `Enter` to copy it.

**Example 4 — Data size:**
Type `1.5 GB` → shows the equivalent in MB, TB, GiB, MiB, and bytes.

**Supported categories:** length, weight, temperature, area, volume, speed, time, data

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key          | Type   | Default | Description                                                            |
| ------------ | ------ | ------- | ---------------------------------------------------------------------- |
| `unitSystem` | select | `both`  | Which unit systems to show in results: `both`, `metric`, or `imperial` |
| `precision`  | select | `2`     | Number of decimal places in results: `0`, `2`, or `4`                  |

---

## Permissions

| Permission  | Used for                                                                  |
| ----------- | ------------------------------------------------------------------------- |
| `clipboard` | Writing the selected conversion result to the system clipboard on `Enter` |

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

---

## Manifest Reference

```json
{
  "id": "com.nuxy.converter",
  "name": "Unit Converter",
  "version": "1.0.0",
  "type": "tool",
  "icon": "convert",
  "permissions": ["clipboard"],
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
    "supported": ["en", "tr"]
  }
}
```

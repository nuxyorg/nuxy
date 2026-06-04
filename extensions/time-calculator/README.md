# Time Calculator

> Instantly converts times between cities and timezones directly from the Nuxy omnibar.

**Type:** `provider`  
**Version:** 1.0.0  
**ID:** `com.nuxy.time-calculator`  
**Permissions:** None

---

## Overview

Time Calculator is an inline provider that detects time conversion queries as you type and shows a two-panel card with the source and destination times side by side. No tool activation is needed — just type a natural-language expression like `3pm istanbul in tokyo` anywhere in the omnibar and the result appears immediately below. It also exposes a `convert` IPC channel so AI orchestrators can invoke timezone conversion programmatically and push results to the frontend.

---

## Extension Type

### `provider`

Runs inline inside the shell — provides a result without the user navigating away. The provider evaluates the query on every keystroke (with an 80 ms debounce) and renders a conversion card directly under the omnibar. It does **not** appear in the Nuxy tool list.

---

## Usage

### Activation

Time Calculator activates automatically whenever the omnibar contains a recognisable time expression (e.g. `12pm`, `3:30am`, `15:00`). No manual tool selection is required.

### Keyboard Shortcuts

The provider has no interactive list — results are displayed inline as a read-only card. No keyboard shortcuts are registered.

### Examples

**Example 1 — Local time to a destination city:**  
Type `12pm here in london` → card shows your local 12:00 PM on the left and the equivalent London time on the right.

**Example 2 — City-to-city conversion:**  
Type `3pm istanbul in tokyo` → card shows 3:00 PM Istanbul on the left and the Tokyo time on the right, including the timezone abbreviation badge.

**Example 3 — 24-hour format:**  
Type `15:30 berlin in dubai` → card parses the 24-hour time and displays the Dubai equivalent.

**Example 4 — AI orchestrator result:**  
When an AI orchestrator calls the `convert` channel, the result is stored and surfaced in the frontend with an `AI` badge next to the "Calculator" header.

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

All platforms supported by Nuxy. Timezone conversion relies on the V8 `Intl.DateTimeFormat` API — no system clock tools are required.

---

## Cross-Extension Integration

### This extension can be called by other extensions

Set `capabilities.callable: true` is already declared in the manifest. Call it from another backend:

```ts
const result = await core.extensions.invoke('com.nuxy.time-calculator', 'convert', {
  time: '3pm',
  from: 'istanbul',
  to: 'tokyo',
})
```

**Exposed IPC channels:**

| Channel         | Payload                                       | Returns                   | Description                                                                                                      |
| --------------- | --------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `eval`          | `{ text: string }`                            | `{ items: EvalResult[] }` | Parses the query and returns a conversion result item, or an empty array if no time expression is detected       |
| `convert`       | `{ time: string, from?: string, to: string }` | `ConvertResponse`         | Structured conversion between two cities/timezones; stores the result as `lastResult` for frontend display       |
| `getLastResult` | —                                             | `ConvertResponse \| null` | Retrieves the most recent result stored by `convert`, used by the frontend on mount to display AI-driven results |
| `setLastResult` | `ConvertResponse`                             | `{ ok: true }`            | Allows an orchestrator to push a pre-computed result directly to the frontend                                    |

---

## Manifest Reference

```json
{
  "id": "com.nuxy.time-calculator",
  "name": "Time Calculator",
  "version": "1.0.0",
  "type": "provider",
  "icon": "clock",
  "providerType": "compare",
  "permissions": [],
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
